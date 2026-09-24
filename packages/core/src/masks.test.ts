import { describe, expect, it } from 'vitest'

import {
  BLUR_MASK_DEVIATION_FACTOR,
  BLUR_MAX_MASK_SIZE,
  CIRCLE_MASK_IMAGE,
  CIRCLE_SIZE_FACTOR,
  CLOCK_SWEEP_TAIL_DEG,
  CURTAIN_FEATHER_PX,
  DIAMOND_COVERAGE_FACTOR,
  FULL_CIRCLE_DEG,
  HEXAGON_COVERAGE_FACTOR,
  RECTANGLE_COVERAGE_MARGIN,
  QR_GRID_CELL_PX,
  RIPPLE_CREST_ALPHA,
  RIPPLE_TRAIL_COUNT,
  SCAN_BAND_ALPHA,
  SCAN_BAND_WIDTH_PX,
  SCAN_FADE_WIDTH_PX,
  SOLID_RECT_MASK_IMAGE,
  SQUARE_COVERAGE_MARGIN,
  STAR_CIRCUMRADIUS_FACTOR,
  STAR_INNER_RATIO,
  STAR_MASK_IMAGE,
  TRIANGLE_CIRCUMRADIUS_FACTOR,
  getBlurCircleMaskGeometry,
  getBlurCircleMaskImage,
  getBlindsFeatherPx,
  getBlindsRevealSpec,
  getCircleMaskGeometry,
  getCircleRevertMaskGeometry,
  getClockSweepRevealSpec,
  getClockSweepReverseRevealSpec,
  getCurtainMaskSpec,
  getCurtainRevealSpec,
  getCurtainReverseRevealSpec,
  getDiamondMaskGeometry,
  getHexagonMaskGeometry,
  getFanBladeStepDeg,
  getFanRevealSpec,
  getFanReverseRevealSpec,
  getMaskGeometry,
  getMaxRadiusToCorners,
  getQrGridMaskSpec,
  getRectangleMaskGeometry,
  getRevealMaskSpec,
  getRippleFrontExtentPx,
  getRippleMaskSpec,
  getRippleRevealSpec,
  getRippleReverseRevealSpec,
  getScanRevealSpec,
  getSquareMaskGeometry,
  getStarMaskGeometry,
  getSweepMaskSpec,
  getTriggerCenter,
  getTriangleMaskGeometry,
  isBlurAnimationType,
  isQrGridAnimationType,
  isRevealAnimationType,
  isRippleAnimationType,
  isShapeAnimationType,
  isSweepAnimationType,
} from './masks'
import type { RectProvider } from './masks'
import { REVEAL_VAR, SWEEP_VAR, ThemeAnimationDirection, ThemeAnimationType } from './types'

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
    expect(isShapeAnimationType(unknown)).toBe(false)
    expect(getMaskGeometry(unknown, { x: 400, y: 300 }, viewport).maskImage).toBe(CIRCLE_MASK_IMAGE)
  })

  it('isShapeAnimationType 对 CIRCLE 与全部几何形状为 true，对属性驱动类型为 false', () => {
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
    for (const type of [ThemeAnimationType.BLINDS, ThemeAnimationType.SCAN, ThemeAnimationType.QR_GRID]) {
      expect(isShapeAnimationType(type)).toBe(false)
    }
  })
})

