import { describe, expect, it } from 'vitest'

import {
  BLUR_MASK_DEVIATION_FACTOR,
  BLUR_MAX_MASK_SIZE,
  CIRCLE_MASK_IMAGE,
  CIRCLE_SIZE_FACTOR,
  CLOCK_SWEEP_TAIL_DEG,
  CURTAIN_FEATHER_PX,
  DIAMOND_COVERAGE_FACTOR,
  DIAMOND_REVERSE_COVERAGE_FACTOR,
  FULL_CIRCLE_DEG,
  HEXAGON_COVERAGE_FACTOR,
  HEXAGON_REVERSE_APOTHEM_FACTOR,
  HEXAGON_REVERSE_COVERAGE_FACTOR,
  RECTANGLE_COVERAGE_MARGIN,
  QR_GRID_CELL_PX,
  RIPPLE_CREST_ALPHA,
  RIPPLE_TRAIL_COUNT,
  SCAN_BAND_ALPHA,
  SCAN_BAND_WIDTH_PX,
  SCAN_FADE_WIDTH_PX,
  SHAPE_REVERSE_FEATHER_PX,
  SOLID_RECT_MASK_IMAGE,
  SQUARE_COVERAGE_MARGIN,
  STAR_CIRCUMRADIUS_FACTOR,
  STAR_INNER_RATIO,
  STAR_MASK_IMAGE,
  TRIANGLE_CIRCUMRADIUS_FACTOR,
  TRIANGLE_REVERSE_COVERAGE_FACTOR,
  TRIANGLE_REVERSE_INRADIUS_FACTOR,
  getBlurCircleMaskGeometry,
  getBlurCircleMaskImage,
  getBlurCircleReverseRevealSpec,
  getBlindsFeatherPx,
  getBlindsRevealSpec,
  getCircleMaskGeometry,
  getClockSweepRevealSpec,
  getClockSweepReverseRevealSpec,
  getCurtainMaskSpec,
  getCurtainRevealSpec,
  getCurtainReverseRevealSpec,
  getDiamondMaskGeometry,
  getDiamondReverseRevealSpec,
  getHexagonMaskGeometry,
  getHexagonReverseRevealSpec,
  getFanBladeStepDeg,
  getFanRevealSpec,
  getFanReverseRevealSpec,
  getMaskGeometry,
  getMaxRadiusToCorners,
  getPanelReverseMaskSpec,
  getQrGridDotRevealSpec,
  getQrGridMaskSpec,
  getRectangleMaskGeometry,
  getRectangleReverseRevealSpec,
  getRevealMaskSpec,
  getRippleFrontExtentPx,
  getRippleMaskSpec,
  getRippleRevealSpec,
  getRippleReverseRevealSpec,
  getScanRevealSpec,
  getSquareMaskGeometry,
  getSquareReverseRevealSpec,
  getStarMaskGeometry,
  getSweepMaskSpec,
  getTriggerCenter,
  getTriangleMaskGeometry,
  getTriangleReverseRevealSpec,
  isBlurAnimationType,
  isPanelReverseAnimationType,
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

  it('分发与守卫：BLINDS / SCAN 命中 reveal，圆 / 形状 / 格子类型不命中', () => {
    for (const type of [ThemeAnimationType.BLINDS, ThemeAnimationType.SCAN]) {
      expect(isRevealAnimationType(type)).toBe(true)
    }
    for (const type of [
      ThemeAnimationType.CIRCLE,
      ThemeAnimationType.SQUARE,
      ThemeAnimationType.STAR,
      ThemeAnimationType.QR_GRID,
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

  it('cellSize 选项缩放平铺周期与 to：96px 格距的软边 = round(96 × 0.28) = 20（封顶）', () => {
    const spec = getQrGridMaskSpec(ThemeAnimationDirection.LTR, 96)
    expect(spec.to).toBe(96)
    expect(spec.baselineSize).toBe('96px 100%')
    expect(spec.cellSize).toBe('100% 96px, 96px 100%')
    expect(spec.baselineImage).toContain('calc(var(--theme-switch-reveal) + 20px)')
    // 32px 格距的软边按比例收缩（round(32 × 0.28) = 9），from 仍是 -2×软边
    const small = getQrGridMaskSpec(ThemeAnimationDirection.LTR, 32)
    expect(small.to).toBe(32)
    expect(small.from).toBe(-18)
    expect(small.baselineImage).toContain('calc(var(--theme-switch-reveal) + 9px)')
    // 缺省 = 64（QR_GRID_CELL_PX），与 v1.14 前的行为逐字节一致
    expect(getQrGridMaskSpec(ThemeAnimationDirection.LTR)).toEqual(getQrGridMaskSpec(ThemeAnimationDirection.LTR, QR_GRID_CELL_PX))
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

describe('QR_GRID 圆点格（cellShape: dot，v1.15）', () => {
  const v = `var(${REVEAL_VAR})`

  it('串结构：单层平铺 radial，圆从每格中心生长，免 @supports 的关键就是单层', () => {
    const spec = getQrGridDotRevealSpec(64)
    expect(spec.maskImage).toBe(
      `radial-gradient(circle, #000 0 ${v}, transparent calc(${v} + 18px))`,
    )
    expect(spec.maskSize).toBe('64px 64px')
    expect(spec.maskRepeat).toBe('repeat')
  })

  it('末帧覆盖数学：to = ceil(格距 × √2 / 2)，圆半径 ≥ 半对角线才盖住整格（直径 ≥ 格距 × √2）', () => {
    for (const cellSize of [16, 32, 64, 96, 128, 200]) {
      const spec = getQrGridDotRevealSpec(cellSize)
      expect(spec.to).toBe(Math.ceil(cellSize * Math.SQRT1_2))
      expect(spec.to * 2).toBeGreaterThanOrEqual(cellSize * Math.SQRT2) // 直径终值 ≥ 格距 × √2
    }
    expect(getQrGridDotRevealSpec(64).to).toBe(46)
  })

  it('from = -软边：圆半径为负被 stop 单调化夹成零宽，首帧整屏透出旧主题', () => {
    const spec = getQrGridDotRevealSpec(64)
    expect(spec.from).toBe(-18)
    expect(spec.from).toBeLessThan(0)
  })

  it('direction 静默：圆点格没有方向入参，四向无差异（与方块格的方向锚定不同）', () => {
    // 函数签名只有 cellSize——四向一致由"无方向参数"这一结构保证
    expect(getQrGridDotRevealSpec(64)).toEqual(getQrGridDotRevealSpec())
  })

  it('软边复用 getBlindsFeatherPx（与方块格 / BLINDS 同款按比例封顶策略）', () => {
    expect(getQrGridDotRevealSpec(16).maskImage).toContain('transparent calc(var(--theme-switch-reveal) + 4px)')
    expect(getQrGridDotRevealSpec(200).maskImage).toContain('transparent calc(var(--theme-switch-reveal) + 20px)')
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

  it('direction 映射开合轴（v1.15）：ltr/rtl 同为水平 90deg、ttb/btt 同为垂直 180deg，to 随轴换全长', () => {
    const horizontal = getCurtainRevealSpec(viewport, ThemeAnimationDirection.LTR)
    expect(getCurtainRevealSpec(viewport, ThemeAnimationDirection.RTL)).toEqual(horizontal)
    expect(horizontal.to).toBe(viewport.width + 2 * f)
    const vertical = getCurtainRevealSpec(viewport, ThemeAnimationDirection.TTB)
    expect(getCurtainRevealSpec(viewport, ThemeAnimationDirection.BTT)).toEqual(vertical)
    expect(vertical.to).toBe(viewport.height + 2 * f)
    expect(vertical.maskImage).toBe(
      `linear-gradient(180deg, transparent calc(50% - ${v} / 2 - ${f}px),` +
      ` #000 calc(50% - ${v} / 2) calc(50% + ${v} / 2),` +
      ` transparent calc(50% + ${v} / 2 + ${f}px))`,
    )
  })

  it('与 BLINDS / SCAN 同族：命中 isRevealAnimationType 并由 getRevealMaskSpec 分发', () => {
    expect(isRevealAnimationType(ThemeAnimationType.CURTAIN)).toBe(true)
    expect(getRevealMaskSpec(ThemeAnimationType.CURTAIN, ThemeAnimationDirection.LTR, 72, viewport))
      .toEqual(getCurtainRevealSpec(viewport))
  })

  it('默认 direction = ltr：不传方向时输出与 v1.14 的恒水平行为逐字节一致', () => {
    expect(getCurtainRevealSpec(viewport)).toEqual(getCurtainRevealSpec(viewport, ThemeAnimationDirection.LTR))
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

  it('反向是两层 add（轴随 direction），不是把正向串取补', () => {
    const spec = getCurtainReverseRevealSpec(viewport)
    expect(spec.maskImage).toBe(
      `linear-gradient(90deg, #000 0 ${v}, transparent calc(${v} + ${f}px)), ` +
      `linear-gradient(270deg, #000 0 ${v}, transparent calc(${v} + ${f}px))`,
    )
    expect(spec.maskImage.match(/linear-gradient\(/g)).toHaveLength(2)
    // 层数与 mask-size / mask-repeat 的逗号列表长度必须一致
    expect(spec.maskSize).toBe('100% 100%, 100% 100%')
    expect(spec.maskRepeat).toBe('no-repeat, no-repeat')
    // 垂直轴（ttb）：上板 180deg + 下板 0deg，构造全等仅轴与长度不同
    const vertical = getCurtainReverseRevealSpec(viewport, ThemeAnimationDirection.TTB)
    expect(vertical.maskImage).toBe(
      `linear-gradient(180deg, #000 0 ${v}, transparent calc(${v} + ${f}px)), ` +
      `linear-gradient(0deg, #000 0 ${v}, transparent calc(${v} + ${f}px))`,
    )
  })

  it('反向两端各留一个软边：from = -软边 让首帧两板全在屏外，to = 半轴长 + 软边 让两板越过中线', () => {
    const spec = getCurtainReverseRevealSpec(viewport)
    expect(spec.from).toBe(-f)
    expect(spec.to).toBe(viewport.width / 2 + f)
    // 末帧每块板的实心段都要越过中线，靠 add 取最大把中央的软边重叠盖掉
    expect(spec.to - viewport.width / 2).toBe(f)
    // 首帧实心段终点为负 → 整块板在屏幕外，起始全隐
    expect(spec.from).toBeLessThan(0)
    // 垂直轴的 to 用半高
    expect(getCurtainReverseRevealSpec(viewport, ThemeAnimationDirection.TTB).to).toBe(viewport.height / 2 + f)
  })

  it('分发：getCurtainMaskSpec / getRevealMaskSpec 的 reverse 位与 direction 轴各自生效，默认正向水平', () => {
    expect(getCurtainMaskSpec(viewport, ThemeAnimationDirection.LTR, true)).toEqual(
      getCurtainReverseRevealSpec(viewport),
    )
    expect(getCurtainMaskSpec(viewport)).toEqual(getCurtainRevealSpec(viewport))
    expect(getRevealMaskSpec(ThemeAnimationType.CURTAIN, ThemeAnimationDirection.TTB, 72, viewport, true))
      .toEqual(getCurtainReverseRevealSpec(viewport, ThemeAnimationDirection.TTB))
  })

  it('反向终值随视口宽缩放，且与正向的"整宽 + 2 软边"不是一回事', () => {
    const wide = getCurtainReverseRevealSpec({ width: 1920, height: 1080 })
    const narrow = getCurtainReverseRevealSpec({ width: 375, height: 667 })
    expect(wide.to - narrow.to).toBe((1920 - 375) / 2)
    expect(wide.to).toBeLessThan(getCurtainRevealSpec({ width: 1920, height: 1080 }).to)
  })

  it('视口宽度决定终值：窄屏与宽屏的 to 差等于视口宽之差', () => {
    const wide = getCurtainRevealSpec({ width: 1920, height: 1080 })
    const narrow = getCurtainRevealSpec({ width: 375, height: 667 })
    expect(wide.to - narrow.to).toBe(1920 - 375)
  })
})

describe('形状反向（SQUARE / RECTANGLE 四板 add）', () => {
  const center = { x: 400, y: 300 }
  const f = SHAPE_REVERSE_FEATHER_PX
  const v = `var(${REVEAL_VAR})`
  /** 从串里解析四块板的洞边界（extent px 与归一因子，缺省 = 1） */
  const panels = (img: string): Array<{ extent: number; k: number }> =>
    [...img.matchAll(/#000 0 calc\(([\d.]+)px - var\(--theme-switch-reveal\)(?: \* ([\d.]+))?\)/g)].map(
      (m) => ({ extent: Number(m[1]), k: m[2] === undefined ? 1 : Number(m[2]) }),
    )

  it('软边常量：24px，与 CURTAIN_FEATHER_PX 同值但独立定义（语义一个是幕布、一个是洞边斜坡）', () => {
    expect(SHAPE_REVERSE_FEATHER_PX).toBe(24)
    expect(SHAPE_REVERSE_FEATHER_PX).toBe(CURTAIN_FEATHER_PX)
  })

  it('SQUARE 中心触发：四块边缘板 90/270/180/0 度，洞边界 = 触发点 ± 半宽，无归一因子', () => {
    const spec = getSquareReverseRevealSpec(center, viewport)
    const layer = (angle: number, e: number): string =>
      `linear-gradient(${angle}deg, #000 0 calc(${e}px - ${v}), transparent calc(${e}px - ${v} + ${f}px))`
    expect(spec.maskImage).toBe(
      [layer(90, 400), layer(270, 400), layer(180, 300), layer(0, 300)].join(', '),
    )
    expect(spec.maskImage.match(/linear-gradient\(/g)).toHaveLength(4)
    expect(spec.maskSize).toBe('100% 100%, 100% 100%, 100% 100%, 100% 100%')
    expect(spec.maskRepeat).toBe('no-repeat, no-repeat, no-repeat, no-repeat')
  })

  it('SQUARE 偏心触发：四板 extent 各取对应半边界，触发点偏移烘进 px 常量', () => {
    const spec = getSquareReverseRevealSpec({ x: 100, y: 0 }, viewport)
    expect(spec.maskImage).toContain(`linear-gradient(90deg, #000 0 calc(100px - ${v})`)
    expect(spec.maskImage).toContain(`linear-gradient(270deg, #000 0 calc(700px - ${v})`)
    expect(spec.maskImage).toContain(`linear-gradient(180deg, #000 0 calc(0px - ${v})`)
    expect(spec.maskImage).toContain(`linear-gradient(0deg, #000 0 calc(600px - ${v})`)
  })

  it('from = max(halfW, halfH) + 软边、to = 0：起点不照抄正向的 1.05 覆盖余量（照抄只会空转）', () => {
    expect(getSquareReverseRevealSpec(center, viewport).from).toBe(400 + f)
    expect(getSquareReverseRevealSpec(center, viewport).to).toBe(0)
    // 角落触发：halfW = 800 → 824
    expect(getSquareReverseRevealSpec({ x: 0, y: 0 }, viewport).from).toBe(800 + f)
    // 偏心：halfW = max(100, 700) = 700 → 724
    expect(getSquareReverseRevealSpec({ x: 100, y: 0 }, viewport).from).toBe(700 + f)
    expect(getSquareReverseRevealSpec(center, viewport).from).toBeLessThan(
      // 正向终边长的一半是 840/2 = 420 + 软边之外还有 1.05 余量——反向一律不要
      420 + f,
    )
  })

  it('首帧全隐不等式：任意触发点下每块板的斜坡外端 ≤ 0（中心与四角穷举）', () => {
    for (const c of [
      { x: 400, y: 300 },
      { x: 0, y: 0 },
      { x: 800, y: 600 },
      { x: 100, y: 560 },
    ]) {
      const spec = getSquareReverseRevealSpec(c, viewport)
      const ps = panels(spec.maskImage)
      expect(ps).toHaveLength(4)
      for (const { extent, k } of ps) {
        // 斜坡外端 = extent − from×k + 软边；> 0 意味着首帧该板在屏内漏出一段新层
        expect(extent - spec.from * k + f).toBeLessThanOrEqual(0)
      }
    }
  })

  it('末帧零残留的数学：to = 0 时左右板实心段相接（extent 之和 = 视口宽），重叠处 add 取最大', () => {
    const spec = getSquareReverseRevealSpec({ x: 300, y: 200 }, viewport)
    const ps = panels(spec.maskImage)
    expect(ps[0]!.extent).toBe(300) // 左板伸到 cx
    expect(ps[1]!.extent).toBe(500) // 右板从右边缘伸 (W − cx)
    expect(ps[0]!.extent + ps[1]!.extent).toBe(viewport.width)
    expect(ps[2]!.extent + ps[3]!.extent).toBe(viewport.height)
    // k 恒为 1（SQUARE 洞保持正方形），to = 0 时归一因子不参与
    for (const { k } of ps) expect(k).toBe(1)
  })

  it('RECTANGLE：洞按轴归一保持视口比例（不退化成正方形撞 SQUARE 的身份），因子烘进串', () => {
    const spec = getRectangleReverseRevealSpec({ x: 100, y: 300 }, viewport)
    const base = 700 + f // max(halfW=700, halfH=300) + 软边
    const ky = ceil4((300 + f) / base)
    expect(spec.from).toBe(base)
    // kx = 1（水平轴就是基准轴）省略因子；ky < 1 显式写出
    expect(spec.maskImage).toContain(
      `linear-gradient(90deg, #000 0 calc(100px - ${v}), transparent calc(100px - ${v} + ${f}px))`,
    )
    expect(spec.maskImage).toContain(
      `linear-gradient(180deg, #000 0 calc(300px - ${v} * ${ky}), transparent calc(300px - ${v} * ${ky} + ${f}px))`,
    )
  })

  it('RECTANGLE 首帧全隐：软边在归一因子内，窄轴的斜坡外端仍 ≤ 0（因子外留软边会漏淡边）', () => {
    for (const c of [
      { x: 100, y: 300 },
      { x: 400, y: 50 },
      { x: 700, y: 550 },
    ]) {
      const spec = getRectangleReverseRevealSpec(c, viewport)
      for (const { extent, k } of panels(spec.maskImage)) {
        expect(extent - spec.from * k + f).toBeLessThanOrEqual(0)
      }
    }
  })

  it('RECTANGLE 末帧零残留：to = 0 时归一因子不参与，四板相接覆盖全屏', () => {
    const spec = getRectangleReverseRevealSpec({ x: 100, y: 300 }, viewport)
    const ps = panels(spec.maskImage)
    expect(ps[0]!.extent + ps[1]!.extent).toBe(viewport.width)
    expect(ps[2]!.extent + ps[3]!.extent).toBe(viewport.height)
    expect(spec.to).toBe(0)
  })

  it('分发与守卫：isPanelReverseAnimationType 只认 SQUARE / RECTANGLE，其余形状族仍未接入', () => {
    expect(isPanelReverseAnimationType(ThemeAnimationType.SQUARE)).toBe(true)
    expect(isPanelReverseAnimationType(ThemeAnimationType.RECTANGLE)).toBe(true)
    for (const type of [
      ThemeAnimationType.CIRCLE,
      ThemeAnimationType.DIAMOND,
      ThemeAnimationType.HEXAGON,
      ThemeAnimationType.TRIANGLE,
      ThemeAnimationType.STAR,
      ThemeAnimationType.CIRCLE_BLUR,
      ThemeAnimationType.BLINDS,
    ] as const) {
      expect(isPanelReverseAnimationType(type)).toBe(false)
    }
    expect(getPanelReverseMaskSpec(ThemeAnimationType.SQUARE, center, viewport)).toEqual(
      getSquareReverseRevealSpec(center, viewport),
    )
    expect(getPanelReverseMaskSpec(ThemeAnimationType.RECTANGLE, center, viewport)).toEqual(
      getRectangleReverseRevealSpec(center, viewport),
    )
  })
})

describe('CIRCLE_BLUR 反向（径向洞 + 宽羽化）', () => {
  const center = { x: 400, y: 300 }
  const v = `var(${REVEAL_VAR})`
  /** 羽化半宽 = blurAmount × 1.2 × 正向终尺寸 / 100，终尺寸与正向几何对拍（不许两处漂移） */
  const featherOf = (blurAmount: number): number => {
    const endSize = Number(getBlurCircleMaskGeometry(center, viewport, blurAmount).endSize.split('px')[0])
    return Math.round((blurAmount * BLUR_MASK_DEVIATION_FACTOR * endSize) / 100 * 100) / 100
  }

  it('串结构：径向洞透明核 + 宽羽化斜坡，圆心 = 触发点（机制同 CIRCLE reverse 洞式）', () => {
    const feather = featherOf(2) // 终尺寸 4000 → 2 × 1.2 × 40 = 96
    expect(feather).toBe(96)
    const spec = getBlurCircleReverseRevealSpec(center, viewport, 2)
    expect(spec.maskImage).toBe(
      `radial-gradient(circle at 400px 300px, transparent calc(${v} - ${feather}px), #000 calc(${v} + ${feather}px))`,
    )
    expect(spec.maskSize).toBe('100% 100%')
    expect(spec.maskRepeat).toBe('no-repeat')
  })

  it('两端都不照抄正向：from = maxRadius + 羽化（正向 4×(长边+200) 是 mask-size 的覆盖余量）、to = −羽化（过冲一整段羽化宽）', () => {
    const spec = getBlurCircleReverseRevealSpec(center, viewport, 2)
    const feather = featherOf(2)
    const maxR = getMaxRadiusToCorners(center, viewport)
    expect(spec.from).toBe(maxR + feather)
    expect(spec.to).toBe(-feather)
    // 首帧全透明段（from − 羽化）盖住视口最远角；末帧 #000 段（to + 羽化 ≤ 0）从 0 起盖满全屏
    expect(spec.from - feather).toBeGreaterThanOrEqual(maxR)
    expect(spec.to + feather).toBeLessThanOrEqual(0)
    // 不过冲（to = 0）会像 RIPPLE 反向一样在中心留半透明点
    expect(spec.to).toBeLessThan(0)
  })

  it('羽化随 blurAmount 增宽：模糊越强，收拢的软边与过冲量同步变大', () => {
    expect(getBlurCircleReverseRevealSpec(center, viewport, 3).to).toBeLessThan(
      getBlurCircleReverseRevealSpec(center, viewport, 2).to,
    )
    expect(getBlurCircleReverseRevealSpec(center, viewport, 3).from).toBeGreaterThan(
      getBlurCircleReverseRevealSpec(center, viewport, 2).from,
    )
  })
})

describe('DIAMOND 反向（对角洞式条带 add）', () => {
  const center = { x: 400, y: 300 }
  const v = `var(${REVEAL_VAR})`
  /** 与 masks.ts 的条带串同构（S 烘进 px，±0.5px 抗锯齿斜坡） */
  const strip = (angle: number, s: number): string =>
    `linear-gradient(${angle}deg, #000 0 calc(${s}px - ${v} - 0.5px),` +
    ` transparent calc(${s}px - ${v} + 0.5px) calc(${s}px + ${v} - 0.5px),` +
    ` #000 calc(${s}px + ${v} + 0.5px))`

  it('串结构：两条对角透明芯条带（135deg/45deg），默认 add 合成下透明区 = 两芯交集 = 菱形洞', () => {
    const spec = getDiamondReverseRevealSpec(center, viewport)
    expect(spec.maskImage).toBe(`${strip(135, 494.97)}, ${strip(45, 494.97)}`)
    expect(spec.maskSize).toBe('100% 100%, 100% 100%')
    expect(spec.maskRepeat).toBe('no-repeat, no-repeat')
    // add 是默认合成：不需要 @supports 门控（roadmap 原猜的 intersect + 门控被预检证伪）
    expect(spec.maskImage).not.toContain('intersect')
    expect(spec.maskImage.match(/linear-gradient\(/g)).toHaveLength(2)
  })

  it('几何常量烘进 px：S = L/2 + (触发点 − 视口中心)·u（L = (宽+高)×√2/2，135°/45° 同长）', () => {
    // 中心触发：S = L/2 = 1400×√2/4 = 494.97（两带同值）
    const spec = getDiamondReverseRevealSpec(center, viewport)
    expect(spec.maskImage).toContain('calc(494.97px - ')
    // 偏心 (100,200)：S_A = 494.97 + (−300−100)×√2/2 = 212.13、S_B = 494.97 + (−300+100)×√2/2 = 353.55
    const off = getDiamondReverseRevealSpec({ x: 100, y: 200 }, viewport)
    expect(off.maskImage).toContain('calc(212.13px - ')
    expect(off.maskImage).toContain('calc(353.55px - ')
  })

  it('from = 1.05 × v0（四角 (|dx|+|dy|)/√2 最大值）、to = 0：不照抄正向 √2×1.05 外接圆余量', () => {
    expect(DIAMOND_REVERSE_COVERAGE_FACTOR).toBe(1.05)
    const spec = getDiamondReverseRevealSpec(center, viewport)
    expect(spec.from).toBe(519.72)
    expect(spec.to).toBe(0)
    // 角落触发 (0,0)：v0 = 1400×√2/2 = 989.95 → from = 1039.45
    expect(getDiamondReverseRevealSpec({ x: 0, y: 0 }, viewport).from).toBe(1039.45)
    // 正向的 DIAMOND_COVERAGE_FACTOR（√2 × 1.05）是外接圆边长余量，照抄只会空转
    expect(spec.from).toBeLessThan(494.97 * DIAMOND_COVERAGE_FACTOR)
  })

  it('首帧全隐不等式：四角都在透明芯内（菱形洞盖住视口的充要条件 (|dx|+|dy|)/√2 < from − 0.5）', () => {
    for (const c of [
      { x: 400, y: 300 },
      { x: 100, y: 200 },
      { x: 0, y: 0 },
      { x: 800, y: 600 },
    ]) {
      const spec = getDiamondReverseRevealSpec(c, viewport)
      for (const [x, y] of [
        [0, 0],
        [800, 0],
        [0, 600],
        [800, 600],
      ]) {
        const reach = ((Math.abs(x - c.x) + Math.abs(y - c.y)) * Math.SQRT1_2)
        expect(reach).toBeLessThan(spec.from - 0.5)
      }
    }
  })

  it('末帧全覆盖：v=0 时两带各留一条亚像素 dip 线、仅触发点交叉处 ~1px（与 CIRCLE reverse 同类容忍）', () => {
    const spec = getDiamondReverseRevealSpec(center, viewport)
    expect(spec.to).toBe(0)
    // 结构保证：条带两端都是 #000（v=0 时两段实心在触发点投影处相接，零残留）
    expect(spec.maskImage.match(/#000 /g)).toHaveLength(4)
  })
})

describe('TRIANGLE 反向（三个半平面 add，P3-11）', () => {
  const center = { x: 400, y: 300 }
  const v = `var(${REVEAL_VAR})`
  /** 与 masks.ts 的半平面串同构（S 烘进 px，边界 = S − v×0.5，±0.5px 抗锯齿斜坡） */
  const halfPlane = (angle: number, s: number): string =>
    `linear-gradient(${angle}deg, #000 0 calc(${s}px - ${v} * 0.5 - 0.5px),` +
    ` transparent calc(${s}px - ${v} * 0.5 + 0.5px))`

  it('常量口径：覆盖余量 1.05（同 SQUARE_COVERAGE_MARGIN）、内切半径系数 0.5（外接圆 = 2a）', () => {
    expect(TRIANGLE_REVERSE_COVERAGE_FACTOR).toBe(1.05)
    expect(TRIANGLE_REVERSE_COVERAGE_FACTOR).toBe(SQUARE_COVERAGE_MARGIN)
    expect(TRIANGLE_REVERSE_INRADIUS_FACTOR).toBe(0.5)
  })

  it('串结构：三个半平面（0/120/240deg 内法向）透明区取交集 = 顶点朝上的洞（与正向蒙版朝向一致）', () => {
    const spec = getTriangleReverseRevealSpec(center, viewport)
    // 中心触发：S = 300 / 496.41 / 496.41（L = |W·sinA| + |H·cosA|，120°/240° 同长）
    expect(spec.maskImage).toBe(
      [halfPlane(0, 300), halfPlane(120, 496.41), halfPlane(240, 496.41)].join(', '),
    )
    expect(spec.maskImage.match(/linear-gradient\(/g)).toHaveLength(3)
    expect(spec.maskSize).toBe('100% 100%, 100% 100%, 100% 100%')
    expect(spec.maskRepeat).toBe('no-repeat, no-repeat, no-repeat')
  })

  it('几何常量烘进 px：S = L/2 + (触发点 − 视口中心)·u，随触发点偏移', () => {
    // 偏心 (100,200)：S_A0 = 300 + 100 = 400；S_A120 = 496.41 − 259.81 − 50 = 186.6；S_A240 = 706.22
    const off = getTriangleReverseRevealSpec({ x: 100, y: 200 }, viewport)
    expect(off.maskImage).toContain('linear-gradient(0deg, #000 0 calc(400px - ')
    expect(off.maskImage).toContain('linear-gradient(120deg, #000 0 calc(186.6px - ')
    expect(off.maskImage).toContain('linear-gradient(240deg, #000 0 calc(706.22px - ')
  })

  it('from = 1.05 × needed / 0.5（视口角 × 内法向最靠外偏移）、to = 0：不照抄正向 2.2 外接圆系数', () => {
    const spec = getTriangleReverseRevealSpec(center, viewport)
    // needed = max(300, 496.41, 496.41) = 496.41 → ×2.1 = 1042.46
    expect(spec.from).toBe(1042.46)
    expect(spec.to).toBe(0)
    // 角落触发 (0,0)：S = 600 / 0 / 692.82 → needed = 692.82 → from = 1454.92
    expect(getTriangleReverseRevealSpec({ x: 0, y: 0 }, viewport).from).toBe(1454.92)
    // 正向 TRIANGLE_CIRCUMRADIUS_FACTOR（2.2×外接圆）是 mask-size 的覆盖余量，
    // 照抄成起点只空转（欧氏判据多留 ~12%，起手空转 125ms → 240ms，预检实测）
    expect(spec.from).toBeLessThan(getMaxRadiusToCorners(center, viewport) * TRIANGLE_CIRCUMRADIUS_FACTOR)
  })

  it('首帧全隐不等式：任意触发点下四角都在三个透明半平面内（越过 ±0.5px 斜坡内沿）', () => {
    for (const c of [
      { x: 400, y: 300 },
      { x: 100, y: 200 },
      { x: 0, y: 0 },
      { x: 800, y: 600 },
    ]) {
      const spec = getTriangleReverseRevealSpec(c, viewport)
      for (const angle of [0, 120, 240]) {
        const rad = (angle * Math.PI) / 180
        const ux = Math.sin(rad)
        const uy = -Math.cos(rad)
        for (const [x, y] of [[0, 0], [800, 0], [0, 600], [800, 600]]) {
          // 角在透明侧 ⇔ −(p−c)·u < from×0.5 − 0.5（1.05 余量提供这 5% 的松弛）
          expect(-(x - c.x) * ux - (y - c.y) * uy).toBeLessThan(spec.from * 0.5 - 0.5)
        }
      }
    }
  })

  it('末帧零残留：to = 0 且三内法向和为零向量 ⇒ v=0 时透明半平面交集为空', () => {
    const spec = getTriangleReverseRevealSpec(center, viewport)
    expect(spec.to).toBe(0)
    // 结构保证：每层「边界外 #000、边界内 transparent」，v=0 时三条边都过触发点，
    // 交集收缩为空（仅触发点交叉处留亚像素半透明斜坡，预检 18 帧 × 两档 dsf 末帧旧主题像素 = 0）
    expect(spec.maskImage.match(/#000 /g)).toHaveLength(3)
  })
})

describe('HEXAGON 反向（三条透明芯条带 add，P3-11 补全）', () => {
  const center = { x: 400, y: 300 }
  const v = `var(${REVEAL_VAR})`
  const K = '0.8661'
  /** 与 masks.ts 的条带串同构（S 烘进 px，芯边界 = S ± v×k，±0.5px 抗锯齿斜坡） */
  const strip = (angle: number, s: number): string =>
    `linear-gradient(${angle}deg, #000 0 calc(${s}px - ${v} * ${K} - 0.5px),` +
    ` transparent calc(${s}px - ${v} * ${K} + 0.5px) calc(${s}px + ${v} * ${K} - 0.5px),` +
    ` #000 calc(${s}px + ${v} * ${K} + 0.5px))`

  it('常量口径：覆盖余量 1.05、边心距系数 ceil4(cos30°) = 0.8661（round2 的 0.87 会欠覆盖 0.4%）', () => {
    expect(HEXAGON_REVERSE_COVERAGE_FACTOR).toBe(1.05)
    expect(HEXAGON_REVERSE_COVERAGE_FACTOR).toBe(SQUARE_COVERAGE_MARGIN)
    expect(HEXAGON_REVERSE_APOTHEM_FACTOR).toBe(0.8661)
    // ceil 方向自证：向上取整必须 ≥ 真值
    expect(HEXAGON_REVERSE_APOTHEM_FACTOR).toBeGreaterThanOrEqual(Math.cos(Math.PI / 6))
  })

  it('串结构：三条透明芯条带（90/150/210deg）透明区取交集 = 尖顶朝上的六边形洞', () => {
    const spec = getHexagonReverseRevealSpec(center, viewport)
    // 中心触发：S = 400 / 459.81 / 459.81（L = |W·sinA| + |H·cosA|，150°/210° 同长）
    expect(spec.maskImage).toBe(
      [strip(90, 400), strip(150, 459.81), strip(210, 459.81)].join(', '),
    )
    expect(spec.maskImage.match(/linear-gradient\(/g)).toHaveLength(3)
    expect(spec.maskSize).toBe('100% 100%, 100% 100%, 100% 100%')
    expect(spec.maskRepeat).toBe('no-repeat, no-repeat, no-repeat')
    // 朝向锚点（预检坑 #2）：A=90 法向水平 ⇒ 左右两条竖直边、上下出顶点 = 尖顶，与正向蒙版一致
    expect(spec.maskImage).toContain('linear-gradient(90deg')
  })

  it('几何常量烘进 px：S = L/2 + (触发点 − 视口中心)·u，随触发点偏移', () => {
    // 偏心 (100,200)：S_A90 = 400 − 300 = 100；S_A150 = 459.81 − 150 − 86.6 = 223.21；S_A210 = 523.21
    const off = getHexagonReverseRevealSpec({ x: 100, y: 200 }, viewport)
    expect(off.maskImage).toContain('linear-gradient(90deg, #000 0 calc(100px - ')
    expect(off.maskImage).toContain('linear-gradient(150deg, #000 0 calc(223.21px - ')
    expect(off.maskImage).toContain('linear-gradient(210deg, #000 0 calc(523.21px - ')
  })

  it('from = 1.05 × needed / 0.8661（条带双侧约束，needed 取 |(p−c)·u| 最大）、to = 0：不照抄正向 √2×1.05', () => {
    const spec = getHexagonReverseRevealSpec(center, viewport)
    // needed = max(400, 459.81, 459.81) = 459.81 → ×1.05/0.8661 = 557.44
    expect(spec.from).toBe(557.44)
    expect(spec.to).toBe(0)
    // 角落触发 (0,0)：needed = max(800, 919.62, 519.62) = 919.62 → from = 1114.88
    expect(getHexagonReverseRevealSpec({ x: 0, y: 0 }, viewport).from).toBe(1114.88)
    // 正向 HEXAGON_COVERAGE_FACTOR（√2×1.05 外接圆边长）是 mask-size 的覆盖余量，照抄只会空转
    expect(spec.from).toBeLessThan(getMaxRadiusToCorners(center, viewport) * HEXAGON_COVERAGE_FACTOR)
  })

  it('首帧全隐不等式：任意触发点下四角都在三条透明芯内（双侧越过 ±0.5px 斜坡内沿）', () => {
    for (const c of [
      { x: 400, y: 300 },
      { x: 100, y: 200 },
      { x: 0, y: 0 },
      { x: 800, y: 600 },
    ]) {
      const spec = getHexagonReverseRevealSpec(c, viewport)
      for (const angle of [90, 150, 210]) {
        const rad = (angle * Math.PI) / 180
        const ux = Math.sin(rad)
        const uy = -Math.cos(rad)
        for (const [x, y] of [[0, 0], [800, 0], [0, 600], [800, 600]]) {
          // 角在透明芯内 ⇔ |(p−c)·u| < from×k − 0.5（1.05 余量提供这 5% 的松弛）
          expect(Math.abs((x - c.x) * ux + (y - c.y) * uy)).toBeLessThan(
            spec.from * HEXAGON_REVERSE_APOTHEM_FACTOR - 0.5,
          )
        }
      }
    }
  })

  it('末帧零残留：to = 0，三条透明芯各自塌成过触发点的线（交集收缩为交叉点）', () => {
    const spec = getHexagonReverseRevealSpec(center, viewport)
    expect(spec.to).toBe(0)
    // 结构保证：每条条带两端都是 #000（v=0 时芯塌线、两端实心相接；
    // 触发点交叉处亚像素斜坡与 DIAMOND 同类容忍，预检末帧旧主题像素 = 0）
    expect(spec.maskImage.match(/#000 /g)).toHaveLength(6)
  })
})

/** 测试内专用：与 masks.ts 的因子舍入对拍（ceil 到 4 位，偏大保守、不欠覆盖） */
function ceil4(value: number): number {
  return Math.ceil(value * 10000 - 1e-6) / 10000
}
