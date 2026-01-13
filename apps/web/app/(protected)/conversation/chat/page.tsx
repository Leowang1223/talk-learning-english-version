'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Mic, MicOff, PhoneOff, Loader2, AlertCircle } from 'lucide-react'
import { DialogSidebar, type Message, type Suggestion } from '../components/DialogSidebar'
import { InterviewerSelector, getInterviewerImagePath, getInterviewerVoice, getInterviewerEnglishVoice, DEFAULT_INTERVIEWER } from '../../lesson/components/InterviewerSelector'
import ProgressTracker from '../components/ProgressTracker'
import CompletionPrompt from '../components/CompletionPrompt'
import { type ScenarioCheckpoint, apiGetScenarioById, fetchJson, getApiBase } from '@/lib/api'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// TTS utility functions (copied from lesson page)
function removePinyin(text: string): string {
  if (!text) return ''
  return text.replace(/\([^)]*\)/g, '').trim()
}

function convertSymbolsToWords(text: string): string {
  if (!text) return ''
  const symbolMap: Record<string, string> = {
    '%': 'percent',
    '&': 'and',
    '@': 'at',
    '#': 'hashtag number',
    '$': 'dollar',
    '??: 'euro',
    '£': 'pound',
    '¥': 'yen yuan',
    '+': 'plus',
    '=': 'equals',
    '<': 'less than',
    '>': 'greater than',
  }
  return text.replace(/[%&@#$?��??=<>]/g, (match) => ` ${symbolMap[match] || match} `)
}

function removePunctuation(text: string): string {
  if (!text) return ''
  return text.replace(/[，。�?？�?：�?"''?�》【】�?）]/g, ' ').replace(/\s+/g, ' ').trim()
}

interface ConversationSettings {
  interviewerId: string
  enableCamera: boolean
  topicMode: 'selected' | 'all' | 'free' | 'scenario'
  selectedTopics: string[]
  scenarioId?: string
  userRole?: string
}

export default function ConversationChatPage() {
  const router = useRouter()

  // Conversation state
  const [sessionId, setSessionId] = useState<string>('')
  const [messages, setMessages] = useState<Message[]>([])
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Settings
  const [settings, setSettings] = useState<ConversationSettings | null>(null)
  const [currentInterviewer, setCurrentInterviewer] = useState<string>(DEFAULT_INTERVIEWER)
  const [showInterviewerSelector, setShowInterviewerSelector] = useState(false)

  // Recording state
  const [isRecording, setIsRecording] = useState(false)
  const [recordingError, setRecordingError] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  // Video stream
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Scenario mode
  const [scenarioInfo, setScenarioInfo] = useState<{
    scenarioId: string
    title: string
    objective: string
    userRole: string
    aiRole: string
    interviewerImage?: string
  } | null>(null)
  const [checkpoints, setCheckpoints] = useState<ScenarioCheckpoint[]>([])
  const [allCheckpointsCompleted, setAllCheckpointsCompleted] = useState(false)

  // Track if first message needs manual play (for browser autoplay restrictions)
  const [needsManualPlay, setNeedsManualPlay] = useState(false)
  const [firstMessageText, setFirstMessageText] = useState<string | null>(null)

  // Load settings
  useEffect(() => {
    const settingsStr = localStorage.getItem('conversationSettings')
    if (!settingsStr) {
      router.push('/conversation')
      return
    }

    try {
      const loadedSettings: ConversationSettings = JSON.parse(settingsStr)
      setSettings(loadedSettings)
      setCurrentInterviewer(loadedSettings.interviewerId)

      // Initialize camera if enabled
      if (loadedSettings.enableCamera) {
        initializeCamera()
      }

      // Start conversation
      startConversation(loadedSettings)
    } catch (error) {
      console.error('Failed to load settings:', error)
      router.push('/conversation')
    }
  }, [])

  // Initialize camera
  const initializeCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      setVideoStream(stream)

      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (error) {
      console.error('Failed to initialize camera:', error)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop())
      }
    }
  }, [videoStream])

  // Sync video ref with stream
  useEffect(() => {
    if (videoRef.current && videoStream) {
      videoRef.current.srcObject = videoStream
    }
  }, [videoStream])

  // Preload TTS voices on page mount
  useEffect(() => {
    if ('speechSynthesis' in window) {
      console.log('?�� Initializing TTS voice preload...')

      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices()
        if (voices.length > 0) {
          console.log('??TTS voices loaded:', voices.length, 'voices available')
          // Log Chinese voices for debugging
          const chineseVoices = voices.filter(v => v.lang.includes('zh'))
          console.log('?��?�� Chinese voices:', chineseVoices.map(v => v.name).join(', '))
        }
      }

      // Try loading immediately (some browsers have voices ready)
      loadVoices()

      // Listen for the event when voices become available
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices)

      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', loadVoices)
      }
    }
  }, [])

  // Get all available chapter IDs from API
  const getAllAvailableChapterIds = async (): Promise<string[]> => {
    try {
      const response = await fetch(`${getApiBase()}/api/lessons`)
      if (!response.ok) {
        console.error('Failed to fetch lessons from API')
        return []
      }

      const lessons = await response.json()
      const chapterSet = new Set<string>()

      lessons.forEach((lesson: any) => {
        if (lesson.chapterId) {
          chapterSet.add(lesson.chapterId)
        }
      })

      return Array.from(chapterSet).sort((a, b) => {
        const numA = parseInt(a.replace('C', ''))
        const numB = parseInt(b.replace('C', ''))
        return numA - numB
      })
    } catch (error) {
      console.error('Error fetching available chapters:', error)
      return []
    }
  }

  // Get all completed chapter IDs from lesson history
  const getAllCompletedChapterIds = (): string[] => {
    if (typeof window === 'undefined') return []

    try {
      const historyStr = localStorage.getItem('lessonHistory')
      if (!historyStr) return []

      const history: any[] = JSON.parse(historyStr)
      const chapterSet = new Set<string>()

      history.forEach(entry => {
        if (entry.lessonId) {
          let chapterId: string | null = null

          // Handle different lesson ID formats:
          // - New format: "C1-L01" -> extract "C1"
          // - Old format: "L10" -> map to chapter based on lesson number
          if (entry.lessonId.includes('-')) {
            // New format: C1-L01
            chapterId = entry.lessonId.split('-')[0]
          } else if (entry.lessonId.match(/^L(\d+)$/)) {
            // Old format: L10 -> map to C1
            // Assuming L1-L10 = C1, L11-L20 = C2, etc.
            const lessonNum = parseInt(entry.lessonId.replace('L', ''))
            const chapterNum = Math.ceil(lessonNum / 10)
            chapterId = `C${chapterNum}`
          }

          // Only add valid chapter IDs (C1, C2, etc.)
          if (chapterId && chapterId.match(/^C\d+$/)) {
            chapterSet.add(chapterId)
          }
        }
      })

      const chapters = Array.from(chapterSet)
      console.log('Extracted chapter IDs:', chapters)
      return chapters
    } catch (error) {
      console.error('Failed to load completed chapters:', error)
      return []
    }
  }

  // Start conversation with backend
  const startConversation = async (loadedSettings: ConversationSettings) => {
    setIsLoading(true)
    setError(null)

    try {
      // Determine topics to send
      let topics: string[] = []
      if (loadedSettings.topicMode === 'selected') {
        topics = loadedSettings.selectedTopics
      } else if (loadedSettings.topicMode === 'all') {
        // Fetch all available chapters from API
        topics = await getAllAvailableChapterIds()
        console.log('?? All available chapters:', topics)
      }

      const requestBody: any = {
        topics,
        topicMode: loadedSettings.topicMode,
        interviewerId: loadedSettings.interviewerId,
      }

      // Add scenario mode parameters
      if (loadedSettings.topicMode === 'scenario') {
        requestBody.scenarioId = loadedSettings.scenarioId
        requestBody.userRole = loadedSettings.userRole
      }

      // Add review mode parameters
      if (loadedSettings.topicMode === 'all') {
        // �?localStorage 讀?�已完�?課�?清單
        const lessonHistory = JSON.parse(localStorage.getItem('lessonHistory') || '[]')
        const completedLessons = lessonHistory.map((h: any) => h.lessonId)
        requestBody.completedLessons = completedLessons
        console.log('?? Review mode (all): Sending', completedLessons.length, 'completed lessons')
      } else if (loadedSettings.topicMode === 'selected') {
        // �?localStorage 讀?�已完�?課�?清單
        const lessonHistory = JSON.parse(localStorage.getItem('lessonHistory') || '[]')
        const allCompletedLessons = lessonHistory.map((h: any) => h.lessonId)

        // ?�濾?�屬?�選定�?節?�已完�?課�?
        const selectedChaptersSet = new Set(loadedSettings.selectedTopics)
        const completedLessonsInSelectedChapters = allCompletedLessons.filter((lessonId: string) => {
          const chapterId = lessonId.split('-')[0]
          return selectedChaptersSet.has(chapterId)
        })

        requestBody.selectedChapters = loadedSettings.selectedTopics || []
        requestBody.completedLessons = completedLessonsInSelectedChapters
        console.log('?? Review mode (selected): Sending chapters', requestBody.selectedChapters)
        console.log('?? Review mode (selected): Found', completedLessonsInSelectedChapters.length, 'completed lessons in these chapters')
      }

      const data = await fetchJson<{
        sessionId: string
        scenario?: any
        firstMessage?: { chinese: string; english: string }
        suggestions?: any[]
        reviewMode?: any
      }>('/api/conversation/start', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })
      setSessionId(data.sessionId)

      // Set scenario info and checkpoints if in scenario mode
      if (data.scenario) {
        // Fetch full scenario data to get interviewer information
        const scenarioData = await apiGetScenarioById(data.scenario.scenarioId)
        const fullScenario = scenarioData.scenario

        // Find the AI role
        const aiRole = fullScenario.roles.find((r: any) => r.id !== data.scenario.userRole)

        // Auto-set interviewer if AI role has interviewerId
        if (aiRole?.interviewerId) {
          setCurrentInterviewer(aiRole.interviewerId)
          console.log(`?�� Auto-selected interviewer: ${aiRole.interviewerId} for role ${aiRole.id}`)
        }

        setScenarioInfo({
          scenarioId: data.scenario.scenarioId,
          title: data.scenario.title,
          objective: data.scenario.objective,
          userRole: data.scenario.userRole,
          aiRole: data.scenario.aiRole,
          interviewerImage: aiRole?.interviewerImage,
        })
        setCheckpoints(data.scenario.checkpoints)
      }

      // Handle first message - may be null if user speaks first
      if (data.firstMessage) {
        // AI speaks first
        const firstMessage: Message = {
          id: `msg-${Date.now()}`,
          role: 'instructor',
          chinese: data.firstMessage.chinese,
          english: data.firstMessage.english,
          timestamp: new Date(),
        }
        setMessages([firstMessage])

        // Play TTS with dynamic voice detection (English for conversation practice)
        console.log('?�� Preparing to play first message TTS...')
        const englishText: string = firstMessage.english ?? ''
        const playFirstMessageTTS = async () => {
          let attempts = 0
          const maxAttempts = 20  // ?�多�?�?2 �?
          while (attempts < maxAttempts) {
            const voices = window.speechSynthesis.getVoices()
            if (voices.length > 0) {
              console.log('??TTS voices loaded, playing first message')
              playTTS(englishText)
              return
            }
            await new Promise(r => setTimeout(r, 100))
            attempts++
          }

          // 超�?仍播?��?使用默�??�音
          console.warn('?��? TTS voices not ready after 2s, playing with default voice')
          playTTS(englishText)
        }

        playFirstMessageTTS()
      } else {
        // User speaks first - no initial message
        setMessages([])
        console.log('?�� User should speak first')
      }

      // Set initial suggestions
      if (data.suggestions) {
        setSuggestions(data.suggestions)
      }
    } catch (error) {
      console.error('Failed to start conversation:', error)
      setError('?��?對話失�?，�??�試??)
    } finally {
      setIsLoading(false)
    }
  }

  // ?�� 語音?��??�數：智?�選?��?佳英?��???  const findBestEnglishVoice = (
    voices: SpeechSynthesisVoice[],
    englishVoiceConfig: any
  ): SpeechSynthesisVoice | undefined => {
    // 1. 精確?��?首選語音?�稱
    if (englishVoiceConfig.preferredVoiceName) {
      const exact = voices.find(v => v.name === englishVoiceConfig.preferredVoiceName)
      if (exact) {
        console.log(`??Found preferred voice (exact): ${exact.name}`)
        return exact
      }
    }

    // 2. ?��??��?首選語音?�稱
    if (englishVoiceConfig.preferredVoiceName) {
      const parts = englishVoiceConfig.preferredVoiceName.toLowerCase().split(' ')
      const partial = voices.find(v => {
        const nameLower = v.name.toLowerCase()
        return v.lang.startsWith('en') &&
          parts.some(p => p.length > 3 && nameLower.includes(p))
      })
      if (partial) {
        console.log(`??Found preferred voice (partial): ${partial.name}`)
        return partial
      }
    }

    // 3. ?�於?�調?��?語音?�稱（�?依賴 male/female ?�鍵字�?
    const isHighPitch = englishVoiceConfig.pitch >= 1.1
    const genderNames = isHighPitch
      ? ['sara', 'jenny', 'emma', 'michelle', 'aria', 'female', 'woman']
      : ['david', 'guy', 'eric', 'jason', 'male', 'man']

    const pitched = voices.find(v =>
      v.lang.startsWith('en') &&
      genderNames.some(name => v.name.toLowerCase().includes(name))
    )
    if (pitched) {
      console.log(`??Found voice by pitch/gender: ${pitched.name}`)
      return pitched
    }

    // 4. 任�??��?語音（�??��?
    const fallback = voices.find(v => v.lang.startsWith('en'))
    if (fallback) {
      console.log(`?��? Using fallback English voice: ${fallback.name}`)
    } else {
      console.error(`??No English voice found!`)
    }
    return fallback
  }

  // ?�� 純英??TTS（英?�學習系統�?
  const playTTS = (text: string) => {
    if (!text || !('speechSynthesis' in window)) {
      console.log('?��? TTS unavailable')
      return
    }

    window.speechSynthesis.cancel()

    const cleanText = text
      .replace(/[\n\r]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    if (!cleanText) return

    // 永�?使用?��?語音
    const englishVoiceConfig = getInterviewerEnglishVoice(currentInterviewer)

    console.log(`?�� [Conversation TTS] Interviewer: ${currentInterviewer}`)
    console.log(`  English Voice: ${englishVoiceConfig.preferredVoiceName}`)
    console.log(`?? Text to speak:`, cleanText)

    const voices = window.speechSynthesis.getVoices()
    const englishVoice = findBestEnglishVoice(voices, englishVoiceConfig)

    const utterance = new SpeechSynthesisUtterance(cleanText)
    if (englishVoice) {
      utterance.voice = englishVoice
    }
    utterance.lang = 'en-US'
    utterance.rate = englishVoiceConfig.rate
    utterance.pitch = englishVoiceConfig.pitch
    utterance.volume = 1.0

    console.log(`?? [Conversation TTS] Using voice: ${englishVoice?.name || 'default'}`)
    window.speechSynthesis.speak(utterance)
  }

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        await sendAudioMessage(audioBlob)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingError(null)
    } catch (error) {
      console.error('Failed to start recording:', error)
      setRecordingError('?��?存�?麥�?�?)
    }
  }

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  // Send audio message to backend
  const sendAudioMessage = async (audioBlob: Blob) => {
    setIsLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('sessionId', sessionId)
      formData.append('audio', audioBlob, 'recording.webm')

      const response = await fetch(`${getApiBase()}/api/conversation/message`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('?�送�??�失??)
      }

      const data = await response.json()

      // Add user message
      const userMessage: Message = {
        id: `msg-${Date.now()}-user`,
        role: 'user',
        chinese: data.userTranscript || '(No transcription)',
        transcript: data.userTranscript,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, userMessage])

      // Update checkpoint progress if in scenario mode
      if (data.scenarioProgress) {
        setCheckpoints(data.scenarioProgress.checkpoints)
        // Check if all checkpoints are completed
        if (data.allCheckpointsCompleted && !allCheckpointsCompleted) {
          setAllCheckpointsCompleted(true)
        }
      }

      // Add instructor response
      setTimeout(() => {
        const instructorMessage: Message = {
          id: `msg-${Date.now()}-instructor`,
          role: 'instructor',
          chinese: data.instructorReply.chinese,
          english: data.instructorReply.english,
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, instructorMessage])

        // Update suggestions
        if (data.suggestions) {
          setSuggestions(data.suggestions)
        }

        // Play TTS for instructor response (pure English for learning)
        const instructorText: string = data.instructorReply.english ?? ''
        playTTS(instructorText)
      }, 500)
    } catch (error) {
      console.error('Failed to send message:', error)
      setError('?��??��?訊息?�發?�錯誤�?請�?試�?)
    } finally {
      setIsLoading(false)
    }
  }

  // End conversation
  const handleEndConversation = async () => {
    const confirm = window.confirm('Are you sure you want to end this conversation?')
    if (!confirm) return

    setIsLoading(true)

    try {
      // Check if session exists
      if (!sessionId) {
        throw new Error('?��??��??��?對話?�段')
      }

      const data = await fetchJson<{
        reportId: string
        analysis: any
      }>('/api/conversation/end', {
        method: 'POST',
        body: JSON.stringify({ sessionId })
      })

      // Save to history with conversation turns
      const conversationHistory = {
        sessionId,
        type: 'conversation',
        completedAt: new Date().toISOString(),
        messages: messages.length,
        reportId: data.reportId,
        settings,
        conversationData: {
          turns: messages.map(msg => ({
            role: msg.role,
            text: msg.chinese,
            timestamp: msg.timestamp,
          })),
          analysis: data.analysis,
        },
      }

      const historyStr = localStorage.getItem('conversationHistory') || '[]'
      const history = JSON.parse(historyStr)
      history.unshift(conversationHistory)
      localStorage.setItem('conversationHistory', JSON.stringify(history))

      // Navigate to report page
      router.push(`/conversation/report/${data.reportId}`)
    } catch (error: any) {
      console.error('Failed to end conversation:', error)
      if (error.message.includes('session') || error.message.includes('SESSION')) {
        setError('對話已�??��??��?對話資�?已遺失。�??��??��?對話??)
      } else {
        setError('結�?對話失�?�? + error.message)
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Handle interviewer change
  const handleSelectInterviewer = (interviewerId: string) => {
    setCurrentInterviewer(interviewerId)
    localStorage.setItem('selectedInterviewer', interviewerId)
    setShowInterviewerSelector(false)
  }

  if (!settings) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-gray-100">
      {/* Header */}
      <div className="border-b bg-white px-6 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">AI Conversation</h1>
            <p className="text-sm text-gray-500">
              {settings.topicMode === 'scenario' && scenarioInfo
                ? scenarioInfo.title
                : settings.topicMode === 'free'
                ? 'Free Talk'
                : `${settings.topicMode === 'all' ? 'All' : settings.selectedTopics.length} Topics`}
            </p>
          </div>

          <button
            onClick={handleEndConversation}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            <PhoneOff className="h-4 w-4" />
            <span>結�?對話</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Video Area (60%) */}
        <div className="relative flex w-3/5 flex-col bg-gray-900">
          {/* Instructor - Fill entire area */}
          {settings.topicMode === 'scenario' ? (
            /* Scenario mode: Fixed interviewer, no selection */
            <div className="relative h-full w-full overflow-hidden">
              <Image
                src={scenarioInfo?.interviewerImage ? `/interviewers/${scenarioInfo.interviewerImage}` : getInterviewerImagePath(currentInterviewer)}
                alt="AI 角色"
                fill
                className="object-cover"
                priority
              />
              {scenarioInfo?.interviewerImage && (
                <div className="absolute bottom-4 left-4 bg-blue-900/90 backdrop-blur-sm rounded-lg px-4 py-3 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-blue-300">
                      <Image
                        src={`/interviewers/${scenarioInfo.interviewerImage}`}
                        alt="AI 角色"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">AI 角色</p>
                      <p className="text-xs text-blue-200">
                        {scenarioInfo.aiRole}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Normal mode: Clickable interviewer selector */
            <button
              onClick={() => setShowInterviewerSelector(true)}
              className="group relative h-full w-full overflow-hidden"
            >
              <Image
                src={getInterviewerImagePath(currentInterviewer)}
                alt="AI ?�師"
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-black/0 transition-all group-hover:bg-black/30 flex items-center justify-center">
                <span className="text-sm font-medium text-white opacity-0 group-hover:opacity-100">
                  ?��??�師
                </span>
              </div>
            </button>
          )}

          {/* User Video - Top Right Corner (if enabled) */}
          {settings.enableCamera && (
            <div className="absolute top-4 right-4 z-10">
              <div className="relative h-32 w-44 overflow-hidden rounded-xl border-2 border-white/30 shadow-2xl">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                />
                <div className="absolute bottom-2 left-2 rounded-full bg-black/70 px-2 py-1 text-xs text-white">
                  ??                </div>
              </div>
            </div>
          )}

          {/* Recording Button - Bottom Center Overlay */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 flex flex-col items-center">
            <button
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              disabled={isLoading || !sessionId}
              className={`group relative h-20 w-20 rounded-full transition-all ${
                isRecording
                  ? 'bg-red-600 shadow-2xl shadow-red-500/50 scale-110'
                  : 'bg-blue-600 shadow-xl hover:bg-blue-700 hover:scale-105'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isRecording ? (
                <MicOff className="h-8 w-8 text-white mx-auto" />
              ) : (
                <Mic className="h-8 w-8 text-white mx-auto" />
              )}

              {isRecording && (
                <div className="absolute -inset-2 rounded-full border-4 border-red-400 animate-ping" />
              )}
            </button>

            <p className="mt-3 text-center text-sm text-white drop-shadow-lg">
              {isRecording ? '?��?以發??..' : '?��?說話'}
            </p>

            {recordingError && (
              <div className="mt-2 flex items-center justify-center gap-2 text-xs text-red-400 bg-black/50 px-3 py-1 rounded-lg">
                <AlertCircle className="h-4 w-4" />
                <span>{recordingError}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Dialog Sidebar (40%) */}
        <div className="w-2/5 border-l border-gray-200">
          <DialogSidebar
            messages={messages}
            suggestions={suggestions}
            onPlayTTS={playTTS}
            isLoading={isLoading}
            currentInterviewer={currentInterviewer}
            scenarioInfo={settings.topicMode === 'scenario' ? scenarioInfo : null}
            checkpoints={settings.topicMode === 'scenario' ? checkpoints : undefined}
          />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="border-t border-red-200 bg-red-50 px-6 py-3">
          <div className="flex items-center gap-2 text-sm text-red-800">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Interviewer Selector Modal */}
      {showInterviewerSelector && (
        <InterviewerSelector
          currentInterviewer={currentInterviewer}
          onSelect={handleSelectInterviewer}
          onClose={() => setShowInterviewerSelector(false)}
        />
      )}

      {/* Auto-completion prompt for scenario mode */}
      {settings.topicMode === 'scenario' && (
        <CompletionPrompt
          isAllCompleted={allCheckpointsCompleted}
          onContinue={() => setAllCheckpointsCompleted(false)} // ?��??�示，繼續�?�?          onEnd={handleEndConversation}
        />
      )}
    </div>
  )
}

