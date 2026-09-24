'use client'

import { useEffect, useState } from 'react'

import { useTheme } from 'next-themes'
import { ThemeAnimationDirection, ThemeAnimationType, useThemeAnimation } from 'theme-switch-animation/react'

const ANIMATION_TYPES: Array<{
  type: ThemeAnimationType
  label: string
  hint: string
  /** 消费 direction 的类型：卡片下方渲染独立的方向选择按钮 */
  initialDirection?: ThemeAnimationDirection
  /** 仅 BLINDS：卡片下方渲染叶宽选择按钮 */
  initialSlatWidth?: number
  /** 仅 RIPPLE：卡片下方渲染波长选择按钮 */
  initialWaveWidth?: number
  /** 仅 FAN：卡片下方渲染扇叶数选择按钮 */
  initialBladeCount?: number
  /** 仅 CIRCLE（reverse 已接通的类型）：卡片下方渲染反向三档按钮 */
  initialReverse?: boolean | 'auto'
}> = [
  { type: ThemeAnimationType.CIRCLE, label: 'CIRCLE', hint: '圆形扩散 · 圆心 = 点击位置', initialReverse: false },
  { type: ThemeAnimationType.CIRCLE_REVERT, label: 'CIRCLE_REVERT', hint: '已废弃 · 等价于 CIRCLE + reverse:auto' },
  { type: ThemeAnimationType.CIRCLE_BLUR, label: 'CIRCLE_BLUR', hint: '圆形模糊扩散 · 边缘高斯模糊' },
  { type: ThemeAnimationType.SQUARE, label: 'SQUARE', hint: '正方形扩散' },
  { type: ThemeAnimationType.DIAMOND, label: 'DIAMOND', hint: '菱形扩散' },
  { type: ThemeAnimationType.RECTANGLE, label: 'RECTANGLE', hint: '矩形扩散 · 贴合视口比例' },
  { type: ThemeAnimationType.HEXAGON, label: 'HEXAGON', hint: '六边形扩散 · 尖顶朝上' },
  { type: ThemeAnimationType.TRIANGLE, label: 'TRIANGLE', hint: '三角形扩散 · 顶点朝上' },
  { type: ThemeAnimationType.STAR, label: 'STAR', hint: '五角星扩散 · 顶点朝上' },
  { type: ThemeAnimationType.BLINDS, label: 'BLINDS', hint: '百叶窗 · 叶片逐条揭开，direction 控方向', initialDirection: ThemeAnimationDirection.LTR, initialSlatWidth: 72 },
  { type: ThemeAnimationType.SCAN, label: 'SCAN', hint: '扫描 · 硬边扫开 + 前缘光束，direction 控方向', initialDirection: ThemeAnimationDirection.TTB },
  { type: ThemeAnimationType.QR_GRID, label: 'QR_GRID', hint: '方块格子 · 方块逐格生长，direction 控方位', initialDirection: ThemeAnimationDirection.LTR },
  { type: ThemeAnimationType.RIPPLE, label: 'RIPPLE', hint: '水滴涟漪 · 环带前缘向外推，waveWidth 控波长', initialWaveWidth: 18 },
  { type: ThemeAnimationType.CLOCK_SWEEP, label: 'CLOCK_SWEEP', hint: '时钟扇形 · 自 12 点顺时针扫开' },
  { type: ThemeAnimationType.FAN, label: 'FAN', hint: '扇叶旋开 · bladeCount 控扇叶数，reverse 改为合拢', initialBladeCount: 8, initialReverse: false },
  { type: ThemeAnimationType.CURTAIN, label: 'CURTAIN', hint: '双开门 · 中线向两侧推开' },
]

/** duration / easing 全局预设：选中后所有按钮的下一次切换立即生效 */
const DURATION_PRESETS = [
  { value: 500, label: '500ms · 快' },
  { value: 750, label: '750ms · 标准' },
  { value: 1000, label: '1000ms · 慢' },
]
const EASING_PRESETS = [
  { value: 'ease-in-out', label: 'ease-in-out' },
  { value: 'cubic-bezier(0.4, 0, 0.2, 1)', label: 'cubic-bezier' },
  { value: 'linear', label: 'linear · 匀速' },
]
/** 方向选择：每张卡片独立持有状态，互不影响 */
const DIRECTION_OPTIONS: ReadonlyArray<{ value: ThemeAnimationDirection; label: string }> = [
  { value: ThemeAnimationDirection.LTR, label: 'LTR' },
  { value: ThemeAnimationDirection.RTL, label: 'RTL' },
  { value: ThemeAnimationDirection.TTB, label: 'TTB' },
  { value: ThemeAnimationDirection.BTT, label: 'BTT' },
]
/** 叶宽档位（px，合法区间 [16, 200]）：仅 BLINDS 卡片展示 */
const SLAT_OPTIONS: ReadonlyArray<{ value: number; label: string }> = [
  { value: 32, label: '32px' },
  { value: 72, label: '72px' },
  { value: 128, label: '128px' },
]
/** 波长档位（px，合法区间 [8, 60]）：仅 RIPPLE 卡片展示，间距即相邻两圈波峰的距离 */
const WAVE_OPTIONS: ReadonlyArray<{ value: number; label: string }> = [
  { value: 10, label: '10px' },
  { value: 18, label: '18px' },
  { value: 34, label: '34px' },
]
/** 扇叶数档位（[4, 16] 的整数）：仅 FAN 卡片展示，每片周期 = 360° / 片数 */
const BLADE_OPTIONS: ReadonlyArray<{ value: number; label: string }> = [
  { value: 6, label: '6' },
  { value: 8, label: '8' },
  { value: 12, label: '12' },
]

