// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { useLayoutEffect, useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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

  describe('受控模式（§5.2 / §5.4）', () => {
    /**
     * 模拟 next-themes 的外部主题系统：状态在 React 侧，class 由 useLayoutEffect 异步写入
     * （对应 next-themes 的 passive effect），库自身不写 class、不碰 localStorage。
     */
    function ControlledToggle({
      animationType = ThemeAnimationType.LTR,
      onChangeSpy,
    }: {
      animationType?: ThemeAnimationType
      onChangeSpy?: (next: boolean) => void
    }) {
      const [dark, setDark] = useState(false)
      useLayoutEffect(() => {
        document.documentElement.classList.toggle('dark', dark)
      }, [dark])
      const { ref, toggleTheme, isDark } = useThemeAnimation({
        animationType,
        darkClassName: 'dark',
        isDark: dark,
        onChange: (next) => {
          onChangeSpy?.(next)
          setDark(next)
        },
      })
      return (
        <button ref={ref} onClick={toggleTheme} data-testid="toggle">
          {isDark ? '🌙' : '☀️'}
        </button>
      )
    }

    it('isDark + onChange 同时提供：点击只调用 onChange，不碰 localStorage', () => {
      installFakeViewTransition({ autoRun: true })
      const calls: boolean[] = []
      const { container } = render(<ControlledToggle onChangeSpy={(next) => calls.push(next)} />)

      fireEvent.click(getToggle(container))

      expect(calls).toEqual([true])
      // 外部系统（layoutEffect）已写 class，截图时序由协议保证
      expect(html().classList.contains('dark')).toBe(true)
      expect(getToggle(container).textContent).toBe('🌙')
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
    })

    it('库不自行改 class：转场回调内只通知外部，class 由外部写入', () => {
      // 模拟外部系统延迟写入：onChange 后不改 class，验证协议在等外部而不是库自己动手
      installFakeViewTransition({ autoRun: true })
      let externalState = false
      const { container } = render(
        <ThemeButton
          options={{
            isDark: externalState,
            onChange: (next) => {
              externalState = next
            },
          }}
        />,
      )
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

      fireEvent.click(getToggle(container))

      // 该组件未把 isDark 接回状态（仍然 false），库不改 class 也不写 localStorage
      expect(externalState).toBe(true)
      expect(html().classList.contains('dark')).toBe(false)
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
      // isDark 恒为 false → incomplete 不成立（两个都提供了），不应告警
      expect(warn).not.toHaveBeenCalled()
    })

    it('快速连点：onChange 与外部状态、html class 三者一致（§9-2）', () => {
      installFakeViewTransition({ autoRun: true })
      const calls: boolean[] = []
      const { container } = render(<ControlledToggle onChangeSpy={(next) => calls.push(next)} />)

      fireEvent.click(getToggle(container))
      fireEvent.click(getToggle(container))

      expect(calls).toEqual([true, false])
      expect(html().classList.contains('dark')).toBe(false)
      expect(getToggle(container).textContent).toBe('☀️')
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
    })

    it('受控 + 降级路径（无 View Transitions）：onChange 照常调用，状态照常更新', () => {
      const calls: boolean[] = []
      const { container } = render(<ControlledToggle onChangeSpy={(next) => calls.push(next)} />)

      fireEvent.click(getToggle(container))

      expect(calls).toEqual([true])
      expect(html().classList.contains('dark')).toBe(true)
      expect(getToggle(container).textContent).toBe('🌙')
    })

    it('只提供 isDark：dev 环境告警，按非受控处理', () => {
      const proc = (globalThis as unknown as { process: { env: { NODE_ENV?: string } } }).process
      const original = proc.env.NODE_ENV
      proc.env.NODE_ENV = 'development'
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const { container } = render(<ThemeButton options={{ isDark: true }} />)

      expect(warn).toHaveBeenCalledWith(expect.stringContaining('受控模式'))

      // 非受控行为：点击走 class + localStorage
      fireEvent.click(getToggle(container))
      expect(html().classList.contains('dark')).toBe(true)
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')

      proc.env.NODE_ENV = original
    })

    it('只提供 onChange：同样告警并按非受控处理', () => {
      const proc = (globalThis as unknown as { process: { env: { NODE_ENV?: string } } }).process
      const original = proc.env.NODE_ENV
      proc.env.NODE_ENV = 'development'
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const onChange = vi.fn()
      const { container } = render(<ThemeButton options={{ onChange }} />)

      expect(warn).toHaveBeenCalledWith(expect.stringContaining('受控模式'))

      fireEvent.click(getToggle(container))
      expect(onChange).not.toHaveBeenCalled()
      expect(html().classList.contains('dark')).toBe(true)

      proc.env.NODE_ENV = original
    })

    it('契约完整或都缺省时不告警；生产环境不告警', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const proc = (globalThis as unknown as { process: { env: { NODE_ENV?: string } } }).process
      const original = proc.env.NODE_ENV

      render(<ThemeButton options={{ isDark: true, onChange: () => {} }} />)
      render(<ThemeButton />)
      expect(warn).not.toHaveBeenCalled()
      cleanup()

      proc.env.NODE_ENV = 'production'
      const incomplete = render(<ThemeButton options={{ isDark: true }} />)
      expect(warn).not.toHaveBeenCalled()
      incomplete.unmount()

      proc.env.NODE_ENV = original
    })
  })
})
