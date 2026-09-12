import { useEffect, useState } from 'react'
import { ThemeAnimationType, useThemeAnimation } from 'theme-switch-animation/react'

const ANIMATION_TYPES: Array<{
  type: ThemeAnimationType
  label: string
  hint: string
  duration?: number
}> = [
  { type: ThemeAnimationType.CIRCLE, label: 'CIRCLE', hint: '圆形扩散 · 圆心 = 点击位置' },
  { type: ThemeAnimationType.CIRCLE_REVERT, label: 'CIRCLE_REVERT', hint: '圆形收起 · 旧主题收缩进点击点' },
  { type: ThemeAnimationType.CIRCLE_BLUR, label: 'CIRCLE_BLUR', hint: '圆形模糊扩散 · 边缘高斯模糊', duration: 750 },
  { type: ThemeAnimationType.LTR, label: 'LTR', hint: '从左向右擦除' },
  { type: ThemeAnimationType.RTL, label: 'RTL', hint: '从右向左擦除' },
  { type: ThemeAnimationType.TTB, label: 'TTB', hint: '从上向下擦除' },
  { type: ThemeAnimationType.BTT, label: 'BTT', hint: '从下向上擦除' },
  { type: ThemeAnimationType.SQUARE, label: 'SQUARE', hint: '正方形扩散' },
  { type: ThemeAnimationType.DIAMOND, label: 'DIAMOND', hint: '菱形扩散' },
  { type: ThemeAnimationType.RECTANGLE, label: 'RECTANGLE', hint: '矩形扩散 · 贴合视口比例' },
  { type: ThemeAnimationType.HEXAGON, label: 'HEXAGON', hint: '六边形扩散 · 尖顶朝上' },
  { type: ThemeAnimationType.TRIANGLE, label: 'TRIANGLE', hint: '三角形扩散 · 顶点朝上' },
  { type: ThemeAnimationType.STAR, label: 'STAR', hint: '五角星扩散 · 顶点朝上' },
]

/** 全局指示器：直接监听 html class，任何实例切换后所有指示器同步 */
function useHtmlIsDark(className = 'dark') {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains(className))
  useEffect(() => {
    const read = () => setIsDark(document.documentElement.classList.contains(className))
    read()
    const observer = new MutationObserver(read)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [className])
  return isDark
}

function ThemeButton({
  animationType,
  label,
  hint,
  duration,
}: {
  animationType: ThemeAnimationType
  label: string
  hint: string
  duration?: number
}) {
  const { ref, toggleTheme, isDark } = useThemeAnimation<HTMLButtonElement>({
    animationType,
    duration: duration ?? 500,
  })
  return (
    <button ref={ref} className="switch-button" data-animation-type={animationType} onClick={toggleTheme}>
      <strong>{label}</strong>
      <span className="hint">{hint}</span>
      <span className="state">{isDark ? '🌙 切到亮色' : '☀️ 切到暗色'}</span>
    </button>
  )
}

export default function App() {
  const isDark = useHtmlIsDark()
  return (
    <main>
      <h1>theme-switch-animation · React playground</h1>
      <p className="status">
        当前主题（MutationObserver 读取 <code>&lt;html&gt;</code> class）：<b>{isDark ? '🌙 暗色' : '☀️ 亮色'}</b>
      </p>
      <p>
        13 个按钮各自是一个独立的 <code>useThemeAnimation</code> 实例（状态以 <code>&lt;html&gt;</code> class
        为准，互相不会失步）。中心扩散类动画（CIRCLE / 形状 / BLUR / REVERT）的起收点都是按钮中心：在不同位置点击可验证跟随效果。
      </p>
      <div className="grid">
        {ANIMATION_TYPES.map((t) => (
          <ThemeButton key={t.type} animationType={t.type} label={t.label} hint={t.hint} duration={t.duration} />
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
