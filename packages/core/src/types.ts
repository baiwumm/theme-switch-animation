/**
 * 动画类型。用 `const` 对象 + `as const` 而非 TS `enum`：
 * Nuxt 自动导入扫描的是命名导出，`const` 对象对打包和 `isolatedModules` 更稳。
 */
export const ThemeAnimationType = {
  /** 以触发元素为中心的圆形扩散；`reverse` 可改为从四周向内收拢（旧 CIRCLE_REVERT 的替代） */
  CIRCLE: 'circle',
  /** 圆形模糊扩散：边缘高斯模糊的圆形蒙版（只挂新截图层，旧层完整垫底） */
  CIRCLE_BLUR: 'circle-blur',
  /** 正方形，从触发点扩散 */
  SQUARE: 'square',
  /** 菱形，从触发点扩散 */
  DIAMOND: 'diamond',
  /** 矩形（贴合视口宽高比），从触发点扩散 */
  RECTANGLE: 'rectangle',
  /** 六边形（尖顶朝上），从触发点扩散 */
  HEXAGON: 'hexagon',
  /** 三角形（顶点朝上），从触发点扩散 */
  TRIANGLE: 'triangle',
  /** 五角星（顶点朝上），从触发点扩散 */
  STAR: 'star',
  /** 百叶窗：叶片逐条揭开（属性驱动蒙版，无触发点），direction 控制叶片方向与扫开方向，slatWidth 控制叶片宽度 */
  BLINDS: 'blinds',
  /** 扫描：硬边扫开 + 前缘半透明光束（属性驱动蒙版，无触发点），direction 控制扫开方向 */
  SCAN: 'scan',
  /** 方块格子：新主题以方块格子逐格生长揭开（类似百叶窗的二维版），direction 控制生长方位 */
  QR_GRID: 'qr-grid',
  /** 水滴涟漪：圆形扩散但前缘是主波 + 衰减余波的环带，waveWidth 控制波长 */
  RIPPLE: 'ripple',
  /** 时钟扇形：新主题以触发点为轴心顺时针扫出扇形揭开（conic-gradient，角度驱动） */
  CLOCK_SWEEP: 'clock-sweep',
  /** 扇叶：bladeCount 片楔形扇叶从轴心同时旋开拼成整屏（repeating-conic-gradient） */
  FAN: 'fan',
  /** 双开门：新主题自屏幕中线向两侧对称揭开（属性驱动蒙版，无触发点） */
  CURTAIN: 'curtain',
} as const

export type ThemeAnimationType = (typeof ThemeAnimationType)[keyof typeof ThemeAnimationType]

/** 中心扩散形状类：蒙版从触发点以 0 尺寸长到覆盖视口（几何形状与 CIRCLE 同构，仅蒙版图形不同） */
export type ShapeAnimationType =
  | typeof ThemeAnimationType.CIRCLE
  | typeof ThemeAnimationType.SQUARE
  | typeof ThemeAnimationType.DIAMOND
  | typeof ThemeAnimationType.RECTANGLE
  | typeof ThemeAnimationType.HEXAGON
  | typeof ThemeAnimationType.TRIANGLE
  | typeof ThemeAnimationType.STAR

/**
 * 扫描方向，供 `direction` 选项使用（当前由 BLINDS / SCAN / QR_GRID 消费，后续类型可扩展）。
 * 四向擦除类型已并入此选项（v0.2 起不再有 LTR/RTL/TTB/BTT 类型）。
 */
export const ThemeAnimationDirection = {
  LTR: 'ltr',
  RTL: 'rtl',
  TTB: 'ttb',
  BTT: 'btt',
} as const

export type ThemeAnimationDirection = (typeof ThemeAnimationDirection)[keyof typeof ThemeAnimationDirection]

