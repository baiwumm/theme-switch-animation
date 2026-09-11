import { computed, nextTick, onMounted, ref, shallowRef, watch } from 'vue'
import type { Ref } from 'vue'

import {
  THEME_STORAGE_KEY,
  ThemeAnimationType,
  applyThemeClass,
  hasThemeClass,
  resolveAnimationOptions,
  runThemeTransition,
  syncThemeOnMount,
  waitForThemeSync,
  writeStoredTheme,
} from '@theme-switch-animation/core'
import type {
  DirectionalAnimationType,
  ResolvedAnimationOptions,
  ThemeAnimationOptions,
} from '@theme-switch-animation/core'

// 先 import 再 export（而非 `export … from`）：dts 打包时 core 的类型才会被内联进 vue.d.ts，
// 而不是留下一个指向私有 workspace 包的引用。
export { THEME_STORAGE_KEY, ThemeAnimationType }
export type { DirectionalAnimationType, ResolvedAnimationOptions, ThemeAnimationOptions }

export type UseThemeAnimationOptions = ThemeAnimationOptions

export interface UseThemeAnimationResult<T extends HTMLElement = HTMLButtonElement> {
  /** 挂到触发元素上；CIRCLE 以该元素中心为圆心。命名避开 Vue 自身的 ref */
  triggerRef: Ref<T | null>
  toggleTheme: () => void
  isDark: Ref<boolean>
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
  // import.meta.env 由 Vite / Nuxt 等打包器注入；SSR 与未注入环境下为 undefined
  return (import.meta as { env?: { DEV?: boolean } }).env?.DEV === true
}

/**
 * 主题切换动画 composable，行为契约与 React 版对齐（§5.2 / §5.3 / §5.4）。
 *
 * **非受控模式（默认）**：库内部管理状态——挂载时从 localStorage（key `theme-switch-animation`）
 * 恢复并对齐 `<html>` 上的 `darkClassName`；切换时写回 localStorage 并同步 toggle class。
 *
 * **受控模式**（`isDark` + `onChange` 同时提供）：库不碰 localStorage、不自行改 class——
 * 转场回调内调用 `onChange(next)` 并等待外部真实改写 DOM（§5.4 协议）后截图。
 *
 * **Vue 转场路线（§9-1）**：`startViewTransition` 回调为
 * `async () => { …; await nextTick() }`——浏览器等 Vue 的 DOM 更新完成后才对新状态截图。
 *
 * 渲染阶段不触碰 `window` / `document` / `localStorage`，setup 可在 SSR 中安全执行。
 */
export function useThemeAnimation<T extends HTMLElement = HTMLButtonElement>(
  options: UseThemeAnimationOptions = {},
): UseThemeAnimationResult<T> {
  const triggerRef: Ref<T | null> = shallowRef<T | null>(null)
  const uncontrolledIsDark = ref(false)
  const optionsRef = shallowRef(options)

  watch(
    () => options,
    (value) => {
      optionsRef.value = value
    },
  )

  const mode = resolveMode(options)

  if (mode === 'incomplete' && isDevEnvironment()) {
    console.warn(
      '[theme-switch-animation] isDark 与 onChange 需同时提供才进入受控模式；当前按非受控模式处理。',
    )
  }

  // 挂载恢复仅限非受控语义；受控模式下 class 与 localStorage 归外部所有
  onMounted(() => {
    if (resolveMode(optionsRef.value) === 'controlled') return
    const restored = syncThemeOnMount(document, resolveAnimationOptions(optionsRef.value).darkClassName)
    if (restored !== null) uncontrolledIsDark.value = restored
  })

  // 受控模式直接镜像外部 isDark（props 响应性由调用方的响应式来源驱动）
  const isDark: Ref<boolean> =
    mode === 'controlled'
      ? computed(() => optionsRef.value.isDark ?? false)
      : uncontrolledIsDark

  function toggleTheme(): void {
    const current = optionsRef.value
    const resolved = resolveAnimationOptions(current)

    if (resolveMode(current) === 'controlled') {
      const next = !current.isDark
      const onChange = current.onChange!
      runThemeTransition({
        trigger: triggerRef.value,
        options: resolved,
        domUpdate: async () => {
          onChange(next)
          // 等外部系统真实改写 DOM（class 翻转或 data-* 变化）后再截图；300ms 超时兜底
          await waitForThemeSync({ doc: document, darkClassName: resolved.darkClassName, nextIsDark: next })
        },
      })
      return
    }

    runThemeTransition({
      trigger: triggerRef.value,
      options: resolved,
      domUpdate: async () => {
        // 回调内以 <html> 上的 class 为准取反：读取时刻即变更时刻，连点与多实例不失步
        const next = !hasThemeClass(document, resolved.darkClassName)
        applyThemeClass(document, next, resolved.darkClassName)
        writeStoredTheme(document, next)
        uncontrolledIsDark.value = next
        // 浏览器等 Vue 的 DOM 更新（组件树内 isDark 文案等）完成后再截图
        await nextTick()
      },
    })
  }

  return { triggerRef, toggleTheme, isDark }
}