describe('属性驱动揭开（BLINDS / SCAN）', () => {
  it('BLINDS LTR：竖叶片 72px 平铺、渐变角 90deg、from = -feather / to = 叶片宽', () => {
    const spec = getBlindsRevealSpec(ThemeAnimationDirection.LTR, 72)
    expect(spec.from).toBe(-20)
    expect(spec.to).toBe(72)
    expect(spec.maskImage).toBe(
      'linear-gradient(90deg, #000 0 var(--theme-switch-reveal), transparent calc(var(--theme-switch-reveal) + 20px))',
    )
    expect(spec.maskSize).toBe('72px 100%')
    expect(spec.maskRepeat).toBe('repeat')
  })

  it('BLINDS 方向表：TTB/BTT 横叶片（100% × 高）且渐变角 180deg/0deg，RTL 270deg', () => {
    expect(getBlindsRevealSpec(ThemeAnimationDirection.TTB, 72).maskSize).toBe('100% 72px')
    expect(getBlindsRevealSpec(ThemeAnimationDirection.TTB, 72).maskImage).toContain('linear-gradient(180deg')
    expect(getBlindsRevealSpec(ThemeAnimationDirection.BTT, 72).maskImage).toContain('linear-gradient(0deg')
    expect(getBlindsRevealSpec(ThemeAnimationDirection.RTL, 72).maskImage).toContain('linear-gradient(270deg')
    expect(getBlindsRevealSpec(ThemeAnimationDirection.RTL, 72).maskSize).toBe('72px 100%')
  })

  it('软边按比例收缩且封顶 20px（小叶片配大软边会导致起始帧遮不全）', () => {
    expect(getBlindsFeatherPx(16)).toBe(4)
    expect(getBlindsFeatherPx(50)).toBe(14)
    expect(getBlindsFeatherPx(72)).toBe(20)
    expect(getBlindsFeatherPx(200)).toBe(20)
  })

  it('SCAN LTR：from 0、to = 视口宽 + 光束总宽、单层 no-repeat', () => {
    const spec = getScanRevealSpec(ThemeAnimationDirection.LTR, viewport)
    expect(spec.from).toBe(0)
    expect(spec.to).toBe(viewport.width + SCAN_BAND_WIDTH_PX + SCAN_FADE_WIDTH_PX)
    expect(spec.maskSize).toBe('100% 100%')
    expect(spec.maskRepeat).toBe('no-repeat')
    expect(spec.maskImage).toContain('linear-gradient(90deg')
    expect(spec.maskImage).toContain(`rgba(0, 0, 0, ${SCAN_BAND_ALPHA})`)
  })

  it('SCAN TTB：推进轴切到 y，to 用视口高', () => {
    const spec = getScanRevealSpec(ThemeAnimationDirection.TTB, viewport)
    expect(spec.to).toBe(viewport.height + SCAN_BAND_WIDTH_PX + SCAN_FADE_WIDTH_PX)
    expect(spec.maskImage).toContain('linear-gradient(180deg')
  })

  it('分发与守卫：仅 BLINDS / SCAN 命中 reveal，其余类型不命中', () => {
    for (const type of [ThemeAnimationType.BLINDS, ThemeAnimationType.SCAN]) {
      expect(isRevealAnimationType(type)).toBe(true)
    }
    for (const type of [
      ThemeAnimationType.CIRCLE,
      ThemeAnimationType.SQUARE,
      ThemeAnimationType.STAR,
      ThemeAnimationType.CIRCLE_REVERT,
    ] as const) {
      expect(isRevealAnimationType(type)).toBe(false)
    }
    expect(getRevealMaskSpec(ThemeAnimationType.BLINDS, ThemeAnimationDirection.LTR, 72, viewport)).toEqual(
      getBlindsRevealSpec(ThemeAnimationDirection.LTR, 72),
    )
    expect(getRevealMaskSpec(ThemeAnimationType.SCAN, ThemeAnimationDirection.TTB, 72, viewport)).toEqual(
      getScanRevealSpec(ThemeAnimationDirection.TTB, viewport),
    )
  })
})

