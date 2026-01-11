import VideoCard from './VideoCard'
import TTSControls from './TTSControls'
import SubtitleBar from './SubtitleBar'
import { useInterviewFlow } from '@/lib/useInterviewFlow'

export type TutorPaneProps = {
  flow: ReturnType<typeof useInterviewFlow>
}

export default function TutorPane({ flow }: TutorPaneProps) {
  const currentQuestion = flow.currentIndex >= 0 && flow.currentIndex < flow.questions.length 
    ? (flow.questions[flow.currentIndex]?.question as string) 
    : undefined

  // 獲取當前課程步驟（用於中文課程）
  const getCurrentStep = () => {
    if (flow.currentLessonIndex >= 0 && flow.currentStepIndex >= 0) {
      const lesson = flow.lessons[flow.currentLessonIndex]
      if (lesson && lesson.steps && lesson.steps[flow.currentStepIndex]) {
        return lesson.steps[flow.currentStepIndex]
      }
    }
    return null
  }

  const currentStep = getCurrentStep()
  const isChineseLesson = flow.lessons && flow.lessons.length > 0
  // 控制是否顯示影片下方的字幕列（依需求關閉）
  const SHOW_SUBTITLE_BAR = false

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <VideoCard question={currentQuestion} currentVideo={flow.currentVideo} />
      </div>
      
      {/* 字幕欄（依需求關閉，避免與影片重疊的中間字幕） */}
      {SHOW_SUBTITLE_BAR && isChineseLesson && currentStep && (
        <SubtitleBar 
          text={currentStep.teacher}
          isRetry={flow.isRetrying}
          encouragement={currentStep.encouragement}
        />
      )}
      
      <div className="border-t border-gray-200 my-4 mx-4"></div>
      
      <div className="px-4 pb-4">
        <TTSControls flow={flow} onTimingUpdate={flow.updateTimingData} />
      </div>
    </div>
  )
}
