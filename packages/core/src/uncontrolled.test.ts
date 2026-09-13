// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { THEME_STORAGE_KEY } from './types'
import {
  applyThemeClass,
  hasThemeClass,
  observeThemeClass,
  readStoredTheme,
  syncThemeOnMount,
  writeStoredTheme,
} from './uncontrolled'

describe('uncontrolled（非受控状态：localStorage + class）', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ''
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('readStoredTheme / writeStoredTheme', () => {
    it('默认 key 为 theme-switch-animation，值为 dark / light', () => {
      writeStoredTheme(document, true)
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
      expect(readStoredTheme(document)).toBe('dark')

      writeStoredTheme(document, false)
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
      expect(readStoredTheme(document)).toBe('light')
    })

    it('没有记录或值非法时返回 null', () => {
      expect(readStoredTheme(document)).toBeNull()
      localStorage.setItem(THEME_STORAGE_KEY, 'blue')
      expect(readStoredTheme(document)).toBeNull()
    })

    it('支持自定义 key', () => {
      writeStoredTheme(document, true, 'custom-key')
      expect(localStorage.getItem('custom-key')).toBe('dark')
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
      expect(readStoredTheme(document, 'custom-key')).toBe('dark')
    })

    it('localStorage 不可用（访问即抛错）时读返回 null、写静默', () => {
      const win = {
        get localStorage(): Storage {
          throw new Error('SecurityError')
        },
      }
      const doc = { defaultView: win, documentElement: document.documentElement } as unknown as Document
      expect(readStoredTheme(doc)).toBeNull()
      expect(() => writeStoredTheme(doc, true)).not.toThrow()
    })

    it('setItem 抛错（配额耗尽）时静默', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError')
      })
      expect(() => writeStoredTheme(document, true)).not.toThrow()
    })

    it('没有 defaultView（脱离窗口的 document）时视为无存储', () => {
      const doc = { defaultView: null, documentElement: document.documentElement } as unknown as Document
      expect(readStoredTheme(doc)).toBeNull()
      expect(() => writeStoredTheme(doc, true)).not.toThrow()
    })
  })

  describe('applyThemeClass / hasThemeClass', () => {
    it('按 isDark 增删暗色类名，不影响其他 class', () => {
      document.documentElement.className = 'keep-me'
      applyThemeClass(document, true, 'dark')
      expect(document.documentElement.className.split(' ').sort()).toEqual(['dark', 'keep-me'])
      expect(hasThemeClass(document, 'dark')).toBe(true)

      applyThemeClass(document, false, 'dark')
      expect(document.documentElement.className).toBe('keep-me')
      expect(hasThemeClass(document, 'dark')).toBe(false)
    })

    it('重复应用同一状态是幂等的', () => {
      applyThemeClass(document, true, 'dark')
      applyThemeClass(document, true, 'dark')
      expect(document.documentElement.classList.length).toBe(1)
    })

    it('支持自定义类名（如 color-mode 的 dark-mode）', () => {
      applyThemeClass(document, true, 'dark-mode')
      expect(hasThemeClass(document, 'dark-mode')).toBe(true)
      expect(hasThemeClass(document, 'dark')).toBe(false)
    })
  })

  describe('syncThemeOnMount（挂载时恢复）', () => {
    it('存储为 dark：补上 class 并返回 true', () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'dark')
      expect(syncThemeOnMount(document, 'dark')).toBe(true)
      expect(hasThemeClass(document, 'dark')).toBe(true)
    })

    it('存储为 light：移除残留 class 并返回 false', () => {
      document.documentElement.className = 'dark'
      localStorage.setItem(THEME_STORAGE_KEY, 'light')
      expect(syncThemeOnMount(document, 'dark')).toBe(false)
      expect(hasThemeClass(document, 'dark')).toBe(false)
    })

    it('没有记录：返回 null 且不改动 DOM', () => {
      document.documentElement.className = 'dark'
      expect(syncThemeOnMount(document, 'dark')).toBeNull()
      expect(hasThemeClass(document, 'dark')).toBe(true)
    })
  })

  describe('observeThemeClass（html class 事实源观察，多实例 / 跨标签页同步）', () => {
    /** MutationObserver 回调在微任务结算：推一拍让断言观察到 */
    const flushObservers = async () => {
      await Promise.resolve()
      await Promise.resolve()
    }

    it('立即回调一次当前状态；class 变化时再次回调', async () => {
      document.documentElement.className = 'dark'
      const seen: boolean[] = []
      const stop = observeThemeClass(document, 'dark', (dark) => seen.push(dark))
      expect(seen).toEqual([true])

      applyThemeClass(document, false, 'dark')
      await flushObservers()
      expect(seen).toEqual([true, false])

      applyThemeClass(document, true, 'dark')
      await flushObservers()
      expect(seen).toEqual([true, false, true])
      stop()
    })

    it('无关 class 变化不触发（attributeFilter 限定 class，但过滤目标类名）', async () => {
      const seen: boolean[] = []
      const stop = observeThemeClass(document, 'dark', (dark) => seen.push(dark))
      document.documentElement.classList.add('other')
      await flushObservers()
      expect(seen).toEqual([false])
      stop()
    })

    it('停止后 class 变化不再回调', async () => {
      const seen: boolean[] = []
      const stop = observeThemeClass(document, 'dark', (dark) => seen.push(dark))
      stop()
      applyThemeClass(document, true, 'dark')
      await flushObservers()
      expect(seen).toEqual([false])
    })

    it('storage 事件（其它标签页切换）：同 key 触发回读，异 key 忽略', async () => {
      const seen: boolean[] = []
      const stop = observeThemeClass(document, 'dark', (dark) => seen.push(dark))

      window.dispatchEvent(new StorageEvent('storage', { key: 'other-key' }))
      await flushObservers()
      expect(seen).toEqual([false])

      localStorage.setItem(THEME_STORAGE_KEY, 'dark')
      window.dispatchEvent(new StorageEvent('storage', { key: THEME_STORAGE_KEY }))
      await flushObservers()
      expect(seen).toEqual([false]) // class 未变：回读去重，不重复回调

      document.documentElement.classList.add('dark')
      window.dispatchEvent(new StorageEvent('storage', { key: THEME_STORAGE_KEY }))
      await flushObservers()
      expect(seen).toEqual([false, true])
      stop()
    })
  })
})
