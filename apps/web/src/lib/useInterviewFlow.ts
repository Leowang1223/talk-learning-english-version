import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { apiGetQuestions, apiGetLessonContent, apiLog, apiStt, apiTts, apiAnalyze } from './api'
import { ttsPlayer } from './ttsPlayer'
import type { PlaybackStrategy, QuestionData } from './strategies'
import { TTSStrategy } from './strategies/TTSStrategy'
import { VideoStrategy } from './strategies/VideoStrategy'

export type FlowItem = { role: 'system' | 'user'; text: string }

export type QuestionItem = { question: string; answer_hint?: string[]; advice?: string[]; videoPath?: string }

export type LessonStep = {
  teacher: string
  expected_answer: string
  pinyin?: string
  hints?: string[]
  encouragement?: string
}

export type LessonItem = {
  id: string
  title: string
  description?: string
  steps: LessonStep[]
}

export type UseInterviewFlowOptions = {
  interviewType?: string
}

// 移除瀏覽器 TTS 備援，僅使用 Gemini 產生之音頻

export function useInterviewFlow(options?: UseInterviewFlowOptions) {
  const { interviewType = 'self_intro' } = options || {}

  const [sessionId] = useState<string>(() => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
  const [questions, setQuestions] = useState<QuestionItem[]>([])
  const [lessons, setLessons] = useState<LessonItem[]>([])
  const [currentLessonIndex, setCurrentLessonIndex] = useState<number>(-1)
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1)
  const [currentIndex, setCurrentIndex] = useState<number>(-1)
  const [items, setItems] = useState<FlowItem[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isPreparingAudio, setIsPreparingAudio] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const [currentVideo, setCurrentVideo] = useState<HTMLVideoElement | null>(null)
  const [playbackMode, setPlaybackMode] = useState<'video' | 'tts' | undefined>(undefined)
  const [isRetrying, setIsRetrying] = useState(false) // 新增：重試狀態
  
  // 儲存每題的最後一次錄音數據（用於最終報表）
  const lastRecordingsRef = useRef<Map<number, { text: string; score: number }>>(new Map())
  
  // 計時數據儲存（state 用於 UI、ref 用於同步存取避免 setState 延遲）
  const [timingData, setTimingData] = useState<Map<number, { thinkingTime: number; answeringTime: number }>>(new Map())
  const timingDataRef = useRef<Map<number, { thinkingTime: number; answeringTime: number }>>(new Map())

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recordMimeRef = useRef<string>('')
  // 簡單的音頻快取：僅保留當前題與下一題，避免佔用太多記憶體
  const audioCacheRef = useRef<Map<number, { base64: string; mime: string }>>(new Map())
  // 防止重複啟動與併發載入
  const isLoadingRef = useRef<boolean>(false)
  // 就緒狀態：TTS 第一題音頻、影片預載數
  const [firstAudioReady, setFirstAudioReady] = useState(false)
  const [videoPreloadedCount, setVideoPreloadedCount] = useState(0)
  const preparedVideoIndexesRef = useRef<Set<number>>(new Set())
  const videoPreloadGoalRef = useRef<number>(1)

  useEffect(() => {
    console.log('[Flow] hook mounted, interviewType=', interviewType, 'sessionId=', sessionId)
    ;(async () => {
      try {
        console.log('[Flow] 開始呼叫 apiGetQuestions...')
        const resp = await apiGetQuestions(interviewType) as any
        console.log('[Flow] API 回應:', resp)
        
        // 检查是否有 lessons 数据（中文学习模式）
        if (resp.lessons && Array.isArray(resp.lessons)) {
          console.log('[Flow] 檢測到 lessons 格式，使用中文學習模式')
          const lessonList: LessonItem[] = resp.lessons.map((lesson: any) => ({
            id: lesson.id,
            title: lesson.title,
            description: lesson.description,
            steps: lesson.steps || []
          }))
          console.log('[Flow] lessons preloaded:', lessonList.length, 'playbackMode from API:', resp?.playbackMode)
          setLessons(lessonList)
          setQuestions([]) // 清空传统问题
        } else {
          // 传统面试模式
          console.log('[Flow] 使用傳統面試模式')
          const list: QuestionItem[] = Array.isArray(resp?.questions)
            ? resp.questions.map((q: any, idx: number) => {
                if (typeof q === 'string') return { question: q } as QuestionItem
                const base = { question: q.question, answer_hint: q.answer_hint, advice: q.advice } as QuestionItem
                if (typeof q.videoPath === 'string') (base as any).videoPath = q.videoPath
                return base
              })
            : []
          console.log('[Flow] questions preloaded:', list.length, 'playbackMode from API:', resp?.playbackMode)
          setQuestions(list)
          setLessons([]) // 清空 lessons
        }
        
        console.log('[Flow] API 回應中的 playbackMode:', resp?.playbackMode)
        if (resp?.playbackMode === 'video' || resp?.playbackMode === 'tts') {
          console.log('[Flow]  使用 API 回傳的 playbackMode:', resp.playbackMode)
          setPlaybackMode(resp.playbackMode)
        } else {
          console.log('[Flow]  API 沒有回傳有效的 playbackMode:', resp?.playbackMode)
          // 臨時解決方案：如果 API 沒有返回 playbackMode，根據題目內容判斷
          const hasVideoPath = (resp.lessons && resp.lessons.some((l: any) => l.steps?.some((s: any) => s.videoPath))) ||
                               (resp.questions && resp.questions.some((q: any) => q.videoPath))
          const defaultMode = hasVideoPath ? 'video' : 'tts'
          console.log('[Flow]  使用自動判斷的 playbackMode:', defaultMode, '(因為題目', hasVideoPath ? '有' : '沒有', 'videoPath)')
          setPlaybackMode(defaultMode)
        }
        // 重置就緒狀態
        setFirstAudioReady(false)
        setVideoPreloadedCount(0)
        preparedVideoIndexesRef.current.clear()
            } catch (e) {
        console.error('[Flow] preload questions/lessons failed:', e)
        console.error('[Flow] 錯誤詳情:', {
          message: (e as Error)?.message,
          stack: (e as Error)?.stack,
          name: (e as Error)?.name
        })
      }
    })()
  }, [interviewType, sessionId])

  const loadQuestions = useCallback(async (): Promise<{ list: QuestionItem[]; lessons: LessonItem[]; mode: 'video' | 'tts' | undefined }> => {
    const resp = await apiGetQuestions(interviewType) as any
    
    let questionsList: QuestionItem[] = []
    let lessonsList: LessonItem[] = []
    
    // 检查是否有 lessons 数据（中文学习模式）
    if (resp.lessons && Array.isArray(resp.lessons)) {
      lessonsList = resp.lessons.map((lesson: any) => ({
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        steps: lesson.steps || []
      }))
    } else {
      // 传统面试模式
      questionsList = Array.isArray(resp?.questions)
        ? resp.questions.map((q: any, idx: number) => {
            if (typeof q === 'string') return { question: q } as QuestionItem
            const base = { question: q.question, answer_hint: q.answer_hint, advice: q.advice } as QuestionItem
            if (typeof q.videoPath === 'string') (base as any).videoPath = q.videoPath
            return base
          })
        : []
    }
    
    const mode: 'video' | 'tts' | undefined = (resp?.playbackMode === 'video' || resp?.playbackMode === 'tts') ? resp.playbackMode : undefined
    console.log('[Flow] loadQuestions -> questions:', questionsList.length, 'lessons:', lessonsList.length, 'mode=', mode)
    // 同步更新狀態，但啟動決策請以本地回傳值為準，避免 setState 延遲
    setQuestions(questionsList)
    setLessons(lessonsList)
    if (mode) setPlaybackMode(mode)
    return { list: questionsList, lessons: lessonsList, mode }
  }, [interviewType])

  const loadLessonContent = useCallback(async (lessonId: string): Promise<LessonItem | null> => {
    try {
      const lessonData = await apiGetLessonContent(interviewType, lessonId)
      const lesson: LessonItem = {
        id: lessonData.id,
        title: lessonData.title,
        description: lessonData.description,
        steps: lessonData.steps || []
      }
      console.log('[Flow] loadLessonContent ->', lessonId, 'steps:', lesson.steps.length)
      return lesson
    } catch (error) {
      console.error('[Flow] loadLessonContent failed:', error)
      return null
    }
  }, [interviewType])

  const appendSystem = useCallback((text: string) => {
    setItems(prev => prev.concat({ role: 'system', text }))
  }, [])
  const appendUser = useCallback((text: string) => {
    setItems(prev => prev.concat({ role: 'user', text }))
  }, [])

  // 更新計時數據
  const updateTimingData = useCallback((questionIndex: number, thinkingTime: number, answeringTime: number) => {
    // 先更新 ref，確保後續立即可讀
    const nextMap = new Map(timingDataRef.current)
    nextMap.set(questionIndex, { thinkingTime, answeringTime })
    timingDataRef.current = nextMap
    // 再同步到 state（供可能的 UI 顯示使用）
    setTimingData(nextMap)
    try {
      console.log('[Flow] updateTimingData -> index=', questionIndex, 'thinkingTime=', thinkingTime, 'answeringTime=', answeringTime)
    } catch {}
  }, [])

  // 保存完整面試記錄到後端
  const saveCompleteInterview = useCallback(async (finalItems: FlowItem[]) => {
    console.log('[Flow] 開始保存完整面試記錄...')
    try { console.log('[Flow] timingData snapshot:', Array.from(timingData.entries())) } catch {}
    try { console.log('[Flow] timingDataRef snapshot:', Array.from(timingDataRef.current.entries())) } catch {}
    
    try {
      // 將記憶體中的對話記錄轉換為後端格式
      const interviewData: any[] = []
      let currentQuestionIndex = -1
      
      for (let i = 0; i < finalItems.length; i++) {
        const item = finalItems[i]
        
        if (item.role === 'system') {
          // 系統問題
          currentQuestionIndex++
          const entry: any = {
            index: currentQuestionIndex,
            question: item.text,
            askedAt: new Date().toISOString()
          }
          
          // 添加計時數據
          const timing = timingDataRef.current.get(currentQuestionIndex)
          if (timing) {
            entry.thinkingTime = timing.thinkingTime
            entry.answeringTime = timing.answeringTime
          }
          
          // 計算 lesson_id 和 step_id
          let globalIndex = 0
          for (let lessonIdx = 0; lessonIdx < lessons.length; lessonIdx++) {
            const lesson = lessons[lessonIdx]
            if (lesson.steps) {
              for (let stepIdx = 0; stepIdx < lesson.steps.length; stepIdx++) {
                if (globalIndex === currentQuestionIndex) {
                  entry.lesson_id = lesson.id
                  entry.step_id = stepIdx
                  // 添加最後錄音的評分數據
                  const lastRecording = lastRecordingsRef.current.get(currentQuestionIndex)
                  if (lastRecording) {
                    entry.final_score = lastRecording.score
                  }
                  break
                }
                globalIndex++
              }
              if (entry.lesson_id) break
            }
          }
          
          interviewData.push(entry)
        } else if (item.role === 'user') {
          // 用戶回答
          if (currentQuestionIndex >= 0) {
            const existingEntry = interviewData.find(entry => entry.index === currentQuestionIndex)
            if (existingEntry) {
              existingEntry.answer = item.text
              existingEntry.answeredAt = new Date().toISOString()
              // 確保合併答案時也帶入計時數據和評分
              const timing = timingDataRef.current.get(currentQuestionIndex)
              console.log('[Flow] 合併答案時的 timing 數據:', { currentQuestionIndex, timing })
              if (timing) {
                existingEntry.thinkingTime = timing.thinkingTime
                existingEntry.answeringTime = timing.answeringTime
              }
              // 添加最後錄音的評分數據
              const lastRecording = lastRecordingsRef.current.get(currentQuestionIndex)
              if (lastRecording) {
                existingEntry.final_score = lastRecording.score
              }
            } else {
              // 如果沒有對應的問題，創建一個新的回答記錄
              const entry: any = {
                index: currentQuestionIndex,
                answer: item.text,
                answeredAt: new Date().toISOString()
              }
              
              // 添加計時數據
              const timing = timingDataRef.current.get(currentQuestionIndex)
              if (timing) {
                entry.thinkingTime = timing.thinkingTime
                entry.answeringTime = timing.answeringTime
              }
              
              // 計算 lesson_id 和 step_id
              let globalIndex = 0
              for (let lessonIdx = 0; lessonIdx < lessons.length; lessonIdx++) {
                const lesson = lessons[lessonIdx]
                if (lesson.steps) {
                  for (let stepIdx = 0; stepIdx < lesson.steps.length; stepIdx++) {
                    if (globalIndex === currentQuestionIndex) {
                      entry.lesson_id = lesson.id
                      entry.step_id = stepIdx
                      // 添加最後錄音的評分數據
                      const lastRecording = lastRecordingsRef.current.get(currentQuestionIndex)
                      if (lastRecording) {
                        entry.final_score = lastRecording.score
                      }
                      break
                    }
                    globalIndex++
                  }
                  if (entry.lesson_id) break
                }
              }
              
              interviewData.push(entry)
            }
          }
        }
      }
      
      // 標記面試完成
      if (interviewData.length > 0) {
        const lastEntry = interviewData[interviewData.length - 1]
        lastEntry.completed = true
      }
      
      console.log('[Flow] 準備保存的數據:', interviewData)
      
      // 一次性保存所有數據
      for (const entry of interviewData) {
        try {
          try { console.log('[Flow] apiLog payload ->', { index: entry.index, question: entry.question, hasAnswer: typeof entry.answer === 'string', thinkingTime: entry.thinkingTime, answeringTime: entry.answeringTime, completed: entry.completed, lesson_id: entry.lesson_id, step_id: entry.step_id, final_score: entry.final_score }) } catch {}
          await apiLog({ 
            sessionId, 
            index: entry.index, 
            question: entry.question,
            answer: entry.answer,
            completed: entry.completed,
            thinkingTime: entry.thinkingTime,
            answeringTime: entry.answeringTime,
            lesson_id: entry.lesson_id,
            step_id: entry.step_id,
          })
        } catch (error) {
          console.warn('[Flow] 保存單個記錄失敗:', error)
        }
      }
      
      console.log('[Flow] 完整面試記錄保存完成')
    } catch (error) {
      console.error('[Flow] 保存完整面試記錄失敗:', error)
    }
  }, [sessionId, lessons])

  // 共用的資源清理函數（同步版本，用於 beforeunload）
  const cleanupResources = useCallback(() => {
    console.log('[Flow] 開始清理資源')
    
    // 停止錄音
    if (isRecording && mediaRecorderRef.current) {
      try {
        mediaRecorderRef.current.stop()
      } catch (e) {
        console.warn('[Flow] 停止錄音時發生錯誤:', e)
      }
    }
    
    // 清理音頻快取
    audioCacheRef.current.clear()
    
    // 停止當前影片播放
    if (currentVideo) {
      try {
        currentVideo.pause()
        currentVideo.currentTime = 0
      } catch (e) {
        console.warn('[Flow] 停止影片播放時發生錯誤:', e)
      }
    }
    
    // 清理 MediaStream
    if (mediaRecorderRef.current?.stream) {
      try {
        const stream = mediaRecorderRef.current.stream
        stream.getTracks().forEach(track => {
          try { track.stop() } catch {}
        })
      } catch (e) {
        console.warn('[Flow] 清理 MediaStream 時發生錯誤:', e)
      }
    }
    
    // 清理影片快取
    preparedVideoIndexesRef.current.clear()
    
    console.log('[Flow] 資源清理完成')
  }, [isRecording, currentVideo])

  // ===== Strategies =====
  const ttsStrategy = useMemo(() => new TTSStrategy(), [])
  const videoStrategy = useMemo(() => new VideoStrategy(), [])

  const pickStrategy = useCallback((i: number): PlaybackStrategy => {
    if (playbackMode === 'video') return videoStrategy
    if (playbackMode === 'tts') return ttsStrategy
    // fallback: default to TTS if unknown
    return ttsStrategy
  }, [playbackMode, ttsStrategy, videoStrategy])

  // 背景預載（全域 video 模式）：在取得題目後預載第 1～3 題
  useEffect(() => {
    if (playbackMode !== 'video') return
    if (!questions || questions.length === 0) return
    const maxPreload = Math.min(3, questions.length)
    ;(async () => {
      for (let i = 0; i < maxPreload; i++) {
        if (preparedVideoIndexesRef.current.has(i)) continue
        const q = questions[i]
        try {
          await videoStrategy.prepareQuestion(i, { question: q.question, playbackType: 'video', videoPath: q.videoPath })
          preparedVideoIndexesRef.current.add(i)
          setVideoPreloadedCount(preparedVideoIndexesRef.current.size)
        } catch {}
      }
    })()
  }, [playbackMode, questions, videoStrategy])

  // 預先準備某題的 TTS 音頻，但不播放
  const prepareQuestionAudio = useCallback(async (i: number) => {
    if (i < 0 || i >= questions.length) return
    if (audioCacheRef.current.has(i)) return
    const text = questions[i]?.question
    try {
      console.log(' 預取第', i + 1, '題 TTS...')
      const tts = await apiTts(text)
      if (tts && tts.audioBase64) {
        // 僅保留至多兩筆：當前與下一題
        if (audioCacheRef.current.size >= 2) {
          const smallestKey = Math.min(...Array.from(audioCacheRef.current.keys()))
          audioCacheRef.current.delete(smallestKey)
        }
        audioCacheRef.current.set(i, { base64: tts.audioBase64, mime: tts.mime })
        if (i === 0) setFirstAudioReady(true)
        console.log(' 預取完成 第', i + 1, '題, cacheSize=', audioCacheRef.current.size)
      }
    } catch (e) {
      console.warn(' 預取失敗 第', i + 1, '題:', e)
    }
  }, [questions])

  // 播放指定題目（若快取命中則即時播放，否則現取）
  const playQuestion = useCallback(async (i: number) => {
    if (i < 0 || i >= questions.length) return
    setCurrentIndex(i)
    const text = questions[i]?.question
    
    console.log(' 開始播放第', i + 1, '題:', text);
    appendSystem(text)
    setIsPlaying(true)
    
    try {
      setIsPreparingAudio(true)
      const strategy = pickStrategy(i)
      // Back-compat: keep existing audio caching for TTSStrategy only
      if (strategy instanceof TTSStrategy) {
        let base64: string | null = null
        let mime: string | undefined = undefined
        const cached = audioCacheRef.current.get(i)
        if (cached) {
          console.log(' 命中快取 第', i + 1, '題')
          base64 = cached.base64
          mime = cached.mime
          setIsPreparingAudio(false)
          console.log(' 音頻就緒, MIME:', mime, 'len:', base64?.length)
          console.log(' 開始播放音頻...');
          await ttsPlayer.enqueueBase64Audio(base64!, mime)
          console.log(' 音頻已加入播放隊列');
        } else {
          console.log(' 呼叫 TTS API...')
          const tts = await apiTts(text)
          if (!tts || !tts.audioBase64) throw new Error('empty tts')
          base64 = tts.audioBase64
          mime = tts.mime
          audioCacheRef.current.set(i, { base64, mime })
          setIsPreparingAudio(false)
          console.log(' 音頻就緒, MIME:', mime, 'len:', base64?.length)
          console.log(' 開始播放音頻...');
          await ttsPlayer.enqueueBase64Audio(base64!, mime)
          console.log(' 音頻已加入播放隊列');
        }
      } else {
        // Video strategy path
        if (strategy instanceof VideoStrategy) {
          const prepared = (strategy as VideoStrategy).getPreparedVideo(i)
          if (prepared) setCurrentVideo(prepared)
        }
        console.log(' 開始播放影片...')
        await strategy.playQuestion(i, { question: text, playbackType: 'video', videoPath: questions[i]?.videoPath })
        // 更新當前影片狀態
        if (strategy instanceof VideoStrategy) {
          setCurrentVideo(strategy.getCurrentVideo())
        }
        console.log(' 影片播放完成')
      }
      // 立即在播放完成時觸發，避免額外延遲
      setTimeout(async () => {
        setIsPlaying(false)
        console.log(' 播放結束，錄音按鈕已啟用');
        try { await ttsPlayer.playBeep(1200, 180, 0.35, 2, 80) } catch {}
      }, 10)

      // 背景預取下一題
      const next = i + 1
      if (next < questions.length) {
        const nextQ = questions[next]
        const nextStrategy = pickStrategy(next)
        if (nextStrategy instanceof TTSStrategy) {
          void prepareQuestionAudio(next)
        } else {
          void nextStrategy.prepareQuestion(next, { question: nextQ.question, playbackType: 'video', videoPath: nextQ.videoPath })
        }
      }
    } catch (error) {
      console.error(' TTS 播放失敗（不使用瀏覽器備援）:', error);
      setIsPlaying(false)
      setIsPreparingAudio(false)
    }
  }, [appendSystem, apiTts, questions, sessionId, prepareQuestionAudio, pickStrategy])

  // 播放指定 lesson step
  const playLessonStep = useCallback(async (lessonIndex: number, stepIndex: number) => {
    if (lessonIndex < 0 || lessonIndex >= lessons.length) return
    const lesson = lessons[lessonIndex]
    if (stepIndex < 0 || stepIndex >= lesson.steps.length) return

    const step = lesson.steps[stepIndex]
    const globalIndex = lessonIndex * 100 + stepIndex // 简单的全局索引计算

    setCurrentIndex(globalIndex)
    setCurrentLessonIndex(lessonIndex)
    setCurrentStepIndex(stepIndex)

    console.log(`🎯 開始播放第 ${lessonIndex + 1} 課第 ${stepIndex + 1} 步:`, step.teacher)
    appendSystem(step.teacher)
    setIsPlaying(true)

    try {
      setIsPreparingAudio(true)

      if (playbackMode === 'tts') {
        let base64: string | null = null
        let mime: string | undefined = undefined
        const cached = audioCacheRef.current.get(globalIndex)

        if (cached) {
          console.log(`📦 命中快取 第 ${lessonIndex + 1} 課第 ${stepIndex + 1} 步`)
          base64 = cached.base64
          mime = cached.mime
          setIsPreparingAudio(false)
          console.log('✅ 音頻就緒, MIME:', mime, 'len:', base64?.length)
          console.log('🔊 開始播放音頻...')
          await ttsPlayer.enqueueBase64Audio(base64!, mime)
          console.log('🎵 音頻已加入播放隊列')
        } else {
          console.log('🎤 呼叫 TTS API...')
          const tts = await apiTts(step.teacher)
          if (!tts || !tts.audioBase64) throw new Error('empty tts')
          base64 = tts.audioBase64
          mime = tts.mime
          audioCacheRef.current.set(globalIndex, { base64, mime })
          setIsPreparingAudio(false)
          console.log('✅ 音頻就緒, MIME:', mime, 'len:', base64?.length)
          console.log('🔊 開始播放音頻...')
          await ttsPlayer.enqueueBase64Audio(base64!, mime)
          console.log('🎵 音頻已加入播放隊列')
        }
      } else {
        // Video mode - 暂时不支持 lesson 的 video
        console.log('🎬 Video mode for lessons not implemented yet')
        setIsPreparingAudio(false)
      }

      // 立即在播放完成时触发
      setTimeout(async () => {
        setIsPlaying(false)
        console.log('⏹️ 播放結束，錄音按鈕已啟用')
        try { await ttsPlayer.playBeep(1200, 180, 0.35, 2, 80) } catch {}
      }, 10)

      // 背景预取下一步
      const nextStepIndex = stepIndex + 1
      if (nextStepIndex < lesson.steps.length) {
        // 同一课的下一步
        const nextStep = lesson.steps[nextStepIndex]
        const nextGlobalIndex = lessonIndex * 100 + nextStepIndex
        if (playbackMode === 'tts' && !audioCacheRef.current.has(nextGlobalIndex)) {
          console.log(`📦 預取第 ${lessonIndex + 1} 課第 ${nextStepIndex + 1} 步 TTS...`)
          const tts = await apiTts(nextStep.teacher)
          if (tts && tts.audioBase64) {
            audioCacheRef.current.set(nextGlobalIndex, { base64: tts.audioBase64, mime: tts.mime })
          }
        }
      } else {
        // 下一课的第一步
        const nextLessonIndex = lessonIndex + 1
        if (nextLessonIndex < lessons.length) {
          const nextLesson = lessons[nextLessonIndex]
          const nextStep = nextLesson.steps[0]
          const nextGlobalIndex = nextLessonIndex * 100
          if (playbackMode === 'tts' && !audioCacheRef.current.has(nextGlobalIndex)) {
            console.log(`📦 預取第 ${nextLessonIndex + 1} 課第 1 步 TTS...`)
            const tts = await apiTts(nextStep.teacher)
            if (tts && tts.audioBase64) {
              audioCacheRef.current.set(nextGlobalIndex, { base64: tts.audioBase64, mime: tts.mime })
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Lesson step 播放失敗:', error)
      setIsPlaying(false)
      setIsPreparingAudio(false)
    }
  }, [appendSystem, apiTts, lessons, playbackMode])

  const startInterview = useCallback(async () => {
    if (isLoadingRef.current) {
      console.log(' 面試啟動進行中，忽略重複請求')
      return
    }
    isLoadingRef.current = true
    console.log(' 開始面試流程...')
    setIsFinished(false)

    try {
      // 以本地變數確保資料就緒，避免依賴 setState 時序
      let localList = questions
      let localLessons = lessons
      let localMode = playbackMode
      if (localList.length === 0 && localLessons.length === 0 || localMode === undefined) {
        console.log(' 載入面試題目與播放模式...')
        const { list, lessons: loadedLessons, mode } = await loadQuestions()
        localList = list
        localLessons = loadedLessons
        localMode = mode
        console.log(' 題目載入完成，共', localList.length, '題;', localLessons.length, '課; mode=', localMode)
      }

      console.log(' 解鎖音頻播放器...')
      await ttsPlayer.unlock()

      // 準備第一題或第一課第一步
      setCurrentIndex(0)
      setIsPreparingAudio(true)

      if (localLessons.length > 0) {
        // 中文學習模式：開始第一課第一步
        setCurrentLessonIndex(0)
        setCurrentStepIndex(0)
        const firstLesson = localLessons[0]
        const firstStep = firstLesson.steps[0]

        if (localMode === 'tts') {
          try {
            if (!audioCacheRef.current.has(0)) {
              console.log(' 預取第 1 課第 1 步 TTS...')
              const tts = await apiTts(firstStep.teacher)
              if (tts && tts.audioBase64) {
                audioCacheRef.current.set(0, { base64: tts.audioBase64, mime: tts.mime })
              }
            }
            setFirstAudioReady(true)
          } finally {
            setIsPreparingAudio(false)
          }
        } else {
          // Video mode - 暂时不支持 lesson 的 video
          setIsPreparingAudio(false)
        }
      } else {
        // 傳統面試模式
        const firstQ = localList[0]
        const firstStrategy: PlaybackStrategy = ((): PlaybackStrategy => {
          if (localMode === 'video') return videoStrategy
          if (localMode === 'tts') return ttsStrategy
          // 未明確指定時，依題目是否含 videoPath 判斷
          return firstQ?.videoPath ? videoStrategy : ttsStrategy
        })()

        if (firstStrategy instanceof TTSStrategy) {
          try {
            // 直接以本地題目文字預取，避免依賴 state.questions
            if (!audioCacheRef.current.has(0)) {
              console.log(' 預取第 1 題 TTS(本地)...')
              const tts = await apiTts(firstQ.question)
              if (tts && tts.audioBase64) {
                audioCacheRef.current.set(0, { base64: tts.audioBase64, mime: tts.mime })
              }
            }
            setFirstAudioReady(true)
          } finally {
            setIsPreparingAudio(false)
          }
        } else {
          await firstStrategy.prepareQuestion(0, { question: firstQ.question, playbackType: 'video', videoPath: firstQ.videoPath })
          preparedVideoIndexesRef.current.add(0)
          setVideoPreloadedCount(preparedVideoIndexesRef.current.size)
          const prepared = videoStrategy.getPreparedVideo(0)
          if (prepared) setCurrentVideo(prepared)
          setIsPreparingAudio(false)
        }
      }
    } catch (err) {
      console.error(' 面試啟動失敗:', err)
      setIsPreparingAudio(false)
    } finally {
      isLoadingRef.current = false
    }
  }, [loadQuestions, questions, lessons, playbackMode, ttsStrategy, videoStrategy])

  useEffect(() => {
    console.log('[Flow] state:', { currentIndex, currentLessonIndex, currentStepIndex, isPlaying, isRecording, qLen: questions.length, lLen: lessons.length, itemsLen: items.length })
  }, [currentIndex, currentLessonIndex, currentStepIndex, isPlaying, isRecording, questions.length, lessons.length, items.length])

  const startRecording = useCallback(async () => {
    if (isPlaying) return
    if (isRecording) return
    const stream: MediaStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
    // 選擇最適合的音訊格式（優先 opus）
    let preferredMime = ''
    if (typeof MediaRecorder !== 'undefined') {
      if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        preferredMime = 'audio/webm;codecs=opus'
      } else if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('audio/webm')) {
        preferredMime = 'audio/webm'
      } else if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        preferredMime = 'audio/ogg;codecs=opus'
      }
    }
    recordMimeRef.current = preferredMime
    const mr = preferredMime ? new MediaRecorder(stream, { mimeType: preferredMime }) : new MediaRecorder(stream)
    chunksRef.current = []
    mr.ondataavailable = ev => { if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data) }
    mr.onstop = () => {
      const tracks: MediaStreamTrack[] = stream.getTracks()
      for (const track of tracks) {
        try { track.stop() } catch {}
      }
      mediaRecorderRef.current = null
    }
    mediaRecorderRef.current = mr
    mr.start()
    setIsRecording(true)
  }, [isPlaying, isRecording])

  const stopRecording = useCallback(async () => {
    if (!isRecording) return
    const mr = mediaRecorderRef.current
    setIsRecording(false)
    // 停止並等待 stop 事件，確保最後一個資料片段已推入
    if (mr) {
      const stopped = new Promise<void>((resolve) => {
        const handler = () => {
          try { mr.removeEventListener('stop', handler as any) } catch {}
          resolve()
        }
        try { mr.addEventListener('stop', handler as any, { once: true } as any) } catch { resolve() }
      })
      const timeout = new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 1500))
      // 先發出 stop 指令，再等待 onstop 或超時
      try { mr.stop() } catch {}
      const result = await Promise.race([stopped, timeout])
      if (result === 'timeout') {
        console.warn('[Flow] MediaRecorder.stop() 超時，強制清理麥克風資源')
        // 強制保險：關閉所有 tracks 並清空參考
        try {
          const stream = mr.stream
          if (stream) {
            const tracks: MediaStreamTrack[] = stream.getTracks()
            for (const track of tracks) {
              try { track.stop() } catch {}
            }
          }
        } catch {}
        mediaRecorderRef.current = null
      }
    }
    console.log('[Flow] 錄音停止，chunks 數量:', chunksRef.current.length)
    
    // 檢查是否有錄音資料
    if (chunksRef.current.length === 0) {
      console.error('[Flow] 沒有錄音資料！')
      return
    }
    
    const typeHint = recordMimeRef.current || 'audio/webm'
    const blob = new Blob(chunksRef.current, { type: typeHint })
    console.log('[Flow] Blob 建立完成，type:', blob.type, 'size:', blob.size, 'bytes')
    
    const ab = await blob.arrayBuffer()
    console.log('[Flow] ArrayBuffer 大小:', ab.byteLength, 'bytes')
    
    // Convert ArrayBuffer to base64 using a more compatible method
    const uint8Array = new Uint8Array(ab)
    let binary = ''
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i])
    }
    const base64 = btoa(binary)
    console.log('[Flow] Base64 轉換完成，長度:', base64.length, 'chars')
    
    // 檢查 base64 是否為空
    if (!base64 || base64.length === 0) {
      console.error('[Flow] Base64 轉換失敗！')
      return
    }
    
    const mimeToSend = blob.type || typeHint
    console.log('[Flow] STT upload mime =', mimeToSend, 'size=', chunksRef.current.reduce((s, b) => s + b.size, 0))
    console.log('[Flow] 準備呼叫 STT API，base64 前 100 字元:', base64.substring(0, 100))
    const { text } = await apiStt(base64, mimeToSend)
    appendUser(text)
    // 清空錄音緩衝，釋放記憶體
    chunksRef.current = []
    
    // 處理下一題或下一步
    if (lessons.length > 0) {
      // 中文學習模式：處理 lesson steps + 評分
      const currentLesson = lessons[currentLessonIndex]
      const currentStep = currentLesson.steps[currentStepIndex]
      
      // 調用 API 進行評分
      try {
        console.log('[Flow] 開始評估錄音答案...')
        const analyzePayload = {
          sessionId,
          interviewType,
          items: [{
            index: currentIndex,
            question: currentStep.teacher,
            answer: text,
            lessonId: currentLesson.id,
            stepId: currentStepIndex,
            expectedAnswer: currentStep.expected_answer
          }]
        }
        
        const analysisResult = await apiAnalyze(analyzePayload)
        console.log('[Flow] 評估結果:', analysisResult)
        
        // 取得總分
        const perQuestion = analysisResult?.perQuestion || []
        const currentScore = perQuestion[0]?.score?.overall || 0
        
        console.log('[Flow] 當前題目得分:', currentScore)
        
        // 儲存最後一次錄音數據
        lastRecordingsRef.current.set(currentIndex, { text, score: currentScore })
        
        // 判斷是否通過（75 分）
        const PASS_THRESHOLD = 75
        if (currentScore >= PASS_THRESHOLD) {
          // 通過，進入下一題
          console.log('[Flow] ✅ 通過！進入下一題')
          setIsRetrying(false)
          
          const nextStepIndex = currentStepIndex + 1
          
          if (nextStepIndex < currentLesson.steps.length) {
            // 同一課的下一歩
            setCurrentStepIndex(nextStepIndex)
            setCurrentIndex(currentIndex + 1)
            // 播放下一歩
            await playLessonStep(currentLessonIndex, nextStepIndex)
          } else {
            // 下一課的第一歩
            const nextLessonIndex = currentLessonIndex + 1
            if (nextLessonIndex < lessons.length) {
              setCurrentLessonIndex(nextLessonIndex)
              setCurrentStepIndex(0)
              setCurrentIndex(currentIndex + 1)
              // 播放下一課的第一歩
              await playLessonStep(nextLessonIndex, 0)
            } else {
              // 所有課程完成
              console.log('[Flow] 所有課程已完成，準備生成報表')
              const finalItems = items.concat({ role: 'user', text })
              
              // 調用 analysis API 生成完整報表
              try {
                const allSteps: any[] = []
                let stepIndex = 0
                
                // 收集所有課程步驟的問答
                for (let lessonIdx = 0; lessonIdx < lessons.length; lessonIdx++) {
                  const lesson = lessons[lessonIdx]
                  for (let sIdx = 0; sIdx < lesson.steps.length; sIdx++) {
                    const step = lesson.steps[sIdx]
                    // 找到對應的使用者回答
                    const userAnswer = finalItems.find((item, idx) => 
                      item.role === 'user' && 
                      finalItems[idx - 1]?.role === 'system' && 
                      finalItems[idx - 1]?.text === step.teacher
                    )
                    
                    // 從最後錄音記錄中取得數據
                    const lastRecording = lastRecordingsRef.current.get(stepIndex)
                    
                    allSteps.push({
                      index: stepIndex,
                      question: step.teacher,
                      answer: userAnswer?.text || lastRecording?.text || '',
                      lessonId: lesson.id,
                      stepId: sIdx,
                      expectedAnswer: step.expected_answer
                    })
                    stepIndex++
                  }
                }
                
                console.log('[Flow] 準備分析的數據:', allSteps)
                
                // 調用 analysis API
                const analysisResult = await apiAnalyze({
                  sessionId,
                  interviewType,
                  items: allSteps
                })
                
                console.log('[Flow] 完整課程分析結果:', analysisResult)
                
                // 保存到後端
                await saveCompleteInterview(finalItems)
              } catch (error) {
                console.error('[Flow] 生成報表失敗:', error)
                // 即使報表生成失敗，仍然保存基本記錄
                await saveCompleteInterview(finalItems)
              }
              
              cleanupResources()
              setIsFinished(true)
            }
          }
        } else {
          // 未通過，重試
          console.log('[Flow] ❌ 未通過（得分:', currentScore, '），重試同一題')
          setIsRetrying(true)
          
          // 延遲 1.5 秒後重新播放題目
          await new Promise(resolve => setTimeout(resolve, 1500))
          
          // 重新播放當前步驟
          await playLessonStep(currentLessonIndex, currentStepIndex)
        }
      } catch (error) {
        console.error('[Flow] 評估失敗:', error)
        // 評估失敗時，仍然繼續下一題（避免卡住）
        setIsRetrying(false)
        const nextStepIndex = currentStepIndex + 1
        
        if (nextStepIndex < currentLesson.steps.length) {
          setCurrentStepIndex(nextStepIndex)
          setCurrentIndex(currentIndex + 1)
          await playLessonStep(currentLessonIndex, nextStepIndex)
        } else {
          const nextLessonIndex = currentLessonIndex + 1
          if (nextLessonIndex < lessons.length) {
            setCurrentLessonIndex(nextLessonIndex)
            setCurrentStepIndex(0)
            setCurrentIndex(currentIndex + 1)
            await playLessonStep(nextLessonIndex, 0)
          } else {
            console.log('[Flow] 所有課程已完成，保存完整記錄')
            const finalItems = items.concat({ role: 'user', text })
            await saveCompleteInterview(finalItems)
            cleanupResources()
            setIsFinished(true)
          }
        }
      }
    } else {
      // 傳統面試模式（無評分機制）
      const next = currentIndex + 1
      if (next < questions.length) {
        // 若下一題已預取則立即播放，否則邊取邊播
        await playQuestion(next)
      } else {
        // 最後一題已回答完成 - 現在才保存完整面試記錄
        // 注意：此處的 items 是 setState 更新前的版本，直接使用它會導致最後一題的回答遺失
        // 因此我們手動將最後的回答加入到 items 的副本中
        console.log('[Flow] 最後一題已回答完成，保存完整面試記錄')
        const finalItems = items.concat({ role: 'user', text })
        await saveCompleteInterview(finalItems)
        
        // 自然結束時也清理資源
        cleanupResources()
        
        setIsFinished(true)
      }
    }
  }, [appendUser, currentIndex, currentLessonIndex, currentStepIndex, questions.length, lessons, sessionId, isRecording, playQuestion, playLessonStep, saveCompleteInterview, cleanupResources, items, interviewType])

  const endInterview = useCallback(async () => {
    // 手動結束：只清理資源，不保存數據
    console.log('[Flow] 手動結束面試，清理資源')
    
    // 使用共用的清理函數
    cleanupResources()
    
    // 額外的狀態重置（只在 endInterview 中）
    setIsRecording(false)
    setCurrentVideo(null)
    setIsPlaying(false)
    setIsPreparingAudio(false)
    setFirstAudioReady(false)
    setVideoPreloadedCount(0)
  }, [cleanupResources])

  const isConfigReady = playbackMode !== undefined && (questions.length > 0 || lessons.length > 0)
  const isSessionReady = useMemo(() => {
    if (!isConfigReady) return false
    if (playbackMode === 'tts') return firstAudioReady
    if (playbackMode === 'video') return videoPreloadedCount >= videoPreloadGoalRef.current
    return false
  }, [isConfigReady, playbackMode, firstAudioReady, videoPreloadedCount])

  return useMemo(() => ({
    sessionId,
    questions,
    lessons,
    currentIndex,
    currentLessonIndex,
    currentStepIndex,
    items,
    isPlaying,
    isRecording,
    isPreparingAudio,
    isFinished,
    isRetrying,
    currentVideo,
    playbackMode,
    // readiness flags
    isConfigReady,
    firstAudioReady,
    videoPreloadedCount,
    videoPreloadGoal: videoPreloadGoalRef.current,
    isSessionReady,
    loadQuestions,
    loadLessonContent,
    startInterview,
    playQuestion,
    playLessonStep,
    prepareQuestionAudio,
    startRecording,
    stopRecording,
    endInterview,
    cleanupResources, // 暴露清理函數供 beforeunload 使用
    updateTimingData, // 暴露計時數據更新函數
  }), [
    sessionId,
    questions,
    lessons,
    currentIndex,
    currentLessonIndex,
    currentStepIndex,
    items,
    isPlaying,
    isRecording,
    isPreparingAudio,
    isFinished,
    isRetrying,
    currentVideo,
    playbackMode,
    isConfigReady,
    firstAudioReady,
    videoPreloadedCount,
    isSessionReady,
    loadQuestions,
    loadLessonContent,
    startInterview,
    playQuestion,
    playLessonStep,
    prepareQuestionAudio,
    startRecording,
    stopRecording,
    endInterview,
    cleanupResources,
    updateTimingData
  ])
}
