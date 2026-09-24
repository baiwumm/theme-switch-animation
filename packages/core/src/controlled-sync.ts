import { hasThemeClass } from './uncontrolled'
import { isDevEnvironment } from './types'

/**
 * 受控模式同步协议的兜底超时（§5.4 v1.1 修订 #1）。
 * MutationObserver 是 DOM 变更后的微任务，通常远快于此值；
 * next-themes（passive effect）与 @nuxtjs/color-mode（插件 watch）写 class 也很快，
 * 但并非绝对，300ms 提供余量。若实测频繁触发超时，按 §5.4 备选方案切换混合模式。
 */
export const THEME_SYNC_TIMEOUT_MS = 300

export interface WaitForThemeSyncOptions {
  doc: Document
  /** 外部主题系统持有的暗色类名 */
  darkClassName: string
  /** 本次切换期望达到的暗色状态 */
  nextIsDark: boolean
  /** 兜底超时 ms，默认 300 */
  timeoutMs?: number
}

/**
 * 受控模式同步协议（§5.4）：等待外部主题系统把 DOM 真实改写后再让浏览器截图。
 *
 * - 监听 `documentElement` 的 class 与 `data-*` 属性变化（next-themes / color-mode
 *   可能以 `attribute="class"` 或 `attribute="data-theme"` 任一形式写入）；
 * - class 翻转到期望状态，或任意 `data-*` 属性变化 → resolve(true)；
 * - 超时（默认 300ms）前再复查一次目标状态（观察回调异常或极端时序下 class
 *   恰在定时器刻度写入时的兜底），仍未达成 → resolve(false)：调用方应返回
 *   SKIP_TRANSITION 让转场跳过——此刻新截图必然还是旧主题，播放动画只会
 *   得到一段"旧→旧"的空转，不如直切；
 * - 目标状态已达成（同步写入的外部系统）→ 立即 resolve(true)。
 *
 * 库自身不改 class、不碰 localStorage——DOM 归属外部，这里只"等"。
 */
export function waitForThemeSync({
  doc,
  darkClassName,
  nextIsDark,
  timeoutMs = THEME_SYNC_TIMEOUT_MS,
}: WaitForThemeSyncOptions): Promise<boolean> {
  const synced = () => hasThemeClass(doc, darkClassName) === nextIsDark

  if (synced()) return Promise.resolve(true)

  // 无 MutationObserver 的环境无法等待：立即放行，等同超时降级，保证不悬挂
  if (typeof MutationObserver === 'undefined') return Promise.resolve(false)

  return new Promise<boolean>((resolve) => {
    let settled = false
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        const name = mutation.attributeName
        if (name === 'class' && synced()) return settle(true)
        if (name !== null && name.startsWith('data-')) return settle(true)
      }
    })
    const timer = setTimeout(() => settle(synced()), timeoutMs)

    function settle(value: boolean): void {
      if (settled) return
      settled = true
      observer.disconnect()
      clearTimeout(timer)
      if (!value && isDevEnvironment()) {
        console.warn(
          `[theme-switch-animation] ${timeoutMs}ms 内未观察到主题同步（class 或 data-* 变化），本次切换跳过动画、直切处理。`,
        )
      }
      resolve(value)
    }

    observer.observe(doc.documentElement, { attributes: true })
  })
}
