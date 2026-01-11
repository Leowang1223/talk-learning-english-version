'use client'

export interface HintCardProps {
  type: 'tip' | 'timing' | 'example'
  title: string
  content: string
  priority: 'low' | 'medium' | 'high'
}

export default function HintCard({ title, content }: HintCardProps) {
  return (
    <div className="mb-4">
      <h4 className="text-base font-semibold text-gray-900 mb-1">{title}</h4>
      <p className="text-sm text-gray-600 leading-6">{content}</p>
    </div>
  )
}