describe('QR_GRID（方块格子）', () => {
  it('LTR 规格：行层自顶中心生长 × 列层自左生长的交叉双层，from = -2×软边 / to = 格距', () => {
    const spec = getQrGridMaskSpec(ThemeAnimationDirection.LTR)
    const feather = 18 // min(20, round(64 × 0.28))
    expect(spec.from).toBe(-2 * feather)
    expect(spec.to).toBe(QR_GRID_CELL_PX)
    expect(spec.baselineImage).toBe(
      'linear-gradient(90deg, #000 0 var(--theme-switch-reveal), transparent calc(var(--theme-switch-reveal) + 18px))',
    )
    expect(spec.baselineSize).toBe('64px 100%')
    expect(spec.cellImage).toBe(
      'linear-gradient(180deg, transparent calc(50% - var(--theme-switch-reveal) / 2 - 18px),' +
      ' #000 calc(50% - var(--theme-switch-reveal) / 2) calc(50% + var(--theme-switch-reveal) / 2),' +
      ' transparent calc(50% + var(--theme-switch-reveal) / 2 + 18px)), ' +
      'linear-gradient(90deg, #000 0 var(--theme-switch-reveal), transparent calc(var(--theme-switch-reveal) + 18px))',
    )
    expect(spec.cellSize).toBe('100% 64px, 64px 100%')
  })

  it('方向表：RTL 列层 270deg；TTB 行层 180deg 推进（基线即行层）；BTT 行层 0deg', () => {
    expect(getQrGridMaskSpec(ThemeAnimationDirection.RTL).baselineImage).toContain('linear-gradient(270deg')
    expect(getQrGridMaskSpec(ThemeAnimationDirection.RTL).baselineSize).toBe('64px 100%')
    const ttb = getQrGridMaskSpec(ThemeAnimationDirection.TTB)
    expect(ttb.baselineImage).toContain('linear-gradient(180deg')
    expect(ttb.baselineSize).toBe('100% 64px')
    // TTB 垂直轴（列）为中心生长，推进轴（行）为起始边生长
    expect(ttb.cellImage).toContain('linear-gradient(90deg, transparent calc(50%')
    expect(ttb.cellImage).toContain(', linear-gradient(180deg')
    expect(getQrGridMaskSpec(ThemeAnimationDirection.BTT).baselineImage).toContain('linear-gradient(0deg')
  })

  it('守卫：仅 QR_GRID 命中 isQrGridAnimationType', () => {
    expect(isQrGridAnimationType(ThemeAnimationType.QR_GRID)).toBe(true)
    for (const type of [
      ThemeAnimationType.BLINDS,
      ThemeAnimationType.SCAN,
      ThemeAnimationType.CIRCLE,
      ThemeAnimationType.SQUARE,
    ] as const) {
      expect(isQrGridAnimationType(type)).toBe(false)
    }
  })
})

