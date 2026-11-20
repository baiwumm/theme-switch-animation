'use client'

import { Button } from '@heroui/react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

import {
  ThemeAnimationType,
  useThemeAnimation,
} from 'theme-switch-animation/react'

/**
 * 站点自己的主题切换按钮 = 本库受控模式 × next-themes 的活示例（§6.1 接线）。
 * 外观与顶栏其它图标按钮一致：HeroUI `Button isIconOnly` + `variant="outline"`
 * + `size="sm"`（better-admin 端同款）。
 *
 * ref 必须无条件挂上：库要拿按钮的 getBoundingClientRect() 算圆形扩散圆心，
 * HeroUI 的 Button 会把 ref 透传到内部 <button>，直接挂上去即可；
 * 若按 mounted 延迟传（undefined → ref 对象），库侧可能拿不到元素，动画会回落到视口中心。
 * 水合守卫只针对图标：next-themes 的 resolvedTheme 服务端为 undefined，
 * isDark 未水合前不渲染图标，避免 SSR 与首帧不一致。
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
      ref={ref}
      isIconOnly
      aria-label="切换主题"
      size="sm"
      variant="outline"
      // 按压缩放不影响动画起收点：库取 trigger getBoundingClientRect 的中心，等比缩放不改中心
      onPress={toggleTheme}
    >
      {mounted && isDark ? (
        <Moon className="size-4" />
      ) : (
        <Sun className="size-4" />
      )}
    </Button>
  )
}
