/**
 * TTS Player - 音訊播放器
 * 
 * 角色：負責播放 AI 面試官的語音回應
 * 作用：
 * - 解碼 base64 音訊數據
 * - 管理音訊播放佇列
 * - 控制音量、播放/停止
 * - 處理音訊播放狀態
 * 
 * 使用場景：當後端發送 llm.reply 消息時，播放 AI 的語音回應
 * 
 * 
 [後端 TTS 系統] 
   │  (持續輸出音訊片段，可能是 Base64 / PCM / Opus)
   ▼
[前端接收器：enqueueBase64Audio 或 enqueueArrayBuffer]
   │  (把收到的資料轉成 ArrayBuffer)
   ▼
[解碼階段：AudioContext.decodeAudioData / PCM fallback]
   │  (轉換為標準 Web Audio 的 AudioBuffer)
   ▼
[可選：chunkSmoother.push(buffer) 合併]
  │  (串流分片時，進行 OLA 合併與門檻輸出)
  ▼
[scheduleBuffer(buffer)]
  │  (交給 AudioContext 排程播放，並套保護性淡入/淡出)
   ▼
[AudioContext + GainNode + Speaker]
   │  (實際聲音輸出)
   ▼
[使用者聽到語音]
 
 *
 */

let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (typeof window === 'undefined') throw new Error('AudioContext unavailable on server');
  if (!sharedAudioContext) {
    const Ctx: typeof AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
    sharedAudioContext = new Ctx();
  }
  return sharedAudioContext;
}

import { ChunkSmoother } from './chunkSmoother';

class TTSPlayerImpl {
  private queue: Array<{ buf: AudioBuffer }> = [];
  private isPlaying = false;
  private gainNode: GainNode | null = null;
  private playheadTime = 0; // 累積播放時間（用於無縫排程）
  // 排程與邊界平滑設定（播放層）
  private readonly lookAheadSec = 0.08; // 最少 80ms 排程提前量，避免趕不上
  private readonly fadeMs = 6;          // 每段首尾做 6ms 微淡入/淡出
  private smoother: ChunkSmoother | null = null;

    // —— PCM fallback 輔助 ——
  // 常見取樣率白名單（僅接受這些值）
  private static readonly ALLOWED_SR = new Set([8000, 16000, 22050, 24000, 32000, 44100, 48000]);

  // 從 mimeType 擷取 rate=，若無或不可信則回傳預設 24000
  private pickSampleRateFromMimeOrDefault(mimeType?: string): number {
    let sr = 24000; // 預設：TTS 常見輸出
    if (typeof mimeType === 'string') {
      const m = /rate\s*=\s*(\d{4,6})/i.exec(mimeType);
      if (m) {
        const cand = parseInt(m[1], 10);
        if (TTSPlayerImpl.ALLOWED_SR.has(cand)) sr = cand; // 僅信白名單
      }
    }
    return sr;
  }

  // 以樣本數/取樣率估算片段時長（毫秒）是否在合理範圍
  private durationLooksSane(samples: number, sr: number): boolean {
    const ms = (samples / sr) * 1000;
    return ms >= 80 && ms <= 600; // 依你們的 chunk 切片策略可調整
  }


  /**
   * 解鎖音訊上下文（需要使用者手勢）
   * 在開始面試前調用，確保音訊可以播放
   */
  async unlock(): Promise<void> {
    // Resume AudioContext on user gesture
    try {
      const ctx = getAudioContext();
      if (ctx.state !== 'running') await ctx.resume();
      // Initialize gain if first time
      if (!this.gainNode) {
        this.gainNode = ctx.createGain();
        this.gainNode.connect(ctx.destination);
      }
    } catch {
      // ignore
    }
  }

  /**
   * 將 base64 音訊數據加入播放佇列
   * @param base64 - base64 編碼的音訊數據
   */
  async enqueueBase64Audio(base64: string, mimeType?: string): Promise<void> {
    console.log('🎵 TTSPlayer: 開始處理 base64 音頻數據, 長度:', base64.length);
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    console.log('🎵 TTSPlayer: base64 轉換完成, 二進制長度:', len, 'bytes');
    await this.enqueueArrayBuffer(bytes.buffer, mimeType);
  }

