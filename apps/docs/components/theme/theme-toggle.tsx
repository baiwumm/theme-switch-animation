'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

import { ThemeAnimationType, useThemeAnimation } from 'theme-switch-animation/react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  className?: string
}

/**
 * 站点自己的主题切换按钮 = 本库受控模式 × next-themes 的活示例（§6.1 接线）。
 * mounted 守卫：next-themes 的 resolvedTheme 服务端为 undefined，直接渲染图标会水合不一致。
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
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
      // isDark 未水合前不渲染图标，避免不一致
      ref={mounted ? ref : undefined}
      aria-label="切换主题"
      className={cn(
        'relative rounded-full border border-transparent p-2 text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-accent-foreground hover:shadow-sm',
        className,
      )}
      onClick={toggleTheme}
    >
      {mounted && isDark ? <Moon size={18} /> : <Sun size={18} />}
    </Button>
  )
}
