'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useInterviewFlow } from '@/lib/useInterviewFlow'

// Custom hook to get the previous value of a prop or state
function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined)
  useEffect(() => {
    ref.current = value
  }, [value])
  return ref.current
}

export type TTSControlsProps = {
  flow: ReturnType<typeof useInterviewFlow>
  onTimingUpdate?: (questionIndex: number, thinkingTime: number, answeringTime: number) => void
}

export default function TTSControls({ flow, onTimingUpdate }: TTSControlsProps) {
  const [thinkingTime, setThinkingTime] = useState(0)
  const [answeringTime, setAnsweringTime] = useState(0)
  const [isThinkingActive, setIsThinkingActive] = useState(false)
  const [isAnsweringActive, setIsAnsweringActive] = useState(false)

  const recording = flow.isRecording
  const prevIsPlaying = usePrevious(flow.isPlaying)

  // 1. 當題目切換時，重置兩個計時器
  useEffect(() => {
    if (flow.currentIndex > -1) {
      setThinkingTime(0)
      setAnsweringTime(0)
      setIsThinkingActive(false)
      setIsAnsweringActive(false)
    }
  }, [flow.currentIndex])

  // 2. 當題目播放完畢時，開始計時思考時間
  useEffect(() => {
    //
    if (prevIsPlaying && !flow.isPlaying && !flow.isRecording) {
      setIsThinkingActive(true)
    }
  }, [prevIsPlaying, flow.isPlaying, flow.isRecording])


  // 思考時間計時器（上限 20 秒）
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isThinkingActive && thinkingTime < 20) {
      interval = setInterval(() => {
        setThinkingTime(prev => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isThinkingActive, thinkingTime])

  // 回答時間計時器
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isAnsweringActive) {
      interval = setInterval(() => {
        setAnsweringTime(prev => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isAnsweringActive])

  // 格式化時間顯示
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // 處理錄音開始/停止
  const handleToggleRecording = useCallback(() => {
    if (!recording) {
      // 開始錄音：停止思考、開始回答，並啟動協調流程
      setIsThinkingActive(false)
      setIsAnsweringActive(true)
      try {
        flow.startRecording()
      } catch (error) {
        console.error('Failed to start recording:', error)
      }
    } else {
      // 停止錄音：停止回答時間並結束協調流程
      setIsAnsweringActive(false)
      
      // 記錄當前題目的計時數據
      if (onTimingUpdate && flow.currentIndex >= 0) {
        onTimingUpdate(flow.currentIndex, thinkingTime, answeringTime)
      }
      
      try {
        flow.stopRecording()
      } catch (error) {
        console.error('Failed to stop recording:', error)
      }
    }
  }, [recording, flow, onTimingUpdate, thinkingTime, answeringTime])

  // 鍵盤事件處理
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      const isSpace = event.code === 'Space' || event.key === ' ' || (event as any).key === 'Spacebar'
      if (!isSpace || event.repeat) return
      const target = event.target as HTMLElement
      const isTyping = target.matches('input, textarea') || target.getAttribute('contenteditable') === 'true'
      if (!isTyping) {
        event.preventDefault()
        handleToggleRecording()
      }
    }

    window.addEventListener('keydown', handleKeyPress, { capture: true })
    return () => window.removeEventListener('keydown', handleKeyPress, { capture: true } as any)
  }, [handleToggleRecording])

  // 開始思考時間（當題目出現時調用）
  useEffect(() => {
    setIsThinkingActive(true)
  }, [])

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-lg p-4">
      {/* 桌面版：三欄佈局 */}
      <div className="hidden sm:grid sm:grid-cols-3 sm:gap-6 sm:items-center sm:justify-items-center">
        {/* 左欄：思考時間卡片 */}
        <div className="w-40 h-24 bg-white rounded-xl border border-gray-300 px-4 py-3 flex flex-col justify-center">
          <div className="text-xs font-medium text-gray-500 mb-1">思考時間</div>
          <div className={`text-base md:text-lg font-semibold ${
            thinkingTime >= 20 ? 'text-red-500' : 'text-gray-900'
          }`}>
            {formatTime(thinkingTime)}/00:20
          </div>
        </div>

        {/* 中欄：錄音主按鈕 */}
        <div className="flex flex-col items-center">
          <button
            role="button"
            aria-pressed={recording}
            aria-label={recording ? '停止回答' : '開始回答'}
            onClick={handleToggleRecording}
            className={`w-16 h-16 rounded-full transition-all duration-300 flex items-center justify-center ${
              recording 
                ? 'bg-red-500 hover:bg-red-600 ring-8 ring-red-100 animate-pulse' 
                : 'bg-[#3B82F6] hover:bg-blue-600 ring-8 ring-blue-100'
            }`}
          >
            {/* 白色麥克風圖示 */}
            <svg 
              className="w-6 h-6 text-white" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" 
              />
            </svg>
          </button>
          <p className="text-xs text-gray-600 font-medium mt-2 text-center" aria-live="polite">
            按空白鍵開始回答
          </p>
        </div>

        {/* 右欄：回答時間卡片 */}
        <div className="w-40 h-24 bg-white rounded-xl border border-gray-300 px-4 py-3 flex flex-col justify-center">
          <div className="text-xs font-medium text-gray-500 mb-1">回答時間</div>
          <div className="text-base md:text-lg font-semibold">
            <span className={answeringTime > 120 ? 'text-red-500' : 'text-gray-900'}>
              {formatTime(answeringTime)}
            </span>
            <span className="text-gray-500"> /02:00</span>
          </div>
        </div>
      </div>

      {/* 行動版：垂直堆疊佈局 */}
      <div className="sm:hidden space-y-4">
        {/* 思考時間卡片 */}
        <div className="w-full bg-white rounded-xl border border-gray-300 px-4 py-3">
          <div className="text-xs font-medium text-gray-500 mb-1">思考時間</div>
          <div className={`text-base font-semibold ${
            thinkingTime >= 20 ? 'text-red-500' : 'text-gray-900'
          }`}>
            {formatTime(thinkingTime)}/00:20
          </div>
        </div>

        {/* 錄音按鈕 */}
        <div className="flex justify-center">
          <button
            role="button"
            aria-pressed={recording}
            aria-label={recording ? '停止回答' : '開始回答'}
            onClick={handleToggleRecording}
            className={`w-16 h-16 rounded-full transition-all duration-300 flex items-center justify-center ${
              recording 
                ? 'bg-red-500 hover:bg-red-600 ring-8 ring-red-100 animate-pulse' 
                : 'bg-[#3B82F6] hover:bg-blue-600 ring-8 ring-blue-100'
            }`}
          >
            <svg 
              className="w-6 h-6 text-white" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" 
              />
            </svg>
          </button>
        </div>

        {/* 回答時間卡片 */}
        <div className="w-full bg-white rounded-xl border border-gray-300 px-4 py-3">
          <div className="text-xs font-medium text-gray-500 mb-1">回答時間</div>
          <div className="text-base font-semibold">
            <span className={answeringTime > 120 ? 'text-red-500' : 'text-gray-900'}>
              {formatTime(answeringTime)}
            </span>
            <span className="text-gray-500"> /02:00</span>
          </div>
        </div>

        {/* 行動版提示文字 */}
        <p className="text-xs text-gray-600 font-medium text-center" aria-live="polite">
          按空白鍵開始回答
        </p>
      </div>

      {/* 字幕顯示移除，改由 Transcript 面板統一呈現 */}
    </div>
  )
}
