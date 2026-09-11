// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { ViewTransitionLike } from '@theme-switch-animation/core'
import { removeAnimationStyle } from '@theme-switch-animation/core'
import { THEME_STORAGE_KEY, ThemeAnimationType, useThemeAnimation } from './index'
import type { UseThemeAnimationOptions } from './index'

function ThemeButton({ options }: { options?: UseThemeAnimationOptions }) {
  const { ref, toggleTheme, isDark } = useThemeAnimation<HTMLButtonElement>(options)
  return (
    <button ref={ref} onClick={toggleTheme} data-testid="toggle">
      {isDark ? '🌙' : '☀️'}
    </button>
  )
}

/** 记录 startViewTransition 收到的转场回调；autoRun 时同步执行（模拟浏览器尽快调用回调），否则由测试手动触发以验证时序 */
function installFakeViewTransition(options: { autoRun?: boolean } = {}) {
  const updates: Array<() => void | Promise<void>> = []
  Object.defineProperty(document, 'startViewTransition', {
    configurable: true,
    writable: true,
    value: (update: () => void | Promise<void>): ViewTransitionLike => {
      updates.push(update)
      if (options.autoRun) {
        void update()
      }
      return { finished: Promise.resolve() }
    },
  })
  return { updates }
}

const html = () => document.documentElement
const getToggle = (container: HTMLElement) =>
  container.querySelector('[data-testid="toggle"]') as HTMLButtonElement

describe('useThemeAnimation（非受控模式）', () => {
  beforeEach(() => {
    localStorage.clear()
    html().className = ''
    delete (document as unknown as Record<string, unknown>).startViewTransition
  })

  afterEach(() => {
    cleanup()
    removeAnimationStyle(document)
  })

  describe('初始状态读取', () => {
    it('没有存储记录：isDark = false，不改 DOM', () => {
      const { container } = render(<ThemeButton />)
      expect(getToggle(container).textContent).toBe('☀️')
      expect(html().classList.contains('dark')).toBe(false)
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
    })

    it('localStorage 为 dark：恢复 isDark = true 并补上 class', () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'dark')
      const { container } = render(<ThemeButton />)
      expect(getToggle(container).textContent).toBe('🌙')
      expect(html().classList.contains('dark')).toBe(true)
    })

    it('localStorage 为 light：清除残留 class', () => {
      html().className = 'dark'
      localStorage.setItem(THEME_STORAGE_KEY, 'light')
      const { container } = render(<ThemeButton />)
      expect(getToggle(container).textContent).toBe('☀️')
      expect(html().classList.contains('dark')).toBe(false)
    })
  })

  describe('降级路径（jsdom 无 View Transitions，即真实浏览器降级形态）', () => {
    it('点击：状态翻转、class 切换、localStorage 写入，一次到位', () => {
      const { container } = render(<ThemeButton />)
      const button = getToggle(container)

      fireEvent.click(button)

      expect(button.textContent).toBe('🌙')
      expect(html().classList.contains('dark')).toBe(true)
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')

      fireEvent.click(button)

      expect(button.textContent).toBe('☀️')
      expect(html().classList.contains('dark')).toBe(false)
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
    })
  })

  describe('flushSync 契约（转场回调内同步完成 class + React 提交）', () => {
    it('截图前 DOM 已更新：回调执行前保持旧主题，执行后 class 与 React 渲染同步变新', () => {
      const { updates } = installFakeViewTransition()
      const { container } = render(<ThemeButton />)
      const button = getToggle(container)

      fireEvent.click(button)

      // 样式已注入、回调已被捕获但尚未执行：DOM 仍是旧主题
      expect(updates).toHaveLength(1)
      expect(document.getElementById('theme-switch-animation')).not.toBeNull()
      expect(html().classList.contains('dark')).toBe(false)
      expect(button.textContent).toBe('☀️')
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()

      // 浏览器执行转场回调：class 切换 + flushSync 提交都在同步代码内完成
      act(() => {
        updates[0]!()
      })

      expect(html().classList.contains('dark')).toBe(true)
      expect(button.textContent).toBe('🌙')
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    })
  })

  describe('动画路径（模拟支持 View Transitions）', () => {
    it.each(Object.values(ThemeAnimationType))('%s：注入对应 keyframes 的临时样式', (type) => {
      installFakeViewTransition({ autoRun: true })
      const { container } = render(
        <ThemeButton options={{ animationType: type, duration: 350, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' }} />,
      )

      fireEvent.click(getToggle(container))

      const style = document.getElementById('theme-switch-animation')
      expect(style).not.toBeNull()
      const css = style!.textContent ?? ''
      expect(css).toContain(`@keyframes theme-switch-${type} {`)
      expect(css).toContain('--theme-switch-duration: 350ms;')
      expect(css).toContain('--theme-switch-easing: cubic-bezier(0.4, 0, 0.2, 1);')
    })

    it('快速连点：以 html class 为准交替翻转，最终状态一致', () => {
      const { updates } = installFakeViewTransition()
      const { container } = render(<ThemeButton />)
      const button = getToggle(container)

      fireEvent.click(button)
      fireEvent.click(button)
      expect(updates).toHaveLength(2)

      // 两个转场回调按浏览器顺序执行：dark → light
      act(() => {
        updates[0]!()
      })
      expect(html().classList.contains('dark')).toBe(true)

      act(() => {
        updates[1]!()
      })
      expect(html().classList.contains('dark')).toBe(false)
      expect(button.textContent).toBe('☀️')
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
    })
  })

  describe('可配置性', () => {
    it('自定义 darkClassName', () => {
      installFakeViewTransition({ autoRun: true })
      const { container } = render(<ThemeButton options={{ darkClassName: 'dark-mode' }} />)

      fireEvent.click(getToggle(container))

      expect(html().classList.contains('dark-mode')).toBe(true)
      expect(html().classList.contains('dark')).toBe(false)
    })

    it('同一页面多个触发器实例不会失步（都以 html class 为准）', () => {
      installFakeViewTransition({ autoRun: true })
      const { container: a } = render(<ThemeButton options={{ animationType: ThemeAnimationType.LTR }} />)
      const { container: b } = render(<ThemeButton options={{ animationType: ThemeAnimationType.RTL }} />)

      fireEvent.click(getToggle(a))
      expect(getToggle(b).textContent).toBe('☀️') // b 尚未点击，自身状态未更新（各自维护 isDark）

      fireEvent.click(getToggle(b))
      expect(html().classList.contains('dark')).toBe(false)
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
    })
  })
})
