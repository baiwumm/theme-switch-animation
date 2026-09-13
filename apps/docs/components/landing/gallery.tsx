'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { ThemeAnimationType, useThemeAnimation } from 'theme-switch-animation/react'
import type { JSX, SVGProps } from 'react'

/** 每张卡片的迷你图形标（stroke 风格，颜色走渐变图标砖的 currentColor） */
function IcoCircle(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} {...props}>
      <circle cx="12" cy="12" r="8" />
    </svg>
  )
}
function IcoRevert(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} {...props}>
      <circle cx="12" cy="12" r="9" strokeDasharray="3 3" />
      <circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none" />
    </svg>
  )
}
function IcoBlur(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} {...props}>
      <defs>
        <filter id="gallery-blur">
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
      </defs>
      <circle cx="12" cy="12" r="7.5" filter="url(#gallery-blur)" />
    </svg>
  )
}
function IcoArrow({ deg = 0, ...props }: SVGProps<SVGSVGElement> & { deg?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} {...props}>
      <g transform={`rotate(${deg} 12 12)`}>
        <path d="M4 12h13" />
        <path d="m12 6 6 6-6 6" />
      </g>
    </svg>
  )
}
function IcoShape(points: string) {
  return function Shape(props: SVGProps<SVGSVGElement>) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} {...props}>
        <polygon points={points} strokeLinejoin="round" />
      </svg>
    )
  }
}
function IcoRect(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} {...props}>
      <rect x="3.5" y="7" width="17" height="10" rx="1.5" />
    </svg>
  )
}

const ANIMATION_TYPES: Array<{
  type: ThemeAnimationType
  label: string
  hint: string
  Icon: (props: SVGProps<SVGSVGElement>) => JSX.Element
  /** 渐变图标砖：亮 / 暗两套底色 + 图标色（写全类名，避免动态拼接被 Tailwind 摇掉） */
  tile: string
}> = [
  { type: ThemeAnimationType.CIRCLE, label: 'CIRCLE', hint: '圆形扩散 · 圆心 = 点击位置', Icon: IcoCircle, tile: 'from-rose-100 to-rose-200 text-rose-600 dark:from-rose-500/15 dark:to-rose-500/5 dark:text-rose-400' },
  { type: ThemeAnimationType.CIRCLE_REVERT, label: 'CIRCLE_REVERT', hint: '切暗扩散、切亮收起', Icon: IcoRevert, tile: 'from-orange-100 to-orange-200 text-orange-600 dark:from-orange-500/15 dark:to-orange-500/5 dark:text-orange-400' },
  { type: ThemeAnimationType.CIRCLE_BLUR, label: 'CIRCLE_BLUR', hint: '圆形模糊扩散', Icon: IcoBlur, tile: 'from-amber-100 to-amber-200 text-amber-600 dark:from-amber-500/15 dark:to-amber-500/5 dark:text-amber-400' },
  { type: ThemeAnimationType.LTR, label: 'LTR', hint: '从左向右擦除', Icon: (p) => <IcoArrow {...p} />, tile: 'from-sky-100 to-sky-200 text-sky-600 dark:from-sky-500/15 dark:to-sky-500/5 dark:text-sky-400' },
  { type: ThemeAnimationType.RTL, label: 'RTL', hint: '从右向左擦除', Icon: (p) => <IcoArrow deg={180} {...p} />, tile: 'from-indigo-100 to-indigo-200 text-indigo-600 dark:from-indigo-500/15 dark:to-indigo-500/5 dark:text-indigo-400' },
  { type: ThemeAnimationType.TTB, label: 'TTB', hint: '从上向下擦除', Icon: (p) => <IcoArrow deg={90} {...p} />, tile: 'from-violet-100 to-violet-200 text-violet-600 dark:from-violet-500/15 dark:to-violet-500/5 dark:text-violet-400' },
  { type: ThemeAnimationType.BTT, label: 'BTT', hint: '从下向上擦除', Icon: (p) => <IcoArrow deg={-90} {...p} />, tile: 'from-purple-100 to-purple-200 text-purple-600 dark:from-purple-500/15 dark:to-purple-500/5 dark:text-purple-400' },
  { type: ThemeAnimationType.SQUARE, label: 'SQUARE', hint: '正方形扩散', Icon: IcoShape('5,5 19,5 19,19 5,19'), tile: 'from-emerald-100 to-emerald-200 text-emerald-600 dark:from-emerald-500/15 dark:to-emerald-500/5 dark:text-emerald-400' },
  { type: ThemeAnimationType.DIAMOND, label: 'DIAMOND', hint: '菱形扩散', Icon: IcoShape('12,3.5 20.5,12 12,20.5 3.5,12'), tile: 'from-teal-100 to-teal-200 text-teal-600 dark:from-teal-500/15 dark:to-teal-500/5 dark:text-teal-400' },
  { type: ThemeAnimationType.RECTANGLE, label: 'RECTANGLE', hint: '矩形 · 贴合视口比例', Icon: IcoRect, tile: 'from-cyan-100 to-cyan-200 text-cyan-600 dark:from-cyan-500/15 dark:to-cyan-500/5 dark:text-cyan-400' },
  { type: ThemeAnimationType.HEXAGON, label: 'HEXAGON', hint: '六边形 · 尖顶朝上', Icon: IcoShape('12,2.8 19.8,7.4 19.8,16.6 12,21.2 4.2,16.6 4.2,7.4'), tile: 'from-blue-100 to-blue-200 text-blue-600 dark:from-blue-500/15 dark:to-blue-500/5 dark:text-blue-400' },
  { type: ThemeAnimationType.TRIANGLE, label: 'TRIANGLE', hint: '三角形 · 顶点朝上', Icon: IcoShape('12,4 20,19 4,19'), tile: 'from-fuchsia-100 to-fuchsia-200 text-fuchsia-600 dark:from-fuchsia-500/15 dark:to-fuchsia-500/5 dark:text-fuchsia-400' },
  { type: ThemeAnimationType.STAR, label: 'STAR', hint: '五角星 · 顶点朝上', Icon: IcoShape('12,2.8 14.7,9 21.5,9.6 16.3,14 17.9,20.7 12,17 6.1,20.7 7.7,14 2.5,9.6 9.3,9'), tile: 'from-pink-100 to-pink-200 text-pink-600 dark:from-pink-500/15 dark:to-pink-500/5 dark:text-pink-400' },
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

function GalleryCard({
  animationType,
  label,
  hint,
  Icon,
  tile,
  duration,
  easing,
  index,
}: {
  animationType: ThemeAnimationType
  label: string
  hint: string
  Icon: (props: SVGProps<SVGSVGElement>) => JSX.Element
  tile: string
  duration: number
  easing: string
  index: number
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
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, delay: (index % 3) * 0.06 }}
      className="glass-card group flex flex-col items-center rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_48px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_16px_48px_rgba(0,0,0,0.5)]"
    >
      {/* 渐变图标砖 */}
      <div className={`mb-3 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br ${tile}`}>
        <Icon className="size-7" />
      </div>
      <h3 className="font-mono text-sm font-bold tracking-wide">{label}</h3>
      <p className="mt-1 text-center text-xs text-muted-foreground">{hint}</p>

      {/* 中央切换按钮：唯一交互点，动画起收点即按钮中心 */}
      <button
        ref={mounted ? ref : undefined}
        type="button"
        data-animation-type={animationType}
        aria-label={`播放 ${label} 动画并切换主题`}
        onClick={toggleTheme}
        className="my-5 flex size-16 items-center justify-center rounded-full border bg-background text-foreground shadow-[0_2px_16px_rgba(0,0,0,0.10)] transition-all duration-300 hover:scale-105 hover:shadow-[0_4px_24px_rgba(0,0,0,0.16)] active:scale-95 dark:shadow-[0_2px_16px_rgba(0,0,0,0.5)]"
      >
        {mounted && isDark ? <Moon size={22} /> : <Sun size={22} />}
      </button>

      {/* 参数行（全局预设的当前值） */}
      <div className="w-full space-y-1.5 border-t pt-4 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Duration</span>
          <span className="font-mono">{duration}ms</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">Easing</span>
          <span className="truncate font-mono">{easing}</span>
        </div>
      </div>
    </motion.div>
  )
}

