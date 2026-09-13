import type { NextConfig } from 'next'

// 纯静态落地页：导出静态文件由 Cloudflare Workers Static Assets 托管（wrangler.jsonc）
const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
}

export default nextConfig
