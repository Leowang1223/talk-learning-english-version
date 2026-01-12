'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import FancyButton from '@/components/ui/FancyButton'

// Force dynamic rendering to avoid build-time prerender errors
export const dynamic = 'force-dynamic'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/update-password`
      })

      if (resetError) throw resetError
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || '發送重設郵件失敗')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 py-16">
        <div className="glass-card w-full max-w-md p-10 space-y-6 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold text-gray-800">檢查您的郵件</h1>
          <p className="text-gray-600">
            我們已發送密碼重設連結到 <strong>{email}</strong>
          </p>
          <Link href="/login" className="brand-link text-sm">
            返回登入頁面
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute top-0 right-0 w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
      <div className="absolute bottom-0 left-0 w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="glass-card w-full max-w-md p-10 space-y-8 shadow-2xl backdrop-blur-xl relative z-10 animate-fade-in">
        <div className="text-center">
          <p className="chip animate-slide-up mb-2">密碼重設</p>
          <h1 className="hero-title text-3xl font-bold text-gray-800 animate-slide-up" style={{ animationDelay: '0.1s' }}>重設密碼</h1>
          <p className="text-gray-600 mt-2 animate-slide-up" style={{ animationDelay: '0.2s' }}>輸入您的郵件地址，我們將發送重設連結</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <div>
            <label htmlFor="email" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              電子郵件
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field mt-2"
              required
              placeholder="your@email.com"
            />
          </div>

          {error && (
            <div className="rounded-2xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <FancyButton
            type="submit"
            variant="solid"
            className="w-full justify-center"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="animate-spin h-4 w-4" />
                發送中...
              </span>
            ) : (
              '發送重設連結'
            )}
          </FancyButton>
        </form>

        <p className="text-center text-sm text-gray-600">
          記起密碼了？{' '}
          <Link href="/login" className="brand-link font-semibold">
            返回登入
          </Link>
        </p>
      </div>
    </main>
  )
}
