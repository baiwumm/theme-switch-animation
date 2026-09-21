/**
 * Nuxt 自动导入扫描目录（§6.3 v1.1 修订 #2）。
 * addImportsDir 扫描的是目录下文件的命名导出，因此 core 的 `ThemeAnimationType` 与全部类型、
 * vue 适配层的 composable 都必须在这里重新导出。
 *
 * 构建时由 scripts/copy-nuxt-runtime.mjs 复制编译产物到 dist/nuxt-runtime/composables/，
 * 保持相同的命名导出。
 */
export { useThemeAnimation } from '@theme-switch-animation/vue'
export type { UseThemeAnimationOptions, UseThemeAnimationResult } from '@theme-switch-animation/vue'

export { THEME_STORAGE_KEY, ThemeAnimationDirection, ThemeAnimationType } from '@theme-switch-animation/core'
export { SKIP_TRANSITION, observeThemeClass } from '@theme-switch-animation/core'
export type {
  ResolvedAnimationOptions,
  ThemeAnimationOptions,
} from '@theme-switch-animation/core'
