'use client'

import { useState, useEffect } from 'react'

export default function SpeechWave() {
  const [bars, setBars] = useState<number[]>([])

  useEffect(() => {
    const interval = setInterval(() => {
      setBars(Array.from({ length: 20 }, () => Math.random() * 100))
    }, 100)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="p-4">
      <h3 className="font-semibold text-gray-900 mb-3">語音活動</h3>
      <div className="flex items-end justify-center space-x-1 h-16">
        {bars.map((height, index) => (
          <div
            key={index}
            className="w-1 bg-blue-500 rounded-full transition-all duration-100"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
      <div className="text-center mt-2">
        <span className="text-xs text-gray-500">正在聆聽...</span>
      </div>
    </div>
  )
}
