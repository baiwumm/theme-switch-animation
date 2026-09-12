import { ThemeAnimationType } from './types'
import type { DirectionalAnimationType, ShapeAnimationType } from './types'

export interface Point {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

/** 只依赖 `getBoundingClientRect` 的最小结构类型，便于在 node 环境用普通对象做单测 */
export interface RectProvider {
  getBoundingClientRect(): { left: number; top: number; width: number; height: number }
}

/** 蒙版的起止几何，值均为可直接写进 CSS 的字符串 */
export interface MaskGeometry {
  /** `mask-image` 的值 */
  maskImage: string
  /** 起始 `mask-size` */
  startSize: string
  /** 起始 `mask-position` */
  startPosition: string
  /** 终止 `mask-size` */
  endSize: string
  /** 终止 `mask-position` */
  endPosition: string
}

/** 圆形蒙版终尺寸 = 触发点到视口最远角距离 × 2.1，留余量防角落锯齿 */
export const CIRCLE_SIZE_FACTOR = 2.1

/** 四向擦除起始细条的厚度（px） */
export const BAR_START_PX = 4

const CIRCLE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2"><circle cx="1" cy="1" r="1" fill="#fff"/></svg>'

/** 圆形蒙版：SVG data-URI，白色实心圆 */
export const CIRCLE_MASK_IMAGE = `url("data:image/svg+xml,${encodeURIComponent(CIRCLE_SVG)}")`

/** 四向擦除蒙版：实心白色条 */
export const BAR_MASK_IMAGE = 'linear-gradient(#fff, #fff)'

/**
 * 实心矩形蒙版：供 SQUARE 与 RECTANGLE 共用。
 * `preserveAspectRatio="none"` 让蒙版被非正方形 `mask-size` 拉伸时仍铺满整个框
 * （默认的 meet 会在非等比尺寸下留透明边）；实心填充不存在形变问题。
 */
const SOLID_RECT_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2" preserveAspectRatio="none"><rect width="2" height="2" fill="#fff"/></svg>'

export const SOLID_RECT_MASK_IMAGE = `url("data:image/svg+xml,${encodeURIComponent(SOLID_RECT_SVG)}")`

/** 多边形顶点（viewBox 0 0 2 2，中心 (1,1)，外接圆半径 1）→ SVG data-URI 蒙版 */
function polygonMaskImage(points: ReadonlyArray<Point>): string {
  const polygon = points.map((p) => `${roundTo(p.x, 4)},${roundTo(p.y, 4)}`).join(' ')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2"><polygon points="${polygon}" fill="#fff"/></svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

/** 极坐标（角度 deg，外接圆半径 r）→ viewBox 内坐标（中心 (1,1)） */
function polar(angleDeg: number, radius: number): Point {
  const rad = (angleDeg * Math.PI) / 180
  return { x: 1 + radius * Math.cos(rad), y: 1 + radius * Math.sin(rad) }
}

/** 菱形：正方形旋转 45°，顶点钉在 viewBox 四边中点 */
export const DIAMOND_MASK_IMAGE = polygonMaskImage([
  polar(-90, 1),
  polar(0, 1),
  polar(90, 1),
  polar(180, 1),
])

/** 六边形：尖顶朝上（与 magicui 一致，起始角 -90°），外接圆半径 1 */
export const HEXAGON_MASK_IMAGE = polygonMaskImage(
  Array.from({ length: 6 }, (_, i) => polar(-90 + i * 60, 1)),
)

/** 三角形：顶点朝上等边三角形，外接圆半径 1 */
export const TRIANGLE_MASK_IMAGE = polygonMaskImage([polar(-90, 1), polar(30, 1), polar(150, 1)])

/**
 * 五角星：顶点朝上，内顶点半径比 0.42（与 magicui 一致）。
 * 内切半径（中心到内凹谷的距离）= 0.42 × 外接圆半径，这是尺寸计算的关键（见 getStarMaskGeometry）。
 */
export const STAR_INNER_RATIO = 0.42

export const STAR_MASK_IMAGE = polygonMaskImage(
  Array.from({ length: 5 }, (_, i) => {
    const outerAngle = -90 + i * 72
    return [polar(outerAngle, 1), polar(outerAngle + 36, STAR_INNER_RATIO)]
  }).flat(),
)

/**
 * 四向擦除的起始尺寸与钉住的边。
 * 百分比 `mask-position` 会把蒙版对应边贴在视口对应边上，因此只让尺寸从细条长到 100%，
 * 被钉住的边保持不动，就得到从该边向对侧擦除的效果：
 * - LTR / RTL：竖直细条（4px 宽、100% 高），分别钉在左边 `0% 0%` 与右边 `100% 0%`；
 * - TTB / BTT：水平细条（100% 宽、4px 高），分别钉在顶边 `0% 0%` 与底边 `0% 100%`。
 */
const DIRECTIONAL_START: Record<DirectionalAnimationType, { size: string; position: string }> = {
  [ThemeAnimationType.LTR]: { size: `${BAR_START_PX}px 100%`, position: '0% 0%' },
  [ThemeAnimationType.RTL]: { size: `${BAR_START_PX}px 100%`, position: '100% 0%' },
  [ThemeAnimationType.TTB]: { size: `100% ${BAR_START_PX}px`, position: '0% 0%' },
  [ThemeAnimationType.BTT]: { size: `100% ${BAR_START_PX}px`, position: '0% 100%' },
}

const px = (value: number): string => `${roundTo(value, 2)}px`

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

/** 触发点到视口四角的最大距离（`Math.hypot`） */
export function getMaxRadiusToCorners(center: Point, viewport: Size): number {
  const { x, y } = center
  const { width, height } = viewport
  return Math.max(
    Math.hypot(x, y),
    Math.hypot(width - x, y),
    Math.hypot(x, height - y),
    Math.hypot(width - x, height - y),
  )
}

/** 触发元素中心（视口坐标）；没有触发元素时回落到视口中心 */
export function getTriggerCenter(trigger: RectProvider | null | undefined, viewport: Size): Point {
  if (!trigger) {
    return { x: viewport.width / 2, y: viewport.height / 2 }
  }
  const rect = trigger.getBoundingClientRect()
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}

/**
 * CIRCLE：蒙版从 0 长到 `2.1 × maxRadius` 的正方形，
 * `mask-position` 同步从中心点移到 `中心 - 边长 / 2`，保证圆心始终钉在触发点。
 */
export function getCircleMaskGeometry(center: Point, viewport: Size): MaskGeometry {
  const endSize = getMaxRadiusToCorners(center, viewport) * CIRCLE_SIZE_FACTOR
  return {
    maskImage: CIRCLE_MASK_IMAGE,
    startSize: '0px 0px',
    startPosition: `${px(center.x)} ${px(center.y)}`,
    endSize: `${px(endSize)} ${px(endSize)}`,
    endPosition: `${px(center.x - endSize / 2)} ${px(center.y - endSize / 2)}`,
  }
}

/** LTR / RTL / TTB / BTT：位置钉在对应边不动，尺寸从细条长到 `100% 100%` */
export function getDirectionalMaskGeometry(type: DirectionalAnimationType): MaskGeometry {
  const start = DIRECTIONAL_START[type]
  return {
    maskImage: BAR_MASK_IMAGE,
    startSize: start.size,
    startPosition: start.position,
    endSize: '100% 100%',
    endPosition: start.position,
  }
}

/** 中心扩散形状的通用收尾：尺寸 0 → 终尺寸，蒙版中心始终钉在触发点 */
function pinCenterGeometry(maskImage: string, center: Point, endSize: Size): MaskGeometry {
  return {
    maskImage,
    startSize: '0px 0px',
    startPosition: `${px(center.x)} ${px(center.y)}`,
    endSize: `${px(endSize.width)} ${px(endSize.height)}`,
    endPosition: `${px(center.x - endSize.width / 2)} ${px(center.y - endSize.height / 2)}`,
  }
}

/** 触发点到对侧半边界的最远距离（用于轴对齐形状的覆盖计算） */
function maxHalfExtent(center: Point, viewport: Size): { halfW: number; halfH: number } {
  return {
    halfW: Math.max(center.x, viewport.width - center.x),
    halfH: Math.max(center.y, viewport.height - center.y),
  }
}

/** SQUARE：轴对齐正方形，半边长盖住更远的半边界即可；5% 余量与 CIRCLE_SIZE_FACTOR 同源（防末帧缝隙） */
export const SQUARE_COVERAGE_MARGIN = 1.05

export function getSquareMaskGeometry(center: Point, viewport: Size): MaskGeometry {
  const { halfW, halfH } = maxHalfExtent(center, viewport)
  const side = Math.max(halfW, halfH) * 2 * SQUARE_COVERAGE_MARGIN
  return pinCenterGeometry(SOLID_RECT_MASK_IMAGE, center, { width: side, height: side })
}

/**
 * RECTANGLE：贴合视口宽高比的矩形（与 magicui 的 rectangle 观感一致），
 * 半宽 / 半高分别盖住对应半边界；5% 余量防末帧缝隙。
 */
export const RECTANGLE_COVERAGE_MARGIN = 1.05

export function getRectangleMaskGeometry(center: Point, viewport: Size): MaskGeometry {
  const { halfW, halfH } = maxHalfExtent(center, viewport)
  return pinCenterGeometry(SOLID_RECT_MASK_IMAGE, center, {
    width: halfW * 2 * RECTANGLE_COVERAGE_MARGIN,
    height: halfH * 2 * RECTANGLE_COVERAGE_MARGIN,
  })
}

/**
 * DIAMOND：内切半径 = 外接圆半径 × √2/2（顶点钉在边中点的正方形）。
 * 要让内切半径盖住视口最远角，外接圆半径 ≥ maxRadius × √2；再留 5% 余量。
 */
export const DIAMOND_COVERAGE_FACTOR = Math.SQRT2 * SQUARE_COVERAGE_MARGIN

export function getDiamondMaskGeometry(center: Point, viewport: Size): MaskGeometry {
  const side = getMaxRadiusToCorners(center, viewport) * DIAMOND_COVERAGE_FACTOR * 2
  return pinCenterGeometry(DIAMOND_MASK_IMAGE, center, { width: side, height: side })
}

/** HEXAGON：尖顶朝上六边形，内切半径（边心距）= 外接圆半径 × cos(30°)；√2 因子已充分覆盖（≥ maxRadius × 1.22） */
export const HEXAGON_COVERAGE_FACTOR = Math.SQRT2 * SQUARE_COVERAGE_MARGIN

export function getHexagonMaskGeometry(center: Point, viewport: Size): MaskGeometry {
  const side = getMaxRadiusToCorners(center, viewport) * HEXAGON_COVERAGE_FACTOR * 2
  return pinCenterGeometry(HEXAGON_MASK_IMAGE, center, { width: side, height: side })
}

/**
 * TRIANGLE：顶点朝上等边三角形，内切半径 = 外接圆半径 / 2，
 * 故外接圆半径取 2.2 × maxRadius（内切半径 1.1 × maxRadius，自带 10% 余量，与 magicui 一致）。
 */
export const TRIANGLE_CIRCUMRADIUS_FACTOR = 2.2

export function getTriangleMaskGeometry(center: Point, viewport: Size): MaskGeometry {
  const side = getMaxRadiusToCorners(center, viewport) * TRIANGLE_CIRCUMRADIUS_FACTOR * 2
  return pinCenterGeometry(TRIANGLE_MASK_IMAGE, center, { width: side, height: side })
}

/**
 * STAR：五角星的内凹谷半径 = STAR_INNER_RATIO × 外接圆半径——凹谷方向是覆盖的最差方向，
 * 必须让内切半径 ≥ maxRadius，故外接圆半径取 maxRadius / 0.42 × 1.05 ≈ 2.5 × maxRadius。
 * 这是有意偏离 magicui 的地方：它的外接圆只有 1.45 × maxRadius，凹谷盖不住视口角落，
 * 末帧四角会透出旧主题（clip-path 随转场组销毁所以它可接受）；我们的 mask 在样式移除前
 * 持续生效（fill both），必须保证完全覆盖。
 */
export const STAR_CIRCUMRADIUS_FACTOR = 2.5

export function getStarMaskGeometry(center: Point, viewport: Size): MaskGeometry {
  const side = getMaxRadiusToCorners(center, viewport) * STAR_CIRCUMRADIUS_FACTOR * 2
  return pinCenterGeometry(STAR_MASK_IMAGE, center, { width: side, height: side })
}

/**
 * CIRCLE_REVERT 收起方向（切回亮色）的几何：暗色圆从全覆盖收缩到触发点 0。
 * 起始尺寸与 CIRCLE 的终尺寸相同（2.1 × maxRadius，保证初始盖住整个视口），
 * 钉扎方向与 CIRCLE 相反：from 全尺寸居中 → to 触发点 0。
 * 扩散方向（切到暗色）直接复用 getCircleMaskGeometry（暗色圆从 0 长出）。
 */
export function getCircleRevertMaskGeometry(center: Point, viewport: Size): MaskGeometry {
  const side = getMaxRadiusToCorners(center, viewport) * CIRCLE_SIZE_FACTOR
  return {
    maskImage: CIRCLE_MASK_IMAGE,
    startSize: `${px(side)} ${px(side)}`,
    startPosition: `${px(center.x - side / 2)} ${px(center.y - side / 2)}`,
    endSize: '0px 0px',
    endPosition: `${px(center.x)} ${px(center.y)}`,
  }
}

/**
 * CIRCLE_BLUR：`feGaussianBlur` 烘焙进 SVG 蒙版本身（而非 CSS filter，Safari 兼容性同其余类型）。
 * viewBox -50..50、圆 r=25 与参考实现（magicui 系 useBlurCircleTheme）一致；模糊强度按
 * BLUR_MASK_DEVIATION_FACTOR 放大后作为 stdDeviation 写进 data-URI，随蒙版缩放。
 * 蒙版只挂新截图层（旧层完整垫底），否则蒙版外露出的是已翻转的实时页面——主题会瞬间全变。
 */
export const BLUR_MASK_DEVIATION_FACTOR = 1.2

const blurMaskCache = new Map<string, string>()

export function getBlurCircleMaskImage(blurAmount: number): string {
  const stdDeviation = roundTo(blurAmount * BLUR_MASK_DEVIATION_FACTOR, 2)
  const cacheKey = String(stdDeviation)
  const cached = blurMaskCache.get(cacheKey)
  if (cached) return cached
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-50 -50 100 100">` +
    `<defs><filter id="b"><feGaussianBlur stdDeviation="${stdDeviation}"/></filter></defs>` +
    `<circle cx="0" cy="0" r="25" fill="#fff" filter="url(#b)"/></svg>`
  const maskImage = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
  blurMaskCache.set(cacheKey, maskImage)
  return maskImage
}

/**
 * 模糊圆的终尺寸：模糊会吃掉蒙版的实心核心，需要比 CIRCLE 更大的尺寸才能保证完全覆盖。
 * 公式与参考实现一致（4 × (视口长边 + 200) 与 2.5 × maxRadius 取大），再按约定加上限
 * BLUR_MAX_MASK_SIZE 防超大屏 GPU 纹理过大（超出上限时视口角落的模糊边缘会略重，可接受）。
 */
export const BLUR_MAX_MASK_SIZE = 8000

export function getBlurCircleMaskGeometry(center: Point, viewport: Size, blurAmount: number): MaskGeometry {
  const longestSide = Math.max(viewport.width, viewport.height)
  const endSize = Math.min(
    BLUR_MAX_MASK_SIZE,
    Math.max((longestSide + 200) * 4, getMaxRadiusToCorners(center, viewport) * 2.5),
  )
  return pinCenterGeometry(getBlurCircleMaskImage(blurAmount), center, { width: endSize, height: endSize })
}

/** 中心扩散形状的几何函数表（含 CIRCLE）；`type in` 即类型守卫 */
const SHAPE_GEOMETRY: Record<ShapeAnimationType, (center: Point, viewport: Size) => MaskGeometry> = {
  [ThemeAnimationType.CIRCLE]: getCircleMaskGeometry,
  [ThemeAnimationType.SQUARE]: getSquareMaskGeometry,
  [ThemeAnimationType.DIAMOND]: getDiamondMaskGeometry,
  [ThemeAnimationType.RECTANGLE]: getRectangleMaskGeometry,
  [ThemeAnimationType.HEXAGON]: getHexagonMaskGeometry,
  [ThemeAnimationType.TRIANGLE]: getTriangleMaskGeometry,
  [ThemeAnimationType.STAR]: getStarMaskGeometry,
}

export function isShapeAnimationType(type: ThemeAnimationType): type is ShapeAnimationType {
  return type in SHAPE_GEOMETRY
}

export function isBlurAnimationType(type: ThemeAnimationType): boolean {
  return type === ThemeAnimationType.CIRCLE_BLUR
}

export function isDirectionalAnimationType(type: ThemeAnimationType): type is DirectionalAnimationType {
  return type in DIRECTIONAL_START
}

/**
 * 按动画类型分发；未知类型按 CIRCLE 处理。blurAmount 仅被 CIRCLE_BLUR 消费。
 * CIRCLE_REVERT 的收起方向由 orchestrate 直接取 getCircleRevertMaskGeometry；
 * 扩散方向与本分发一致（暗色圆从触发点长出 = CIRCLE 几何），故回落 CIRCLE。
 */
export function getMaskGeometry(
  type: ThemeAnimationType,
  center: Point,
  viewport: Size,
  blurAmount = 2,
): MaskGeometry {
  if (isDirectionalAnimationType(type)) return getDirectionalMaskGeometry(type)
  if (isShapeAnimationType(type)) return SHAPE_GEOMETRY[type](center, viewport)
  if (isBlurAnimationType(type)) return getBlurCircleMaskGeometry(center, viewport, blurAmount)
  return getCircleMaskGeometry(center, viewport)
}
