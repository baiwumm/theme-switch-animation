import type { CircleHoleGeometry, MaskGeometry, QrGridMaskSpec, RevealMaskSpec } from './masks'
import { REVEAL_VAR, THEME_ANIMATION_DEFAULTS, THEME_ANIMATION_STYLE_ID, ThemeAnimationType } from './types'

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
  /** mask-size / mask-position 驱动类型的蒙版几何；reveal / holeGeometry 分支不需要 */
  geometry?: MaskGeometry
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
  /**
   * 属性驱动揭开（BLINDS / SCAN）的蒙版规格；给了它就忽略 geometry，
   * 生成 `@property` 注册属性 + 静止蒙版盒子 + 引用该属性的渐变（机制同洞式，见 masks.ts）。
   */
  reveal?: RevealMaskSpec
  /** QR_GRID 的方块格子双层蒙版规格；给了它就忽略 geometry，蒙版挂新截图层（见 masks.ts QrGridMaskSpec） */
  qrGrid?: QrGridMaskSpec
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
 * 属性驱动揭开（BLINDS / SCAN）的 CSS：与洞式同一机制——蒙版盒子完全静止，
 * keyframes 只动注册属性 `REVEAL_VAR`，引用它的 mask-image 渐变逐帧重新解析
 * （mask-image 本身不可动画；`@property` 注册后 length 属性可参与插值）。
 * 蒙版挂新截图层，旧层完整垫底；渐变模板与起止值由 masks.ts 的 RevealMaskSpec 提供。
 */
function buildRevealAnimationCSS(reveal: RevealMaskSpec, duration: number, easing: string, name: string): string {
  const safeDuration = Number.isFinite(duration) && duration >= 0 ? duration : THEME_ANIMATION_DEFAULTS.duration
  // 注册属性名与单位由 spec 决定：px 族用 REVEAL_VAR（<length>），角度族用 SWEEP_VAR（<angle>）
  const varName = reveal.varName ?? REVEAL_VAR
  const unit = reveal.unit ?? 'px'
  const syntax = unit === 'deg' ? '<angle>' : '<length>'
  const zero = unit === 'deg' ? '0deg' : '0px'
  return `:root {
  ${DURATION_VAR}: ${safeDuration}ms;
  ${EASING_VAR}: ${easing};
}
@property ${varName} {
  syntax: "${syntax}";
  inherits: false;
  initial-value: ${zero};
}
::view-transition-old(root),
::view-transition-new(root) {
  animation: none;
  mix-blend-mode: normal;
}
@keyframes ${name} {
  from {
    ${varName}: ${reveal.from}${unit};
  }
  to {
    ${varName}: ${reveal.to}${unit};
  }
}
::view-transition-new(root) {
  mask-image: ${reveal.maskImage};
  mask-size: ${reveal.maskSize};
  mask-position: 0 0;
  mask-repeat: ${reveal.maskRepeat};
  animation: ${name} var(${DURATION_VAR}, ${THEME_ANIMATION_DEFAULTS.duration}ms) ease-in-out both;
  animation: ${name} var(${DURATION_VAR}, ${THEME_ANIMATION_DEFAULTS.duration}ms) var(${EASING_VAR}, ease-in-out) both;
}
`
}

/**
 * QR_GRID 的 CSS：与 BLINDS 同样挂新截图层（旧层完整垫底），方块随注册属性 `REVEAL_VAR`
 * 同步生长。基线（所有浏览器）：沿推进轴的单层条带（观感同百叶窗），状态始终正确；
 * `@supports` 增强（支持 mask-composite 的引擎）：叠加垂直轴条带层做 intersect，
 * 两个正交条带组的交集即逐格方块。不写 `-webkit-mask-composite`：仅支持旧语法的引擎
 * 落入基线即可，避免新旧两套 composite 关键字的级联歧义。
 */
function buildQrGridAnimationCSS(spec: QrGridMaskSpec, duration: number, easing: string, name: string): string {
  const safeDuration = Number.isFinite(duration) && duration >= 0 ? duration : THEME_ANIMATION_DEFAULTS.duration
  const animation = (): string =>
    `animation: ${name} var(${DURATION_VAR}, ${THEME_ANIMATION_DEFAULTS.duration}ms) ease-in-out both;
  animation: ${name} var(${DURATION_VAR}, ${THEME_ANIMATION_DEFAULTS.duration}ms) var(${EASING_VAR}, ease-in-out) both;`
  return `:root {
  ${DURATION_VAR}: ${safeDuration}ms;
  ${EASING_VAR}: ${easing};
}
@property ${REVEAL_VAR} {
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
    ${REVEAL_VAR}: ${spec.from}px;
  }
  to {
    ${REVEAL_VAR}: ${spec.to}px;
  }
}
::view-transition-new(root) {
  mask-image: ${spec.baselineImage};
  mask-size: ${spec.baselineSize};
  mask-position: 0 0;
  mask-repeat: repeat;
  ${animation()}
}
@supports (mask-composite: intersect) {
  ::view-transition-new(root) {
    mask-image: ${spec.cellImage};
    mask-size: ${spec.cellSize};
    mask-position: 0 0, 0 0;
    mask-repeat: repeat, repeat;
    mask-composite: intersect;
    ${animation()}
  }
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
  reveal,
  qrGrid,
}: BuildAnimationCSSParams): string {
  const name = getAnimationName(animationType)
  if (holeGeometry) return buildHoleAnimationCSS(holeGeometry, duration, easing, name)
  if (reveal) return buildRevealAnimationCSS(reveal, duration, easing, name)
  if (qrGrid) return buildQrGridAnimationCSS(qrGrid, duration, easing, name)
  if (!geometry) throw new TypeError('buildAnimationCSS: mask-size 驱动的类型必须提供 geometry（reveal / holeGeometry 分支除外）')
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
