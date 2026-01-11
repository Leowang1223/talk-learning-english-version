'use client'

import { useEffect, useState } from 'react'

function getGatewayBase(): string {
  if (typeof process !== 'undefined' && (process.env as any).NEXT_PUBLIC_GATEWAY_HTTP_URL) {
    return (process.env as any).NEXT_PUBLIC_GATEWAY_HTTP_URL as string
  }
  // default dev base
  return 'http://localhost:8081'
}

export default function VoicePicker({ onChange }: { onChange?: (v: string) => void }) {
  const [voices, setVoices] = useState<string[]>([])
  const [selected, setSelected] = useState<string>('')

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('voiceName') || '' : ''
    setSelected(saved)
    ;(async () => {
      try {
        const base = getGatewayBase()
        const res = await fetch(`${base}/api/interview/voices`)
        const data = await res.json()
        if (Array.isArray(data.voices)) {
          setVoices(data.voices)
          if (!saved && data.voices.length > 0) {
            setSelected(data.voices[0])
          }
        }
      } catch {}
    })()
  }, [])

  useEffect(() => {
    if (!selected) return
    try { window.localStorage.setItem('voiceName', selected) } catch {}
    onChange?.(selected)
  }, [selected, onChange])

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-gray-600">人聲</label>
      <select
        className="border rounded-md px-2 py-1 text-sm"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
      >
        {voices.map(v => (
          <option key={v} value={v}>{v}</option>
        ))}
      </select>
    </div>
  )
}