function PresetRow<T extends number | string>({
  label,
  presets,
  value,
  onChange,
}: {
  label: string
  presets: ReadonlyArray<{ value: T; label: string }>
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <span className="mr-1 font-mono text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      {presets.map((p) => (
        <button
          key={String(p.value)}
          type="button"
          onClick={() => onChange(p.value)}
          className={`rounded-full px-3.5 py-1.5 font-mono text-xs transition-all ${
            value === p.value
              ? 'bg-primary font-semibold text-primary-foreground shadow'
              : 'border bg-card/70 text-muted-foreground backdrop-blur hover:border-primary/40 hover:text-foreground'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}

/** 13 种动画的可交互画廊：卡片中央圆形按钮触发（受控模式 × next-themes，与站点主题联动） */
export function GallerySection() {
  const [duration, setDuration] = useState(750)
  const [easing, setEasing] = useState('ease-in-out')

  return (
    <section id="gallery" className="relative z-10 scroll-mt-24 border-b border-dashed border-black/10 py-20 dark:border-white/10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <span className="mb-3 inline-block rounded-full border bg-card/70 px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-muted-foreground backdrop-blur">
            Playground
          </span>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Try Different Animations</h2>
          <p className="mt-3 text-muted-foreground">
            点击卡片中央的切换按钮体验对应动画（切换右上角主题也可以）。中心扩散类动画的起收点 = 按钮中心。
          </p>
        </div>

        <div className="glass-card mx-auto mb-10 flex max-w-3xl flex-col items-center gap-2.5 rounded-3xl p-5">
          <PresetRow label="duration" presets={DURATION_PRESETS} value={duration} onChange={(v) => setDuration(v)} />
          <PresetRow label="easing" presets={EASING_PRESETS} value={easing} onChange={(v) => setEasing(v)} />
        </div>

        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ANIMATION_TYPES.map((t, index) => (
            <GalleryCard
              key={t.type}
              animationType={t.type}
              label={t.label}
              hint={t.hint}
              Icon={t.Icon}
              tile={t.tile}
              duration={duration}
              easing={easing}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
