import { useEffect, useState } from 'react'
import {
  ThemeAnimationDirection,
  ThemeAnimationType,
  observeThemeClass,
  useThemeAnimation,
} from 'theme-switch-animation/react'

const ANIMATION_TYPES: Array<{
  type: ThemeAnimationType
  label: string
  hint: string
  /** 消费 direction 的类型：卡片下方渲染独立的方向选择按钮 */
  initialDirection?: ThemeAnimationDirection
  /** 仅 BLINDS：卡片下方渲染叶宽选择按钮 */
  initialSlatWidth?: number
}> = [
  { type: ThemeAnimationType.CIRCLE, label: 'CIRCLE', hint: '圆形扩散 · 圆心 = 点击位置' },
  { type: ThemeAnimationType.CIRCLE_REVERT, label: 'CIRCLE_REVERT', hint: '圆形收起/扩散 · 切回亮色收起、切到暗色扩散' },
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

/** 全局指示器：复用库导出的 observeThemeClass——html class 事实源观察器（非受控多实例同步同款机制） */
function useHtmlIsDark(className = 'dark') {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains(className))
  useEffect(() => {
    return observeThemeClass(document, className, setIsDark)
  }, [className])
  return isDark
}

function ThemeButton({
  animationType,
  label,
  hint,
  initialDirection,
  initialSlatWidth,
  duration,
  easing,
}: {
  animationType: ThemeAnimationType
  label: string
  hint: string
  initialDirection?: ThemeAnimationDirection
  initialSlatWidth?: number
  duration: number
  easing: string
}) {
  const [direction, setDirection] = useState<ThemeAnimationDirection>(initialDirection ?? ThemeAnimationDirection.LTR)
  const [slatWidth, setSlatWidth] = useState(initialSlatWidth ?? 72)
  const { ref, toggleTheme, isDark } = useThemeAnimation<HTMLButtonElement>({
    animationType,
    direction,
    slatWidth,
    duration,
    easing,
  })
  return (
    <div className="switch-card">
      <button ref={ref} className="switch-button" data-animation-type={animationType} onClick={toggleTheme}>
        <strong>{label}</strong>
        <span className="hint">{hint}</span>
        <span className="state">{isDark ? '🌙 切到亮色' : '☀️ 切到暗色'}</span>
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
    </div>
  )
}

export default function App() {
  const isDark = useHtmlIsDark()
  const [duration, setDuration] = useState(750)
  const [easing, setEasing] = useState('ease-in-out')
  return (
    <main>
      <h1>theme-switch-animation · React playground</h1>
      <p className="status">
        当前主题（MutationObserver 读取 <code>&lt;html&gt;</code> class）：<b>{isDark ? '🌙 暗色' : '☀️ 亮色'}</b>
      </p>
      <p>
        12 个按钮各自是一个独立的 <code>useThemeAnimation</code> 实例——非受控模式下所有实例的{' '}
        <code>isDark</code> 以 <code>&lt;html&gt;</code> class 为事实源自动镜像（库内{' '}
        <code>observeThemeClass</code>），其它标签页的切换经 storage 事件同步。中心扩散类动画（CIRCLE /
        形状 / BLUR / REVERT）的起收点都是按钮中心：在不同位置点击可验证跟随效果。BLINDS / SCAN / QR_GRID
        卡片下方各有独立的 direction 选择，只影响本卡片。
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
            duration={duration}
            easing={easing}
          />
        ))}
      </div>
      <p className="note">
        View Transitions API 支持范围：Chrome / Edge 111+、Safari 18+、Firefox 144+；不支持的浏览器或系统开启
        “减少动态效果”时自动降级为直接切换（状态仍然正确）。Playwright 的 Firefox 内核可能未启用 View
        Transitions，Firefox 请用真机手动验证。
      </p>
    </main>
  )
}
