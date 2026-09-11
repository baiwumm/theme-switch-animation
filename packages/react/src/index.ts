'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { flushSync } from 'react-dom'

import {
  THEME_STORAGE_KEY,
  ThemeAnimationType,
  applyThemeClass,
  hasThemeClass,
  resolveAnimationOptions,
  runThemeTransition,
  syncThemeOnMount,
  writeStoredTheme,
} from '@theme-switch-animation/core'
import type {
  DirectionalAnimationType,
  ResolvedAnimationOptions,
  ThemeAnimationOptions,
} from '@theme-switch-animation/core'

// 先 import 再 export（而非 `export … from`）：dts 打包时 core 的类型才会被内联进 react.d.ts，
// 而不是留下一个指向私有 workspace 包的引用。
export { THEME_STORAGE_KEY, ThemeAnimationType }
export type { DirectionalAnimationType, ResolvedAnimationOptions, ThemeAnimationOptions }

/**
 * 非受控模式选项：`animationType` / `darkClassName` / `duration` / `easing`。
 * 受控字段 `isDark` / `onChange` 在 Phase 2b 加入，当前在类型层排除，避免传了却静默无效。
 */
export type UseThemeAnimationOptions = Omit<ThemeAnimationOptions, 'isDark' | 'onChange'>

export interface UseThemeAnimationResult<T extends HTMLElement = HTMLButtonElement> {
  /** 挂到触发元素上；CIRCLE 以该元素中心为圆心 */
  ref: RefObject<T | null>
  toggleTheme: () => void
  isDark: boolean
}

/**
 * 主题切换动画 hook（非受控模式）。
 *
 * - 库内部管理状态：挂载时从 localStorage（key `theme-switch-animation`）恢复并对齐
 *   `<html>` 上的 `darkClassName`；切换时写回 localStorage 并同步 toggle class。
 * - 切换在 `startViewTransition` 回调内完成：先改 class，再用 `flushSync` 强制 React
 *   同步提交，保证浏览器截图前 DOM 已经是新主题。
 * - 不支持 View Transitions / `prefers-reduced-motion: reduce` / SSR 时降级为直接切换，
 *   状态照常更新。
 * - 渲染阶段不触碰 `window` / `document` / `localStorage`，可在 SSR 中安全渲染。
 */
export function useThemeAnimation<T extends HTMLElement = HTMLButtonElement>(
  options: UseThemeAnimationOptions = {},
): UseThemeAnimationResult<T> {
  const [isDark, setIsDark] = useState(false)
  const triggerRef = useRef<T | null>(null)
  const optionsRef = useRef(options)

  useEffect(() => {
    optionsRef.current = options
  })

  useEffect(() => {
    const restored = syncThemeOnMount(document, resolveAnimationOptions(optionsRef.current).darkClassName)
    if (restored !== null) setIsDark(restored)
  }, [])

  const toggleTheme = useCallback(() => {
    const resolved = resolveAnimationOptions(optionsRef.current)

    runThemeTransition({
      trigger: triggerRef.current,
      options: resolved,
      domUpdate: () => {
        // 在转场回调内以 <html> 上的 class 为准取反：读取时刻即变更时刻，
        // 快速连点（上一个回调已翻转 class）与同页多实例都不会因时序失步
        const next = !hasThemeClass(document, resolved.darkClassName)
        applyThemeClass(document, next, resolved.darkClassName)
        writeStoredTheme(document, next)
        flushSync(() => {
          setIsDark(next)
        })
      },
    })
  }, [])

  return { ref: triggerRef, toggleTheme, isDark }
}