describe('RIPPLE（水滴涟漪）', () => {
  const center = { x: 400, y: 300 }
  const v = `var(${REVEAL_VAR})`
  /** 以波长格数为单位写出 calc 表达式（0 格即 var 本身） */
  const at = (waves: number, waveWidth = 18): string => {
    const offset = waves * waveWidth
    if (offset === 0) return v
    return `calc(${v} ${offset > 0 ? '+' : '-'} ${Math.abs(offset)}px)`
  }

  it('环带序列：实心水面 + 主波峰 + 2 圈衰减余波，波峰落在整数格、波谷落在半整数格', () => {
    const spec = getRippleRevealSpec(center, viewport, 18)
    expect(spec.maskImage).toBe(
      `radial-gradient(circle at 400px 300px, ` +
      `#000 0 ${at(-1)}, ` +
      `transparent ${at(-0.5)}, ` +
      `rgba(0, 0, 0, ${RIPPLE_CREST_ALPHA}) ${at(0)}, ` +
      `transparent ${at(0.5)}, ` +
      `rgba(0, 0, 0, 0.275) ${at(1)}, ` +
      `transparent ${at(1.5)}, ` +
      `rgba(0, 0, 0, 0.151) ${at(2)}, ` +
      `transparent ${at(2.5)})`,
    )
  })

  it('反向串是正向的补集：stop 位置一格不差，alpha 换成 1-a（主峰 0.5 的补仍是 0.5）', () => {
    const spec = getRippleReverseRevealSpec(center, viewport, 18)
    expect(spec.maskImage).toBe(
      `radial-gradient(circle at 400px 300px, ` +
      `transparent 0 ${at(-1)}, ` +
      `#000 ${at(-0.5)}, ` +
      `rgba(0, 0, 0, ${RIPPLE_CREST_ALPHA}) ${at(0)}, ` +
      `#000 ${at(0.5)}, ` +
      `rgba(0, 0, 0, 0.725) ${at(1)}, ` +
      `#000 ${at(1.5)}, ` +
      `rgba(0, 0, 0, 0.849) ${at(2)}, ` +
      `#000 ${at(2.5)})`,
    )
    // 位置集合必须与正向完全一致——两串共用同一份 stop 生成器，不允许各自演化
    const positions = (img: string) => [...img.matchAll(/(?:calc\(var\(--theme-switch-reveal\)[^)]*\)|var\(--theme-switch-reveal\))/g)].map((m) => m[0])
    expect(positions(spec.maskImage)).toEqual(positions(getRippleRevealSpec(center, viewport, 18).maskImage))
  })

  it('反向两端都不照抄正向：终点过冲一整个前缘、起点去掉为正向覆盖留的 2.1 倍余量', () => {
    const spec = getRippleReverseRevealSpec(center, viewport, 18)
    const front = getRippleFrontExtentPx(18)
    const maxR = getMaxRadiusToCorners(center, viewport)
    // 主峰 α=0.5 取补仍是 0.5，收到 0 会在中心留半透明圆点 → 必须过冲到 -front
    expect(spec.to).toBe(-front)
    // 正向 to = 2.1×maxR + front 里的 2.1 是正向覆盖余量；照抄会让前 60% 时间屏幕毫无变化
    expect(spec.from).toBe(maxR + front)
    expect(spec.from).toBeLessThan(getRippleRevealSpec(center, viewport, 18).to)
  })

  it('反向 from 帧透明核刚好盖满视口、to 帧实心段反向盖满：两端都满足覆盖约束', () => {
    const spec = getRippleReverseRevealSpec(center, viewport, 18)
    const maxR = getMaxRadiusToCorners(center, viewport)
    // 起始：透明核止于 from - 1 波长，须 ≥ 视口最远角，否则首帧就漏出新主题
    expect(spec.from - 18).toBeGreaterThanOrEqual(maxR)
    // 末帧：收拢后实心段从 0 起、透明带整体落到负半径之外，末帧完全覆盖
    expect(spec.to + 18).toBeLessThan(0)
  })

  it('分发：getRippleMaskSpec 的 reverse 位在正/反之间切换，默认正向', () => {
    expect(getRippleMaskSpec(center, viewport, 18, true)).toEqual(getRippleReverseRevealSpec(center, viewport, 18))
    expect(getRippleMaskSpec(center, viewport, 18)).toEqual(getRippleRevealSpec(center, viewport, 18))
    expect(getRippleMaskSpec(center, viewport, 18, false)).toEqual(getRippleRevealSpec(center, viewport, 18))
  })

  it('余波圈数由 RIPPLE_TRAIL_COUNT 决定：主峰之外恰好再跟那么多圈', () => {
    const spec = getRippleRevealSpec(center, viewport, 18)
    expect(spec.maskImage.split('rgba(0, 0, 0, ').length - 1).toBe(RIPPLE_TRAIL_COUNT + 1)
  })

  it('from = 0 且实心段止于 -1 波长：首帧实心半径为负，被渐变 stop 单调化夹成 0，起始屏不提前露出新主题', () => {
    const spec = getRippleRevealSpec(center, viewport, 18)
    expect(spec.from).toBe(0)
    expect(spec.maskImage).toContain(`#000 0 ${at(-1)}`)
  })

  it('to = CIRCLE 终半径 + 前缘外沿，末帧实心段仍远超视口最远角（mask 持续生效必须完全覆盖）', () => {
    const waveWidth = 18
    const spec = getRippleRevealSpec(center, viewport, waveWidth)
    const maxRadius = getMaxRadiusToCorners(center, viewport)
    expect(getRippleFrontExtentPx(waveWidth)).toBe((RIPPLE_TRAIL_COUNT + 0.5) * waveWidth)
    expect(spec.to).toBe(maxRadius * CIRCLE_SIZE_FACTOR + getRippleFrontExtentPx(waveWidth))
    expect(spec.to - waveWidth).toBeGreaterThan(maxRadius)
  })

  it('波源中心写进 radial-gradient 串，环带间距按 waveWidth 等比缩放', () => {
    const spec = getRippleRevealSpec({ x: 120.5, y: 640.25 }, viewport, 40)
    expect(spec.maskImage).toContain('circle at 120.5px 640.25px')
    expect(spec.maskImage).toContain(`#000 0 calc(${v} - 40px)`)
    expect(spec.maskImage).toContain(`transparent calc(${v} + 100px)`)
    expect(spec.to).toBeCloseTo(
      getMaxRadiusToCorners({ x: 120.5, y: 640.25 }, viewport) * CIRCLE_SIZE_FACTOR + 100,
      10,
    )
  })

  it('蒙版盒子静止：mask-size 100% 100% + no-repeat（逐帧只动注册属性，与 BLINDS / SCAN 同机制）', () => {
    const spec = getRippleRevealSpec(center, viewport, 18)
    expect(spec.maskSize).toBe('100% 100%')
    expect(spec.maskRepeat).toBe('no-repeat')
  })

  it('守卫与分发：仅 RIPPLE 命中 isRippleAnimationType，且不落入 BLINDS / SCAN 的 isRevealAnimationType', () => {
    expect(isRippleAnimationType(ThemeAnimationType.RIPPLE)).toBe(true)
    for (const type of [
      ThemeAnimationType.BLINDS,
      ThemeAnimationType.SCAN,
      ThemeAnimationType.CIRCLE,
      ThemeAnimationType.QR_GRID,
    ] as const) {
      expect(isRippleAnimationType(type)).toBe(false)
    }
    expect(isRevealAnimationType(ThemeAnimationType.RIPPLE)).toBe(false)
  })

  it('RIPPLE 不是形状类也不是模糊类：getMaskGeometry 按既有语义回落 CIRCLE', () => {
    expect(isShapeAnimationType(ThemeAnimationType.RIPPLE)).toBe(false)
    expect(isBlurAnimationType(ThemeAnimationType.RIPPLE)).toBe(false)
    expect(getMaskGeometry(ThemeAnimationType.RIPPLE, center, viewport)).toEqual(
      getCircleMaskGeometry(center, viewport),
    )
  })
})