export interface ThemeAnimationOptions {
  /** 动画类型，默认 `CIRCLE` */
  animationType?: ThemeAnimationType
  /** 暗色类名，默认 `'dark'` */
  darkClassName?: string
  /** 动画时长（ms），默认 `750` */
  duration?: number
  /** 任意合法 CSS timing-function，默认 `'ease-in-out'` */
  easing?: string
  /** 模糊蒙版的模糊强度（`feGaussianBlur` 的视觉强度系数），默认 `2`。仅 `CIRCLE_BLUR` 生效 */
  blurAmount?: number
  /** 扫描方向，默认 `'ltr'`。仅 BLINDS / SCAN / QR_GRID 生效，其余类型忽略 */
  direction?: ThemeAnimationDirection
  /** 百叶窗叶片宽度（px），合法范围 `[16, 200]`，默认 `72`。仅 `BLINDS` 生效，非法值静默回落默认 */
  slatWidth?: number
  /** 涟漪波长（px，相邻两圈波峰间距），合法范围 `[8, 60]`，默认 `18`。仅 `RIPPLE` 生效，非法值静默回落默认 */
  waveWidth?: number
  /** 扇叶数，合法范围 `[4, 16]` 的整数，默认 `8`。仅 `FAN` 生效，非法值静默回落默认 */
  bladeCount?: number
  /**
   * 反向揭开：`false` 总是正向（默认）、`true` 总是反向、`'auto'` 切暗正向 / 切亮反向。
   * 与 `direction` 正交——`direction` 决定推进轴，`reverse` 决定从内还是从外揭开。
   * 非法值静默回落 `false`。当前 `CIRCLE` 与 `FAN` 生效，其余类型忽略（原因见 docs/animation-roadmap.md §4）。
   */
  reverse?: boolean | 'auto'
  /** 受控模式：外部暗色状态。与 `onChange` 同时提供才进入受控模式 */
  isDark?: boolean
  /** 受控模式：状态变更回调。与 `isDark` 同时提供才进入受控模式 */
  onChange?: (next: boolean) => void
}

/** 两种模式共用的动画参数（已填充默认值） */
export interface ResolvedAnimationOptions {
  animationType: ThemeAnimationType
  darkClassName: string
  duration: number
  easing: string
  blurAmount: number
  direction: ThemeAnimationDirection
  slatWidth: number
  waveWidth: number
  bladeCount: number
  reverse: boolean | 'auto'
}

/** 百叶窗叶片宽度的默认值与合法区间（超出区间静默回落默认，与 blurAmount 同策略） */
export const SLAT_WIDTH_DEFAULT = 72
export const MIN_SLAT_WIDTH = 16
export const MAX_SLAT_WIDTH = 200

/** 涟漪波长的默认值与合法区间（同 slatWidth 的静默回落策略） */
export const WAVE_WIDTH_DEFAULT = 18
export const MIN_WAVE_WIDTH = 8
export const MAX_WAVE_WIDTH = 60

/** 扇叶数的默认值与合法区间（必须是区间内的整数，非整数会让末帧扇叶接缝错位） */
export const BLADE_COUNT_DEFAULT = 8
export const MIN_BLADE_COUNT = 4
export const MAX_BLADE_COUNT = 16

export const THEME_ANIMATION_DEFAULTS: Readonly<ResolvedAnimationOptions> = Object.freeze({
  animationType: ThemeAnimationType.CIRCLE,
  darkClassName: 'dark',
  duration: 750,
  easing: 'ease-in-out',
  blurAmount: 2,
  direction: ThemeAnimationDirection.LTR,
  slatWidth: SLAT_WIDTH_DEFAULT,
  waveWidth: WAVE_WIDTH_DEFAULT,
  bladeCount: BLADE_COUNT_DEFAULT,
  reverse: false,
})

/** 非受控模式持久化到 localStorage 的 key（v1.2：避免与 next-themes 等库的 `'theme'` 冲突） */
export const THEME_STORAGE_KEY = 'theme-switch-animation'

/** 注入 `<head>` 的临时 `<style>` 的固定 id，重复注入时先移除旧节点 */
export const THEME_ANIMATION_STYLE_ID = 'theme-switch-animation'

/**
 * 属性驱动揭开（BLINDS / SCAN）的注册自定义属性名。
 * 注册后是全局的（`@property` 无法注销），因此加 `--theme-switch-` 前缀避免撞名。
 * 放在本模块而非 styles.ts：masks.ts 构建引用它的渐变模板时不与 styles.ts 产生循环导入。
 */
export const REVEAL_VAR = '--theme-switch-reveal'

