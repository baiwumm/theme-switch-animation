import { describe, expect, it } from 'vitest'

import * as core from './index'

describe('core 公开导出', () => {
  it('运行时导出面完整（适配层依赖这些名字，删改需同步 react / vue / nuxt）', () => {
    expect(Object.keys(core).sort()).toEqual(
      [
        // types
        'BLUR_MASK_DEVIATION_FACTOR',
        'BLUR_MAX_MASK_SIZE',
        'DIAMOND_COVERAGE_FACTOR',
        'DIAMOND_MASK_IMAGE',
        'HEXAGON_COVERAGE_FACTOR',
        'HEXAGON_MASK_IMAGE',
        'RECTANGLE_COVERAGE_MARGIN',
        'SOLID_RECT_MASK_IMAGE',
        'SQUARE_COVERAGE_MARGIN',
        'STAR_CIRCUMRADIUS_FACTOR',
        'STAR_INNER_RATIO',
        'STAR_MASK_IMAGE',
        'THEME_ANIMATION_DEFAULTS',
        'THEME_ANIMATION_STYLE_ID',
        'TRIANGLE_CIRCUMRADIUS_FACTOR',
        'TRIANGLE_MASK_IMAGE',
        'THEME_STORAGE_KEY',
        'ThemeAnimationType',
        'resolveAnimationOptions',
        // masks
        'BAR_MASK_IMAGE',
        'BAR_START_PX',
        'CIRCLE_MASK_IMAGE',
        'CIRCLE_SIZE_FACTOR',
        'getBlurCircleMaskGeometry',
        'getBlurCircleMaskImage',
        'getCircleMaskGeometry',
        'getCircleRevertHoleGeometry',
        'getCircleRevertMaskGeometry',
        'getDiamondMaskGeometry',
        'getDirectionalMaskGeometry',
        'getHexagonMaskGeometry',
        'getMaskGeometry',
        'getMaxRadiusToCorners',
        'getRectangleMaskGeometry',
        'getSquareMaskGeometry',
        'getStarMaskGeometry',
        'getTriggerCenter',
        'getTriangleMaskGeometry',
        'isBlurAnimationType',
        'isDirectionalAnimationType',
        'isShapeAnimationType',
        // styles
        'DURATION_VAR',
        'EASING_VAR',
        'HOLE_RADIUS_VAR',
        'buildAnimationCSS',
        'getAnimationName',
        'injectAnimationStyle',
        'removeAnimationStyle',
        // orchestrate
        'SKIP_TRANSITION',
        'getViewportSize',
        'prefersReducedMotion',
        'runThemeTransition',
        'shouldSkipTransition',
        'supportsViewTransition',
        // uncontrolled
        'applyThemeClass',
        'hasThemeClass',
        'observeThemeClass',
        'readStoredTheme',
        'syncThemeOnMount',
        'writeStoredTheme',
        // controlled-sync
        'THEME_SYNC_TIMEOUT_MS',
        'waitForThemeSync',
      ].sort(),
    )
  })

  it('ThemeAnimationType 与常量与需求一致', () => {
    expect(core.ThemeAnimationType.CIRCLE).toBe('circle')
    expect(core.THEME_STORAGE_KEY).toBe('theme-switch-animation')
  })
})
