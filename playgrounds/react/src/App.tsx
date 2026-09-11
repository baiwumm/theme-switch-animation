import { useEffect, useState } from 'react'
import { ThemeAnimationType, useThemeAnimation } from 'theme-switch-animation/react'

const ANIMATION_TYPES = [
  { type: ThemeAnimationType.CIRCLE, label: 'CIRCLE', hint: '圆形扩散 · 圆心 = 点击位置', pos: 'pos-c' },
  { type: ThemeAnimationType.LTR, label: 'LTR', hint: '从左向右擦除', pos: 'pos-tl' },
  { type: ThemeAnimationType.RTL, label: 'RTL', hint: '从右向左擦除', pos: 'pos-tr' },
  { type: ThemeAnimationType.TTB, label: 'TTB', hint: '从上向下擦除', pos: 'pos-bl' },
  { type: ThemeAnimationType.BTT, label: 'BTT', hint: '从下向上擦除', pos: 'pos-br' },
] as const

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
  pos,
}: {
  animationType: ThemeAnimationType
  label: string
  hint: string
  pos: string
}) {
  const { ref, toggleTheme, isDark } = useThemeAnimation<HTMLButtonElement>({
    animationType,
    duration: 500,
  })
  return (
    <button ref={ref} className={`switch-button ${pos}`} onClick={toggleTheme}>
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
        五个按钮各自是一个独立的 <code>useThemeAnimation</code> 实例（状态以 <code>&lt;html&gt;</code> class
        为准，互相不会失步）。CIRCLE 的圆心是按钮中心：分别点四角与中间，可以验证扩散起点跟随点击位置。
      </p>
      <div className="grid">
        {ANIMATION_TYPES.map((t) => (
          <ThemeButton key={t.type} animationType={t.type} label={t.label} hint={t.hint} pos={t.pos} />
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
