'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

import {
  ThemeAnimationType,
  useThemeAnimation,
} from 'theme-switch-animation/react'

import { Button } from '@/components/motion/button/base'

/**
 * 站点自己的主题切换按钮 = 本库受控模式 × next-themes 的活示例（§6.1 接线）。
 * mounted 守卫：next-themes 的 resolvedTheme 服务端为 undefined，直接渲染图标会水合不一致。
 */
export function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const { resolvedTheme, setTheme } = useTheme()
  const { ref, toggleTheme, isDark } = useThemeAnimation<HTMLButtonElement>({
    animationType: ThemeAnimationType.CIRCLE,
    duration: 750,
    isDark: resolvedTheme === 'dark',
    onChange: (next) => setTheme(next ? 'dark' : 'light'),
  })

  useEffect(() => setMounted(true), [])

  return (
    <Button
      variant="ghost"
      size="icon"
      // ref 必须无条件挂上：motion 组件只在自身挂载时转发一次 ref，
      // 若按 mounted 延迟传（undefined → ref 对象）库侧永远拿不到元素，动画会回落到视口中心。
      // 水合守卫只针对图标：isDark 未水合前不渲染，避免 SSR 与首帧不一致。
      ref={ref}
      aria-label="切换主题"
      // 按压缩放不影响动画起收点：库取 trigger getBoundingClientRect 的中心，等比缩放不改中心
      onClick={toggleTheme}
    >
      {mounted && isDark ? <Moon size={18} /> : <Sun size={18} />}
    </Button>
  )
}
