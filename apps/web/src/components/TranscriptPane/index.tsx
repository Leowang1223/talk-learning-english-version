'use client'

import { useMemo } from 'react'
import MessageBubble from './MessageBubble'
import { useInterviewFlow } from '@/lib/useInterviewFlow'

export type TranscriptPaneProps = {
  flow: ReturnType<typeof useInterviewFlow>
}

export default function TranscriptPane({ flow }: TranscriptPaneProps) {
  const messages = useMemo(() => {
    // 將 flow.items 轉為可顯示模型（加上 timestamp）
    const nowTime = () => {
      const d = new Date()
      const hh = d.getHours().toString().padStart(2, '0')
      const mm = d.getMinutes().toString().padStart(2, '0')
      return `${hh}:${mm}`
    }
    return flow.items.map((it, i) => ({ id: i + 1, message: it.text, isUser: it.role === 'user', timestamp: nowTime() }))
  }, [flow.items])

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg.message}
            isUser={msg.isUser}
            timestamp={msg.timestamp}
          />
        ))}
      </div>
      
      <div className="p-4">
        <div className="border-t border-gray-200 mb-4 mx-4"></div>
        <div className="text-center text-sm text-gray-500">面試進行中...</div>
      </div>
    </div>
  )
}
