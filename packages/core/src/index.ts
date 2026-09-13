export {
  THEME_ANIMATION_DEFAULTS,
  THEME_ANIMATION_STYLE_ID,
  THEME_STORAGE_KEY,
  ThemeAnimationType,
  resolveAnimationOptions,
} from './types'
export type {
  DirectionalAnimationType,
  ResolvedAnimationOptions,
  ShapeAnimationType,
  ThemeAnimationOptions,
} from './types'

export {
  BAR_MASK_IMAGE,
  BAR_START_PX,
  BLUR_MASK_DEVIATION_FACTOR,
  BLUR_MAX_MASK_SIZE,
  CIRCLE_MASK_IMAGE,
  CIRCLE_SIZE_FACTOR,
  DIAMOND_COVERAGE_FACTOR,
  DIAMOND_MASK_IMAGE,
  getBlurCircleMaskImage,
  HEXAGON_COVERAGE_FACTOR,
  HEXAGON_MASK_IMAGE,
  RECTANGLE_COVERAGE_MARGIN,
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
export type { CircleHoleGeometry, MaskGeometry, Point, RectProvider, Size } from './masks'

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
  getViewportSize,
  prefersReducedMotion,
  runThemeTransition,
  shouldSkipTransition,
  supportsViewTransition,
} from './orchestrate'
export type {
  DomUpdate,
  RunThemeTransitionParams,
  RunThemeTransitionResult,
  ViewTransitionLike,
} from './orchestrate'

export {
  applyThemeClass,
  hasThemeClass,
  readStoredTheme,
  syncThemeOnMount,
  writeStoredTheme,
} from './uncontrolled'
export type { StoredTheme } from './uncontrolled'

export { THEME_SYNC_TIMEOUT_MS, waitForThemeSync } from './controlled-sync'
export type { WaitForThemeSyncOptions } from './controlled-sync'
