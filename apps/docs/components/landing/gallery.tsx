'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { ThemeAnimationDirection, ThemeAnimationType, useThemeAnimation } from 'theme-switch-animation/react'

import { AnimatedBadge } from '@/components/motion/animated-badge'
import { Button } from '@/components/motion/button/base'
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
function IcoBlinds(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} {...props}>
      <path d="M5 4v16M12 4v16M19 4v16" />
    </svg>
  )
}
function IcoScan(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} {...props}>
      <path d="M4 5.5h16" strokeWidth={2.6} />
      <path d="M4 12h16" strokeDasharray="3 3" />
      <path d="M4 18.5h16" strokeWidth={1.2} />
    </svg>
  )
}
function IcoQrGrid(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} {...props}>
      <rect x="4" y="4" width="6" height="6" />
      <rect x="14" y="4" width="6" height="6" />
      <rect x="4" y="14" width="6" height="6" />
      <path d="M14 14h3v3h-3zM20 14v0.01M14 20v0.01M20 20v0.01M17.5 20v0.01M20 17.5v0.01" strokeLinecap="round" />
    </svg>
  )
}
function IcoRipple(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} {...props}>
      <circle cx="12" cy="12" r="1.9" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="6" opacity="0.7" />
      <circle cx="12" cy="12" r="10" opacity="0.35" />
    </svg>
  )
}
function IcoClockSweep(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} {...props}>
      <circle cx="12" cy="12" r="9" opacity="0.35" />
      <path d="M12 12V3" />
      <path d="M12 12l6.4 6.4" />
      <path d="M12 3a9 9 0 0 1 6.36 15.36" strokeWidth={2.6} />
    </svg>
  )
}
function IcoFan(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4" opacity="0.55" />
    </svg>
  )
}
function IcoCurtain(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} {...props}>
      <path d="M12 3v18" strokeWidth={2.4} />
      <path d="M7.5 6.5 4 12l3.5 5.5" opacity="0.6" />
      <path d="M16.5 6.5 20 12l-3.5 5.5" opacity="0.6" />
    </svg>
  )
}

