/// <reference types="next" />
/// <reference types="next/image-types/global" />

declare module '*.css' {
  const content: { [className: string]: string }
  export default content
}

// Tailwind CSS 類型支援
declare module 'tailwindcss/tailwind-config' {
  const config: any
  export default config
}

