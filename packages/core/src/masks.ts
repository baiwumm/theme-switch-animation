import { REVEAL_VAR, SWEEP_VAR, ThemeAnimationDirection, ThemeAnimationType } from './types'
import type { ShapeAnimationType } from './types'

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

const CIRCLE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2"><circle cx="1" cy="1" r="1" fill="#fff"/></svg>'

/** 圆形蒙版：SVG data-URI，白色实心圆 */
export const CIRCLE_MASK_IMAGE = `url("data:image/svg+xml,${encodeURIComponent(CIRCLE_SVG)}")`

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
 * 蒙版几何一律取整到整数 px：Math.hypot 的无理数会产生分数像素，
 * 而对快照层逐帧动画 mask-size / mask-position 时，分数偏移会在 GPU 栅格化
 * （尤其 Windows 分数缩放的 dpr）下暴露 1px 级接缝——表现为收起时边缘偶现"线条抖动"。
 * 覆盖余量（≥5%）远大于取整损失（≤0.5px），安全性无虞。
 */
const px = (value: number): string => `${Math.round(value)}px`

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
 * CIRCLE_REVERT 收起方向（切回亮色）的"反向蒙版（洞）"参数：
 * 蒙版改挂 `::view-transition-new(root)`（层序回到 UA 默认，不再需要 z-index 置顶旧层），
 * 用"圆内透明、圆外不透明"的洞露出下面的旧主题，视觉上与"旧层圆形蒙版"等价
 * （见 docs/phase-6-report.md 附录六的逐像素等价性实测）。
 * 洞的圆心恒在触发点，起始半径 = CIRCLE 终尺寸的一半（保证初始整屏都是旧主题）。
 */
export interface CircleHoleGeometry {
  /** 洞心 x（视口坐标，直接写进 radial-gradient，不做像素对齐） */
  cx: number
  /** 洞心 y */
  cy: number
  /** 起始半径 px（动画结束收缩到 0） */
  startRadius: number
}

export function getCircleRevertHoleGeometry(center: Point, viewport: Size): CircleHoleGeometry {
  return {
    cx: roundTo(center.x, 2),
    cy: roundTo(center.y, 2),
    startRadius: (getMaxRadiusToCorners(center, viewport) * CIRCLE_SIZE_FACTOR) / 2,
  }
}

/**
 * CIRCLE_REVERT 收起方向（切回亮色）的几何：暗色圆从全覆盖收缩到触发点 0。
 * 起始尺寸与 CIRCLE 的终尺寸相同（2.1 × maxRadius，保证初始盖住整个视口），
 * 钉扎方向与 CIRCLE 相反：from 全尺寸居中 → to 触发点 0。
 * 扩散方向（切到暗色）直接复用 getCircleMaskGeometry（暗色圆从 0 长出）。
 *
 * 注：V1.6 起收起方向默认走上面的 `getCircleRevertHoleGeometry`（新层反向蒙版）；
 * 此函数保留为公开 API 与降级路径。
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

/**
 * 属性驱动揭开（BLINDS / SCAN）：蒙版盒子完全静止（不动画 mask-size / mask-position），
 * 只有注册属性 `REVEAL_VAR` 在动——渐变蒙版引用该属性，属性每帧变化时渐变重新解析。
 * 与 CIRCLE_REVERT 收起方向的"洞"（buildHoleAnimationCSS）同一机制，CSS 生成见 styles.ts。
 * 旧截图层完整垫底、新层挂蒙版。消费 center 的成员是 RIPPLE 与角度族——它们的圆心得
 * 写进渐变串（见 getRippleRevealSpec / getClockSweepRevealSpec）；BLINDS / SCAN / CURTAIN
 * 无触发点、不消费 center。
 */