  /**
   * 將 ArrayBuffer 音訊數據加入播放佇列
   * @param ab - 音訊數據的 ArrayBuffer
   */
  async enqueueArrayBuffer(arrayBuffer: ArrayBuffer, mimeType?: string): Promise<void> {
    console.log('🎵 TTSPlayer: 開始處理 ArrayBuffer, 大小:', arrayBuffer.byteLength, 'bytes, MIME:', mimeType);
    
    try {
      let audioBuffer: AudioBuffer;
      
      // Handle PCM audio format (audio/L16)
      if (mimeType && mimeType.includes('audio/L16')) {
        console.log('🎵 TTSPlayer: 檢測到 PCM 音頻格式，進行轉換...');
        // PCM L16 format: 16-bit signed little-endian, 24kHz sample rate, mono
        const pcmData = new Int16Array(arrayBuffer);
        const sampleRate = 24000; // 24kHz as specified in MIME type
        const channelCount = 1; // mono
        
        // Create AudioBuffer
        const audioContext = getAudioContext();
        audioBuffer = audioContext.createBuffer(channelCount, pcmData.length, sampleRate);
        
        // Convert Int16 PCM to Float32 for Web Audio API
        const channelData = audioBuffer.getChannelData(0);
        for (let i = 0; i < pcmData.length; i++) {
          // Convert 16-bit signed integer (-32768 to 32767) to float (-1.0 to 1.0)
          channelData[i] = pcmData[i] / 32768.0;
        }
        
        console.log('🎵 TTSPlayer: PCM 轉換完成，樣本數:', pcmData.length, '採樣率:', sampleRate);
      } else {
        // Standard audio format handling
        console.log('🎵 TTSPlayer: 使用標準音頻解碼...');
        audioBuffer = await getAudioContext().decodeAudioData(arrayBuffer);
        console.log('🎵 TTSPlayer: 音頻解碼完成，持續時間:', audioBuffer.duration, '秒');
      }
      
      await this.playBufferAndWait(audioBuffer);
    } catch (error) {
      console.error('🎵 TTSPlayer: 音頻處理失敗:', error);
      throw error;
    }
  }

  /**
   * 播放一個 AudioBuffer 並在結束時 resolve
   */
  private async playBufferAndWait(buffer: AudioBuffer): Promise<void> {
    const ctx = getAudioContext();
    if (!this.gainNode) { this.gainNode = ctx.createGain(); this.gainNode.connect(ctx.destination); }

    const localGain = ctx.createGain();
    localGain.connect(this.gainNode);

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(localGain);

    const now = ctx.currentTime;
    this.playheadTime = Math.max(this.playheadTime, now + this.lookAheadSec);

    const duration = buffer.duration;
    const fadeS = Math.min(Math.max(this.fadeMs, 10) / 1000, duration * 0.25);

    const startAt = this.playheadTime;
    const endAt = startAt + duration;

    localGain.gain.setValueAtTime(0, startAt);
    localGain.gain.linearRampToValueAtTime(1, startAt + fadeS);
    const fadeOutStart = Math.max(startAt, endAt - fadeS);
    localGain.gain.setValueAtTime(1, fadeOutStart);
    localGain.gain.linearRampToValueAtTime(0, endAt);

    console.log('🎵 TTSPlayer: 音頻已排程播放, 開始時間:', Math.round(startAt * 1000), 'ms, 結束時間:', Math.round(endAt * 1000), 'ms, 時長:', Math.round(duration * 1000), 'ms');
    return new Promise<void>((resolve) => {
      src.onended = () => resolve();
      src.start(startAt);
      this.playheadTime = endAt;
    });
  }

  /**
   * 設置音量（0.0 到 1.0）
   * 未來可能會用到，比如用戶想要調整 AI 語音的音量
   * @param linear - 線性音量值，0.0 為靜音，1.0 為最大音量
   */
  setVolume(linear: number): void {
    const ctx = getAudioContext();
    if (!this.gainNode) {
      this.gainNode = ctx.createGain();
      this.gainNode.connect(ctx.destination);
    }
    const v = Math.max(0, Math.min(1, Number(linear) || 0));
    const now = ctx.currentTime;
    this.gainNode.gain.cancelScheduledValues(now);
    this.gainNode.gain.setTargetAtTime(v, now, 0.015); // 15ms 時常，平順
  }
  

