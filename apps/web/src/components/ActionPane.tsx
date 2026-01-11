'use client'

import { Mic, MicOff, Pause, Square, RotateCcw, Settings } from 'lucide-react'
import { useState } from 'react'

export default function ActionPane() {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  return (
    <div className="bg-white border-t border-gray-200 p-4">
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        {/* Left side - Recording status */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`} />
            <span className="text-sm text-gray-600">
              {isRecording ? '錄製中...' : '未錄製'}
            </span>
          </div>
          
          {isRecording && (
            <div className="text-sm text-gray-500">
              時長: 02:34
            </div>
          )}
        </div>
        
        {/* Center - Main controls */}
        <div className="flex items-center space-x-3">
          {/* Record/Stop button */}
          <button
            onClick={() => setIsRecording(!isRecording)}
            className={`p-3 rounded-full transition-colors ${
              isRecording 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          
          {/* Pause/Resume button */}
          {isRecording && (
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="p-3 rounded-full bg-gray-500 hover:bg-gray-600 text-white transition-colors"
            >
              {isPaused ? <Mic className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
            </button>
          )}
          
          {/* Reset button */}
          <button className="p-3 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors">
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
        
        {/* Right side - Additional controls */}
        <div className="flex items-center space-x-2">
          <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
