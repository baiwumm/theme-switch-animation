'use client'

import { useEffect, useState } from 'react'

import { useTheme } from 'next-themes'
import { ThemeAnimationType, useThemeAnimation } from 'theme-switch-animation/react'

const ANIMATION_TYPES = [
  { type: ThemeAnimationType.CIRCLE, label: 'CIRCLE', hint: '圆形扩散 · 圆心 = 点击位置', pos: 'pos-c' },
  { type: ThemeAnimationType.LTR, label: 'LTR', hint: '从左向右擦除', pos: 'pos-tl' },
  { type: ThemeAnimationType.RTL, label: 'RTL', hint: '从右向左擦除', pos: 'pos-tr' },
  { type: ThemeAnimationType.TTB, label: 'TTB', hint: '从上向下擦除', pos: 'pos-bl' },
  { type: ThemeAnimationType.BTT, label: 'BTT', hint: '从下向上擦除', pos: 'pos-br' },
] as const

/**
 * 受控模式 × next-themes（需求 §6.1）：
 * 库不碰 localStorage、不自行改 class；转场回调内调用 onChange 触发 setTheme，
 * 并经 §5.4 协议等待 next-themes 真实写入 <html> class 后再截图。
 */
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
  const { resolvedTheme, setTheme } = useTheme()
  const { ref, toggleTheme, isDark } = useThemeAnimation({
    animationType,
    darkClassName: 'dark',
    duration: 500,
    isDark: resolvedTheme === 'dark',
    onChange: (next) => setTheme(next ? 'dark' : 'light'),
  })
  return (
    <button ref={ref} className={`switch-button ${pos}`} onClick={toggleTheme}>
      <strong>{label}</strong>
      <span className="hint">{hint}</span>
      <span className="state">{isDark ? '🌙 切到亮色' : '☀️ 切到暗色'}</span>
    </button>
  )
}

/** 全局指示器：直接监听 html class，验证 resolvedTheme / isDark / html class 三者一致（§9-2） */
function useHtmlIsDark() {
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
  return { isDark, resolvedTheme }
}

export function ThemeSwitcher() {
  const { isDark, resolvedTheme } = useHtmlIsDark()
  return (
    <main>
      <h1>theme-switch-animation · Next playground</h1>
      <p className="status">
        受控模式 × next-themes（resolvedTheme: <b>{resolvedTheme ?? '…'}</b>，html class:{' '}
        <b>{isDark ? 'dark' : 'light'}</b>）
      </p>
      <p>
        五个按钮各自是独立的受控 <code>useThemeAnimation</code> 实例：库不写 localStorage、不改 class，
        在转场回调内调用 <code>setTheme</code> 并等待 next-themes 写入 class 后截图。CIRCLE
        的圆心是按钮中心，可验证点击位置跟随。
      </p>
      <div className="grid">
        {ANIMATION_TYPES.map((t) => (
          <ThemeButton key={t.type} animationType={t.type} label={t.label} hint={t.hint} pos={t.pos} />
        ))}
      </div>
      <p className="note">
        验收提示（§9-2）：每次切换蒙版下都应是目标主题截图（不允许“新蒙版展开但底下是旧主题”或白闪）；
        快速连点后 resolvedTheme / isDark / html class 三者应一致。
        DevTools → Rendering → Emulate prefers-reduced-motion 或 CPU 4x/6x throttling + Slow 3G
        可实测 §5.4 协议：dev 环境下超时兜底会输出 console.warn。
      </p>
    </main>
  )
}