export interface RevealMaskSpec {
  /** 注册属性的起始值 / 终止值（px），写进 keyframes 的 from / to */
  from: number
  to: number
  /** `mask-image`：引用 `REVEAL_VAR` 的渐变模板 */
  maskImage: string
  /** `mask-size`：BLINDS 按叶片尺寸平铺，SCAN 单层满铺 */
  maskSize: string
  /** BLINDS 叶片平铺 `repeat`；SCAN 单层 `no-repeat`。多层蒙版（CURTAIN 反向）写逗号列表，层数与 maskImage 对齐 */
  maskRepeat: string
  /**
   * 动画量的注册属性名；缺省 = `REVEAL_VAR`。CLOCK_SWEEP / FAN 传 `SWEEP_VAR`，
   * 因为 `@property` 的 syntax 一经注册不可改，`<angle>` 必须另起一名。
   */
  varName?: string
  /** 动画量的单位，决定 `@property` 的 syntax 与 keyframes 的值后缀；缺省 `'px'`（`<length>`） */
  unit?: 'px' | 'deg'
}

/** BLINDS / SCAN 共用的方向参数表：渐变角 = 扫开方向（90deg 向右 / 270deg 向左 / 180deg 向下 / 0deg 向上） */
const REVEAL_DIRECTION: Record<ThemeAnimationDirection, { angle: number; axis: 'x' | 'y' }> = {
  [ThemeAnimationDirection.LTR]: { angle: 90, axis: 'x' },
  [ThemeAnimationDirection.RTL]: { angle: 270, axis: 'x' },
  [ThemeAnimationDirection.TTB]: { angle: 180, axis: 'y' },
  [ThemeAnimationDirection.BTT]: { angle: 0, axis: 'y' },
}

/** BLINDS 软边宽度 = 叶片宽 × 此比例（与 beui 的 72/20 同比例），上限 BLINDS_MAX_FEATHER_PX */
export const BLINDS_FEATHER_RATIO = 0.28
export const BLINDS_MAX_FEATHER_PX = 20

export function getBlindsFeatherPx(slatWidth: number): number {
  return Math.min(BLINDS_MAX_FEATHER_PX, Math.round(slatWidth * BLINDS_FEATHER_RATIO))
}

/**
 * BLINDS：视口被尺寸 `slatWidth` 的叶片平铺，每根叶片的不透明部分从 0 长到全宽。
 * from = -feather：渐变的 `#000` 段整体落在叶片左侧之外，起始帧整屏透出旧主题；
 * to = slatWidth：`#000` 段盖满整个叶片，末帧完全揭开。软边超出叶片的部分被平铺边界裁掉，
 * 形成"相邻叶片硬边相接"的百叶窗观感（与 beui 一致）。
 */
export function getBlindsRevealSpec(direction: ThemeAnimationDirection, slatWidth: number): RevealMaskSpec {
  const { angle, axis } = REVEAL_DIRECTION[direction]
  const feather = getBlindsFeatherPx(slatWidth)
  const v = `var(${REVEAL_VAR})`
  return {
    from: -feather,
    to: slatWidth,
    maskImage: `linear-gradient(${angle}deg, #000 0 ${v}, transparent calc(${v} + ${feather}px))`,
    maskSize: axis === 'x' ? `${slatWidth}px 100%` : `100% ${slatWidth}px`,
    maskRepeat: 'repeat',
  }
}

/** SCAN 前缘光束带：实心段之后的半透明"扫描光"宽度与透明度 */
export const SCAN_BAND_WIDTH_PX = 12
export const SCAN_BAND_ALPHA = 0.4
/** 光束带后端的渐隐尾巴宽度 */
export const SCAN_FADE_WIDTH_PX = 4

/**
 * SCAN：单层满铺蒙版，揭开前缘带一条半透明光束——硬边实心段 + 平坦半透明带 + 渐隐尾。
 * to = 推进轴全长 + 光束总宽：实心段末帧盖满视口，光束整体扫出画面（与 CIRCLE 的
 * 覆盖余量同哲学：蒙版在样式移除前持续生效，末帧必须完全覆盖）。
 */