describe('角度驱动族（CLOCK_SWEEP / FAN）', () => {
  const center = { x: 640, y: 400 }
  const v = `var(${SWEEP_VAR})`

  it('CLOCK_SWEEP：单层 conic + 12° 软尾，from 0 / to 372，注册属性是角度族的 SWEEP_VAR', () => {
    const spec = getClockSweepRevealSpec(center)
    expect(spec.maskImage).toBe(
      `conic-gradient(from 0deg at 640px 400px, ` +
      `#000 0 calc(${v} - ${CLOCK_SWEEP_TAIL_DEG}deg), transparent ${v})`,
    )
    expect(spec.from).toBe(0)
    expect(spec.to).toBe(FULL_CIRCLE_DEG + CLOCK_SWEEP_TAIL_DEG)
    expect(spec.maskSize).toBe('100% 100%')
    expect(spec.maskRepeat).toBe('no-repeat')
    expect(spec.varName).toBe(SWEEP_VAR)
    expect(spec.unit).toBe('deg')
  })

  it('CLOCK_SWEEP 的覆盖与半径无关：末帧实心段止于 360°，整周实心（conic 覆盖角度而非面积）', () => {
    const spec = getClockSweepRevealSpec(center)
    // 末帧实心段终点 = to - 尾宽 = 360°，与视口尺寸、轴心位置都无关
    expect(spec.to - CLOCK_SWEEP_TAIL_DEG).toBe(FULL_CIRCLE_DEG)
    // 换任意轴心与视口，终值不变——这是角度族相对 CIRCLE 家族的结构性便利
    expect(getClockSweepRevealSpec({ x: 1, y: 1 }).to).toBe(spec.to)
    expect(getClockSweepRevealSpec({ x: 4000, y: -300 }).to).toBe(spec.to)
  })

  it('CLOCK_SWEEP 起始帧：实心段止于 -12° 被单调化夹成 0，整屏透出旧主题', () => {
    const spec = getClockSweepRevealSpec(center)
    expect(spec.from - CLOCK_SWEEP_TAIL_DEG).toBeLessThan(0)
    expect(spec.maskImage).toContain(`#000 0 calc(${v} - 12deg)`)
  })

  it('CLOCK_SWEEP 反向：软尾镜像到内缘，from 372 / to 0，观感即当初搁置的"逆时针扫开"', () => {
    const spec = getClockSweepReverseRevealSpec(center)
    expect(spec.maskImage).toBe(
      `conic-gradient(from 0deg at 640px 400px, ` +
      `transparent 0 calc(${v} - ${CLOCK_SWEEP_TAIL_DEG}deg), #000 ${v})`,
    )
    expect(spec.from).toBe(FULL_CIRCLE_DEG + CLOCK_SWEEP_TAIL_DEG)
    expect(spec.to).toBe(0)
    expect(spec.varName).toBe(SWEEP_VAR)
    expect(spec.unit).toBe('deg')
  })

  it('CLOCK_SWEEP 反向的 from 可直接沿用正向 to：conic 覆盖角度不是面积，没有正向那份半径余量要挤掉时间', () => {
    const fwd = getClockSweepRevealSpec(center)
    const rev = getClockSweepReverseRevealSpec(center)
    expect(rev.from).toBe(fwd.to)
    // 末帧 v=0 时透明段两端与 #000 起点同落在 0deg，塌成零宽不留缝
    expect(rev.to).toBe(0)
    expect(rev.to - CLOCK_SWEEP_TAIL_DEG).toBeLessThan(0)
  })

  it('FAN：扇叶周期 = 360 / bladeCount，末帧 open 到周期末即拼成整圆', () => {
    const spec = getFanRevealSpec(center, 8)
    expect(getFanBladeStepDeg(8)).toBe(45)
    expect(spec.maskImage).toBe(
      `repeating-conic-gradient(from 0deg at 640px 400px, #000 0 ${v}, transparent ${v} 45deg)`,
    )
    expect(spec.from).toBe(0)
    expect(spec.to).toBe(45)
    expect(spec.varName).toBe(SWEEP_VAR)
    expect(spec.unit).toBe('deg')
  })

  it('FAN 扇叶数缩放周期：4 片 90°、16 片 22.5°；非整除值保留四位小数', () => {
    expect(getFanRevealSpec(center, 4).to).toBe(90)
    expect(getFanRevealSpec(center, 16).to).toBe(22.5)
    expect(getFanBladeStepDeg(7)).toBe(51.4286)
    expect(getFanRevealSpec(center, 7).maskImage).toContain(`transparent ${v} 51.4286deg)`)
  })

  it('FAN 硬边是有意为之：软尾会在周期末留下永不闭合的淡缝，违反末帧必须完全覆盖', () => {
    const spec = getFanRevealSpec(center, 8)
    expect(spec.maskImage).not.toContain('calc(')
    // 末帧实心段止于 open = step，透明段退化为零长度区间
    expect(spec.maskImage).toContain(`#000 0 ${v}`)
  })

  it('FAN 反向：正向串取补（#000 ↔ transparent 互换）+ 区间反向，周期与 varName / unit 不变', () => {
    const spec = getFanReverseRevealSpec(center, 8)
    expect(spec.maskImage).toBe(
      `repeating-conic-gradient(from 0deg at 640px 400px, transparent 0 ${v}, #000 ${v} 45deg)`,
    )
    expect(spec.from).toBe(45)
    expect(spec.to).toBe(0)
    expect(spec.varName).toBe(SWEEP_VAR)
    expect(spec.unit).toBe('deg')
    expect(spec.maskSize).toBe('100% 100%')
    expect(spec.maskRepeat).toBe('no-repeat')
  })

  it('FAN 反向末帧干净的前提是硬边：to = 0 时两组 stop 同时归位到 0deg，透明带塌成零宽而非留缝', () => {
    const spec = getFanReverseRevealSpec(center, 8)
    // 区间端点：from 是完整周期（新层全隐）、to 是 0（新层全显）
    expect(spec.from).toBe(getFanBladeStepDeg(8))
    expect(spec.to).toBe(0)
    // 串里不得出现 calc / 软尾——一旦加了羽化，带子塌零时两条斜坡会交叉出凹陷（CURTAIN 就栽在这）
    expect(spec.maskImage).not.toContain('calc(')
    // 透明带是 `transparent 0 var`、实心段是 `#000 var step`：两者共用同一个 var，
    // var→0 时带子塌成零宽且 #000 的起点同步落到 0deg，所以末帧不留任何缝隙
    expect(spec.maskImage).toContain(`transparent 0 ${v}, #000 ${v} `)
  })

  it('FAN 反向同样随 bladeCount 缩放周期', () => {
    expect(getFanReverseRevealSpec(center, 4).from).toBe(90)
    expect(getFanReverseRevealSpec(center, 16).from).toBe(22.5)
    expect(getFanReverseRevealSpec(center, 6).maskImage).toBe(
      `repeating-conic-gradient(from 0deg at 640px 400px, transparent 0 ${v}, #000 ${v} 60deg)`,
    )
  })

  it('分发：getSweepMaskSpec 的 reverse 位对角度族两类型都生效，默认正向', () => {
    expect(getSweepMaskSpec(ThemeAnimationType.FAN, center, 8, true))
      .toEqual(getFanReverseRevealSpec(center, 8))
    expect(getSweepMaskSpec(ThemeAnimationType.FAN, center, 8, false))
      .toEqual(getFanRevealSpec(center, 8))
    expect(getSweepMaskSpec(ThemeAnimationType.CLOCK_SWEEP, center, 8, true))
      .toEqual(getClockSweepReverseRevealSpec(center))
    expect(getSweepMaskSpec(ThemeAnimationType.CLOCK_SWEEP, center, 8, false))
      .toEqual(getClockSweepRevealSpec(center))
    // 省略第三参即正向
    expect(getSweepMaskSpec(ThemeAnimationType.FAN, center, 8)).toEqual(getFanRevealSpec(center, 8))
    expect(getSweepMaskSpec(ThemeAnimationType.CLOCK_SWEEP, center, 8)).toEqual(getClockSweepRevealSpec(center))
  })

  it('分发与守卫：角度族两类型命中 isSweepAnimationType，且不落入 px 驱动的三个守卫', () => {
    for (const type of [ThemeAnimationType.CLOCK_SWEEP, ThemeAnimationType.FAN] as const) {
      expect(isSweepAnimationType(type)).toBe(true)
      expect(isRevealAnimationType(type)).toBe(false)
      expect(isRippleAnimationType(type)).toBe(false)
      expect(isQrGridAnimationType(type)).toBe(false)
      expect(isShapeAnimationType(type)).toBe(false)
    }
    expect(isSweepAnimationType(ThemeAnimationType.RIPPLE)).toBe(false)
    expect(isSweepAnimationType(ThemeAnimationType.SCAN)).toBe(false)
    expect(getSweepMaskSpec(ThemeAnimationType.FAN, center, 8)).toEqual(getFanRevealSpec(center, 8))
    expect(getSweepMaskSpec(ThemeAnimationType.CLOCK_SWEEP, center, 8)).toEqual(getClockSweepRevealSpec(center))
  })

  it('轴心写进 conic 串：换触发点即换轴心（与 RIPPLE 同族，消费 ref 几何）', () => {
    const spec = getFanRevealSpec({ x: 12.5, y: 700.25 }, 8)
    expect(spec.maskImage).toContain('from 0deg at 12.5px 700.25px')
  })
})