  /**
   * 停止播放並清空佇列
   * 完全停止所有音訊播放
   */
  stop(): void {
    try { getAudioContext().suspend(); } catch {}
    this.queue = [];
    this.isPlaying = false;
  }

  /**
   * 清空播放佇列但不停止當前播放
   * 使用場景：用戶想要跳過 AI 說話，直接進入回答環節
   * 注意：當前正在播放的音訊會繼續播放完畢
   */
  clearQueue(): void {
    this.queue = [];
    // 不改變 isPlaying 狀態，讓當前播放的音訊自然結束
  }

  /**
   * 清空播放佇列並停止當前播放
   * 使用場景：用戶想要立即停止 AI 說話
   * 這會立即停止所有音訊
   */
  clearQueueAndStop(): void {
    this.queue = [];
    this.isPlaying = false;
    // 可以考慮暫停 AudioContext 來立即停止當前播放
    try { getAudioContext().suspend(); } catch {}
    try { this.playheadTime = getAudioContext().currentTime; } catch { this.playheadTime = 0; }
  }

  /**
   * 提示音：在用戶輪到回答時播放短促的嗶聲
   */
  async playBeep(
    frequencyHz = 1200,
    durationMs = 180,
    volume = 0.25,
    repeat = 2,
    gapMs = 90,
  ): Promise<void> {
    const ctx = getAudioContext();
    for (let i = 0; i < repeat; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = frequencyHz * (i === 1 ? 1.25 : 1.0); // 第二聲稍高一些
      gain.gain.value = 0.0001;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      const start = now;
      const end = start + durationMs / 1000;
      gain.gain.setValueAtTime(0.0001, start);
      // 快速淡入到指定音量
      gain.gain.exponentialRampToValueAtTime(volume, start + 0.02);
      // 淡出
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      osc.start(start);
      osc.stop(end);
      await new Promise<void>(r => setTimeout(r, durationMs + (i < repeat - 1 ? gapMs : 0)));
    }
  }

  /**
   * 播放佇列中的下一個音訊
   * 內部方法，自動管理播放狀態
   */
  private scheduleBuffer(buffer: AudioBuffer): void {
    const ctx = getAudioContext();
    if (!this.gainNode) { this.gainNode = ctx.createGain(); this.gainNode.connect(ctx.destination); }
  
    const localGain = ctx.createGain();
    localGain.connect(this.gainNode);
  
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(localGain);
  
    const now = ctx.currentTime;
    this.playheadTime = Math.max(this.playheadTime, now + this.lookAheadSec);
  
    const duration = buffer.duration;
    const fadeS = Math.min(Math.max(this.fadeMs, 10) / 1000, duration * 0.25); // 最少 10ms
  
    const startAt = this.playheadTime;
    const endAt = startAt + duration;
  
    localGain.gain.setValueAtTime(0, startAt);
    localGain.gain.linearRampToValueAtTime(1, startAt + fadeS);
    const fadeOutStart = Math.max(startAt, endAt - fadeS);
    localGain.gain.setValueAtTime(1, fadeOutStart);
    localGain.gain.linearRampToValueAtTime(0, endAt);
  
    console.log('🎵 TTSPlayer: 音頻已排程播放, 開始時間:', Math.round(startAt * 1000), 'ms, 結束時間:', Math.round(endAt * 1000), 'ms, 時長:', Math.round(duration * 1000), 'ms');
    src.start(startAt);
    this.playheadTime = endAt;
  }
  
  // 可選：啟用/停用串流平滑器（當為流式分片時再開啟）
  enableSmoothing(enabled: boolean, opts?: { minChunkSec?: number; overlapMs?: number; targetSampleRate?: number | null }): void {
    if (enabled) {
      this.smoother = new ChunkSmoother(getAudioContext, opts);
    } else {
      this.smoother = null;
    }
  }
  
  /**
   * 確保 AudioContext 處於運行狀態
   * 內部方法，處理音訊上下文暫停的情況
   */
  private async ensureResumed(): Promise<void> {
    const ctx = getAudioContext();
    if (ctx.state !== 'running') {
      try { await ctx.resume(); } catch {}
    }
  }
}

export const ttsPlayer = new TTSPlayerImpl();
export type TTSPlayer = typeof ttsPlayer;