export function getScanRevealSpec(direction: ThemeAnimationDirection, viewport: Size): RevealMaskSpec {
  const { angle, axis } = REVEAL_DIRECTION[direction]
  const extent = axis === 'x' ? viewport.width : viewport.height
  const v = `var(${REVEAL_VAR})`
  return {
    from: 0,
    to: extent + SCAN_BAND_WIDTH_PX + SCAN_FADE_WIDTH_PX,
    maskImage:
      `linear-gradient(${angle}deg, #000 0 calc(${v} - ${SCAN_BAND_WIDTH_PX}px),` +
      ` rgba(0, 0, 0, ${SCAN_BAND_ALPHA}) calc(${v} - ${SCAN_BAND_WIDTH_PX}px),` +
      ` rgba(0, 0, 0, ${SCAN_BAND_ALPHA}) calc(${v} - ${SCAN_FADE_WIDTH_PX}px),` +
      ` transparent ${v})`,
    maskSize: '100% 100%',
    maskRepeat: 'no-repeat',
  }
}

/**
 * CURTAIN 双开门：新主题自屏幕中线向两侧对称揭开。与 QR_GRID 的垂直轴层同构
 * （`qrCenterGradient` 的写法），区别是只有一层、推进轴固定为水平、且不消费 direction。
 *
 * 起始帧（reveal = 0）实心段宽度为 0，但两侧各留一条 `CURTAIN_FEATHER_PX` 的软边——表现为
 * 中缝先透出一道光、再向两边推开，这是幕布观感的一部分（同 RIPPLE 起始帧的中心淡纹）。
 * 末帧要把两条软边都推出画面，故 `to = 视口宽 + 2 × 软边`。
 */
export const CURTAIN_FEATHER_PX = 24

export function getCurtainRevealSpec(viewport: Size): RevealMaskSpec {
  const v = `var(${REVEAL_VAR})`
  const f = CURTAIN_FEATHER_PX
  return {
    from: 0,
    to: viewport.width + 2 * f,
    maskImage:
      `linear-gradient(90deg, transparent calc(50% - ${v} / 2 - ${f}px),` +
      ` #000 calc(50% - ${v} / 2) calc(50% + ${v} / 2),` +
      ` transparent calc(50% + ${v} / 2 + ${f}px))`,
    maskSize: '100% 100%',
    maskRepeat: 'no-repeat',
  }
}

/**
 * CURTAIN 反向：两扇幕布从屏幕两侧向中线合拢，新主题随之从边缘显出。
 *
 * **不能靠"把正向串取补"实现**——正向是一条居中透明带的补集，那条带被钉在 50%、
 * 无论把 `r` 收到多负都消不掉，末帧必留一条居中半透明缝（实测 40 全透 + 150 半透，
 * 过冲与"单渐变两侧板"两种改法都只减小不消除）。
 *
 * 可用的构造是**两层 + 默认 `add`（取最大 alpha）**：左板自左边缘向右长、右板自右
 * 边缘向左长，软边都朝内。两板在中央重叠时取最大值而不是相互抵消，所以末帧必然全实。
 * 两端各留一个软边宽度：`from = -软边` 让首帧两板整体在屏幕外（全隐），
 * `to = 半屏 + 软边` 让两板都越过中线（全覆盖）。探针实测首帧 6400/6400 全隐、
 * 末帧 0 残留、推进近似线性。
 */
export function getCurtainReverseRevealSpec(viewport: Size): RevealMaskSpec {
  const v = `var(${REVEAL_VAR})`
  const f = CURTAIN_FEATHER_PX
  const layerLeft = `linear-gradient(90deg, #000 0 ${v}, transparent calc(${v} + ${f}px))`
  const layerRight = `linear-gradient(270deg, #000 0 ${v}, transparent calc(${v} + ${f}px))`
  return {
    from: -f,
    to: viewport.width / 2 + f,
    maskImage: `${layerLeft}, ${layerRight}`,
    maskSize: '100% 100%, 100% 100%',
    maskRepeat: 'no-repeat, no-repeat',
  }
}

