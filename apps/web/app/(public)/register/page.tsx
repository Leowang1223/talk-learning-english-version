'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, User, AlertCircle, Loader2 } from 'lucide-react'
import FancyButton from '@/components/ui/FancyButton'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: { full_name: form.name },
          emailRedirectTo: `${window.location.origin}/dashboard`
        }
      })

      if (signUpError) throw signUpError

      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: form.email,
            full_name: form.name,
            provider: 'email'
          })

        if (profileError) console.error('Profile creation error:', profileError)
      }

      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      if (error) throw error
    } catch (err: any) {
      setError(err.message || 'Google 註冊失敗')
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
      <div className="absolute bottom-0 left-0 w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="glass-card w-full max-w-md p-10 space-y-8 shadow-2xl backdrop-blur-xl relative z-10 animate-fade-in">
        <div className="space-y-6 text-center">
          <p className="chip animate-slide-up mb-2">TALK LEARNING</p>
          <h1 className="hero-title text-4xl font-bold leading-tight animate-slide-up" style={{ animationDelay: '0.1s' }}>
            Create<br />Account
          </h1>
          <p className="text-gray-600 text-base leading-relaxed mt-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            Start your Chinese learning journey
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <div>
            <label htmlFor="register-name" className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
              <User className="w-4 h-4" />
              Full Name
            </label>
            <input
              id="register-name"
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input-field transition-all focus:ring-4 focus:ring-blue-100"
              required
              autoComplete="name"
            />
          </div>

          <div>
            <label htmlFor="register-email" className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
              <Mail className="w-4 h-4" />
              Email
            </label>
            <input
              id="register-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input-field transition-all focus:ring-4 focus:ring-blue-100"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="register-password" className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
              <Lock className="w-4 h-4" />
              Password
            </label>
            <input
              id="register-password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="input-field transition-all focus:ring-4 focus:ring-blue-100"
              required
              minLength={6}
              autoComplete="new-password"
            />
            <p className="text-xs text-gray-500 mt-2">At least 6 characters</p>
          </div>

          {error && (
            <div className="rounded-2xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-3 animate-slide-up" role="alert">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <FancyButton
            type="submit"
            variant="solid"
            className="w-full justify-center transform transition hover:scale-105"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="animate-spin h-4 w-4" />
                Creating account...
              </span>
            ) : (
              'Sign Up'
            )}
          </FancyButton>
        </form>

        {/* Google OAuth 分隔线 */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">或</span>
          </div>
        </div>

        {/* Google 注册按钮 */}
        <button
          type="button"
          onClick={handleGoogleSignup}
          className="w-full flex items-center justify-center gap-3 px-4 py-3
                     border border-gray-300 rounded-xl shadow-sm bg-white
                     hover:bg-gray-50 transition-all duration-200"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span className="text-sm font-medium text-gray-700">使用 Google 註冊</span>
        </button>

        <p className="text-center text-sm text-gray-600 pt-2">
          Already have an account?{' '}
          <Link href="/login" className="brand-link font-semibold hover:text-blue-700 transition">
            Log in
          </Link>
        </p>
      </div>
    </main>
  )
}
