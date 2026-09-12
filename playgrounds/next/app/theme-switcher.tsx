'use client'

import { useEffect, useState } from 'react'

import { useTheme } from 'next-themes'
import { ThemeAnimationType, useThemeAnimation } from 'theme-switch-animation/react'

const ANIMATION_TYPES: Array<{
  type: ThemeAnimationType
  label: string
  hint: string
  duration?: number
}> = [
  { type: ThemeAnimationType.CIRCLE, label: 'CIRCLE', hint: '圆形扩散 · 圆心 = 点击位置' },
  { type: ThemeAnimationType.CIRCLE_REVERT, label: 'CIRCLE_REVERT', hint: '圆形收起/扩散 · 切回亮色收起、切到暗色扩散' },
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
 * 并经 §5.4 协议等待 next-themes 真实写入 <html> class 后再截图。
 */
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
  const mounted = useMounted()
  const { resolvedTheme, setTheme } = useTheme()
  const { ref, toggleTheme, isDark } = useThemeAnimation({
    animationType,
    darkClassName: 'dark',
    duration: duration ?? 500,
    isDark: resolvedTheme === 'dark',
    onChange: (next) => setTheme(next ? 'dark' : 'light'),
  })
  return (
    <button ref={ref} className="switch-button" data-animation-type={animationType} onClick={toggleTheme}>
      <strong>{label}</strong>
      <span className="hint">{hint}</span>
      <span className="state">{mounted ? (isDark ? '🌙 切到亮色' : '☀️ 切到暗色') : '🌗 切换主题'}</span>
    </button>
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
  return (
    <main>
      <h1>theme-switch-animation · Next playground</h1>
      <p className="status">
        受控模式 × next-themes（resolvedTheme: <b>{mounted ? (resolvedTheme ?? '—') : '…'}</b>，html class:{' '}
        <b>{mounted ? (isDark ? 'dark' : 'light') : '…'}</b>）
      </p>
      <p>
        13 个按钮各自是独立的受控 <code>useThemeAnimation</code> 实例：库不写 localStorage、不改 class，
        在转场回调内调用 <code>setTheme</code> 并等待 next-themes 写入 class 后截图。中心扩散类动画的起收点是按钮中心，可验证点击位置跟随。
      </p>
      <div className="grid">
        {ANIMATION_TYPES.map((t) => (
          <ThemeButton key={t.type} animationType={t.type} label={t.label} hint={t.hint} duration={t.duration} />
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
