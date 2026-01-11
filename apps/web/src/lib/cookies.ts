export type CookieOptions = {
  days?: number
  path?: string
  sameSite?: 'strict' | 'lax' | 'none'
  secure?: boolean
}

export function setCookie(name: string, value: string, options: CookieOptions = {}): void {
  const {
    days = 1,
    path = '/',
    sameSite = 'lax',
    secure = false, // 開發環境下設為 false
  } = options

  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Expires=${expires}; Path=${path}; SameSite=${sameSite}`
  if (secure) cookie += '; Secure'
  document.cookie = cookie
}

export function getCookie(name: string): string | undefined {
  const target = encodeURIComponent(name) + '='
  const parts = document.cookie.split('; ')
  for (const part of parts) {
    if (part.startsWith(target)) {
      return decodeURIComponent(part.substring(target.length))
    }
  }
  return undefined
}

export function deleteCookie(name: string, path: string = '/'): void {
  document.cookie = `${encodeURIComponent(name)}=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=${path}`
}

// Auth-specific helpers
export const AUTH_COOKIE = 'isLoggedIn'
export const EMAIL_COOKIE = 'userEmail'

export function setAuthCookies(email: string): void {
  setCookie(AUTH_COOKIE, 'true', { days: 1 })
  setCookie(EMAIL_COOKIE, email, { days: 1 })
}

export function clearAuthCookies(): void {
  deleteCookie(AUTH_COOKIE)
  deleteCookie(EMAIL_COOKIE)
}


