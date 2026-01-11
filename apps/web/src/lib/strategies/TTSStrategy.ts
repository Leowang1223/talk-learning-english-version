'use client'

import { ttsPlayer } from '../ttsPlayer'
import type { PlaybackStrategy, QuestionData } from './index'
import { apiTts } from '../api'

export class TTSStrategy implements PlaybackStrategy {
  private audioCache = new Map<number, { base64: string; mime?: string }>()
  private playing = false

  async playQuestion(index: number, question: QuestionData): Promise<void> {
    const text = question.question
    let base64: string | null = null
    let mime: string | undefined = undefined

    const cached = this.audioCache.get(index)
    if (cached) {
      base64 = cached.base64
      mime = cached.mime
    } else {
      const tts = await apiTts(text)
      base64 = tts.audioBase64
      mime = tts.mime
      this.audioCache.set(index, { base64, mime })
    }

    this.playing = true
    try {
      await ttsPlayer.enqueueBase64Audio(base64!, mime)
    } finally {
      this.playing = false
    }
  }

  async prepareQuestion(index: number, question: QuestionData): Promise<void> {
    if (this.audioCache.has(index)) return
    const tts = await apiTts(question.question)
    this.audioCache.set(index, { base64: tts.audioBase64, mime: tts.mime })
  }

  stop(): void {
    try { ttsPlayer.stop() } catch {}
    this.playing = false
  }

  isPlaying(): boolean { return this.playing }
}


