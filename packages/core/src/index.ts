export {
  MAX_SLAT_WIDTH,
  MAX_WAVE_WIDTH,
  MIN_SLAT_WIDTH,
  MIN_WAVE_WIDTH,
  REVEAL_VAR,
  SLAT_WIDTH_DEFAULT,
  THEME_ANIMATION_DEFAULTS,
  THEME_ANIMATION_STYLE_ID,
  THEME_STORAGE_KEY,
  WAVE_WIDTH_DEFAULT,
  ThemeAnimationDirection,
  ThemeAnimationType,
  resolveAnimationOptions,
} from './types'
export type {
  ResolvedAnimationOptions,
  ShapeAnimationType,
  ThemeAnimationOptions,
} from './types'

export {
  BLINDS_FEATHER_RATIO,
  BLINDS_MAX_FEATHER_PX,
  BLUR_MASK_DEVIATION_FACTOR,
  BLUR_MAX_MASK_SIZE,
  CIRCLE_MASK_IMAGE,
  CIRCLE_SIZE_FACTOR,
  DIAMOND_COVERAGE_FACTOR,
  DIAMOND_MASK_IMAGE,
  getBlurCircleMaskImage,
  getBlindsFeatherPx,
  HEXAGON_COVERAGE_FACTOR,
  HEXAGON_MASK_IMAGE,
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
  TRIANGLE_MASK_IMAGE,
  getCircleMaskGeometry,
  getBlurCircleMaskGeometry,
  getCircleRevertHoleGeometry,
  getCircleRevertMaskGeometry,
  getDiamondMaskGeometry,
  getHexagonMaskGeometry,
  getMaskGeometry,
  getMaxRadiusToCorners,
  getQrGridMaskSpec,
  getRectangleMaskGeometry,
  getRevealMaskSpec,
  getRippleFrontExtentPx,
  getRippleRevealSpec,
  getSquareMaskGeometry,
  getStarMaskGeometry,
  getTriggerCenter,
  getTriangleMaskGeometry,
  isBlurAnimationType,
  isQrGridAnimationType,
  isRevealAnimationType,
  isRippleAnimationType,
  isShapeAnimationType,
} from './masks'
export type {
  CircleHoleGeometry,
  MaskGeometry,
  Point,
  QrGridMaskSpec,
  RectProvider,
  RevealMaskSpec,
  Size,
} from './masks'

export {
  DURATION_VAR,
  EASING_VAR,
  HOLE_RADIUS_VAR,
  buildAnimationCSS,
  getAnimationName,
  injectAnimationStyle,
  removeAnimationStyle,
} from './styles'
export type { BuildAnimationCSSParams } from './styles'

export {
  SKIP_TRANSITION,
  getViewportSize,
  prefersReducedMotion,
  runThemeTransition,
  shouldSkipTransition,
  supportsViewTransition,
} from './orchestrate'
export type {
  DomUpdate,
  DomUpdateResult,
  RunThemeTransitionParams,
  RunThemeTransitionResult,
  ViewTransitionLike,
} from './orchestrate'

export {
  applyThemeClass,
  hasThemeClass,
  observeThemeClass,
  readStoredTheme,
  syncThemeOnMount,
  writeStoredTheme,
} from './uncontrolled'
export type { StoredTheme } from './uncontrolled'

export { THEME_SYNC_TIMEOUT_MS, waitForThemeSync } from './controlled-sync'
export type { WaitForThemeSyncOptions } from './controlled-sync'
