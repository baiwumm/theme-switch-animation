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
  ThemeAnimationOptions,
} from './types'

export {
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
export type { MaskGeometry, Point, RectProvider, Size } from './masks'

export {
  DURATION_VAR,
  EASING_VAR,
  buildAnimationCSS,
  getAnimationName,
  injectAnimationStyle,
  removeAnimationStyle,
} from './styles'
export type { BuildAnimationCSSParams } from './styles'
