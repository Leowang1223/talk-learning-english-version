/** @type {import('next').NextConfig} */
// Last updated: 2026-01-13 - TTS fixes deployed
const nextConfig = {

  // 圖片優化設定
  images: {
    unoptimized: true
  },
  
  // 移除 NEXT_PUBLIC_API_BASE，改用 runtime 動態檢測
  
  // 重寫規則（如果需要）
  // 改用 API Route 反向代理，關閉 rewrites 以避免衝突
  async rewrites() { return [] }
}

module.exports = nextConfig