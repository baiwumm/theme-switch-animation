import { describe, expect, it } from 'vitest'

import {
  BAR_MASK_IMAGE,
  BAR_START_PX,
  CIRCLE_MASK_IMAGE,
  CIRCLE_SIZE_FACTOR,
  getCircleMaskGeometry,
  getDirectionalMaskGeometry,
  getMaskGeometry,
  getMaxRadiusToCorners,
  getTriggerCenter,
  isDirectionalAnimationType,
} from './masks'
import type { RectProvider } from './masks'
import { ThemeAnimationType } from './types'

const viewport = { width: 800, height: 600 }

const rectOf = (left: number, top: number, width: number, height: number): RectProvider => ({
  getBoundingClientRect: () => ({ left, top, width, height }),
})

describe('getMaxRadiusToCorners（四角最大距离）', () => {
  it('视口中心：到四角等距，等于半对角线', () => {
    expect(getMaxRadiusToCorners({ x: 400, y: 300 }, viewport)).toBe(500)
  })

  it.each([
    ['左上角', { x: 0, y: 0 }],
    ['右上角', { x: 800, y: 0 }],
    ['左下角', { x: 0, y: 600 }],
    ['右下角', { x: 800, y: 600 }],
  ])('%s：最远点是对角，等于整条对角线', (_label, center) => {
    expect(getMaxRadiusToCorners(center, viewport)).toBe(1000)
  })

  it('偏心点：取四角中的最大值', () => {
    // 到 (0,0)=100, (800,0)=√(700²+0²)=700, (0,600)=√(100²+600²), (800,600)=√(700²+600²)
    expect(getMaxRadiusToCorners({ x: 100, y: 0 }, viewport)).toBeCloseTo(Math.hypot(700, 600), 10)
  })

  it('触发点在视口外（负坐标 / 超出）：距离仍按几何计算，不被截断', () => {
    expect(getMaxRadiusToCorners({ x: -100, y: 700 }, viewport)).toBeCloseTo(Math.hypot(900, 700), 10)
  })

  it('零尺寸视口不会产生 NaN', () => {
    expect(getMaxRadiusToCorners({ x: 0, y: 0 }, { width: 0, height: 0 })).toBe(0)
  })
})

describe('getTriggerCenter（触发元素中心）', () => {
  it('取 getBoundingClientRect 的中心点', () => {
    expect(getTriggerCenter(rectOf(100, 50, 40, 20), viewport)).toEqual({ x: 120, y: 60 })
  })

  it('没有触发元素时回落到视口中心', () => {
    expect(getTriggerCenter(null, viewport)).toEqual({ x: 400, y: 300 })
    expect(getTriggerCenter(undefined, viewport)).toEqual({ x: 400, y: 300 })
  })

  it('元素部分滚出视口（负坐标）时保留真实坐标', () => {
    expect(getTriggerCenter(rectOf(-30, -10, 20, 20), viewport)).toEqual({ x: -20, y: 0 })
  })
})

describe('getCircleMaskGeometry（CIRCLE 终尺寸与圆心钉扎）', () => {
  it('终尺寸 = 四角最大距离 × 2.1，从 0 长起', () => {
    const geometry = getCircleMaskGeometry({ x: 400, y: 300 }, viewport)
    expect(CIRCLE_SIZE_FACTOR).toBe(2.1)
    expect(geometry.startSize).toBe('0px 0px')
    expect(geometry.endSize).toBe('1050px 1050px')
  })

  it('起始 position 落在触发点，终止 position = 触发点 - 边长 / 2（圆心不动）', () => {
    const geometry = getCircleMaskGeometry({ x: 400, y: 300 }, viewport)
    expect(geometry.startPosition).toBe('400px 300px')
    expect(geometry.endPosition).toBe('-125px -225px')
  })

  it('角落触发时终尺寸覆盖整条对角线 × 2.1', () => {
    const geometry = getCircleMaskGeometry({ x: 0, y: 0 }, viewport)
    expect(geometry.startPosition).toBe('0px 0px')
    expect(geometry.endSize).toBe('2100px 2100px')
    expect(geometry.endPosition).toBe('-1050px -1050px')
  })

  it('非整数结果保留两位小数，避免超长浮点串进入 CSS', () => {
    const geometry = getCircleMaskGeometry({ x: 100, y: 0 }, viewport)
    const expected = Math.round(Math.hypot(700, 600) * 2.1 * 100) / 100
    expect(geometry.endSize).toBe(`${expected}px ${expected}px`)
    expect(geometry.endSize).not.toMatch(/\d\.\d{3,}/)
  })

  it('使用 SVG data-URI 实心圆作为 mask-image', () => {
    const geometry = getCircleMaskGeometry({ x: 400, y: 300 }, viewport)
    expect(geometry.maskImage).toBe(CIRCLE_MASK_IMAGE)
    expect(geometry.maskImage).toMatch(/^url\("data:image\/svg\+xml,/)
    expect(decodeURIComponent(geometry.maskImage)).toContain('<circle')
  })
})

describe('getDirectionalMaskGeometry（四向起始位置 / 尺寸）', () => {
  it('起始细条厚度为 4px', () => {
    expect(BAR_START_PX).toBe(4)
  })

  it.each([
    [ThemeAnimationType.LTR, '4px 100%', '0% 0%'],
    [ThemeAnimationType.RTL, '4px 100%', '100% 0%'],
    [ThemeAnimationType.TTB, '100% 4px', '0% 0%'],
    [ThemeAnimationType.BTT, '100% 4px', '0% 100%'],
  ] as const)('%s：起始尺寸 %s，钉在 %s', (type, startSize, position) => {
    const geometry = getDirectionalMaskGeometry(type)
    expect(geometry.startSize).toBe(startSize)
    expect(geometry.startPosition).toBe(position)
    expect(geometry.endSize).toBe('100% 100%')
    expect(geometry.endPosition).toBe(position)
    expect(geometry.maskImage).toBe(BAR_MASK_IMAGE)
    expect(geometry.maskImage).toMatch(/^linear-gradient\(/)
  })
})

describe('getMaskGeometry（按类型分发）', () => {
  it('CIRCLE 走圆形几何，且依赖触发点与视口', () => {
    expect(getMaskGeometry(ThemeAnimationType.CIRCLE, { x: 400, y: 300 }, viewport)).toEqual(
      getCircleMaskGeometry({ x: 400, y: 300 }, viewport),
    )
  })

  it('四向类型走条形几何，与触发点无关', () => {
    const a = getMaskGeometry(ThemeAnimationType.LTR, { x: 0, y: 0 }, viewport)
    const b = getMaskGeometry(ThemeAnimationType.LTR, { x: 800, y: 600 }, viewport)
    expect(a).toEqual(b)
    expect(a).toEqual(getDirectionalMaskGeometry(ThemeAnimationType.LTR))
  })

  it('未知类型按 CIRCLE 处理', () => {
    const unknown = 'diamond' as unknown as ThemeAnimationType
    expect(isDirectionalAnimationType(unknown)).toBe(false)
    expect(getMaskGeometry(unknown, { x: 400, y: 300 }, viewport).maskImage).toBe(CIRCLE_MASK_IMAGE)
  })

  it('isDirectionalAnimationType 只对四向类型为 true', () => {
    expect(isDirectionalAnimationType(ThemeAnimationType.CIRCLE)).toBe(false)
    for (const type of [ThemeAnimationType.LTR, ThemeAnimationType.RTL, ThemeAnimationType.TTB, ThemeAnimationType.BTT]) {
      expect(isDirectionalAnimationType(type)).toBe(true)
    }
  })
})
