'use client'

import TopBar from '@/components/TopBar'
import TutorPane from '@/components/TutorPane'
import TranscriptPane from '@/components/TranscriptPane'
import HintPane from '@/components/HintPane'
import ActionPane from '@/components/ActionPane'
import VoiceDock from '@/components/VoiceDock'
// import { useInterviewSession } from '@/lib/useInterviewSession';
import { useInterviewFlow } from '@/lib/useInterviewFlow'
import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { ttsPlayer } from '@/lib/ttsPlayer'


export default function MockInterviewPage() {
  const search = useSearchParams()
  const type = search.get('type') || 'self_intro'
  const [started, setStarted] = useState(false)
  const [firstPlayed, setFirstPlayed] = useState(false)
  const [finished, setFinished] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const flow = useInterviewFlow({ interviewType: type })

  // 檢查是否為中文課程（L開頭）
  const isChineseLesson = type.startsWith('L')

  const handleStart = useCallback(() => {
    console.log('🚀 主頁面: 用戶點擊開始面試');
    setStarted(true)
    
    // 如果是中文課程，直接跳過影片播放
    if (isChineseLesson) {
      setFirstPlayed(true)
      flow.startInterview()
      // 直接進入對話，不播放影片
      setTimeout(() => {
        flow.playQuestion(0)
      }, 500)
    } else {
      flow.startInterview() // 立即更新 UI，讓準備工作在背景執行
    }
  }, [flow, isChineseLesson]);

  // 根據 readiness 自動開播並關閉遮罩（僅非中文課程）
  useEffect(() => {
    if (isChineseLesson) return // 中文課程跳過這個邏輯
    if (!started || firstPlayed || countdown !== null) return
    if (!flow.isConfigReady) return
    
    // 檢查是否準備完成
    const isReady = flow.playbackMode === 'tts' 
      ? flow.firstAudioReady 
      : flow.videoPreloadedCount >= flow.videoPreloadGoal
    
    if (isReady) {
      // 開始倒數計時
      setCountdown(5)
    }
  }, [isChineseLesson, started, firstPlayed, countdown, flow.isConfigReady, flow.playbackMode, flow.firstAudioReady, flow.videoPreloadedCount, flow.videoPreloadGoal])

  // 倒數計時邏輯（僅非中文課程）
  useEffect(() => {
    if (isChineseLesson) return // 中文課程跳過倒數
    if (countdown === null || countdown <= 0) return
    
    // 播放倒數聲音
    if (countdown > 0) {
      ;(async () => {
        try {
          // 播放倒數音效 (短促的嗶聲)
          await ttsPlayer.playBeep(800, 200, 0.3, 1, 60)
        } catch (e) {
          console.warn('倒數音效播放失敗:', e)
        }
      })()
    }
    
    const timer = setTimeout(() => {
      if (countdown === 1) {
        // 倒數結束，播放開始音效
        ;(async () => {
          try {
            // 播放開始音效 (較長的嗶聲)
            await ttsPlayer.playBeep(1200, 500, 0.5, 1, 80)
          } catch (e) {
            console.warn('開始音效播放失敗:', e)
          }
        })()
        
        // 開始面試
        setCountdown(null)
        setFirstPlayed(true)
        ;(async () => { await flow.playQuestion(0) })()
      } else {
        setCountdown(countdown - 1)
      }
    }, 1000)
    
    return () => clearTimeout(timer)
  }, [isChineseLesson, countdown, flow])

  // 由 flow 的 isFinished 控制結束顯示，避免競態
  useEffect(() => {
    setFinished(flow.isFinished)
  }, [flow.isFinished])

  // 添加 beforeunload 事件處理，與 endInterview 共用清理邏輯
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (started && !finished) {
        // 使用共用的清理函數
        flow.cleanupResources()
        
        e.preventDefault()
        e.returnValue = '面試進行中，確定要離開嗎？'
        return '面試進行中，確定要離開嗎？'
      }
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [started, finished, flow.cleanupResources])
  
  
  return (
    <div className="min-h-screen bg-white">
      <TopBar onEndInterview={flow.endInterview} onCleanupResources={flow.cleanupResources} />
      
      <div className="flex h-screen pt-12">
       
        
        {/* Left Panel - Transcript */}
        <div className="w-1/4">
          <TranscriptPane flow={flow} />
        </div>

         {/* Center Panel - Tutor */}
         <div className="w-1/2">
          <TutorPane flow={flow} />
        </div>
        
        {/* Right Panel - Hints */}
        <div className="w-1/4">
          <HintPane flow={flow} />
        </div>
      </div>
      {/* 啟動/準備遮罩 */}
      {(!started || (!firstPlayed && !isChineseLesson)) && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/85 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            {!started ? (
              <>
                <div className="text-gray-300">按下「開始{isChineseLesson ? '學習' : '面試'}」以啟用音訊並開始</div>
                <button onClick={handleStart} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">
                  開始{isChineseLesson ? '學習' : '面試'}
                </button>
              </>
            ) : countdown !== null ? (
              <>
                <div className="text-6xl font-bold text-blue-400 mb-4">{countdown}</div>
                <div className="text-lg font-semibold text-white">面試即將開始</div>
                <div className="text-gray-300">請準備好，面試即將開始</div>
              </>
            ) : (
              <>
                {!flow.isConfigReady && (
                  <>
                    <div className="text-lg font-semibold text-white">載入面試設定中...</div>
                    <div className="text-gray-300">請稍候，正在取得題目與播放模式</div>
                  </>
                )}
                {flow.isConfigReady && flow.playbackMode === 'tts' && !flow.firstAudioReady && (
                  <>
                    <div className="text-lg font-semibold text-white">面試即將開始...</div>
                    <div className="text-gray-300">正在準備第一題的語音...</div>
                  </>
                )}
                {flow.isConfigReady && flow.playbackMode === 'video' && flow.videoPreloadedCount < flow.videoPreloadGoal && (
                  <>
                    <div className="text-lg font-semibold text-white">面試即將開始...</div>
                    <div className="text-gray-300">正在預載影片...</div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* 面試結束覆蓋層 */}
      {flow.isFinished && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/90 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="text-xl font-semibold text-white">{isChineseLesson ? '課程結束' : '面試結束'}</div>
            <div className="text-gray-300">辛苦了！可以前往分析頁面查看建議。</div>
            <div className="flex gap-3">
              <a href="/dashboard" className="px-4 py-2 rounded-lg bg-gray-600 text-white text-sm font-medium hover:bg-gray-700">返回首頁</a>
              <a href={`/analysis?sessionId=${encodeURIComponent(flow.sessionId)}&type=${encodeURIComponent(type)}`} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">查看分析</a>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Panel - Actions */}
      {/* <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <ActionPane />
      </div> */}
      
      {/* Voice Dock */}
      <VoiceDock />


      
    </div>
  )
}
