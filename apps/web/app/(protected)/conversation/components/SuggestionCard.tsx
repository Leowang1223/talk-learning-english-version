'use client'

import { Volume2 } from 'lucide-react'

interface SuggestionCardProps {
  chinese: string
  pinyin: string
  english: string
  onPlayTTS: (text: string) => void
}

export function SuggestionCard({ chinese, pinyin, english, onPlayTTS }: SuggestionCardProps) {
  return (
    <div className="group rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-all hover:border-blue-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          {/* English (Primary Learning Language) */}
          <div className="text-sm font-medium text-gray-900">{english}</div>

          {/* Chinese Translation */}
          <div className="mt-1 text-xs text-gray-600 italic">{chinese}</div>

          {/* Pinyin */}
          <div className="mt-1 text-xs text-gray-500">{pinyin}</div>
        </div>

        {/* TTS Button */}
        <button
          onClick={() => onPlayTTS(english)}
          className="shrink-0 rounded-full p-2 text-blue-600 transition-colors hover:bg-blue-50"
          title="Listen to pronunciation"
        >
          <Volume2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
