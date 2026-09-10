import { ThemeAnimationType } from './types'
import type { DirectionalAnimationType } from './types'

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

export function isDirectionalAnimationType(type: ThemeAnimationType): type is DirectionalAnimationType {
  return type in DIRECTIONAL_START
}

/** 按动画类型分发；未知类型按 CIRCLE 处理 */
export function getMaskGeometry(type: ThemeAnimationType, center: Point, viewport: Size): MaskGeometry {
  return isDirectionalAnimationType(type)
    ? getDirectionalMaskGeometry(type)
    : getCircleMaskGeometry(center, viewport)
}
