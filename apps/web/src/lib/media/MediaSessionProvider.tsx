'use client'
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'

type MediaCtx = {
  stream?: MediaStream
  audioEnabled: boolean
  videoEnabled: boolean
  speakerEnabled: boolean
  ensureStream: () => Promise<MediaStream>
  setAudioEnabled: (on: boolean) => void
  setVideoEnabled: (on: boolean) => void
  setSpeakerEnabled: (on: boolean) => void
  stopAll: () => void
  toggleAudio: () => void
  toggleVideo: () => void
  toggleSpeaker: () => void
}

const Ctx = createContext<MediaCtx | null>(null)

export const MediaSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stream, setStream] = useState<MediaStream | undefined>(undefined)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [videoEnabled, setVideoEnabled] = useState(false)
  const [speakerEnabled, setSpeakerEnabled] = useState(true)

  // 從 localStorage 讀取上次的設定
  useEffect(() => {
    try {
      const savedAudio = localStorage.getItem('media_audio_enabled')
      const savedVideo = localStorage.getItem('media_video_enabled')
      const savedSpeaker = localStorage.getItem('media_speaker_enabled')
      
      if (savedAudio !== null) setAudioEnabled(savedAudio === 'true')
      if (savedVideo !== null) setVideoEnabled(savedVideo === 'true')
      if (savedSpeaker !== null) setSpeakerEnabled(savedSpeaker === 'true')
    } catch (error) {
      console.warn('Failed to load media settings from localStorage:', error)
    }
  }, [])

  const ensureStream = useCallback(async (): Promise<MediaStream> => {
    if (stream) return stream
    
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        audio: { 
          echoCancellation: true, 
          noiseSuppression: true, 
          autoGainControl: true,
          sampleRate: { ideal: 48000 }
        },
        video: { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 }, 
          frameRate: { ideal: 30 } 
        },
      })
      
      // 根據當前設定啟用/禁用 tracks
      s.getAudioTracks().forEach(t => (t.enabled = audioEnabled))
      s.getVideoTracks().forEach(t => (t.enabled = videoEnabled))
      
      setStream(s)
      return s
    } catch (error) {
      console.error('Failed to get media stream:', error)
      throw error
    }
  }, [stream, audioEnabled, videoEnabled])

  const setAudio = useCallback((on: boolean) => {
    setAudioEnabled(on)
    stream?.getAudioTracks().forEach(t => (t.enabled = on))
    
    // 保存到 localStorage
    try {
      localStorage.setItem('media_audio_enabled', on.toString())
    } catch (error) {
      console.warn('Failed to save audio setting to localStorage:', error)
    }
  }, [stream])

  const setVideo = useCallback((on: boolean) => {
    setVideoEnabled(on)
    stream?.getVideoTracks().forEach(t => (t.enabled = on))
    
    // 保存到 localStorage
    try {
      localStorage.setItem('media_video_enabled', on.toString())
    } catch (error) {
      console.warn('Failed to save video setting to localStorage:', error)
    }
  }, [stream])

  const setSpeaker = useCallback((on: boolean) => {
    setSpeakerEnabled(on)
    
    // 保存到 localStorage
    try {
      localStorage.setItem('media_speaker_enabled', on.toString())
    } catch (error) {
      console.warn('Failed to save speaker setting to localStorage:', error)
    }
  }, [])

  const toggleAudio = useCallback(() => setAudio(!audioEnabled), [audioEnabled, setAudio])
  const toggleVideo = useCallback(() => setVideo(!videoEnabled), [videoEnabled, setVideo])
  const toggleSpeaker = useCallback(() => setSpeaker(!speakerEnabled), [speakerEnabled, setSpeaker])

  const stopAll = useCallback(() => {
    stream?.getTracks().forEach(t => t.stop())
    setStream(undefined)
  }, [stream])

  return (
    <Ctx.Provider
      value={{
        stream,
        audioEnabled,
        videoEnabled,
        speakerEnabled,
        ensureStream,
        setAudioEnabled: setAudio,
        setVideoEnabled: setVideo,
        setSpeakerEnabled: setSpeaker,
        stopAll,
        toggleAudio,
        toggleVideo,
        toggleSpeaker,
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useMediaSession() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useMediaSession must be used within MediaSessionProvider')
  return v
}