/**
 * 属性驱动规格的分发参数：`reverse` 位目前只有 CURTAIN 需要单独走构造器，
 * 其余类型反向即正向取补，在各自函数内部处理。
 */
export function getCurtainMaskSpec(viewport: Size, reverse = false): RevealMaskSpec {
  return reverse ? getCurtainReverseRevealSpec(viewport) : getCurtainRevealSpec(viewport)
}

export function isRevealAnimationType(type: ThemeAnimationType): boolean {
  return type === ThemeAnimationType.BLINDS || type === ThemeAnimationType.SCAN
    || type === ThemeAnimationType.CURTAIN
}

/** 按动画类型分发属性驱动规格；仅接受 BLINDS / SCAN / CURTAIN（QR_GRID 走独立的双层蒙版规格） */
export function getRevealMaskSpec(
  type: ThemeAnimationType,
  direction: ThemeAnimationDirection,
  slatWidth: number,
  viewport: Size,
  reverse = false,
): RevealMaskSpec {
  if (type === ThemeAnimationType.BLINDS) return getBlindsRevealSpec(direction, slatWidth)
  if (type === ThemeAnimationType.CURTAIN) return getCurtainMaskSpec(viewport, reverse)
  return getScanRevealSpec(direction, viewport)
}

/**
 * QR_GRID：方块格子——百叶窗的二维版。新截图层挂"列约束 ∩ 行约束"的双层渐变蒙版：
 * 列层是按格距平铺的竖条、行层是按格距平铺的横条，intersect 后即每格一个方块，
 * 方块随注册属性同步生长、末帧相邻方块融为整屏（末帧必须完全覆盖，同 BLINDS 的叶片）。
 * `direction` 决定方块的锚定角：LTR = 左上（向右下长）、RTL = 右上、TTB = 顶边中点（向下）、
 * BTT = 底边中点（向上）。不支持 mask-composite 的引擎按 @supports 降级为推进轴单层条带
 * （观感同百叶窗，见 styles.ts）。
 */
export interface QrGridMaskSpec {
  /** 揭开进度变量的起止值（px）：-2×软边起步（起始帧整屏旧主题），格距收尾（方块融为整屏） */
  from: number
  to: number
  /** 基线（不支持 mask-composite 的引擎）：沿推进轴的单层条带渐变 */
  baselineImage: string
  baselineSize: string
  /** 方块双层蒙版：列约束（x）与行约束（y）两条渐变，逗号拼接 */
  cellImage: string
  /** 双层各自的 mask-size，逗号拼接 */
  cellSize: string
}

/** QR_GRID 方块格距（px）：每格方块的最大边长，也是双层蒙版各自的平铺周期 */
export const QR_GRID_CELL_PX = 64

/** QR_GRID 各方向的锚定参数：推进轴（列/行）渐变角 + 垂直轴渐变角 */
interface QrGridDirectionSpec {
  /** 推进轴（先揭示的轴）渐变角：LTR/RTL = 90/270（列层），TTB/BTT = 180/0（行层），恒为起始边生长 */
  leadAngle: 90 | 270 | 180 | 0
  /** 垂直轴渐变角：水平推进（LTR/RTL）恒为 180（自顶向下）；垂直推进（TTB/BTT）为 90（自左向右） */
  crossAngle: 90 | 180
  /** 垂直轴是否为推进轴（决定基线层取哪条渐变与 mask-size 的轴） */
  leadIsX: boolean
}

const QR_GRID_DIRECTION: Record<ThemeAnimationDirection, QrGridDirectionSpec> = {
  [ThemeAnimationDirection.LTR]: { leadAngle: 90, crossAngle: 180, leadIsX: true },
  [ThemeAnimationDirection.RTL]: { leadAngle: 270, crossAngle: 180, leadIsX: true },
  [ThemeAnimationDirection.TTB]: { leadAngle: 180, crossAngle: 90, leadIsX: false },
  [ThemeAnimationDirection.BTT]: { leadAngle: 0, crossAngle: 90, leadIsX: false },
}

