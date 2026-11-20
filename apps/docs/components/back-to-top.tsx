'use client'

// 回到顶部（token-usage 同款）：页面滚动过阈值后浮出，点击平滑回顶
// （reduced-motion 下瞬时跳转）。显隐、悬停、按压全部走 CSS 过渡，
// 滚动监听用 rAF 节流，一帧最多一次 state 读取。
//
// 幅度刻意收小：进入位移 6px、缩放 95% → 100%，200ms 缓出；悬停不再
// 整体上浮，只换描边与文字色；按压交给 HeroUI Button 自带的 scale(0.96)。
// 收起态保持 invisible，不进无障碍树也不可聚焦。

import { Button, cn } from '@heroui/react'
import { ArrowUp } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

/** 滚过这一步才浮出；Hero 约一屏高，避免一进页就出现。 */
const SHOW_AFTER_PX = 480

export function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let frame = 0

    const update = () => {
      frame = 0
      setVisible(window.scrollY > SHOW_AFTER_PX)
    }
    const schedule = () => {
      if (frame) return
      frame = window.requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', schedule, { passive: true })

    return () => {
      window.removeEventListener('scroll', schedule)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  const scrollToTop = useCallback(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  }, [])

  return (
    <Button
      isIconOnly
      aria-label="回到顶部"
      className={cn(
        'border-default/60 bg-surface/90 text-foreground fixed right-4 bottom-4 z-30 size-11 rounded-full border shadow-lg backdrop-blur-md sm:right-6 sm:bottom-6',
        // visibility 同列过渡项：淡出时它到最后一帧才切 hidden，收场不硬切。
        'transition-[opacity,translate,scale,visibility,box-shadow,border-color,color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
        // hover/active 底色显式压回表面色，避免 ghost 变体自带的灰底盖住 accent 描边。
        'hover:bg-surface active:bg-surface hover:border-accent/50 hover:text-accent hover:shadow-md',
        'motion-reduce:transition-none',
        visible
          ? 'translate-y-0 scale-100 opacity-100'
          : 'pointer-events-none invisible translate-y-1.5 scale-95 opacity-0',
      )}
      size="lg"
      variant="ghost"
      onPress={scrollToTop}
    >
      <ArrowUp aria-hidden="true" className="size-4.5" />
    </Button>
  )
}
