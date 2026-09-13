import type { CircleHoleGeometry, MaskGeometry } from './masks'
import { THEME_ANIMATION_DEFAULTS, THEME_ANIMATION_STYLE_ID, ThemeAnimationType } from './types'

/** 时长变量名；用户 duration 写进 `:root`，动画声明只引用变量 */
export const DURATION_VAR = '--theme-switch-duration'

/** 缓动变量名；用户 easing 原样写进 `:root`，动画声明只引用变量（零字符串拼接） */
export const EASING_VAR = '--theme-switch-easing'

/**
 * 收起方向"洞"半径的注册自定义属性名。
 * 注册后是全局的（`@property` 无法注销），因此加 `--theme-switch-` 前缀避免撞名。
 */
export const HOLE_RADIUS_VAR = '--theme-switch-radius'

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
  /** 仅 CIRCLE_REVERT 使用：collapse = 切回亮色，暗色圆收起（挂旧截图层并置顶）；expand = 切到暗色，暗色圆扩散（挂新截图层）。缺省按 collapse */
  revertDirection?: 'collapse' | 'expand'
  /**
   * CIRCLE_REVERT 收起方向改用"新层反向蒙版（洞）"时传入；给了它就忽略 geometry，
   * 生成静止蒙版盒子 + 动画半径的 CSS（见 §附录六）。
   */
  holeGeometry?: CircleHoleGeometry
}

/**
 * 收起方向的"洞"式 CSS：蒙版挂新截图层（层序与 CIRCLE 完全一致，不需要 z-index），
 * 蒙版盒子完全静止（`mask-size: 100% 100%` / `mask-position: 0 0`），
 * 只有注册属性 `--theme-switch-radius` 在动——盒子不动，就不会被合成器的像素对齐推着走。
 */
function buildHoleAnimationCSS(hole: CircleHoleGeometry, duration: number, easing: string, name: string): string {
  const safeDuration = Number.isFinite(duration) && duration >= 0 ? duration : THEME_ANIMATION_DEFAULTS.duration
  return `:root {
  ${DURATION_VAR}: ${safeDuration}ms;
  ${EASING_VAR}: ${easing};
}
@property ${HOLE_RADIUS_VAR} {
  syntax: "<length>";
  inherits: false;
  initial-value: 0px;
}
::view-transition-old(root),
::view-transition-new(root) {
  animation: none;
  mix-blend-mode: normal;
}
@keyframes ${name} {
  from {
    ${HOLE_RADIUS_VAR}: ${hole.startRadius}px;
  }
  to {
    ${HOLE_RADIUS_VAR}: 0px;
  }
}
::view-transition-new(root) {
  mask-image: radial-gradient(circle at ${hole.cx}px ${hole.cy}px, transparent calc(var(${HOLE_RADIUS_VAR}) - 0.5px), #000 calc(var(${HOLE_RADIUS_VAR}) + 0.5px));
  mask-size: 100% 100%;
  mask-position: 0 0;
  mask-repeat: no-repeat;
  animation: ${name} var(${DURATION_VAR}, ${THEME_ANIMATION_DEFAULTS.duration}ms) ease-in-out both;
  animation: ${name} var(${DURATION_VAR}, ${THEME_ANIMATION_DEFAULTS.duration}ms) var(${EASING_VAR}, ease-in-out) both;
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
 * 5. CIRCLE_REVERT 方向感知（§7）：collapse 挂旧截图层并置顶（z-index: 1，暗色圆收起），
 *    expand 与其余类型一样挂新截图层（暗色圆扩散）；传了 `holeGeometry` 时收起方向走
 *    "新层反向蒙版（洞）+ 静止蒙版盒子"（§附录六），层序与 CIRCLE 一致。
 */
export function buildAnimationCSS({
  animationType,
  geometry,
  duration,
  easing,
  revertDirection,
  holeGeometry,
}: BuildAnimationCSSParams): string {
  const name = getAnimationName(animationType)
  if (holeGeometry) return buildHoleAnimationCSS(holeGeometry, duration, easing, name)
  const safeDuration = Number.isFinite(duration) && duration >= 0 ? duration : THEME_ANIMATION_DEFAULTS.duration
  const onOld = animationType === ThemeAnimationType.CIRCLE_REVERT && revertDirection !== 'expand'
  const selector = onOld ? '::view-transition-old(root)' : '::view-transition-new(root)'
  const zIndexLine = onOld ? '\n  z-index: 1;' : ''
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
${selector} {
  mask-image: ${geometry.maskImage};
  mask-repeat: no-repeat;${zIndexLine}
  will-change: mask-size, mask-position;
  animation: ${name} var(${DURATION_VAR}, ${THEME_ANIMATION_DEFAULTS.duration}ms) ease-in-out both;
  animation: ${name} var(${DURATION_VAR}, ${THEME_ANIMATION_DEFAULTS.duration}ms) var(${EASING_VAR}, ease-in-out) both;
}
`
}

/**
 * 移除已注入的动画样式；不存在时静默。
 * 只匹配 `<style>` 节点：固定 id 若与页面里其它元素撞名（如用户自建的容器 div）不得误删。
 */
export function removeAnimationStyle(doc: Document): void {
  doc.querySelectorAll(`style#${THEME_ANIMATION_STYLE_ID}`).forEach((node) => node.remove())
}

/**
 * 注入动画样式。固定 id，注入前先移除旧节点，防止快速连点叠加多份样式
 * （全量匹配 `<style>`，同上防撞名）。
 */
export function injectAnimationStyle(doc: Document, css: string): HTMLStyleElement {
  removeAnimationStyle(doc)
  const style = doc.createElement('style')
  style.id = THEME_ANIMATION_STYLE_ID
  style.textContent = css
  ;(doc.head ?? doc.documentElement).appendChild(style)
  return style
}
