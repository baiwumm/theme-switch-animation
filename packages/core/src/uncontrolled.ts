import { THEME_STORAGE_KEY } from './types'

/** localStorage 中持久化的取值 */
export type StoredTheme = 'light' | 'dark'

function getStorage(doc: Document): Storage | null {
  try {
    return doc.defaultView?.localStorage ?? null
  } catch {
    // 隐私模式 / 禁用存储 / 跨域 iframe 等场景访问 localStorage 本身会抛错
    return null
  }
}

/** 读取持久化的主题；没有记录或值非法时返回 null */
export function readStoredTheme(doc: Document, key: string = THEME_STORAGE_KEY): StoredTheme | null {
  try {
    const raw = getStorage(doc)?.getItem(key)
    return raw === 'dark' || raw === 'light' ? raw : null
  } catch {
    return null
  }
}

/** 持久化主题；存储不可用时静默 */
export function writeStoredTheme(doc: Document, isDark: boolean, key: string = THEME_STORAGE_KEY): void {
  try {
    getStorage(doc)?.setItem(key, isDark ? 'dark' : 'light')
  } catch {
    // 配额耗尽 / 只读存储：状态仍以 class 为准，不影响本次切换
  }
}

export function hasThemeClass(doc: Document, className: string): boolean {
  return doc.documentElement.classList.contains(className)
}

/** 把 `documentElement` 上的暗色类名对齐到 `isDark`，不触碰其他 class */
export function applyThemeClass(doc: Document, isDark: boolean, className: string): void {
  doc.documentElement.classList.toggle(className, isDark)
}

/**
 * 挂载时恢复主题：读 localStorage，把 class 对齐到存储值并返回当前暗色状态。
 * 没有记录时返回 null 且不改动 DOM（沿用页面初始状态）。
 */
export function syncThemeOnMount(doc: Document, className: string, key: string = THEME_STORAGE_KEY): boolean | null {
  const stored = readStoredTheme(doc, key)
  if (stored === null) return null
  const isDark = stored === 'dark'
  applyThemeClass(doc, isDark, className)
  return isDark
}