/** 从格子起始边生长的条带渐变（与 BLINDS 叶片同构）：不透明段 0→r，软边 f */
function qrEdgeGradient(angle: number, feather: number): string {
  const v = `var(${REVEAL_VAR})`
  return `linear-gradient(${angle}deg, #000 0 ${v}, transparent calc(${v} + ${feather}px))`
}

/** 从格子中心向两侧对称生长的条带渐变：不透明段 50%±r/2，两侧各带软边 f */
function qrCenterGradient(axisAngle: 90 | 180, feather: number): string {
  const v = `var(${REVEAL_VAR})`
  return (
    `linear-gradient(${axisAngle}deg, transparent calc(50% - ${v} / 2 - ${feather}px),` +
    ` #000 calc(50% - ${v} / 2) calc(50% + ${v} / 2),` +
    ` transparent calc(50% + ${v} / 2 + ${feather}px))`
  )
}

export function getQrGridMaskSpec(direction: ThemeAnimationDirection): QrGridMaskSpec {
  const spec = QR_GRID_DIRECTION[direction]
  const feather = getBlindsFeatherPx(QR_GRID_CELL_PX)
  // 起始值取 -2×软边：edge 锚定只需 -f 即不可见，center 锚定（±r/2）需要 -2f，统一取后者
  const from = -2 * feather
  // 推进轴层：LTR/RTL = 列层（竖条），TTB/BTT = 行层（横条）；垂直轴层恒为对称中心生长
  const leadGradient = qrEdgeGradient(spec.leadAngle, feather)
  const crossGradient = qrCenterGradient(spec.crossAngle, feather)
  const leadSize = spec.leadIsX ? `${QR_GRID_CELL_PX}px 100%` : `100% ${QR_GRID_CELL_PX}px`
  const crossSize = spec.leadIsX ? `100% ${QR_GRID_CELL_PX}px` : `${QR_GRID_CELL_PX}px 100%`
  return {
    from,
    to: QR_GRID_CELL_PX,
    baselineImage: leadGradient,
    baselineSize: leadSize,
    cellImage: `${crossGradient}, ${leadGradient}`,
    cellSize: `${crossSize}, ${leadSize}`,
  }
}

export function isQrGridAnimationType(type: ThemeAnimationType): boolean {
  return type === ThemeAnimationType.QR_GRID
}

/**
 * RIPPLE：水滴涟漪——仍是"从触发点圆面积扩大"，但揭开前缘不是一条干净的边，
 * 而是主波峰 + 若干圈衰减余波的环带。与 BLINDS / SCAN 同属属性驱动揭开（蒙版盒子静止、
 * 只有 `REVEAL_VAR` 在动，CSS 复用 buildRevealAnimationCSS），差别有两处：
 *
 * 1. 渐变是 radial 且需要触发点——圆心写进 mask-image 串本身（同 CIRCLE_REVERT 的洞式），
 *    所以它消费 center，而 BLINDS / SCAN 不消费；
 * 2. 波峰用部分 alpha（而非 >1）：蒙版 alpha 就是新截图层的不透明度，半幅环带叠在完整
 *    垫底的旧层上，观感是透亮的水线；波谷用 transparent 露出旧主题，形成明暗相间的环。
 *
 * 半径以「波长 W 的整数倍」表达：波峰在 R + kW（k = 0…余波圈数），波谷在半整数位，
 * 最外波谷即前缘。`REVEAL_VAR` 从 0 长到 `CIRCLE 终半径 + 前缘外沿`，末帧实心段远超
 * 视口最远角——本库的硬约束「mask 在样式移除前持续生效，末帧必须完全覆盖」在此同样成立。
 */
export const RIPPLE_TRAIL_COUNT = 2
export const RIPPLE_CREST_ALPHA = 0.5
const RIPPLE_TRAIL_DECAY = 0.55
/** 实心水面止于 `R - 1 × W`（留一格给主波峰前的波谷） */
const RIPPLE_SOLID_LAG_WAVES = 1

