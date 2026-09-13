import { describe, expect, it } from 'vitest'

import {
  BAR_MASK_IMAGE,
  BAR_START_PX,
  BLUR_MASK_DEVIATION_FACTOR,
  BLUR_MAX_MASK_SIZE,
  CIRCLE_MASK_IMAGE,
  CIRCLE_SIZE_FACTOR,
  DIAMOND_COVERAGE_FACTOR,
  HEXAGON_COVERAGE_FACTOR,
  RECTANGLE_COVERAGE_MARGIN,
  SOLID_RECT_MASK_IMAGE,
  SQUARE_COVERAGE_MARGIN,
  STAR_CIRCUMRADIUS_FACTOR,
  STAR_INNER_RATIO,
  STAR_MASK_IMAGE,
  TRIANGLE_CIRCUMRADIUS_FACTOR,
  getBlurCircleMaskGeometry,
  getBlurCircleMaskImage,
  getCircleMaskGeometry,
  getCircleRevertMaskGeometry,
  getDiamondMaskGeometry,
  getDirectionalMaskGeometry,
  getHexagonMaskGeometry,
  getMaskGeometry,
  getMaxRadiusToCorners,
  getRectangleMaskGeometry,
  getSquareMaskGeometry,
  getStarMaskGeometry,
  getTriggerCenter,
  getTriangleMaskGeometry,
  isBlurAnimationType,
  isDirectionalAnimationType,
  isShapeAnimationType,
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

  it('结果取整到整数 px，避免分数像素与超长浮点串进入 CSS', () => {
    const geometry = getCircleMaskGeometry({ x: 100, y: 0 }, viewport)
    const expected = Math.round(Math.hypot(700, 600) * 2.1)
    expect(geometry.endSize).toBe(`${expected}px ${expected}px`)
    expect(geometry.endSize).not.toMatch(/\d\.\d/)
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

describe('中心扩散形状几何（SQUARE / RECTANGLE / DIAMOND / HEXAGON / TRIANGLE / STAR）', () => {
  const center = { x: 400, y: 300 }

  it('覆盖系数与推导一致（修改时必须同步需求文档 §7）', () => {
    expect(SQUARE_COVERAGE_MARGIN).toBe(1.05)
    expect(RECTANGLE_COVERAGE_MARGIN).toBe(1.05)
    expect(DIAMOND_COVERAGE_FACTOR).toBeCloseTo(Math.SQRT2 * 1.05, 12)
    expect(HEXAGON_COVERAGE_FACTOR).toBeCloseTo(Math.SQRT2 * 1.05, 12)
    expect(TRIANGLE_CIRCUMRADIUS_FACTOR).toBe(2.2)
    expect(STAR_CIRCUMRADIUS_FACTOR).toBe(2.5)
    expect(STAR_INNER_RATIO).toBe(0.42)
  })

  it('SQUARE：半边长盖住更远的半边界 × 1.05，蒙版中心钉在触发点', () => {
    const geometry = getSquareMaskGeometry(center, viewport)
    // halfW = 400 → side = 400 × 2 × 1.05 = 840
    expect(geometry.endSize).toBe('840px 840px')
    expect(geometry.startSize).toBe('0px 0px')
    expect(geometry.startPosition).toBe('400px 300px')
    expect(geometry.endPosition).toBe('-20px -120px')
  })

  it('RECTANGLE：半宽 / 半高分别盖住对应半边界（贴合视口宽高比）', () => {
    const geometry = getRectangleMaskGeometry(center, viewport)
    // w = 400×2×1.05 = 840，h = 300×2×1.05 = 630
    expect(geometry.endSize).toBe('840px 630px')
    expect(geometry.endPosition).toBe('-20px -15px')
  })

  it('SQUARE / RECTANGLE：角落触发时盖住到远侧边界 × 1.05', () => {
    const corner = { x: 0, y: 0 }
    expect(getSquareMaskGeometry(corner, viewport).endSize).toBe('1680px 1680px')
    expect(getRectangleMaskGeometry(corner, viewport).endSize).toBe('1680px 1260px')
    expect(getRectangleMaskGeometry(corner, viewport).endPosition).toBe('-840px -630px')
  })

  it('SQUARE / RECTANGLE：共用 preserveAspectRatio="none" 的实心矩形 SVG', () => {
    const svg = decodeURIComponent(SOLID_RECT_MASK_IMAGE)
    expect(SOLID_RECT_MASK_IMAGE).toMatch(/^url\("data:image\/svg\+xml,/)
    expect(svg).toContain('preserveAspectRatio="none"')
    expect(svg).toContain('<rect')
    expect(getSquareMaskGeometry(center, viewport).maskImage).toBe(SOLID_RECT_MASK_IMAGE)
    expect(getRectangleMaskGeometry(center, viewport).maskImage).toBe(SOLID_RECT_MASK_IMAGE)
  })

  it.each([
    ['DIAMOND', getDiamondMaskGeometry, DIAMOND_COVERAGE_FACTOR],
    ['HEXAGON', getHexagonMaskGeometry, HEXAGON_COVERAGE_FACTOR],
  ] as const)('%s：终边长 = maxRadius × √2 × 1.05 × 2，中心钉在触发点', (_label, geometryFn, factor) => {
    const geometry = geometryFn(center, viewport)
    // maxRadius = 500（中心到四角）；几何一律取整到整数 px（位置用未取整边长计算后取整）
    const side = 500 * factor * 2
    expect(geometry.endSize).toBe(`${Math.round(side)}px ${Math.round(side)}px`)
    expect(geometry.startPosition).toBe('400px 300px')
    expect(geometry.endPosition).toBe(`${Math.round(400 - side / 2)}px ${Math.round(300 - side / 2)}px`)
  })

  it('TRIANGLE：外接圆半径 2.2 × maxRadius（内切半径 1.1 × maxRadius 天然覆盖）', () => {
    const geometry = getTriangleMaskGeometry(center, viewport)
    // 500 × 2.2 × 2 = 2200
    expect(geometry.endSize).toBe('2200px 2200px')
    expect(geometry.endPosition).toBe('-700px -800px')
  })

  it('STAR：外接圆半径 2.5 × maxRadius——内凹谷半径 0.42 × 2.5 = 1.05 ≥ maxRadius，凹谷方向也完全覆盖', () => {
    const geometry = getStarMaskGeometry(center, viewport)
    // 500 × 2.5 × 2 = 2500
    expect(geometry.endSize).toBe('2500px 2500px')
    expect(geometry.endPosition).toBe('-850px -950px')
  })

  it.each([
    ['DIAMOND', 4],
    ['HEXAGON', 6],
    ['TRIANGLE', 3],
    ['STAR', 10],
  ] as const)('%s 蒙版是含 %i 个顶点的 SVG polygon data-URI', (label, vertexCount) => {
    const images = {
      DIAMOND: getDiamondMaskGeometry(center, viewport).maskImage,
      HEXAGON: getHexagonMaskGeometry(center, viewport).maskImage,
      TRIANGLE: getTriangleMaskGeometry(center, viewport).maskImage,
      STAR: getStarMaskGeometry(center, viewport).maskImage,
    } as const
    const maskImage = images[label]
    expect(maskImage).toMatch(/^url\("data:image\/svg\+xml,/)
    const svg = decodeURIComponent(maskImage)
    expect(svg).toContain('<polygon')
    const pairs = svg.match(/points="([^"]+)"/)![1].trim().split(/\s+/)
    expect(pairs).toHaveLength(vertexCount)
  })

  it('STAR 蒙版顶点朝上：最顶点在 x=1（viewBox 中心线上）', () => {
    const svg = decodeURIComponent(STAR_MASK_IMAGE)
    const first = svg.match(/points="([\d.]+),([\d.]+) /)!
    expect(first[1]).toBe('1')
    expect(first[2]).toBe('0')
  })
})

describe('getCircleRevertMaskGeometry（REVERT 收起方向：全尺寸收缩到触发点）', () => {
  it('起始尺寸与 CIRCLE 终尺寸相同（2.1 × maxRadius），保证初始盖住视口', () => {
    const revert = getCircleRevertMaskGeometry({ x: 400, y: 300 }, viewport)
    const circle = getCircleMaskGeometry({ x: 400, y: 300 }, viewport)
    expect(revert.startSize).toBe(circle.endSize)
    expect(revert.startPosition).toBe(circle.endPosition)
  })

  it('收缩终点：尺寸 0、位置钉在触发点，蒙版为同一张圆形 SVG', () => {
    const revert = getCircleRevertMaskGeometry({ x: 400, y: 300 }, viewport)
    expect(revert.endSize).toBe('0px 0px')
    expect(revert.endPosition).toBe('400px 300px')
    expect(revert.maskImage).toBe(CIRCLE_MASK_IMAGE)
  })
})

describe('getBlurCircleMaskImage / getBlurCircleMaskGeometry（CIRCLE_BLUR）', () => {
  it('模糊烘焙进 SVG：feGaussianBlur stdDeviation = blurAmount × 1.2，data-URI 完整编码', () => {
    expect(BLUR_MASK_DEVIATION_FACTOR).toBe(1.2)
    const maskImage = getBlurCircleMaskImage(2)
    expect(maskImage).toMatch(/^url\("data:image\/svg\+xml,/)
    const svg = decodeURIComponent(maskImage)
    expect(svg).toContain('viewBox="-50 -50 100 100"')
    expect(svg).toContain('<feGaussianBlur stdDeviation="2.4"/>')
    expect(svg).toContain('r="25"')
    expect(svg).toContain('filter="url(#b)"')
    expect(maskImage).not.toContain('#')
  })

  it('同强度命中缓存返回一致结果，不同强度生成不同 stdDeviation', () => {
    expect(getBlurCircleMaskImage(2)).toBe(getBlurCircleMaskImage(2))
    expect(getBlurCircleMaskImage(3)).toContain(encodeURIComponent('stdDeviation="3.6"'))
    expect(getBlurCircleMaskImage(2)).not.toBe(getBlurCircleMaskImage(3))
  })

  it('终尺寸 = max(4 × (长边 + 200), 2.5 × maxRadius)，蒙版中心钉在触发点', () => {
    const geometry = getBlurCircleMaskGeometry({ x: 400, y: 300 }, viewport, 2)
    // max(4 × (800 + 200), 2.5 × 500) = 4000
    expect(geometry.endSize).toBe('4000px 4000px')
    expect(geometry.startSize).toBe('0px 0px')
    expect(geometry.startPosition).toBe('400px 300px')
    expect(geometry.endPosition).toBe('-1600px -1700px')
  })

  it('超大视口按 BLUR_MAX_MASK_SIZE 封顶', () => {
    expect(BLUR_MAX_MASK_SIZE).toBe(8000)
    const geometry = getBlurCircleMaskGeometry({ x: 2000, y: 1500 }, { width: 4000, height: 3000 }, 2)
    expect(geometry.endSize).toBe('8000px 8000px')
  })

  it('蒙版随 blurAmount 变化：dispatch 透传第四参', () => {
    expect(getMaskGeometry(ThemeAnimationType.CIRCLE_BLUR, { x: 400, y: 300 }, viewport, 3).maskImage).toBe(
      getBlurCircleMaskImage(3),
    )
    expect(getMaskGeometry(ThemeAnimationType.CIRCLE_BLUR, { x: 400, y: 300 }, viewport).maskImage).toBe(
      getBlurCircleMaskImage(2),
    )
    expect(isBlurAnimationType(ThemeAnimationType.CIRCLE_BLUR)).toBe(true)
    expect(isBlurAnimationType(ThemeAnimationType.CIRCLE)).toBe(false)
    expect(isShapeAnimationType(ThemeAnimationType.CIRCLE_BLUR)).toBe(false)
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

  it('形状类型分发给各自的几何函数', () => {
    expect(getMaskGeometry(ThemeAnimationType.SQUARE, { x: 400, y: 300 }, viewport)).toEqual(
      getSquareMaskGeometry({ x: 400, y: 300 }, viewport),
    )
    expect(getMaskGeometry(ThemeAnimationType.DIAMOND, { x: 400, y: 300 }, viewport)).toEqual(
      getDiamondMaskGeometry({ x: 400, y: 300 }, viewport),
    )
    expect(getMaskGeometry(ThemeAnimationType.RECTANGLE, { x: 400, y: 300 }, viewport)).toEqual(
      getRectangleMaskGeometry({ x: 400, y: 300 }, viewport),
    )
    expect(getMaskGeometry(ThemeAnimationType.HEXAGON, { x: 400, y: 300 }, viewport)).toEqual(
      getHexagonMaskGeometry({ x: 400, y: 300 }, viewport),
    )
    expect(getMaskGeometry(ThemeAnimationType.TRIANGLE, { x: 400, y: 300 }, viewport)).toEqual(
      getTriangleMaskGeometry({ x: 400, y: 300 }, viewport),
    )
    expect(getMaskGeometry(ThemeAnimationType.STAR, { x: 400, y: 300 }, viewport)).toEqual(
      getStarMaskGeometry({ x: 400, y: 300 }, viewport),
    )
  })

  it('未知类型按 CIRCLE 处理', () => {
    const unknown = 'spiral' as unknown as ThemeAnimationType
    expect(isDirectionalAnimationType(unknown)).toBe(false)
    expect(isShapeAnimationType(unknown)).toBe(false)
    expect(getMaskGeometry(unknown, { x: 400, y: 300 }, viewport).maskImage).toBe(CIRCLE_MASK_IMAGE)
  })

  it('isDirectionalAnimationType 只对四向类型为 true', () => {
    expect(isDirectionalAnimationType(ThemeAnimationType.CIRCLE)).toBe(false)
    for (const type of [ThemeAnimationType.LTR, ThemeAnimationType.RTL, ThemeAnimationType.TTB, ThemeAnimationType.BTT]) {
      expect(isDirectionalAnimationType(type)).toBe(true)
    }
  })

  it('isShapeAnimationType 对 CIRCLE 与全部几何形状为 true，对四向类型为 false', () => {
    for (const type of [
      ThemeAnimationType.CIRCLE,
      ThemeAnimationType.SQUARE,
      ThemeAnimationType.DIAMOND,
      ThemeAnimationType.RECTANGLE,
      ThemeAnimationType.HEXAGON,
      ThemeAnimationType.TRIANGLE,
      ThemeAnimationType.STAR,
    ]) {
      expect(isShapeAnimationType(type)).toBe(true)
    }
    for (const type of [ThemeAnimationType.LTR, ThemeAnimationType.RTL, ThemeAnimationType.TTB, ThemeAnimationType.BTT]) {
      expect(isShapeAnimationType(type)).toBe(false)
    }
  })
})
