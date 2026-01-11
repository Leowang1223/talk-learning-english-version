/**
 * ChunkSmoother - 專責處理串流音訊的邊界平滑與合併
 *
 * 功能：
 * - 可選的重採樣至 AudioContext 目標取樣率
 * - 兩種合併模式：
 *   1. 簡單接合（Simple Concatenation）：直接連接音訊片段，無邊界處理
 *   2. 等功率交疊（OLA）：將多個小片段合併成較長的一段，平滑邊界
 * - 達到門檻再輸出，減少邊界數量
 *
 * 用法：
 * const smoother = new ChunkSmoother(getAudioContext, { mergeMode: 'simple' }); // 或 'ola'
 * const out = await smoother.push(buffer); // 可能回傳 null（尚未達門檻）或合併後的 AudioBuffer
 * const flushed = await smoother.flush(); // 將餘量輸出
 */

export type GetAudioContext = () => AudioContext;

export type MergeMode = 'simple' | 'ola';

export class ChunkSmoother {
  private readonly getCtx: GetAudioContext;
  private accumulator: { samples: Float32Array | null; sampleRate: number | null } = { samples: null, sampleRate: null };
  private readonly minChunkSec: number; // 累積到此秒數才輸出
  private readonly overlapMs: number;   // OLA 交疊毫秒
  private mergeMode: MergeMode; // 合併模式（移除 readonly，讓它可以被修改）
  private targetSampleRate: number | null = null;

  constructor(getCtx: GetAudioContext, options?: { 
    minChunkSec?: number; 
    overlapMs?: number; 
    targetSampleRate?: number | null;
    mergeMode?: MergeMode;
  }) {
    this.getCtx = getCtx;
    this.minChunkSec = options?.minChunkSec ?? 0.22;
    this.overlapMs = options?.overlapMs ?? 10;
    this.targetSampleRate = options?.targetSampleRate ?? null; // 預設跟隨 AudioContext
    this.mergeMode = options?.mergeMode ?? 'simple'; // 預設使用簡單接合
  }

  public setTargetSampleRate(rate: number | null): void {
    this.targetSampleRate = rate;
  }

  public setMergeMode(mode: MergeMode): void {
    this.mergeMode = mode;
  }

  // 對外 API：推入一段，可能回傳合併後可播的 AudioBuffer，或 null 代表繼續累積
  public async push(input: AudioBuffer): Promise<AudioBuffer | null> {
    const ctx = this.getCtx();
    const buf = await this.resampleToTarget(input);
    const ch = buf.getChannelData(0);

    if (!this.accumulator.samples) {
      this.accumulator = { samples: ch.slice(), sampleRate: buf.sampleRate };
    } else if (this.accumulator.sampleRate !== buf.sampleRate) {
      // 理論上不會發生（已重採樣），保底：先沖出舊的再重起
      const flushed = await this.flush();
      this.accumulator = { samples: ch.slice(), sampleRate: buf.sampleRate };
      if (flushed) return flushed; // 先讓呼叫端播放已累積的
    } else {
      // 根據合併模式選擇處理方式
      if (this.mergeMode === 'ola') {
        // const merged = this.olaEqualPower(this.accumulator.samples!, ch, buf.sampleRate);
        // this.accumulator.samples = merged;
        // 暫時註解掉 OLA，使用簡單接合作為替代
        const merged = this.simpleConcatenate(this.accumulator.samples!, ch);
        this.accumulator.samples = merged;
      } else {
        // 簡單接合模式
        const merged = this.simpleConcatenate(this.accumulator.samples!, ch);
        this.accumulator.samples = merged;
      }
    }

    const acc = this.accumulator.samples!;
    const dur = acc.length / (this.accumulator.sampleRate || 1);
    if (dur >= this.minChunkSec) {
      const out = ctx.createBuffer(1, acc.length, this.accumulator.sampleRate!);
      out.getChannelData(0).set(acc);
      this.accumulator = { samples: null, sampleRate: null };
      return out;
    }
    return null;
  }

  // 對外 API：將尚未達門檻的餘量輸出為一段（若存在）
  public async flush(): Promise<AudioBuffer | null> {
    if (!this.accumulator.samples || !this.accumulator.sampleRate) return null;
    const ctx = this.getCtx();
    const out = ctx.createBuffer(1, this.accumulator.samples.length, this.accumulator.sampleRate);
    out.getChannelData(0).set(this.accumulator.samples);
    this.accumulator = { samples: null, sampleRate: null };
    return out;
  }

  // 若指定 targetSampleRate（或預設取 AudioContext.sampleRate）則重採樣
  private async resampleToTarget(buf: AudioBuffer): Promise<AudioBuffer> {
    const ctx = this.getCtx();
    const target = this.targetSampleRate ?? ctx.sampleRate;
    if (buf.sampleRate === target) return buf;
    const offline = new OfflineAudioContext(1, Math.ceil(buf.duration * target), target);
    const src = offline.createBufferSource();
    src.buffer = buf; src.connect(offline.destination); src.start();
    return await offline.startRendering();
  }

  // 簡單接合：直接連接兩個音訊片段，無邊界處理
  private simpleConcatenate(prev: Float32Array, next: Float32Array): Float32Array {
    const merged = new Float32Array(prev.length + next.length);
    merged.set(prev, 0);           // 複製前一段
    merged.set(next, prev.length); // 複製後一段
    return merged;
  }

  // OLA：等功率交疊（暫時註解掉）
  /*
  private olaEqualPower(prev: Float32Array, next: Float32Array, sr: number): Float32Array {
    const ovlSamples = Math.min(Math.floor((this.overlapMs / 1000) * sr), Math.min(prev.length, next.length, 4800));
    if (ovlSamples <= 1) {
      const merged = new Float32Array(prev.length + next.length);
      merged.set(prev); merged.set(next, prev.length); return merged;
    }
    const tailLen = prev.length - ovlSamples;
    const headLen = next.length - ovlSamples;
    const out = new Float32Array(tailLen + ovlSamples + headLen);
    out.set(prev.subarray(0, tailLen), 0);
    for (let i = 0; i < ovlSamples; i++) {
      const t = i / (ovlSamples - 1);
      const wOut = Math.cos(0.5 * Math.PI * t);
      const wIn  = Math.sin(0.5 * Math.PI * t);
      out[tailLen + i] = prev[tailLen + i] * wOut + next[i] * wIn;
    }
    out.set(next.subarray(ovlSamples), tailLen + ovlSamples);
    return out;
  }
  */
}

export type { ChunkSmoother as DefaultChunkSmoother };