/** 前缘外沿（px）：最外一圈波谷到实心段的距离，`REVEAL_VAR` 终值要加上它 */
export function getRippleFrontExtentPx(waveWidth: number): number {
  return (RIPPLE_TRAIL_COUNT + 0.5) * waveWidth
}

/** 以波长为单位的环带位置 → `calc()` 表达式（0 格即 var 本身，负格走减号且两侧留空格） */
function rippleStop(waveWidth: number, waves: number): string {
  const v = `var(${REVEAL_VAR})`
  const offset = roundTo(waves * waveWidth, 2)
  if (offset === 0) return v
  return `calc(${v} ${offset > 0 ? '+' : '-'} ${Math.abs(offset)}px)`
}

/**
 * 环带 stop 序列。正向是"实心水面 + 主峰 + 两圈衰减余波"；`invert = true` 返回它的
 * **补集**——同一批位置上把 alpha 换成 `1 - a`，供反向揭开用。正向与反向共用这一份
 * 定义，避免两条波带结构各自演化后失配。
 */
function rippleStops(waveWidth: number, invert: boolean): string {
  const at = (alpha: number): string => {
    const a = invert ? 1 - alpha : alpha
    return a === 0 ? 'transparent' : a === 1 ? '#000' : `rgba(0, 0, 0, ${roundTo(a, 3)})`
  }
  const stops = [
    `${at(1)} 0 ${rippleStop(waveWidth, -RIPPLE_SOLID_LAG_WAVES)}`,
    `${at(0)} ${rippleStop(waveWidth, -0.5)}`,
  ]
  for (let wave = 0; wave <= RIPPLE_TRAIL_COUNT; wave += 1) {
    const alpha = wave === 0
      ? RIPPLE_CREST_ALPHA
      : RIPPLE_CREST_ALPHA * RIPPLE_TRAIL_DECAY ** wave
    stops.push(`${at(alpha)} ${rippleStop(waveWidth, wave)}`)
    stops.push(`${at(0)} ${rippleStop(waveWidth, wave + 0.5)}`)
  }
  return stops.join(', ')
}

export function getRippleRevealSpec(center: Point, viewport: Size, waveWidth: number): RevealMaskSpec {
  return {
    from: 0,
    to: getMaxRadiusToCorners(center, viewport) * CIRCLE_SIZE_FACTOR + getRippleFrontExtentPx(waveWidth),
    maskImage: `radial-gradient(circle at ${roundTo(center.x, 2)}px ${roundTo(center.y, 2)}px, ${rippleStops(waveWidth, false)})`,
    maskSize: '100% 100%',
    maskRepeat: 'no-repeat',
  }
}

/**
 * RIPPLE 反向：水面从四周向内收拢，环带随之往中心走。串是正向的补集、区间反向，
 * **但两端都不能照抄正向**（探针实测）：
 *
 * - 终点取 `-前缘宽度` 而非 0：主峰 α=0.5 取补后仍是 0.5，收到 0 会在中心留一个
 *   约半透明的圆点（末帧扫描 18 个半透明采样点），过冲一整个前缘才收干净。
 * - 起点取 `maxRadius + 前缘宽度` 而非正向的 `2.1 × maxRadius + 前缘`：那个 2.1 是
 *   为**正向**覆盖留的余量，反向用不上——照抄会让透明核先空收掉视口最远角以外那一大段，
 *   实测前 60% 的时间里屏幕毫无变化。
 */
export function getRippleReverseRevealSpec(center: Point, viewport: Size, waveWidth: number): RevealMaskSpec {
  const front = getRippleFrontExtentPx(waveWidth)
  return {
    from: getMaxRadiusToCorners(center, viewport) + front,
    to: -front,
    maskImage: `radial-gradient(circle at ${roundTo(center.x, 2)}px ${roundTo(center.y, 2)}px, ${rippleStops(waveWidth, true)})`,
    maskSize: '100% 100%',
    maskRepeat: 'no-repeat',
  }
}