const ANIMATION_TYPES: Array<{
  type: ThemeAnimationType
  label: string
  hint: string
  /** 消费 direction 的类型：卡片内渲染独立的方向选择按钮（初始方向） */
  initialDirection?: ThemeAnimationDirection
  /** 仅 BLINDS：卡片内渲染叶宽选择器（初始宽度 px） */
  initialSlatWidth?: number
  /** 仅 RIPPLE：卡片内渲染波长选择器（初始波长 px） */
  initialWaveWidth?: number
  /** 仅 FAN：卡片内渲染扇叶数选择器（初始扇叶数） */
  initialBladeCount?: number
  /** 仅 CIRCLE（reverse 已接通的类型）：卡片内渲染反向三档选择器（初始值） */
  initialReverse?: boolean | 'auto'
  Icon: (props: SVGProps<SVGSVGElement>) => JSX.Element
  /** 渐变图标砖：亮 / 暗两套底色 + 图标色（写全类名，避免动态拼接被 Tailwind 摇掉） */
  tile: string
}> = [
  { type: ThemeAnimationType.CIRCLE, label: 'CIRCLE', hint: '圆形扩散 · 圆心 = 点击位置', initialReverse: false, Icon: IcoCircle, tile: 'from-rose-100 to-rose-200 text-rose-600 dark:from-rose-500/15 dark:to-rose-500/5 dark:text-rose-400' },
  { type: ThemeAnimationType.CIRCLE_REVERT, label: 'CIRCLE_REVERT', hint: '已废弃 · 等价于 CIRCLE + reverse:auto', Icon: IcoRevert, tile: 'from-orange-100 to-orange-200 text-orange-600 dark:from-orange-500/15 dark:to-orange-500/5 dark:text-orange-400' },
  { type: ThemeAnimationType.CIRCLE_BLUR, label: 'CIRCLE_BLUR', hint: '圆形模糊扩散', Icon: IcoBlur, tile: 'from-amber-100 to-amber-200 text-amber-600 dark:from-amber-500/15 dark:to-amber-500/5 dark:text-amber-400' },
  { type: ThemeAnimationType.SQUARE, label: 'SQUARE', hint: '正方形扩散', Icon: IcoShape('5,5 19,5 19,19 5,19'), tile: 'from-emerald-100 to-emerald-200 text-emerald-600 dark:from-emerald-500/15 dark:to-emerald-500/5 dark:text-emerald-400' },
  { type: ThemeAnimationType.DIAMOND, label: 'DIAMOND', hint: '菱形扩散', Icon: IcoShape('12,3.5 20.5,12 12,20.5 3.5,12'), tile: 'from-teal-100 to-teal-200 text-teal-600 dark:from-teal-500/15 dark:to-teal-500/5 dark:text-teal-400' },
  { type: ThemeAnimationType.RECTANGLE, label: 'RECTANGLE', hint: '矩形 · 贴合视口比例', Icon: IcoRect, tile: 'from-cyan-100 to-cyan-200 text-cyan-600 dark:from-cyan-500/15 dark:to-cyan-500/5 dark:text-cyan-400' },
  { type: ThemeAnimationType.HEXAGON, label: 'HEXAGON', hint: '六边形 · 尖顶朝上', Icon: IcoShape('12,2.8 19.8,7.4 19.8,16.6 12,21.2 4.2,16.6 4.2,7.4'), tile: 'from-blue-100 to-blue-200 text-blue-600 dark:from-blue-500/15 dark:to-blue-500/5 dark:text-blue-400' },
  { type: ThemeAnimationType.TRIANGLE, label: 'TRIANGLE', hint: '三角形 · 顶点朝上', Icon: IcoShape('12,4 20,19 4,19'), tile: 'from-fuchsia-100 to-fuchsia-200 text-fuchsia-600 dark:from-fuchsia-500/15 dark:to-fuchsia-500/5 dark:text-fuchsia-400' },
  { type: ThemeAnimationType.STAR, label: 'STAR', hint: '五角星 · 顶点朝上', Icon: IcoShape('12,2.8 14.7,9 21.5,9.6 16.3,14 17.9,20.7 12,17 6.1,20.7 7.7,14 2.5,9.6 9.3,9'), tile: 'from-pink-100 to-pink-200 text-pink-600 dark:from-pink-500/15 dark:to-pink-500/5 dark:text-pink-400' },
  { type: ThemeAnimationType.BLINDS, label: 'BLINDS', hint: '百叶窗 · 叶宽与方向可调', initialDirection: ThemeAnimationDirection.LTR, initialSlatWidth: 72, Icon: IcoBlinds, tile: 'from-lime-100 to-lime-200 text-lime-600 dark:from-lime-500/15 dark:to-lime-500/5 dark:text-lime-400' },
  { type: ThemeAnimationType.SCAN, label: 'SCAN', hint: '扫描 · 硬边扫开 + 前缘光束', initialDirection: ThemeAnimationDirection.TTB, Icon: IcoScan, tile: 'from-green-100 to-green-200 text-green-600 dark:from-green-500/15 dark:to-green-500/5 dark:text-green-400' },
  { type: ThemeAnimationType.QR_GRID, label: 'QR_GRID', hint: '方块格子 · 方块逐格生长揭开', initialDirection: ThemeAnimationDirection.LTR, Icon: IcoQrGrid, tile: 'from-stone-100 to-stone-200 text-stone-600 dark:from-stone-500/15 dark:to-stone-500/5 dark:text-stone-400' },
  { type: ThemeAnimationType.RIPPLE, label: 'RIPPLE', hint: '水滴涟漪 · 波源', initialWaveWidth: 18, initialReverse: false, Icon: IcoRipple, tile: 'from-sky-100 to-sky-200 text-sky-600 dark:from-sky-500/15 dark:to-sky-500/5 dark:text-sky-400' },
  { type: ThemeAnimationType.CLOCK_SWEEP, label: 'CLOCK_SWEEP', hint: '时钟扇形 · 轴心', initialReverse: false, Icon: IcoClockSweep, tile: 'from-violet-100 to-violet-200 text-violet-600 dark:from-violet-500/15 dark:to-violet-500/5 dark:text-violet-400' },
  { type: ThemeAnimationType.FAN, label: 'FAN', hint: '扇叶旋开 · 轴心', initialBladeCount: 8, initialReverse: false, Icon: IcoFan, tile: 'from-indigo-100 to-indigo-200 text-indigo-600 dark:from-indigo-500/15 dark:to-indigo-500/5 dark:text-indigo-400' },
  { type: ThemeAnimationType.CURTAIN, label: 'CURTAIN', hint: '双开门 · 中线推开', initialReverse: false, Icon: IcoCurtain, tile: 'from-yellow-100 to-yellow-200 text-yellow-700 dark:from-yellow-500/15 dark:to-yellow-500/5 dark:text-yellow-400' },
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

/** 方向选择按钮：四个方向，每张卡片独立持有状态，互不影响 */
const DIRECTION_OPTIONS: ReadonlyArray<{ value: ThemeAnimationDirection; label: string }> = [
  { value: ThemeAnimationDirection.LTR, label: 'LTR' },
  { value: ThemeAnimationDirection.RTL, label: 'RTL' },
  { value: ThemeAnimationDirection.TTB, label: 'TTB' },
  { value: ThemeAnimationDirection.BTT, label: 'BTT' },
]

/**
 * reverse 三档：仅 CIRCLE 卡片展示。与 Direction 正交——Direction 定推进轴，
 * Reverse 定从内还是从外揭开；`auto` 是"切暗正向、切亮收起"，即旧 CIRCLE_REVERT 的行为。
 */
const REVERSE_OPTIONS: ReadonlyArray<{ value: boolean | 'auto'; label: string }> = [
  { value: false, label: 'off' },
  { value: true, label: 'on' },
  { value: 'auto', label: 'auto' },
]

/** 叶宽档位（px，合法区间 [16, 200]）：仅 BLINDS 卡片展示，同样卡片级独立 */
const SLAT_OPTIONS: ReadonlyArray<{ value: number; label: string }> = [
  { value: 32, label: '32px' },
  { value: 72, label: '72px' },
  { value: 128, label: '128px' },
]

/** 波长档位（px，合法区间 [8, 60]）：仅 RIPPLE 卡片展示，环带间距 = 相邻两圈波峰的距离 */
const WAVE_OPTIONS: ReadonlyArray<{ value: number; label: string }> = [
  { value: 10, label: '10px' },
  { value: 18, label: '18px' },
  { value: 34, label: '34px' },
]

/** 扇叶数档位（合法区间 [4, 16] 的整数）：仅 FAN 卡片展示，周期 = 360° / 片数 */
const BLADE_OPTIONS: ReadonlyArray<{ value: number; label: string }> = [
  { value: 6, label: '6' },
  { value: 8, label: '8' },
  { value: 12, label: '12' },
]

function GalleryCard({
  animationType,
  label,
  hint,
  initialDirection,
  initialSlatWidth,
  initialWaveWidth,
  initialBladeCount,
  initialReverse,
  Icon,
  tile,
  duration,
  easing,
  index,
}: {
  animationType: ThemeAnimationType
  label: string
  hint: string
  initialDirection?: ThemeAnimationDirection
  initialSlatWidth?: number
  initialWaveWidth?: number
  initialBladeCount?: number
  initialReverse?: boolean | 'auto'
  Icon: (props: SVGProps<SVGSVGElement>) => JSX.Element
  tile: string
  duration: number
  easing: string
  index: number
}) {
  const [mounted, setMounted] = useState(false)
  // direction 每张卡片独立（初始值来自配置），只在该类型消费 direction 时展示选择器
  const [direction, setDirection] = useState<ThemeAnimationDirection>(initialDirection ?? ThemeAnimationDirection.LTR)
  const [slatWidth, setSlatWidth] = useState(initialSlatWidth ?? 72)
  const [waveWidth, setWaveWidth] = useState(initialWaveWidth ?? 18)
  const [bladeCount, setBladeCount] = useState(initialBladeCount ?? 8)
  const [reverse, setReverse] = useState<boolean | 'auto'>(initialReverse ?? false)
  const { resolvedTheme, setTheme } = useTheme()
  const { ref, toggleTheme, isDark } = useThemeAnimation<HTMLButtonElement>({
    animationType,
    direction,
    slatWidth,
    waveWidth,
    bladeCount,
    reverse,
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
      <p className="mt-1 min-h-8 text-center text-xs text-muted-foreground">{hint}</p>

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

      {/* 参数行（全局预设的当前值 + 卡片独立的方向选择） */}
      <div className="w-full space-y-1.5 border-t pt-4 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Duration</span>
          <span className="font-mono">{duration}ms</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">Easing</span>
          <span className="truncate font-mono">{easing}</span>
        </div>
        {initialDirection !== undefined && (
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <span className="text-muted-foreground">Direction</span>
            <div className="flex gap-1">
              {DIRECTION_OPTIONS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setDirection(d.value)}
                  className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] transition-colors ${
                    direction === d.value
                      ? 'bg-primary font-semibold text-primary-foreground'
                      : 'border border-border bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {initialSlatWidth !== undefined && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Slat</span>
            <div className="flex gap-1">
              {SLAT_OPTIONS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSlatWidth(s.value)}
                  className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] transition-colors ${
                    slatWidth === s.value
                      ? 'bg-primary font-semibold text-primary-foreground'
                      : 'border border-border bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {initialWaveWidth !== undefined && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Wave</span>
            <div className="flex gap-1">
              {WAVE_OPTIONS.map((w) => (
                <button
                  key={w.value}
                  type="button"
                  onClick={() => setWaveWidth(w.value)}
                  className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] transition-colors ${
                    waveWidth === w.value
                      ? 'bg-primary font-semibold text-primary-foreground'
                      : 'border border-border bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {initialBladeCount !== undefined && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Blades</span>
            <div className="flex gap-1">
              {BLADE_OPTIONS.map((b) => (
                <button
                  key={b.value}
                  type="button"
                  onClick={() => setBladeCount(b.value)}
                  className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] transition-colors ${
                    bladeCount === b.value
                      ? 'bg-primary font-semibold text-primary-foreground'
                      : 'border border-border bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {initialReverse !== undefined && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Reverse</span>
            <div className="flex gap-1">
              {REVERSE_OPTIONS.map((r) => (
                <button
                  key={String(r.value)}
                  type="button"
                  onClick={() => setReverse(r.value)}
                  className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] transition-colors ${
                    reverse === r.value
                      ? 'bg-primary font-semibold text-primary-foreground'
                      : 'border border-border bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        )}
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
        <Button
          key={String(p.value)}
          size="sm"
          variant={value === p.value ? 'primary' : 'secondary'}
          aria-pressed={value === p.value}
          onClick={() => onChange(p.value)}
          className="font-mono"
        >
          {p.label}
        </Button>
      ))}
    </div>
  )
}

/** 16 种动画的可交互画廊：卡片中央圆形按钮触发（受控模式 × next-themes，与站点主题联动） */
export function GallerySection() {
  const [duration, setDuration] = useState(750)
  const [easing, setEasing] = useState('ease-in-out')

  return (
    <section id="gallery" className="relative z-10 scroll-mt-24 border-b border-dashed border-black/10 py-20 dark:border-white/10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <AnimatedBadge size="sm" className="mb-3">
            Playground
          </AnimatedBadge>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Try Different Animations</h2>
          <p className="mt-3 text-muted-foreground">
            点击卡片中央按钮播放动画；BLINDS / SCAN / QR_GRID 可在卡内切换方向，RIPPLE 可切换环带波长，FAN 可切换扇叶数。
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
              initialDirection={t.initialDirection}
              initialSlatWidth={t.initialSlatWidth}
              initialWaveWidth={t.initialWaveWidth}
              initialBladeCount={t.initialBladeCount}
              initialReverse={t.initialReverse}
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
