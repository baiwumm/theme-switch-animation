import type { MaskGeometry, Point } from './masks'
import { THEME_ANIMATION_DEFAULTS, THEME_ANIMATION_STYLE_ID, ThemeAnimationType } from './types'

/** 时长变量名；用户 duration 写进 `:root`，动画声明只引用变量 */
export const DURATION_VAR = '--theme-switch-duration'

/** 缓动变量名；用户 easing 原样写进 `:root`，动画声明只引用变量（零字符串拼接） */
export const EASING_VAR = '--theme-switch-easing'

export function getAnimationName(type: ThemeAnimationType): string {
  return `theme-switch-${type}`
}

export interface BuildAnimationCSSParams {
  animationType: ThemeAnimationType
  geometry: MaskGeometry
  /** 动画时长 ms */
  duration: number
  /** 任意合法 CSS timing-function */
  easing: string
  /** 触发点（视口坐标）。CIRCLE_REVERT 的缩放原点；蒙版类型忽略 */
  origin: Point
}

const round2 = (value: number): number => Math.round(value * 100) / 100

/**
 * CIRCLE_REVERT 的"穿越缩放"样式：旧截图层 scale 1 → 0（收起，置顶 z-index: 1），
 * 新截图层 scale 0 → 1（扩散），同长同时进行——与 CIRCLE 相反的交接顺序（旧先走、新后到）。
 *
 * 为什么不用 mask：mask 只做裁剪、内容不动，"扩散"半段会与已是新主题的实时页面重合而不可见；
 * transform 让内容随缩放移动，两段才都可见（这也是常见 zoom-through 主题切换的实现方式）。
 * 注意：transform 动画在 Safari 的表现需真机验证（需求 §2 的 WebKit 限制针对 clip-path 与 WAAPI）。
 */
function buildZoomThroughCSS(name: string, origin: Point, duration: number, easing: string): string {
  const safeDuration = Number.isFinite(duration) && duration >= 0 ? duration : THEME_ANIMATION_DEFAULTS.duration
  const originPx = `${round2(origin.x)}px ${round2(origin.y)}px`
  return `:root {
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
    transform: scale(1);
  }
  to {
    transform: scale(0);
  }
}
@keyframes ${name}-expand {
  from {
    transform: scale(0);
  }
  to {
    transform: scale(1);
  }
}
::view-transition-old(root) {
  transform-origin: ${originPx};
  z-index: 1;
  will-change: transform;
  animation: ${name} var(${DURATION_VAR}, 400ms) ease-in-out both;
  animation: ${name} var(${DURATION_VAR}, 400ms) var(${EASING_VAR}, ease-in-out) both;
}
::view-transition-new(root) {
  transform-origin: ${originPx};
  will-change: transform;
  animation: ${name}-expand var(${DURATION_VAR}, 400ms) ease-in-out both;
  animation: ${name}-expand var(${DURATION_VAR}, 400ms) var(${EASING_VAR}, ease-in-out) both;
}
`
}

/**
 * 生成注入 `<head>` 的临时样式表：
 *
 * 1. `:root` 定义 duration / easing 两个变量（唯一需要插值用户输入的地方）；
 * 2. 关闭 UA 默认的交叉淡入淡出，并把混合模式改回 normal——UA 默认的 `plus-lighter`
 *    是为双方同时淡出淡入设计的，旧截图静止不动时会把两张图相加成白色；
 * 3. mask 类型的 keyframes 只改 `mask-size` / `mask-position`（Safari 忽略 view-transition 伪元素上的
 *    clip-path 与 WAAPI，只能用 mask），触发点与终尺寸是运行时值，需要插进 keyframes；
 * 4. 动画声明写两遍：第一遍硬编码 `ease-in-out` 作为不支持 `var()` 的兜底，
 *    第二遍引用变量，支持 `var()` 的浏览器按后者生效，用户传 `linear()` / `steps()` 直接生效；
 * 5. CIRCLE_REVERT 走 transform 缩放（见 buildZoomThroughCSS），不使用蒙版。
 */
export function buildAnimationCSS({ animationType, geometry, origin, duration, easing }: BuildAnimationCSSParams): string {
  const name = getAnimationName(animationType)
  if (animationType === ThemeAnimationType.CIRCLE_REVERT) {
    return buildZoomThroughCSS(name, origin, duration, easing)
  }
  const safeDuration = Number.isFinite(duration) && duration >= 0 ? duration : THEME_ANIMATION_DEFAULTS.duration
  return `:root {
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
::view-transition-new(root) {
  mask-image: ${geometry.maskImage};
  mask-repeat: no-repeat;
  will-change: mask-size, mask-position;
  animation: ${name} var(${DURATION_VAR}, 400ms) ease-in-out both;
  animation: ${name} var(${DURATION_VAR}, 400ms) var(${EASING_VAR}, ease-in-out) both;
}
`
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
