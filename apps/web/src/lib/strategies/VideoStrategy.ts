'use client'

import type { PlaybackStrategy, QuestionData } from './index'

export class VideoStrategy implements PlaybackStrategy {
  private videoCache = new Map<number, HTMLVideoElement>()
  private currentVideo: HTMLVideoElement | null = null

  getCurrentVideo(): HTMLVideoElement | null {
    return this.currentVideo
  }

  getPreparedVideo(index: number): HTMLVideoElement | undefined {
    return this.videoCache.get(index)
  }

  async playQuestion(index: number, question: QuestionData): Promise<void> {
    const path = question.videoPath
    if (!path) throw new Error('VideoStrategy: missing videoPath')

    let video = this.videoCache.get(index)
    if (!video) {
      video = await this.loadVideo(path)
      this.videoCache.set(index, video)
    }

    // Ensure last frame freeze after end
    video.pause()
    try { video.currentTime = 0 } catch {}
    video.muted = false
    video.playsInline = true as any
    video.controls = false

    this.currentVideo = video

    await new Promise<void>((resolve, reject) => {
      const onEnded = () => {
        // Freeze on last frame
        try {
          video.pause()
          // Seek to end to display last frame
          if (!isNaN(video.duration) && isFinite(video.duration)) {
            video.currentTime = Math.max(video.duration - 0.05, 0)
          }
        } catch {}
        cleanup();
        resolve()
      }
      const onError = () => { cleanup(); reject(new Error('Video playback error')) }
      const cleanup = () => {
        video.removeEventListener('ended', onEnded)
        video.removeEventListener('error', onError)
      }
      video.addEventListener('ended', onEnded)
      video.addEventListener('error', onError)
      void video.play().catch(onError)
    })
    
    // 保持影片顯示在最後一禎
    this.currentVideo = video
  }

  async prepareQuestion(index: number, question: QuestionData): Promise<void> {
    if (this.videoCache.has(index)) return
    const path = question.videoPath
    if (!path) return
    
    console.log('📦 預取影片:', path)
    const video = await this.loadVideo(path)
    this.videoCache.set(index, video)
    console.log('📦 影片預取完成')
  }

  stop(): void {
    if (this.currentVideo) {
      try { this.currentVideo.pause() } catch {}
      this.currentVideo = null
    }
  }

  isPlaying(): boolean {
    return this.currentVideo ? !this.currentVideo.paused : false
  }

  private async loadVideo(path: string): Promise<HTMLVideoElement> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      video.src = path
      video.preload = 'metadata'
      video.crossOrigin = 'anonymous'
      video.muted = true
      video.playsInline = true as any
      video.onloadedmetadata = () => resolve(video)
      video.onerror = () => reject(new Error('Failed to load video: ' + path))
    })
  }
}


