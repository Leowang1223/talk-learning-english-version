'use client'

import { Play, Pause, Volume2 } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

export type VideoCardProps = {
  question?: string
  currentVideo?: HTMLVideoElement | null
}

export default function VideoCard({ question, currentVideo }: VideoCardProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [displayQuestion, setDisplayQuestion] = useState<string>('請等待面試官發問...')
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (typeof question === 'string' && question.trim().length > 0) {
      setDisplayQuestion(question)
    } else {
      setDisplayQuestion('請等待面試官發問...')
    }
  }, [question])

  // Mount the actual playing video element for visible playback and audio
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    // cleanup previous children
    container.innerHTML = ''
    if (currentVideo) {
      try {
        currentVideo.playsInline = true as any
        currentVideo.controls = false
        currentVideo.style.width = '100%'
        currentVideo.style.height = '100%'
  currentVideo.style.objectFit = 'cover'
  currentVideo.style.maxHeight = '100%'
  currentVideo.style.maxWidth = '100%'
        currentVideo.muted = isMuted
        container.appendChild(currentVideo)
      } catch {}

      const onPlay = () => setIsPlaying(true)
      const onPause = () => setIsPlaying(false)
      const onEnded = () => setIsPlaying(false)
      try {
        currentVideo.addEventListener('play', onPlay)
        currentVideo.addEventListener('pause', onPause)
        currentVideo.addEventListener('ended', onEnded)
      } catch {}
      return () => {
        try {
          currentVideo.removeEventListener('play', onPlay)
          currentVideo.removeEventListener('pause', onPause)
          currentVideo.removeEventListener('ended', onEnded)
        } catch {}
      }
    }
  }, [currentVideo])

  // Apply mute toggle to actual video element
  useEffect(() => {
    if (currentVideo) {
      try { currentVideo.muted = isMuted } catch {}
    }
  }, [isMuted, currentVideo])

  return (
    <div className="p-2 md:p-4">
      <div className="bg-gray-900 rounded-lg overflow-hidden relative">
        {/* Video Player or Interviewer Placeholder Image */}
     <div className="w-full bg-black flex items-center justify-center overflow-hidden"
       style={{ aspectRatio: '4 / 3' }}>
          {currentVideo ? (
            <div ref={containerRef} className="w-full h-full" />
          ) : (
            <Image src="/interviewers/woman.png" alt="Interviewer" width={1600} height={900} className="object-cover w-full h-full" priority />
          )}
        </div>

      </div>

      <div className="mt-4 md:mt-6">
        <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-2 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
          Question
        </h3>
        <p className="text-gray-900 text-base leading-relaxed whitespace-pre-wrap">{displayQuestion}</p>
      </div>

    </div>
  )
}