/** RIPPLE 分发：与角度族同构，reverse 位决定出正向还是补集串 */
export function getRippleMaskSpec(
  center: Point,
  viewport: Size,
  waveWidth: number,
  reverse = false,
): RevealMaskSpec {
  return reverse
    ? getRippleReverseRevealSpec(center, viewport, waveWidth)
    : getRippleRevealSpec(center, viewport, waveWidth)
}

export function isRippleAnimationType(type: ThemeAnimationType): boolean {
  return type === ThemeAnimationType.RIPPLE
}

/**
 * 角度驱动揭开（CLOCK_SWEEP / FAN）：与 RIPPLE 同一套静止蒙版盒子，只是动画量从
 * `<length>` 换成 `<angle>`、渐变从 radial 换成 conic。
 *
 * 关键便利：conic-gradient 覆盖的是**角度**而不是半径——从轴心出发的任意射线都有颜色，
 * 所以扫满一周时整个平面必然盖住，不存在 CIRCLE 家族"终半径要够到视口最远角"的计算问题。
 * CSS conic 的 `0deg` 就是 12 点方向、顺时针为正，做"时钟擦除"不需要角度偏移。
 */
export const FULL_CIRCLE_DEG = 360

/** conic 渐变的轴心（视口坐标；轴心静止不动，故无需像素对齐，同洞式圆心的处理） */
function conicAt(center: Point): string {
  return `${roundTo(center.x, 2)}px ${roundTo(center.y, 2)}px`
}

/**
 * CLOCK_SWEEP：实心扇形从 12 点顺时针扫出，前缘留一条 `CLOCK_SWEEP_TAIL_DEG` 的软尾
 * （观感同 SCAN 的前缘带，只是弯成了弧）。`to = 360 + 尾宽`：末帧实心段止于 360°，
 * 软尾整体转出画面，全平面实心。
 */
export const CLOCK_SWEEP_TAIL_DEG = 12

export function getClockSweepRevealSpec(center: Point): RevealMaskSpec {
  const v = `var(${SWEEP_VAR})`
  return {
    from: 0,
    to: FULL_CIRCLE_DEG + CLOCK_SWEEP_TAIL_DEG,
    maskImage:
      `conic-gradient(from 0deg at ${conicAt(center)}, ` +
      `#000 0 calc(${v} - ${CLOCK_SWEEP_TAIL_DEG}deg), transparent ${v})`,
    maskSize: '100% 100%',
    maskRepeat: 'no-repeat',
    varName: SWEEP_VAR,
    unit: 'deg',
  }
}

/**
 * FAN：`bladeCount` 片楔形扇叶同时从各自周期的起始边向终止边旋开，末帧拼成整圆。
 * 每片是硬边（`#000 0 open` + `transparent open step`）——这里做不了软尾：软尾会让
 * 周期末残留一段渐变淡出，末帧就留一圈永不闭合的缝，违反"末帧必须完全覆盖"。
 * 硬边也更贴扇叶的锐利直边。`step` 必须整除 360，故 bladeCount 限整数。
 *
 * 观感是"扇叶旋开"，不是相机光圈的"中央孔径收缩"——后者需要半径维度，
 * 而 conic 只有角度维度，表达不了（故本类型定名 FAN 而非 IRIS）。
 */
export function getFanBladeStepDeg(bladeCount: number): number {
  return roundTo(FULL_CIRCLE_DEG / bladeCount, 4)
}

export function getFanRevealSpec(center: Point, bladeCount: number): RevealMaskSpec {
  const v = `var(${SWEEP_VAR})`
  const step = getFanBladeStepDeg(bladeCount)
  return {
    from: 0,
    to: step,
    maskImage:
      `repeating-conic-gradient(from 0deg at ${conicAt(center)}, ` +
      `#000 0 ${v}, transparent ${v} ${step}deg)`,
    maskSize: '100% 100%',
    maskRepeat: 'no-repeat',
    varName: SWEEP_VAR,
    unit: 'deg',
  }
}

