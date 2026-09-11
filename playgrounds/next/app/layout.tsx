import type { Metadata } from 'next'

import { ThemeProvider } from 'next-themes'

import './globals.css'

export const metadata: Metadata = {
  title: 'theme-switch-animation · Next playground',
  description: 'theme-switch-animation 受控模式 × next-themes 联调',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning：next-themes 会在 html 上补 class，属预期的服务端/客户端差异
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
