import { computed, nextTick, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import type { Ref } from 'vue'

import {
  SKIP_TRANSITION,
  THEME_STORAGE_KEY,
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
  DirectionalAnimationType,
  ResolvedAnimationOptions,
  ThemeAnimationOptions,
} from '@theme-switch-animation/core'

// 先 import 再 export（而非 `export … from`）：dts 打包时 core 的类型才会被内联进 vue.d.ts，
// 而不是留下一个指向私有 workspace 包的引用。
export { SKIP_TRANSITION, THEME_STORAGE_KEY, ThemeAnimationType }
export type { DirectionalAnimationType, ResolvedAnimationOptions, ThemeAnimationOptions }

export type UseThemeAnimationOptions = ThemeAnimationOptions

export interface UseThemeAnimationResult<T extends HTMLElement = HTMLButtonElement> {
  /** 挂到触发元素上；CIRCLE 以该元素中心为圆心。命名避开 Vue 自身的 ref */
  triggerRef: Ref<T | null>
  toggleTheme: () => void
  isDark: Ref<boolean>
  /**
   * 最近一次切换的动画结束 Promise（shallowRef，每次切换更新 .value）。
   * 降级（无动画）时立即结算；错误已在库内消化，不会 reject。
   */
  finished: Ref<Promise<void>>
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
 * 多实例共享同一事实源（html class）：任一实例切换后，所有实例的 `isDark` 都会同步
 * （含其它标签页经 storage 事件）。
 *
 * **受控模式**（`isDark` + `onChange` 同时提供）：库不碰 localStorage、不自行改 class——
 * 转场回调内调用 `onChange(next)` 并等待外部真实改写 DOM（§5.4 协议）后截图。
 * 超时未同步时跳过动画直切（SKIP_TRANSITION），不播放"旧→旧"的空转动画。
 *
 * **模式动态判定**：`mode` 是 computed——options 需传响应式来源（reactive / props），
 * 先按非受控使用、后补上 `isDark` + `onChange` 转受控时，切换路径与 `isDark` 返回值
 * 都随最新模式走；普通对象字面量会按 setup 时的快照工作（与旧版一致）。
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
  // finished 用 shallowRef：每次切换替换 .value，消费方 watch / await 它拿最新一轮
  const finished = shallowRef<Promise<void>>(Promise.resolve())

  // 模式与 isDark 来源均动态判定（读取经过 reactive proxy 的属性 → 自动追踪）：
  // 修复旧版 setup 期快照导致的脱钩——非受控启动、响应式补全 isDark + onChange 后，
  // 旧版切换行为已变受控而返回的 isDark 仍停在非受控 state 上
  const mode = computed(() => resolveMode(options))
  const isDark = computed<boolean>(() =>
    mode.value === 'controlled' ? (options.isDark ?? false) : uncontrolledIsDark.value,
  )

  if (mode.value === 'incomplete' && isDevEnvironment()) {
    console.warn(
      '[theme-switch-animation] isDark 与 onChange 需同时提供才进入受控模式；当前按非受控模式处理。',
    )
  }

  let stopObserving: (() => void) | undefined

  // 挂载恢复仅限非受控语义；受控模式下 class 与 localStorage 归外部所有
  onMounted(() => {
    if (mode.value === 'controlled') return
    const className = resolveAnimationOptions(options).darkClassName
    const restored = syncThemeOnMount(document, className)
    if (restored !== null) uncontrolledIsDark.value = restored
    // 非受控模式以 html class 为事实源：同页多实例 + 跨标签页（storage）切换同步镜像
    stopObserving = observeThemeClass(document, className, (dark) => {
      uncontrolledIsDark.value = dark
    })
  })

  onUnmounted(() => stopObserving?.())

  function toggleTheme(): void {
    const resolved = resolveAnimationOptions(options)

    if (mode.value === 'controlled') {
      const next = !options.isDark
      const onChange = options.onChange!
      // 受控模式方向感知以调用方声明的目标状态为准：外部系统可能写 data-theme
      // 而非 class（如 @nuxtjs/color-mode attribute 配置），从 class 反推会恒判 expand
      finished.value = runThemeTransition({
        trigger: triggerRef.value,
        options: resolved,
        nextIsDark: next,
        domUpdate: async () => {
          onChange(next)
          // 等外部系统真实改写 DOM（class 翻转或 data-* 变化）后再截图；
          // 超时未同步 → SKIP_TRANSITION 跳过动画直切
          const synced = await waitForThemeSync({
            doc: document,
            darkClassName: resolved.darkClassName,
            nextIsDark: next,
          })
          if (!synced) return SKIP_TRANSITION
        },
      }).finished
      return
    }

    finished.value = runThemeTransition({
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
    }).finished
  }

  return { triggerRef, toggleTheme, isDark, finished }
}