describe('CURTAIN（双开门）', () => {
  const v = `var(${REVEAL_VAR})`
  const f = CURTAIN_FEATHER_PX

  it('中线向两侧对称生长：90deg 三段，实心段以 50% 为轴对称展开', () => {
    const spec = getCurtainRevealSpec(viewport)
    expect(spec.maskImage).toBe(
      `linear-gradient(90deg, transparent calc(50% - ${v} / 2 - ${f}px),` +
      ` #000 calc(50% - ${v} / 2) calc(50% + ${v} / 2),` +
      ` transparent calc(50% + ${v} / 2 + ${f}px))`,
    )
    expect(spec.maskSize).toBe('100% 100%')
    expect(spec.maskRepeat).toBe('no-repeat')
  })

  it('from = 0：起始帧实心段零宽、两侧各留一条软边，即中缝先透出一道光', () => {
    const spec = getCurtainRevealSpec(viewport)
    expect(spec.from).toBe(0)
  })

  it('to = 视口宽 + 2 × 软边，末帧两条软边都被推出画面', () => {
    const spec = getCurtainRevealSpec(viewport)
    expect(spec.to).toBe(viewport.width + 2 * f)
    // 实心段左右边界各自超出视口沿 f 像素 → 软边落在画面外，末帧完全覆盖
    expect(spec.to / 2 - viewport.width / 2).toBe(f)
  })

  it('与 BLINDS / SCAN 同族：命中 isRevealAnimationType 并由 getRevealMaskSpec 分发', () => {
    expect(isRevealAnimationType(ThemeAnimationType.CURTAIN)).toBe(true)
    expect(getRevealMaskSpec(ThemeAnimationType.CURTAIN, ThemeAnimationDirection.LTR, 72, viewport))
      .toEqual(getCurtainRevealSpec(viewport))
  })

  it('不消费 direction：四个取值结果完全一致（中线对称推开没有方向语义）', () => {
    const base = getCurtainRevealSpec(viewport)
    for (const direction of [
      ThemeAnimationDirection.LTR,
      ThemeAnimationDirection.RTL,
      ThemeAnimationDirection.TTB,
      ThemeAnimationDirection.BTT,
    ] as const) {
      expect(getRevealMaskSpec(ThemeAnimationType.CURTAIN, direction, 72, viewport)).toEqual(base)
    }
  })

  it('不消费触发点：既不是形状类也不是模糊类，getMaskGeometry 按既有语义回落 CIRCLE', () => {
    const center = { x: 400, y: 300 }
    expect(isShapeAnimationType(ThemeAnimationType.CURTAIN)).toBe(false)
    expect(isBlurAnimationType(ThemeAnimationType.CURTAIN)).toBe(false)
    expect(isRippleAnimationType(ThemeAnimationType.CURTAIN)).toBe(false)
    expect(isSweepAnimationType(ThemeAnimationType.CURTAIN)).toBe(false)
    expect(getMaskGeometry(ThemeAnimationType.CURTAIN, center, viewport)).toEqual(
      getCircleMaskGeometry(center, viewport),
    )
  })

  it('反向是两层 add（左板 90deg + 右板 270deg），不是把正向串取补', () => {
    const spec = getCurtainReverseRevealSpec(viewport)
    expect(spec.maskImage).toBe(
      `linear-gradient(90deg, #000 0 ${v}, transparent calc(${v} + ${f}px)), ` +
      `linear-gradient(270deg, #000 0 ${v}, transparent calc(${v} + ${f}px))`,
    )
    expect(spec.maskImage.match(/linear-gradient\(/g)).toHaveLength(2)
    // 层数与 mask-size / mask-repeat 的逗号列表长度必须一致
    expect(spec.maskSize).toBe('100% 100%, 100% 100%')
    expect(spec.maskRepeat).toBe('no-repeat, no-repeat')
  })

  it('反向两端各留一个软边：from = -软边 让首帧两板全在屏外，to = 半屏 + 软边 让两板越过中线', () => {
    const spec = getCurtainReverseRevealSpec(viewport)
    expect(spec.from).toBe(-f)
    expect(spec.to).toBe(viewport.width / 2 + f)
    // 末帧每块板的实心段都要越过中线，靠 add 取最大把中央的软边重叠盖掉
    expect(spec.to - viewport.width / 2).toBe(f)
    // 首帧实心段终点为负 → 整块板在屏幕外，起始全隐
    expect(spec.from).toBeLessThan(0)
  })

  it('反向终值随视口宽缩放，且与正向的"整宽 + 2 软边"不是一回事', () => {
    const wide = getCurtainReverseRevealSpec({ width: 1920, height: 1080 })
    const narrow = getCurtainReverseRevealSpec({ width: 375, height: 667 })
    expect(wide.to - narrow.to).toBe((1920 - 375) / 2)
    expect(wide.to).toBeLessThan(getCurtainRevealSpec({ width: 1920, height: 1080 }).to)
  })

  it('分发：getCurtainMaskSpec / getRevealMaskSpec 的 reverse 位在正反向之间切换，默认正向', () => {
    expect(getCurtainMaskSpec(viewport, true)).toEqual(getCurtainReverseRevealSpec(viewport))
    expect(getCurtainMaskSpec(viewport)).toEqual(getCurtainRevealSpec(viewport))
    expect(getRevealMaskSpec(ThemeAnimationType.CURTAIN, ThemeAnimationDirection.LTR, 72, viewport, true))
      .toEqual(getCurtainReverseRevealSpec(viewport))
  })

  it('视口宽度决定终值：窄屏与宽屏的 to 差等于视口宽之差', () => {
    const wide = getCurtainRevealSpec({ width: 1920, height: 1080 })
    const narrow = getCurtainRevealSpec({ width: 375, height: 667 })
    expect(wide.to - narrow.to).toBe(1920 - 375)
  })
})
