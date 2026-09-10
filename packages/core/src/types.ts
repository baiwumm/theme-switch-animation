/**
 * 动画类型。用 `const` 对象 + `as const` 而非 TS `enum`：
 * Nuxt 自动导入扫描的是命名导出，`const` 对象对打包和 `isolatedModules` 更稳。
 */
export const ThemeAnimationType = {
  /** 以触发元素为中心的圆形扩散 */
  CIRCLE: 'circle',
  /** 从左到右擦除 */
  LTR: 'ltr',
  /** 从右到左擦除 */
  RTL: 'rtl',
  /** 从上到下擦除 */
  TTB: 'ttb',
  /** 从下到上擦除 */
  BTT: 'btt',
} as const

export type ThemeAnimationType = (typeof ThemeAnimationType)[keyof typeof ThemeAnimationType]

/** 四向擦除类型（CIRCLE 以外的全部类型） */
export type DirectionalAnimationType = Exclude<ThemeAnimationType, typeof ThemeAnimationType.CIRCLE>

export interface ThemeAnimationOptions {
  /** 动画类型，默认 `CIRCLE` */
  animationType?: ThemeAnimationType
  /** 暗色类名，默认 `'dark'` */
  darkClassName?: string
  /** 动画时长（ms），默认 `400` */
  duration?: number
  /** 任意合法 CSS timing-function，默认 `'ease-in-out'` */
  easing?: string
  /** 受控模式：外部暗色状态。与 `onChange` 同时提供才进入受控模式 */
  isDark?: boolean
  /** 受控模式：状态变更回调。与 `isDark` 同时提供才进入受控模式 */
  onChange?: (next: boolean) => void
}

/** 两种模式共用的四个动画参数（已填充默认值） */
export interface ResolvedAnimationOptions {
  animationType: ThemeAnimationType
  darkClassName: string
  duration: number
  easing: string
}

export const THEME_ANIMATION_DEFAULTS: Readonly<ResolvedAnimationOptions> = Object.freeze({
  animationType: ThemeAnimationType.CIRCLE,
  darkClassName: 'dark',
  duration: 400,
  easing: 'ease-in-out',
})

/** 非受控模式持久化到 localStorage 的 key（v1.2：避免与 next-themes 等库的 `'theme'` 冲突） */
export const THEME_STORAGE_KEY = 'theme-switch-animation'

/** 注入 `<head>` 的临时 `<style>` 的固定 id，重复注入时先移除旧节点 */
export const THEME_ANIMATION_STYLE_ID = 'theme-switch-animation'

/** 用户传入的 `undefined` 视为未提供，回落到默认值 */
export function resolveAnimationOptions(options: ThemeAnimationOptions = {}): ResolvedAnimationOptions {
  return {
    animationType: options.animationType ?? THEME_ANIMATION_DEFAULTS.animationType,
    darkClassName: options.darkClassName ?? THEME_ANIMATION_DEFAULTS.darkClassName,
    duration: options.duration ?? THEME_ANIMATION_DEFAULTS.duration,
    easing: options.easing ?? THEME_ANIMATION_DEFAULTS.easing,
  }
}
