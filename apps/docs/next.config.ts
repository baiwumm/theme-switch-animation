import type { NextConfig } from 'next'

// 纯静态落地页：导出静态文件，由腾讯云 EdgeOne 静态托管（output: 'export' → out/）
const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  experimental: {
    // HeroUI v3 是全量桶导出，按需拆包避免把没用的组件打进 bundle（与 token-usage 同款配置）
    optimizePackageImports: ['@heroui/react'],
  },
}

export default nextConfig
