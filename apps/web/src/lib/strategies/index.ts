'use client'

export type PlaybackType = 'tts' | 'video'

export interface QuestionData {
  question: string
  playbackType?: PlaybackType
  videoPath?: string
  voiceConfig?: unknown
}

export interface PlaybackStrategy {
  playQuestion(index: number, question: QuestionData): Promise<void>
  prepareQuestion(index: number, question: QuestionData): Promise<void>
  stop(): void
  isPlaying(): boolean
}