/** 角度驱动族（CLOCK_SWEEP / FAN）；与 px 驱动的 BLINDS / SCAN / RIPPLE 互斥 */
export function isSweepAnimationType(type: ThemeAnimationType): boolean {
  return type === ThemeAnimationType.CLOCK_SWEEP || type === ThemeAnimationType.FAN
}

/**
 * FAN 的反向规格：扇叶"合拢"——已旋开的部分反过来变透明，新主题从各片扇叶的终止边
 * 显出、向起始边收拢。构造是**正向串取补 + 区间反向**（`--sweep` 从 step 收到 0）。
 *
 * 之所以只有 FAN 能这么做：它是硬边（无羽化），透明带塌到零宽时 `transparent` 与 `#000`
 * 两组 stop 同时归位到 0deg，末帧不留任何残留。CURTAIN 那种带软边的对称带做不到——
 * 两条斜坡在带子塌零时必然交叉出一个凹陷，实测末帧留一条约 38px 的居中半透明带，
 * 违反"末帧必须完全覆盖"，所以 CURTAIN 不接入 reverse（见 docs/animation-roadmap.md §4）。
 */
export function getFanReverseRevealSpec(center: Point, bladeCount: number): RevealMaskSpec {
  const v = `var(${SWEEP_VAR})`
  const step = getFanBladeStepDeg(bladeCount)
  return {
    from: step,
    to: 0,
    maskImage:
      `repeating-conic-gradient(from 0deg at ${conicAt(center)}, ` +
      `transparent 0 ${v}, #000 ${v} ${step}deg)`,
    maskSize: '100% 100%',
    maskRepeat: 'no-repeat',
    varName: SWEEP_VAR,
    unit: 'deg',
  }
}

/**
 * CLOCK_SWEEP 反向：新主题从"尚未扫过"的一侧显出，边界**逆时针**回退。
 * 观感上等于当初搁置的"顺 / 逆时针"参数——补集扇形 `[v, 360]` 的边界随 v 从
 * 372 收到 0 就是逆时针转的，所以不必再单开一个方向选项。
 *
 * 12° 软尾跟着镜像到内缘（`transparent 0 calc(v - 12deg), #000 v`）。终点取 0 即可：
 * 届时 `transparent` 段的两个端点都塌到 0deg、`#000` 同点接手，末帧零残留
 * （反向的 `from` 用正向的 `to = 360 + 尾宽` 没有浪费——conic 覆盖的是角度不是面积）。
 */
export function getClockSweepReverseRevealSpec(center: Point): RevealMaskSpec {
  const v = `var(${SWEEP_VAR})`
  return {
    from: FULL_CIRCLE_DEG + CLOCK_SWEEP_TAIL_DEG,
    to: 0,
    maskImage:
      `conic-gradient(from 0deg at ${conicAt(center)}, ` +
      `transparent 0 calc(${v} - ${CLOCK_SWEEP_TAIL_DEG}deg), #000 ${v})`,
    maskSize: '100% 100%',
    maskRepeat: 'no-repeat',
    varName: SWEEP_VAR,
    unit: 'deg',
  }
}

/** 角度族分发；仅接受 isSweepAnimationType 命中的类型，其余按 CLOCK_SWEEP 处理 */
export function getSweepMaskSpec(
  type: ThemeAnimationType,
  center: Point,
  bladeCount: number,
  reverse = false,
): RevealMaskSpec {
  if (type === ThemeAnimationType.FAN) {
    return reverse ? getFanReverseRevealSpec(center, bladeCount) : getFanRevealSpec(center, bladeCount)
  }
  return reverse ? getClockSweepReverseRevealSpec(center) : getClockSweepRevealSpec(center)
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
  if (isShapeAnimationType(type)) return SHAPE_GEOMETRY[type](center, viewport)
  if (isBlurAnimationType(type)) return getBlurCircleMaskGeometry(center, viewport, blurAmount)
  return getCircleMaskGeometry(center, viewport)
}
