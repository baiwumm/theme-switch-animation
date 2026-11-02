import type { NextConfig } from 'next'

// 纯静态落地页：导出静态文件，由腾讯云 EdgeOne 静态托管（output: 'export' → out/）
const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
}

export default nextConfig