/**
 * 角度驱动揭开（CLOCK_SWEEP / FAN）的注册自定义属性名。
 * 与 `REVEAL_VAR` 分开是因为 `@property` 的 syntax 一经注册不可改（这里是 `<angle>`），
 * 复用同一个名字会和已注册成 `<length>` 的实例冲突——同名不同 syntax 在规范下是非法注册。
 */
export const SWEEP_VAR = '--theme-switch-sweep'

/** 用户传入的 `undefined` 视为未提供，回落到默认值 */
export function resolveAnimationOptions(options: ThemeAnimationOptions = {}): ResolvedAnimationOptions {
  return {
    animationType: options.animationType ?? THEME_ANIMATION_DEFAULTS.animationType,
    darkClassName: options.darkClassName ?? THEME_ANIMATION_DEFAULTS.darkClassName,
    duration: options.duration ?? THEME_ANIMATION_DEFAULTS.duration,
    easing: options.easing ?? THEME_ANIMATION_DEFAULTS.easing,
    blurAmount: isValidBlurAmount(options.blurAmount) ? options.blurAmount : THEME_ANIMATION_DEFAULTS.blurAmount,
    direction: isValidDirection(options.direction) ? options.direction : THEME_ANIMATION_DEFAULTS.direction,
    slatWidth: isValidSlatWidth(options.slatWidth) ? options.slatWidth : THEME_ANIMATION_DEFAULTS.slatWidth,
    waveWidth: isValidWaveWidth(options.waveWidth) ? options.waveWidth : THEME_ANIMATION_DEFAULTS.waveWidth,
    bladeCount: isValidBladeCount(options.bladeCount) ? options.bladeCount : THEME_ANIMATION_DEFAULTS.bladeCount,
    reverse: isValidReverse(options.reverse) ? options.reverse : THEME_ANIMATION_DEFAULTS.reverse,
  }
}

/**
 * `reverse` 的三态校验：只接受 `true` / `false` / `'auto'` 三个字面量，
 * 其余（`'yes'` / `1` / `null` / `undefined`）静默回落 `false`——与 `direction` 同策略。
 * 逐字面量比对而非 `typeof value === 'boolean' || value === 'auto'`：后者会把 `'AUTO'`
 * 这类近义串收进来当假值以外的东西处理，而反向是用户看得见的行为，宁可回落不要猜。
 */
function isValidReverse(value: boolean | 'auto' | undefined): value is boolean | 'auto' {
  return value === true || value === false || value === 'auto'
}

/** 开发环境判定（不直接引用 `process`：core 面向浏览器，不引入 Node 类型） */
export function isDevEnvironment(): boolean {
  const proc = (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process
  return proc?.env?.NODE_ENV === 'development'
}

/** blurAmount 仅在 CIRCLE_BLUR 下有意义，非法值（非正 / NaN / 无穷）静默回落默认 */
function isValidBlurAmount(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value) && value > 0
}

/** direction 仅 BLINDS / SCAN / QR_GRID 消费；字面量逐一比对（不查表），非法值静默回落默认 */
function isValidDirection(value: ThemeAnimationDirection | undefined): value is ThemeAnimationDirection {
  return value === ThemeAnimationDirection.LTR || value === ThemeAnimationDirection.RTL
    || value === ThemeAnimationDirection.TTB || value === ThemeAnimationDirection.BTT
}

/** slatWidth 仅 BLINDS 消费；越界 / NaN / 无穷静默回落默认 */
function isValidSlatWidth(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value) && value >= MIN_SLAT_WIDTH && value <= MAX_SLAT_WIDTH
}

/** waveWidth 仅 RIPPLE 消费；越界 / NaN / 无穷静默回落默认 */
function isValidWaveWidth(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value) && value >= MIN_WAVE_WIDTH && value <= MAX_WAVE_WIDTH
}

/**
 * bladeCount 仅 FAN 消费；必须是非负整数——叶片周期 = 360 / bladeCount，
 * 非整数片会让末帧的 repeating 周期与 360° 不整除，接缝处留一条永不闭合的缝。
 */
function isValidBladeCount(value: number | undefined): value is number {
  return value !== undefined && Number.isInteger(value) && value >= MIN_BLADE_COUNT && value <= MAX_BLADE_COUNT
}
