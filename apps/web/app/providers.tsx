'use client'
console.log('[media-provider] mounted')
import { MediaSessionProvider } from '../src/lib/media/MediaSessionProvider'

export function Providers({ children }: { children: React.ReactNode }) {
  return <MediaSessionProvider>{children}</MediaSessionProvider>
}
