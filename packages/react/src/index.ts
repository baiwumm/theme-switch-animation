'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { flushSync } from 'react-dom'

import {
  SKIP_TRANSITION,
  THEME_STORAGE_KEY,
  ThemeAnimationDirection,
  ThemeAnimationType,
  applyThemeClass,
  hasThemeClass,
  observeThemeClass,
  resolveAnimationOptions,
  runThemeTransition,
  syncThemeOnMount,
  waitForThemeSync,
  writeStoredTheme,
} from '@theme-switch-animation/core'
import type {
  ResolvedAnimationOptions,
  ThemeAnimationOptions,
} from '@theme-switch-animation/core'

// 先 import 再 export（而非 `export … from`）：dts 打包时 core 的类型才会被内联进 react.d.ts，
// 而不是留下一个指向私有 workspace 包的引用。
export { SKIP_TRANSITION, THEME_STORAGE_KEY, ThemeAnimationDirection, ThemeAnimationType, observeThemeClass }
export type { ResolvedAnimationOptions, ThemeAnimationOptions }

export type UseThemeAnimationOptions = ThemeAnimationOptions

export interface UseThemeAnimationResult<T extends HTMLElement = HTMLButtonElement> {
  /** 挂到触发元素上；CIRCLE 以该元素中心为圆心 */
  ref: RefObject<T | null>
  toggleTheme: () => void
  isDark: boolean
  /**
   * 最近一次切换的动画结束 Promise（点击触发的那次渲染更新后读取到最新值）。
   * 降级（无动画）时立即结算；错误已在库内消化，不会 reject。
   */
  finished: Promise<void>
}

type ThemeSwitchMode = 'uncontrolled' | 'controlled' | 'incomplete'

/** §5.2 模式判定：isDark 与 onChange 同时提供 → 受控；都缺省 → 非受控；只提供其一 → 契约不完整 */
function resolveMode(options: UseThemeAnimationOptions): ThemeSwitchMode {
  const hasIsDark = options.isDark !== undefined
  const hasOnChange = typeof options.onChange === 'function'
  if (hasIsDark && hasOnChange) return 'controlled'
  if (hasIsDark || hasOnChange) return 'incomplete'
  return 'uncontrolled'
}

function isDevEnvironment(): boolean {
  // 不直接引用 process：库面向浏览器，不引入 Node 类型
  const proc = (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process
  return proc?.env?.NODE_ENV === 'development'
}

/**
 * 主题切换动画 hook。
 *
 * **非受控模式（默认）**：库内部管理状态——挂载时从 localStorage（key `theme-switch-animation`）
 * 恢复并对齐 `<html>` 上的 `darkClassName`；切换时写回 localStorage 并同步 toggle class。
 * 多实例共享同一事实源（html class）：任一实例切换后，所有实例的 `isDark` 与
 * localStorage 都会同步（含其它标签页经 storage 事件）。
 *
 * **受控模式**（`isDark` + `onChange` 同时提供，§5.2 / §5.4）：库不碰 localStorage、不自行改
 * class，只做两件事——注入动画样式；在转场回调内调用 `onChange(next)` 并等待外部主题系统
 * 把 DOM 真实改写（class 翻转或 data-* 变化，300ms 超时兜底）后再让浏览器截图。
 * 超时未同步时跳过动画直切（SKIP_TRANSITION），不播放"旧→旧"的空转动画。
 *
 * 切换在 `startViewTransition` 回调内完成；非受控模式额外用 `flushSync` 强制 React 同步提交，
 * 保证截图前 DOM 已更新。不支持 View Transitions / `prefers-reduced-motion: reduce` / SSR 时
 * 降级为直接切换，状态照常更新。渲染阶段不触碰浏览器 API，可在 SSR 中安全渲染。
 */
export function useThemeAnimation<T extends HTMLElement = HTMLButtonElement>(
  options: UseThemeAnimationOptions = {},
): UseThemeAnimationResult<T> {
  const { isDark } = options
  const mode = resolveMode(options)

  const [uncontrolledIsDark, setUncontrolledIsDark] = useState(false)
  // finished 用 state 而非 ref：ref 的值在渲染期被捕获，点击后消费方拿到的还是上一轮的
  // promise；state 让点击后的重渲染把最新一轮的 finished 带给消费方
  const [finished, setFinished] = useState<Promise<void>>(() => Promise.resolve())
  const triggerRef = useRef<T | null>(null)
  const optionsRef = useRef(options)

  useEffect(() => {
    optionsRef.current = options
  })

  useEffect(() => {
    if (mode !== 'incomplete') return
    if (isDevEnvironment()) {
      console.warn(
        '[theme-switch-animation] isDark 与 onChange 需同时提供才进入受控模式；当前按非受控模式处理。',
      )
    }
  }, [mode])

  // 挂载恢复仅限非受控语义（含契约不完整回落）；受控模式下 class 与 localStorage 归外部所有
  useEffect(() => {
    if (resolveMode(optionsRef.current) === 'controlled') return
    const restored = syncThemeOnMount(document, resolveAnimationOptions(optionsRef.current).darkClassName)
    if (restored !== null) setUncontrolledIsDark(restored)
  }, [])

  // 非受控模式：以 html class 为事实源镜像状态（同页多实例 + 跨标签页 storage 同步）。
  // darkClassName 在挂载时锁定；模式后续变受控时立即停止镜像，isDark 来源让位外部。
  useEffect(() => {
    if (resolveMode(optionsRef.current) === 'controlled') return () => {}
    return observeThemeClass(
      document,
      resolveAnimationOptions(optionsRef.current).darkClassName,
      setUncontrolledIsDark,
    )
  }, [])

  const toggleTheme = useCallback(() => {
    const current = optionsRef.current
    const resolved = resolveAnimationOptions(current)

    if (resolveMode(current) === 'controlled') {
      const next = !current.isDark
      const onChange = current.onChange!
      // 受控模式方向感知以调用方声明的目标状态为准：外部系统可能写 data-theme
      // 而非 class（如 @nuxtjs/color-mode attribute 配置），从 class 反推会恒判 expand
      const { finished: transitionFinished } = runThemeTransition({
        trigger: triggerRef.current,
        options: resolved,
        nextIsDark: next,
        domUpdate: () => {
          onChange(next)
          // 等外部系统真实改写 DOM 后再截图；超时未同步 → 跳过动画直切
          return waitForThemeSync({ doc: document, darkClassName: resolved.darkClassName, nextIsDark: next }).then(
            (synced) => (synced ? undefined : SKIP_TRANSITION),
          )
        },
      })
      setFinished(transitionFinished)
      return
    }

    const { finished: transitionFinished } = runThemeTransition({
      trigger: triggerRef.current,
      options: resolved,
      domUpdate: () => {
        // 在转场回调内以 <html> 上的 class 为准取反：读取时刻即变更时刻，
        // 快速连点（上一个回调已翻转 class）与同页多实例都不会因时序失步
        const next = !hasThemeClass(document, resolved.darkClassName)
        applyThemeClass(document, next, resolved.darkClassName)
        writeStoredTheme(document, next)
        flushSync(() => {
          setUncontrolledIsDark(next)
        })
      },
    })
    setFinished(transitionFinished)
  }, [])

  return {
    ref: triggerRef,
    toggleTheme,
    isDark: mode === 'controlled' ? (isDark ?? false) : uncontrolledIsDark,
    finished,
  }
}
