import type { Metadata, Viewport } from 'next'
import { ThemeProvider } from '@/components/provider/theme-provider'
import { SITE_INFO } from '@/constants/site'

import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_INFO.url),
  title: SITE_INFO.title,
  description: SITE_INFO.description,
  keywords: ['theme', 'dark-mode', 'view-transitions', 'animation', 'react', 'vue', 'nextjs', 'nuxt'],
  openGraph: {
    title: SITE_INFO.title,
    description: SITE_INFO.description,
    url: SITE_INFO.url,
    siteName: SITE_INFO.siteName,
    locale: 'zh_CN',
    type: 'website',
  },
  twitter: { card: 'summary' },
  icons: { icon: '/favicon.png' },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    // suppressHydrationWarning：next-themes 依 class 方案在首帧前同步改 <html>，属预期不一致
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
