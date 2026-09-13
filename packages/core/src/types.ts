/**
 * 动画类型。用 `const` 对象 + `as const` 而非 TS `enum`：
 * Nuxt 自动导入扫描的是命名导出，`const` 对象对打包和 `isolatedModules` 更稳。
 */
export const ThemeAnimationType = {
  /** 以触发元素为中心的圆形扩散 */
  CIRCLE: 'circle',
  /** 圆形收起：旧主题以圆形收缩进触发点，新主题从四周显现（动画作用于旧截图层） */
  CIRCLE_REVERT: 'circle-revert',
  /** 圆形模糊扩散：边缘高斯模糊的圆形蒙版（只挂新截图层，旧层完整垫底） */
  CIRCLE_BLUR: 'circle-blur',
  /** 从左到右擦除 */
  LTR: 'ltr',
  /** 从右到左擦除 */
  RTL: 'rtl',
  /** 从上到下擦除 */
  TTB: 'ttb',
  /** 从下到上擦除 */
  BTT: 'btt',
  /** 正方形，从触发点扩散 */
  SQUARE: 'square',
  /** 菱形，从触发点扩散 */
  DIAMOND: 'diamond',
  /** 矩形（贴合视口宽高比），从触发点扩散 */
  RECTANGLE: 'rectangle',
  /** 六边形（尖顶朝上），从触发点扩散 */
  HEXAGON: 'hexagon',
  /** 三角形（顶点朝上），从触发点扩散 */
  TRIANGLE: 'triangle',
  /** 五角星（顶点朝上），从触发点扩散 */
  STAR: 'star',
} as const

export type ThemeAnimationType = (typeof ThemeAnimationType)[keyof typeof ThemeAnimationType]

/** 四向擦除类型（条形蒙版沿对应方向生长） */
export type DirectionalAnimationType =
  | typeof ThemeAnimationType.LTR
  | typeof ThemeAnimationType.RTL
  | typeof ThemeAnimationType.TTB
  | typeof ThemeAnimationType.BTT

/** 中心扩散形状类：蒙版从触发点以 0 尺寸长到覆盖视口（几何形状与 CIRCLE 同构，仅蒙版图形不同） */
export type ShapeAnimationType =
  | typeof ThemeAnimationType.CIRCLE
  | typeof ThemeAnimationType.SQUARE
  | typeof ThemeAnimationType.DIAMOND
  | typeof ThemeAnimationType.RECTANGLE
  | typeof ThemeAnimationType.HEXAGON
  | typeof ThemeAnimationType.TRIANGLE
  | typeof ThemeAnimationType.STAR

export interface ThemeAnimationOptions {
  /** 动画类型，默认 `CIRCLE` */
  animationType?: ThemeAnimationType
  /** 暗色类名，默认 `'dark'` */
  darkClassName?: string
  /** 动画时长（ms），默认 `750` */
  duration?: number
  /** 任意合法 CSS timing-function，默认 `'ease-in-out'` */
  easing?: string
  /** 模糊蒙版的模糊强度（`feGaussianBlur` 的视觉强度系数），默认 `2`。仅 `CIRCLE_BLUR` 生效 */
  blurAmount?: number
  /** 受控模式：外部暗色状态。与 `onChange` 同时提供才进入受控模式 */
  isDark?: boolean
  /** 受控模式：状态变更回调。与 `isDark` 同时提供才进入受控模式 */
  onChange?: (next: boolean) => void
}

/** 两种模式共用的动画参数（已填充默认值） */
export interface ResolvedAnimationOptions {
  animationType: ThemeAnimationType
  darkClassName: string
  duration: number
  easing: string
  blurAmount: number
}

export const THEME_ANIMATION_DEFAULTS: Readonly<ResolvedAnimationOptions> = Object.freeze({
  animationType: ThemeAnimationType.CIRCLE,
  darkClassName: 'dark',
  duration: 750,
  easing: 'ease-in-out',
  blurAmount: 2,
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
    blurAmount: isValidBlurAmount(options.blurAmount) ? options.blurAmount : THEME_ANIMATION_DEFAULTS.blurAmount,
  }
}

/** blurAmount 仅在 CIRCLE_BLUR 下有意义，非法值（非正 / NaN / 无穷）静默回落默认 */
function isValidBlurAmount(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value) && value > 0
}
