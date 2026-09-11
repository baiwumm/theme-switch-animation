import { describe, expect, it } from 'vitest'

import * as core from './index'

describe('core 公开导出', () => {
  it('运行时导出面完整（适配层依赖这些名字，删改需同步 react / vue / nuxt）', () => {
    expect(Object.keys(core).sort()).toEqual(
      [
        // types
        'THEME_ANIMATION_DEFAULTS',
        'THEME_ANIMATION_STYLE_ID',
        'THEME_STORAGE_KEY',
        'ThemeAnimationType',
        'resolveAnimationOptions',
        // masks
        'BAR_MASK_IMAGE',
        'BAR_START_PX',
        'CIRCLE_MASK_IMAGE',
        'CIRCLE_SIZE_FACTOR',
        'getCircleMaskGeometry',
        'getDirectionalMaskGeometry',
        'getMaskGeometry',
        'getMaxRadiusToCorners',
        'getTriggerCenter',
        'isDirectionalAnimationType',
        // styles
        'DURATION_VAR',
        'EASING_VAR',
        'buildAnimationCSS',
        'getAnimationName',
        'injectAnimationStyle',
        'removeAnimationStyle',
        // orchestrate
        'getViewportSize',
        'prefersReducedMotion',
        'runThemeTransition',
        'shouldSkipTransition',
        'supportsViewTransition',
        // uncontrolled
        'applyThemeClass',
        'hasThemeClass',
        'readStoredTheme',
        'syncThemeOnMount',
        'writeStoredTheme',
      ].sort(),
    )
  })

  it('ThemeAnimationType 与常量与需求一致', () => {
    expect(core.ThemeAnimationType.CIRCLE).toBe('circle')
    expect(core.THEME_STORAGE_KEY).toBe('theme-switch-animation')
  })
})
