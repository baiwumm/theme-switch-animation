'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { ThemeAnimationType, useThemeAnimation } from 'theme-switch-animation/react'

const ANIMATION_TYPES: Array<{
  type: ThemeAnimationType
  label: string
  hint: string
}> = [
  { type: ThemeAnimationType.CIRCLE, label: 'CIRCLE', hint: '圆形扩散 · 圆心 = 点击位置' },
  { type: ThemeAnimationType.CIRCLE_REVERT, label: 'CIRCLE_REVERT', hint: '切暗扩散、切亮收起' },
  { type: ThemeAnimationType.CIRCLE_BLUR, label: 'CIRCLE_BLUR', hint: '圆形模糊扩散' },
  { type: ThemeAnimationType.LTR, label: 'LTR', hint: '从左向右擦除' },
  { type: ThemeAnimationType.RTL, label: 'RTL', hint: '从右向左擦除' },
  { type: ThemeAnimationType.TTB, label: 'TTB', hint: '从上向下擦除' },
  { type: ThemeAnimationType.BTT, label: 'BTT', hint: '从下向上擦除' },
  { type: ThemeAnimationType.SQUARE, label: 'SQUARE', hint: '正方形扩散' },
  { type: ThemeAnimationType.DIAMOND, label: 'DIAMOND', hint: '菱形扩散' },
  { type: ThemeAnimationType.RECTANGLE, label: 'RECTANGLE', hint: '矩形 · 贴合视口比例' },
  { type: ThemeAnimationType.HEXAGON, label: 'HEXAGON', hint: '六边形 · 尖顶朝上' },
  { type: ThemeAnimationType.TRIANGLE, label: 'TRIANGLE', hint: '三角形 · 顶点朝上' },
  { type: ThemeAnimationType.STAR, label: 'STAR', hint: '五角星 · 顶点朝上' },
]

const DURATION_PRESETS = [
  { value: 500, label: '500ms' },
  { value: 750, label: '750ms' },
  { value: 1000, label: '1000ms' },
]
const EASING_PRESETS = [
  { value: 'ease-in-out', label: 'ease-in-out' },
  { value: 'cubic-bezier(0.4, 0, 0.2, 1)', label: 'cubic-bezier' },
  { value: 'linear', label: 'linear · 匀速' },
]

function GalleryButton({
  animationType,
  label,
  hint,
  duration,
  easing,
}: {
  animationType: ThemeAnimationType
  label: string
  hint: string
  duration: number
  easing: string
}) {
  const [mounted, setMounted] = useState(false)
  const { resolvedTheme, setTheme } = useTheme()
  const { ref, toggleTheme, isDark } = useThemeAnimation<HTMLButtonElement>({
    animationType,
    duration,
    easing,
    isDark: resolvedTheme === 'dark',
    onChange: (next) => setTheme(next ? 'dark' : 'light'),
  })
  useEffect(() => setMounted(true), [])

  return (
    <button
      ref={mounted ? ref : undefined}
      type="button"
      data-animation-type={animationType}
      onClick={toggleTheme}
      className="flex flex-col items-start gap-1.5 rounded-2xl border bg-card/70 p-4 text-left shadow-sm backdrop-blur transition-colors hover:border-primary/50"
    >
      <span className="font-mono text-sm font-semibold tracking-wide">{label}</span>
      <span className="text-xs text-muted-foreground">{hint}</span>
      <span className="mt-2 text-xs text-muted-foreground">
        {mounted ? (isDark ? '🌙 切到亮色' : '☀️ 切到暗色') : '👆 点击体验'}
      </span>
    </button>
  )
}

/** 13 种动画的可交互画廊：受控模式 × next-themes（与站点主题切换联动），duration / easing 全局预设 */
export function GallerySection() {
  const [duration, setDuration] = useState(750)
  const [easing, setEasing] = useState('ease-in-out')

  return (
    <section id="gallery" className="relative z-10 scroll-mt-24 border-b border-dashed border-black/10 py-20 dark:border-white/10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">动画演示</h2>
          <p className="mt-3 text-muted-foreground">
            点击任意卡片，该动画会应用到整个页面（切换右上角主题也可以试试）。中心扩散类动画的起收点 = 点击位置。
          </p>
        </div>

        <div className="mx-auto mb-8 flex max-w-3xl flex-col items-center gap-2">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="mr-1 text-sm text-muted-foreground">duration</span>
            {DURATION_PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setDuration(p.value)}
                className={`rounded-full border px-3.5 py-1.5 font-mono text-xs transition-colors ${
                  duration === p.value ? 'border-primary bg-primary/10 font-semibold' : 'hover:border-primary/40'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="mr-1 text-sm text-muted-foreground">easing</span>
            {EASING_PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setEasing(p.value)}
                className={`rounded-full border px-3.5 py-1.5 font-mono text-xs transition-colors ${
                  easing === p.value ? 'border-primary bg-primary/10 font-semibold' : 'hover:border-primary/40'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {ANIMATION_TYPES.map((t) => (
            <GalleryButton key={t.type} animationType={t.type} label={t.label} hint={t.hint} duration={duration} easing={easing} />
          ))}
        </div>
      </div>
    </section>
  )
}
