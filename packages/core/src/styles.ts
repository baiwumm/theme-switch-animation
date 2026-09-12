import type { MaskGeometry } from './masks'
import { THEME_ANIMATION_DEFAULTS, THEME_ANIMATION_STYLE_ID, ThemeAnimationType } from './types'

/** 时长变量名；用户 duration 写进 `:root`，动画声明只引用变量 */
export const DURATION_VAR = '--theme-switch-duration'

/** 缓动变量名；用户 easing 原样写进 `:root`，动画声明只引用变量（零字符串拼接） */
export const EASING_VAR = '--theme-switch-easing'

export function getAnimationName(type: ThemeAnimationType): string {
  return `theme-switch-${type}`
}

/** 动画作用的伪元素层：new = 仅新截图（默认）；old = 仅旧截图（CIRCLE_REVERT，old 需置顶）；both = 新旧两层（CIRCLE_BLUR） */
export type AnimationLayerTarget = 'new' | 'old' | 'both'

/**
 * 层选择：REVERT 要收缩的是旧截图，故动画挂在 old 层并置顶；BLUR 的模糊边缘由新旧两层
 * 以同一蒙版联动构成（old 沉底 z-index: -1，蒙版透明区露出已是新主题的实时页面）；其余只动 new 层。
 */
export function getAnimationLayerTarget(type: ThemeAnimationType): AnimationLayerTarget {
  if (type === ThemeAnimationType.CIRCLE_REVERT) return 'old'
  if (type === ThemeAnimationType.CIRCLE_BLUR) return 'both'
  return 'new'
}

export interface BuildAnimationCSSParams {
  animationType: ThemeAnimationType
  geometry: MaskGeometry
  /** 动画时长 ms */
  duration: number
  /** 任意合法 CSS timing-function */
  easing: string
}

/** 单个伪元素层的 mask + 动画规则。`extra` 插在 mask-repeat 与 will-change 之间（如 z-index） */
function layerRule(selector: string, name: string, geometry: MaskGeometry, extra: string): string {
  return `${selector} {
  mask-image: ${geometry.maskImage};
  mask-repeat: no-repeat;
${extra}  will-change: mask-size, mask-position;
  animation: ${name} var(${DURATION_VAR}, 400ms) ease-in-out both;
  animation: ${name} var(${DURATION_VAR}, 400ms) var(${EASING_VAR}, ease-in-out) both;
}
`
}

/**
 * 生成注入 `<head>` 的临时样式表：
 *
 * 1. `:root` 定义 duration / easing 两个变量（唯一需要插值用户输入的地方）；
 * 2. 关闭 UA 默认的交叉淡入淡出，并把混合模式改回 normal——UA 默认的 `plus-lighter`
 *    是为双方同时淡出淡入设计的，旧截图静止不动时会把两张图相加成白色；
 * 3. keyframes 只改 `mask-size` / `mask-position`（Safari 忽略 view-transition 伪元素上的
 *    clip-path 与 WAAPI，只能用 mask），触发点与终尺寸是运行时值，需要插进 keyframes；
 * 4. 动画声明写两遍：第一遍硬编码 `ease-in-out` 作为不支持 `var()` 的兜底，
 *    第二遍引用变量，支持 `var()` 的浏览器按后者生效，用户传 `linear()` / `steps()` 直接生效；
 * 5. 蒙版与动画挂在哪个伪元素层由 `getAnimationLayerTarget` 决定——默认 new 层；
 *    CIRCLE_REVERT 挂 old 层并置顶（z-index: 1），让旧截图收缩在上、新截图从四周透出。
 */
export function buildAnimationCSS({ animationType, geometry, duration, easing }: BuildAnimationCSSParams): string {
  const name = getAnimationName(animationType)
  const safeDuration = Number.isFinite(duration) && duration >= 0 ? duration : THEME_ANIMATION_DEFAULTS.duration
  const head = `:root {
  ${DURATION_VAR}: ${safeDuration}ms;
  ${EASING_VAR}: ${easing};
}
::view-transition-old(root),
::view-transition-new(root) {
  animation: none;
  mix-blend-mode: normal;
}
@keyframes ${name} {
  from {
    mask-size: ${geometry.startSize};
    mask-position: ${geometry.startPosition};
  }
  to {
    mask-size: ${geometry.endSize};
    mask-position: ${geometry.endPosition};
  }
}
`
  const target = getAnimationLayerTarget(animationType)
  const layer =
    target === 'old'
      ? layerRule('::view-transition-old(root)', name, geometry, '  z-index: 1;\n')
      : target === 'both'
        ? layerRule('::view-transition-old(root)', name, geometry, '  z-index: -1;\n') +
          layerRule('::view-transition-new(root)', name, geometry, '')
        : layerRule('::view-transition-new(root)', name, geometry, '')
  return head + layer
}

/** 移除已注入的动画样式；不存在时静默 */
export function removeAnimationStyle(doc: Document): void {
  doc.getElementById(THEME_ANIMATION_STYLE_ID)?.remove()
}

/** 注入动画样式。固定 id，注入前先移除旧节点，防止快速连点叠加多份样式 */
export function injectAnimationStyle(doc: Document, css: string): HTMLStyleElement {
  removeAnimationStyle(doc)
  const style = doc.createElement('style')
  style.id = THEME_ANIMATION_STYLE_ID
  style.textContent = css
  ;(doc.head ?? doc.documentElement).appendChild(style)
  return style
}