/**
 * reverse 三档：仅 CIRCLE 卡片展示。与 direction 正交——direction 定推进轴，
 * reverse 定从内还是从外揭开；auto = 切暗正向、切亮收起（旧 CIRCLE_REVERT 的行为）。
 */
const REVERSE_OPTIONS: ReadonlyArray<{ value: boolean | 'auto'; label: string }> = [
  { value: false, label: 'off' },
  { value: true, label: 'on' },
  { value: 'auto', label: 'auto' },
]

/**
 * next-themes 的 SSR 约定：`resolvedTheme` 在服务端为 undefined，而客户端水合渲染期间
 * Provider 的 useState 初始化器会同步读 localStorage（存了 dark 时首帧即 'dark'），
 * 因此任何直接渲染 resolvedTheme 的文本都会造成服务端/客户端不一致（hydration 报错）。
 * 官方模式：挂载前渲染与主题无关的中性文案。
 */
function useMounted() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return mounted
}

/**
 * 受控模式 × next-themes（需求 §6.1）：
 * 库不碰 localStorage、不自行改 class；转场回调内调用 onChange 触发 setTheme，
 * 并经 §5.4 协议等待 next-themes 真实写入 <html> class 后再截图；
 * 300ms 未同步到位时跳过动画直切（SKIP_TRANSITION，不播放"旧→旧"空转）。
 */
