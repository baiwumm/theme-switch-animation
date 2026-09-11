// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { THEME_STORAGE_KEY } from './types'
import {
  applyThemeClass,
  hasThemeClass,
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
})
