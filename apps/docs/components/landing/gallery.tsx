'use client'

import {
  Button,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@heroui/react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import type { JSX, SVGProps } from 'react'
import { useEffect, useState } from 'react'
import {
  type ThemeAnimationCellShape,
  ThemeAnimationDirection,
  ThemeAnimationType,
  useThemeAnimation,
} from 'theme-switch-animation/react'

import { SectionHeader } from '@/components/landing/section-header'
import { FlowNumber } from '@/components/ui/flow-number'

/** 每张卡片的迷你图形标（stroke 风格，颜色走图标砖的 currentColor） */
function IcoCircle(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="12" r="8" />
    </svg>
  )
}
function IcoBlur(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      aria-hidden="true"
      {...props}
    >
      <defs>
        <filter id="gallery-blur">
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
      </defs>
      <circle cx="12" cy="12" r="7.5" filter="url(#gallery-blur)" />
    </svg>
  )
}
/** 多边形图标：points 走 props 的模块级组件（biome noComponentHookFactories——不在函数内定义组件） */
function ShapeIcon({
  points,
  ...props
}: { points: string } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      aria-hidden="true"
      {...props}
    >
      <polygon points={points} strokeLinejoin="round" />
    </svg>
  )
}
function IcoRect(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      aria-hidden="true"
      {...props}
    >
      <rect x="3.5" y="7" width="17" height="10" rx="1.5" />
    </svg>
  )
}
function IcoBlinds(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      aria-hidden="true"
      {...props}
    >
      <path d="M5 4v16M12 4v16M19 4v16" />
    </svg>
  )
}
function IcoScan(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      aria-hidden="true"
      {...props}
    >
      <path d="M4 5.5h16" strokeWidth={2.6} />
      <path d="M4 12h16" strokeDasharray="3 3" />
      <path d="M4 18.5h16" strokeWidth={1.2} />
    </svg>
  )
}
function IcoQrGrid(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      aria-hidden="true"
      {...props}
    >
      <rect x="4" y="4" width="6" height="6" />
      <rect x="14" y="4" width="6" height="6" />
      <rect x="4" y="14" width="6" height="6" />
      <path
        d="M14 14h3v3h-3zM20 14v0.01M14 20v0.01M20 20v0.01M17.5 20v0.01M20 17.5v0.01"
        strokeLinecap="round"
      />
    </svg>
  )
}
function IcoRipple(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="12" r="1.9" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="6" opacity="0.7" />
      <circle cx="12" cy="12" r="10" opacity="0.35" />
    </svg>
  )
}
function IcoClockSweep(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="12" r="9" opacity="0.35" />
      <path d="M12 12V3" />
      <path d="M12 12l6.4 6.4" />
      <path d="M12 3a9 9 0 0 1 6.36 15.36" strokeWidth={2.6} />
    </svg>
  )
}
function IcoFan(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="12" r="9" />
      <path
        d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4"
        opacity="0.55"
      />
    </svg>
  )
}
function IcoCurtain(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      aria-hidden="true"
      {...props}
    >
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
  /** 仅 QR_GRID：卡片内渲染格距与格子形状选择器（初始值） */
  initialCellSize?: number
  initialCellShape?: ThemeAnimationCellShape
  /** 仅 RIPPLE：卡片内渲染波长选择器（初始波长 px） */
  initialWaveWidth?: number
  /** 仅 FAN：卡片内渲染扇叶数选择器（初始扇叶数） */
  initialBladeCount?: number
  /** 仅 reverse 已接通的 11 个类型：卡片内渲染反向三档选择器（初始值） */
  initialReverse?: boolean | 'auto'
  Icon: (props: SVGProps<SVGSVGElement>) => JSX.Element
}> = [
  {
    type: ThemeAnimationType.CIRCLE,
    label: 'CIRCLE',
    hint: '圆形扩散 · 圆心 = 点击位置',
    initialReverse: false,
    Icon: IcoCircle,
  },
  {
    type: ThemeAnimationType.CIRCLE_BLUR,
    label: 'CIRCLE_BLUR',
    hint: '圆形模糊扩散',
    initialReverse: false,
    Icon: IcoBlur,
  },
  {
    type: ThemeAnimationType.SQUARE,
    label: 'SQUARE',
    hint: '正方形扩散',
    initialReverse: false,
    Icon: (props) => <ShapeIcon points="5,5 19,5 19,19 5,19" {...props} />,
  },
  {
    type: ThemeAnimationType.DIAMOND,
    label: 'DIAMOND',
    hint: '菱形扩散',
    initialReverse: false,
    Icon: (props) => (
      <ShapeIcon points="12,3.5 20.5,12 12,20.5 3.5,12" {...props} />
    ),
  },
  {
    type: ThemeAnimationType.RECTANGLE,
    label: 'RECTANGLE',
    hint: '矩形 · 贴合视口比例',
    initialReverse: false,
    Icon: IcoRect,
  },
  {
    type: ThemeAnimationType.HEXAGON,
    label: 'HEXAGON',
    hint: '六边形 · 尖顶朝上',
    initialReverse: false,
    Icon: (props) => (
      <ShapeIcon
        points="12,2.8 19.8,7.4 19.8,16.6 12,21.2 4.2,16.6 4.2,7.4"
        {...props}
      />
    ),
  },
  {
    type: ThemeAnimationType.TRIANGLE,
    label: 'TRIANGLE',
    hint: '三角形 · 顶点朝上',
    initialReverse: false,
    Icon: (props) => <ShapeIcon points="12,4 20,19 4,19" {...props} />,
  },
  {
    type: ThemeAnimationType.STAR,
    label: 'STAR',
    hint: '五角星 · 顶点朝上',
    Icon: (props) => (
      <ShapeIcon
        points="12,2.8 14.7,9 21.5,9.6 16.3,14 17.9,20.7 12,17 6.1,20.7 7.7,14 2.5,9.6 9.3,9"
        {...props}
      />
    ),
  },
  {
    type: ThemeAnimationType.BLINDS,
    label: 'BLINDS',
    hint: '百叶窗 · 叶宽与方向可调',
    initialDirection: ThemeAnimationDirection.LTR,
    initialSlatWidth: 72,
    Icon: IcoBlinds,
  },
  {
    type: ThemeAnimationType.SCAN,
    label: 'SCAN',
    hint: '扫描 · 硬边扫开 + 前缘光束',
    initialDirection: ThemeAnimationDirection.TTB,
    Icon: IcoScan,
  },
  {
    type: ThemeAnimationType.QR_GRID,
    label: 'QR_GRID',
    hint: '方块格子 · 格距与形状可调',
    initialDirection: ThemeAnimationDirection.LTR,
    initialCellSize: 64,
    initialCellShape: 'square',
    Icon: IcoQrGrid,
  },
  {
    type: ThemeAnimationType.RIPPLE,
    label: 'RIPPLE',
    hint: '水滴涟漪 · 波源',
    initialWaveWidth: 18,
    initialReverse: false,
    Icon: IcoRipple,
  },
  {
    type: ThemeAnimationType.CLOCK_SWEEP,
    label: 'CLOCK_SWEEP',
    hint: '时钟扇形 · 轴心',
    initialReverse: false,
    Icon: IcoClockSweep,
  },
  {
    type: ThemeAnimationType.FAN,
    label: 'FAN',
    hint: '扇叶旋开 · 轴心',
    initialBladeCount: 8,
    initialReverse: false,
    Icon: IcoFan,
  },
  {
    type: ThemeAnimationType.CURTAIN,
    label: 'CURTAIN',
    hint: '双开门 · 开合轴可调',
    initialDirection: ThemeAnimationDirection.LTR,
    initialReverse: false,
    Icon: IcoCurtain,
  },
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

/** 方向选择：四个方向，每张卡片独立持有状态，互不影响 */
const DIRECTION_OPTIONS: ReadonlyArray<{
  value: ThemeAnimationDirection
  label: string
}> = [
  { value: ThemeAnimationDirection.LTR, label: 'LTR' },
  { value: ThemeAnimationDirection.RTL, label: 'RTL' },
  { value: ThemeAnimationDirection.TTB, label: 'TTB' },
  { value: ThemeAnimationDirection.BTT, label: 'BTT' },
]

/**
 * reverse 三档：仅已接通的 11 个类型展示（CIRCLE / FAN / RIPPLE / CLOCK_SWEEP / CURTAIN /
 * SQUARE / RECTANGLE / CIRCLE_BLUR / DIAMOND / TRIANGLE / HEXAGON）。
 * 与 Direction 正交——Direction 定推进轴，Reverse 定从内还是从外揭开；
 * `auto` 是"切暗正向、切亮收起"，即跟随本次切换方向。
 */
const REVERSE_OPTIONS: ReadonlyArray<{
  value: boolean | 'auto'
  label: string
}> = [
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

/** QR_GRID 格距档位（px，合法区间 [16, 200]）：仅 QR_GRID 卡片展示 */
const CELL_SIZE_OPTIONS: ReadonlyArray<{ value: number; label: string }> = [
  { value: 32, label: '32px' },
  { value: 64, label: '64px' },
  { value: 128, label: '128px' },
]

/** QR_GRID 格子形状档位：方块（双层 intersect）与圆点（单层平铺 radial，免 @supports） */
const CELL_SHAPE_OPTIONS: ReadonlyArray<{
  value: ThemeAnimationCellShape
  label: string
}> = [
  { value: 'square', label: '方块' },
  { value: 'dot', label: '圆点' },
]

/**
 * 参数选择组（HeroUI ToggleButtonGroup，单选受控）。
 * 选项值的类型横跨 number / string / boolean | 'auto'，统一走 String() 做 key；
 * 泛型在调用点显式给定（onChange 是 Dispatch，推断不出联合里的具体分支）。
 * react-aria 单选组允许点选中的项取消选择（keys 变空），此时忽略、保持当前值。
 */
function ParamGroup<T extends number | string | boolean>({
  label,
  options,
  value,
  onChange,
  align = 'row',
}: {
  label: string
  options: ReadonlyArray<{ value: T; label: string }>
  value: T
  onChange: (v: T) => void
  align?: 'row' | 'center'
}) {
  return (
    <div
      className={
        align === 'center'
          ? 'flex flex-wrap items-center justify-center gap-2'
          : 'flex items-center justify-between gap-2'
      }
    >
      <span
        className={
          align === 'center'
            ? 'mr-1 font-mono text-[11px] tracking-wider text-muted uppercase'
            : 'text-xs text-muted'
        }
      >
        {label}
      </span>
      <ToggleButtonGroup
        size="sm"
        selectedKeys={new Set([String(value)])}
        selectionMode="single"
        onSelectionChange={(keys) => {
          const first = [...keys][0]
          if (first === undefined) return
          const hit = options.find((o) => String(o.value) === String(first))
          if (hit) onChange(hit.value)
        }}
      >
        {options.map((o) => (
          <ToggleButton
            key={String(o.value)}
            id={String(o.value)}
            className="px-2 font-mono text-xs"
          >
            {o.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </div>
  )
}

function GalleryCard({
  animationType,
  label,
  hint,
  initialDirection,
  initialSlatWidth,
  initialCellSize,
  initialCellShape,
  initialWaveWidth,
  initialBladeCount,
  initialReverse,
  Icon,
  duration,
  easing,
}: {
  animationType: ThemeAnimationType
  label: string
  hint: string
  initialDirection?: ThemeAnimationDirection
  initialSlatWidth?: number
  initialCellSize?: number
  initialCellShape?: ThemeAnimationCellShape
  initialWaveWidth?: number
  initialBladeCount?: number
  initialReverse?: boolean | 'auto'
  Icon: (props: SVGProps<SVGSVGElement>) => JSX.Element
  duration: number
  easing: string
}) {
  const [mounted, setMounted] = useState(false)
  // direction 每张卡片独立（初始值来自配置），只在该类型消费 direction 时展示选择器
  const [direction, setDirection] = useState<ThemeAnimationDirection>(
    initialDirection ?? ThemeAnimationDirection.LTR,
  )
  const [slatWidth, setSlatWidth] = useState(initialSlatWidth ?? 72)
  const [cellSize, setCellSize] = useState(initialCellSize ?? 64)
  const [cellShape, setCellShape] = useState<ThemeAnimationCellShape>(
    initialCellShape ?? 'square',
  )
  const [waveWidth, setWaveWidth] = useState(initialWaveWidth ?? 18)
  const [bladeCount, setBladeCount] = useState(initialBladeCount ?? 8)
  const [reverse, setReverse] = useState<boolean | 'auto'>(
    initialReverse ?? false,
  )
  const { resolvedTheme, setTheme } = useTheme()
  const { ref, toggleTheme, isDark } = useThemeAnimation<HTMLButtonElement>({
    animationType,
    direction,
    slatWidth,
    cellSize,
    cellShape,
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
    <article className="flex flex-col rounded-lg border border-border bg-surface p-6">
      {/* 头部行：图标 + 标题/副标题 + 触发按钮，左右排布垂直居中；
          一行放不下时按钮自动换行并水平居中（flex-wrap + justify-center）。
          触发按钮是本库受控模式的活演示：ref 必须始终挂载（库取
          getBoundingClientRect 中心当动画圆心），HeroUI Button 会透传到内部 button */}
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-4 pb-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-surface-secondary text-accent">
            <Icon className="size-5" />
          </div>
          {/* flex-1：文字块吃掉剩余宽度，超长 hint 截断而不是把按钮挤到换行，
              保证同行卡片的头部形态一致（按钮都和标题同排） */}
          <div className="min-w-0 flex-1">
            <Typography
              className="font-mono tracking-wide"
              type="body-sm"
              weight="semibold"
            >
              {label}
            </Typography>
            <Typography className="truncate" color="muted" type="body-xs">
              {hint}
            </Typography>
          </div>
        </div>
        {/* 触发按钮是本库受控模式的活演示：ref 必须始终挂载（库取
            getBoundingClientRect 中心当动画圆心），HeroUI Button 会透传到内部 button；
            尺寸与样式全部走组件默认 */}
        <Button
          ref={ref}
          isIconOnly
          size="lg"
          variant="outline"
          data-animation-type={animationType}
          aria-label={`播放 ${label} 动画并切换主题`}
          onPress={toggleTheme}
        >
          {mounted && isDark ? (
            <Moon className="size-4" />
          ) : (
            <Sun className="size-4" />
          )}
        </Button>
      </div>

      {/* 参数行（全局预设的当前值 + 卡片独立的方向选择）：
          flex-1 让分割线在同行卡片上恒定对齐；参数行从分割线下方
          正常向下堆叠（gap-2 常规间距），底部空间自然留白，不做均分 */}
      <div className="flex flex-1 flex-col gap-2 border-t border-border pt-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted">Duration</span>
          <Chip className="font-mono">
            {/* 数值滚动：全局切换档位时 15 张卡同步滚到新值 */}
            <FlowNumber suffix="ms" value={duration} />
          </Chip>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted">Easing</span>
          <Chip className="max-w-[70%] font-mono">
            <span className="truncate">{easing}</span>
          </Chip>
        </div>
        {initialDirection !== undefined && (
          <div className="pt-0.5">
            <ParamGroup<ThemeAnimationDirection>
              label="Direction"
              options={DIRECTION_OPTIONS}
              value={direction}
              onChange={setDirection}
            />
          </div>
        )}
        {initialSlatWidth !== undefined && (
          <ParamGroup<number>
            label="Slat"
            options={SLAT_OPTIONS}
            value={slatWidth}
            onChange={setSlatWidth}
          />
        )}
        {initialCellShape !== undefined && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted">Cell</span>
            <div className="flex gap-1.5">
              <ToggleButtonGroup
                size="sm"
                selectedKeys={new Set([cellShape])}
                selectionMode="single"
                onSelectionChange={(keys) => {
                  const first = [...keys][0]
                  if (first === undefined) return
                  const hit = CELL_SHAPE_OPTIONS.find((o) => o.value === first)
                  if (hit) setCellShape(hit.value)
                }}
              >
                {CELL_SHAPE_OPTIONS.map((s) => (
                  <ToggleButton
                    key={s.value}
                    id={s.value}
                    className="px-2 font-mono text-xs"
                  >
                    {s.label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
              <ToggleButtonGroup
                size="sm"
                selectedKeys={new Set([String(cellSize)])}
                selectionMode="single"
                onSelectionChange={(keys) => {
                  const first = [...keys][0]
                  if (first === undefined) return
                  const hit = CELL_SIZE_OPTIONS.find(
                    (o) => String(o.value) === String(first),
                  )
                  if (hit) setCellSize(hit.value)
                }}
              >
                {CELL_SIZE_OPTIONS.map((c) => (
                  <ToggleButton
                    key={c.value}
                    id={String(c.value)}
                    className="px-2 font-mono text-xs"
                  >
                    {c.label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </div>
          </div>
        )}
        {initialWaveWidth !== undefined && (
          <ParamGroup<number>
            label="Wave"
            options={WAVE_OPTIONS}
            value={waveWidth}
            onChange={setWaveWidth}
          />
        )}
        {initialBladeCount !== undefined && (
          <ParamGroup<number>
            label="Blades"
            options={BLADE_OPTIONS}
            value={bladeCount}
            onChange={setBladeCount}
          />
        )}
        {initialReverse !== undefined && (
          <ParamGroup<boolean | 'auto'>
            label="Reverse"
            options={REVERSE_OPTIONS}
            value={reverse}
            onChange={setReverse}
          />
        )}
      </div>
    </article>
  )
}

/** 15 种动画的可交互画廊：卡片中央圆形按钮触发（受控模式 × next-themes，与站点主题联动） */
export function GallerySection() {
  const [duration, setDuration] = useState(750)
  const [easing, setEasing] = useState('ease-in-out')

  return (
    <section id="gallery" className="scroll-mt-14 border-t border-border">
      <div className="mx-auto w-full max-w-6xl px-6 py-20 sm:py-24">
        <SectionHeader
          eyebrow="02 / 动画演示"
          sub="点击卡片中央按钮播放动画，方向与参数可在卡内调整。"
          title="Try Different Animations"
        />

        <div className="mx-auto mt-10 flex w-fit max-w-full flex-col items-center gap-2.5 rounded-lg border border-border bg-surface p-5">
          <ParamGroup<number>
            align="center"
            label="duration"
            options={DURATION_PRESETS}
            value={duration}
            onChange={setDuration}
          />
          <ParamGroup<string>
            align="center"
            label="easing"
            options={EASING_PRESETS}
            value={easing}
            onChange={setEasing}
          />
        </div>

        <div className="mx-auto mt-10 grid max-w-6xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ANIMATION_TYPES.map((t) => (
            <GalleryCard
              key={t.type}
              animationType={t.type}
              label={t.label}
              hint={t.hint}
              initialDirection={t.initialDirection}
              initialSlatWidth={t.initialSlatWidth}
              initialCellSize={t.initialCellSize}
              initialCellShape={t.initialCellShape}
              initialWaveWidth={t.initialWaveWidth}
              initialBladeCount={t.initialBladeCount}
              initialReverse={t.initialReverse}
              Icon={t.Icon}
              duration={duration}
              easing={easing}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