function ThemeButton({
  animationType,
  label,
  hint,
  initialDirection,
  initialSlatWidth,
  initialWaveWidth,
  initialBladeCount,
  initialReverse,
  duration,
  easing,
}: {
  animationType: ThemeAnimationType
  label: string
  hint: string
  initialDirection?: ThemeAnimationDirection
  initialSlatWidth?: number
  initialWaveWidth?: number
  initialBladeCount?: number
  initialReverse?: boolean | 'auto'
  duration: number
  easing: string
}) {
  const mounted = useMounted()
  const [direction, setDirection] = useState<ThemeAnimationDirection>(initialDirection ?? ThemeAnimationDirection.LTR)
  const [slatWidth, setSlatWidth] = useState(initialSlatWidth ?? 72)
  const [waveWidth, setWaveWidth] = useState(initialWaveWidth ?? 18)
  const [bladeCount, setBladeCount] = useState(initialBladeCount ?? 8)
  const [reverse, setReverse] = useState<boolean | 'auto'>(initialReverse ?? false)
  const { resolvedTheme, setTheme } = useTheme()
  const { ref, toggleTheme, isDark } = useThemeAnimation({
    animationType,
    direction,
    slatWidth,
    waveWidth,
    bladeCount,
    reverse,
    darkClassName: 'dark',
    duration,
    easing,
    isDark: resolvedTheme === 'dark',
    onChange: (next) => setTheme(next ? 'dark' : 'light'),
  })
  return (
    <div className="switch-card">
      <button ref={ref} className="switch-button" data-animation-type={animationType} onClick={toggleTheme}>
        <strong>{label}</strong>
        <span className="hint">{hint}</span>
        <span className="state">{mounted ? (isDark ? '🌙 切到亮色' : '☀️ 切到暗色') : '🌗 切换主题'}</span>
      </button>
      {initialDirection !== undefined && (
        <div className="directions" role="group" aria-label={`${label} direction`}>
          <span>direction</span>
          {DIRECTION_OPTIONS.map((d) => (
            <button
              key={d.value}
              type="button"
              className={`chip chip-sm${direction === d.value ? ' active' : ''}`}
              onClick={() => setDirection(d.value)}
            >
              {d.label}
            </button>
          ))}
        </div>
      )}
      {initialSlatWidth !== undefined && (
        <div className="slats" role="group" aria-label={`${label} slatWidth`}>
          <span>slatWidth</span>
          {SLAT_OPTIONS.map((s) => (
            <button
              key={s.value}
              type="button"
              className={`chip chip-sm${slatWidth === s.value ? ' active' : ''}`}
              onClick={() => setSlatWidth(s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
      {initialWaveWidth !== undefined && (
        <div className="slats" role="group" aria-label={`${label} waveWidth`}>
          <span>waveWidth</span>
          {WAVE_OPTIONS.map((w) => (
            <button
              key={w.value}
              type="button"
              className={`chip chip-sm${waveWidth === w.value ? ' active' : ''}`}
              onClick={() => setWaveWidth(w.value)}
            >
              {w.label}
            </button>
          ))}
        </div>
      )}
      {initialBladeCount !== undefined && (
        <div className="slats" role="group" aria-label={`${label} bladeCount`}>
          <span>bladeCount</span>
          {BLADE_OPTIONS.map((b) => (
            <button
              key={b.value}
              type="button"
              className={`chip chip-sm${bladeCount === b.value ? ' active' : ''}`}
              onClick={() => setBladeCount(b.value)}
            >
              {b.label}
            </button>
          ))}
        </div>
      )}
      {initialReverse !== undefined && (
        <div className="slats" role="group" aria-label={`${label} reverse`}>
          <span>reverse</span>
          {REVERSE_OPTIONS.map((r) => (
            <button
              key={String(r.value)}
              type="button"
              className={`chip chip-sm${reverse === r.value ? ' active' : ''}`}
              onClick={() => setReverse(r.value)}
            >
              {r.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** 全局指示器：直接监听 html class，验证 resolvedTheme / isDark / html class 三者一致（§9-2） */
function useHtmlIsDark() {
  const mounted = useMounted()
  const [isDark, setIsDark] = useState(false)
  const { resolvedTheme } = useTheme()
  useEffect(() => {
    const read = () => setIsDark(document.documentElement.classList.contains('dark'))
    read()
    const observer = new MutationObserver(read)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    setIsDark(resolvedTheme === 'dark')
  }, [resolvedTheme])
  return { mounted, isDark, resolvedTheme }
}

export function ThemeSwitcher() {
  const { mounted, isDark, resolvedTheme } = useHtmlIsDark()
  const [duration, setDuration] = useState(750)
  const [easing, setEasing] = useState('ease-in-out')
  return (
    <main>
      <h1>theme-switch-animation · Next playground</h1>
      <p className="status">
        受控模式 × next-themes（resolvedTheme: <b>{mounted ? (resolvedTheme ?? '—') : '…'}</b>，html class:{' '}
        <b>{mounted ? (isDark ? 'dark' : 'light') : '…'}</b>）
      </p>
      <p>
        16 个按钮各自是独立的受控 <code>useThemeAnimation</code> 实例：库不写 localStorage、不改 class，
        在转场回调内调用 <code>setTheme</code> 并等待 next-themes 写入 class 后截图（300ms 未同步则自动直切）。
        中心扩散与角度扫开类动画（含 RIPPLE / CLOCK_SWEEP / FAN）的起收点是按钮中心，可验证点击位置跟随；BLINDS / SCAN /
        QR_GRID / CURTAIN 不读触发元素几何。前一组卡片下方各有独立的 direction 选择，RIPPLE 另有 waveWidth 档位、FAN
        另有 bladeCount 档位，都只影响本卡片。
      </p>
      <div className="presets" role="group" aria-label="duration 预设">
        <span>duration</span>
        {DURATION_PRESETS.map((p) => (
          <button
            key={p.value}
            className={`chip${duration === p.value ? ' active' : ''}`}
            onClick={() => setDuration(p.value)}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="presets" role="group" aria-label="easing 预设">
        <span>easing</span>
        {EASING_PRESETS.map((p) => (
          <button
            key={p.value}
            className={`chip${easing === p.value ? ' active' : ''}`}
            onClick={() => setEasing(p.value)}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="grid">
        {ANIMATION_TYPES.map((t) => (
          <ThemeButton
            key={t.type}
            animationType={t.type}
            label={t.label}
            hint={t.hint}
            initialDirection={t.initialDirection}
            initialSlatWidth={t.initialSlatWidth}
            initialWaveWidth={t.initialWaveWidth}
            initialBladeCount={t.initialBladeCount}
            initialReverse={t.initialReverse}
            duration={duration}
            easing={easing}
          />
        ))}
      </div>
      <p className="note">
        验收提示（§9-2）：每次切换蒙版下都应是目标主题截图（不允许“新蒙版展开但底下是旧主题”或白闪）；
        快速连点后 resolvedTheme / isDark / html class 三者应一致。
        DevTools → Rendering → Emulate prefers-reduced-motion 或 CPU 4x/6x throttling + Slow 3G
        可实测 §5.4 协议：dev 环境下超时兜底输出 console.warn，且转场直接跳过（不再播放旧→旧空转动画）。
      </p>
    </main>
  )
}
