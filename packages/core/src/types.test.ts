import { describe, expect, it } from 'vitest'

import {
  THEME_ANIMATION_DEFAULTS,
  THEME_ANIMATION_STYLE_ID,
  THEME_STORAGE_KEY,
  ThemeAnimationType,
  resolveAnimationOptions,
} from './types'

describe('ThemeAnimationType', () => {
  it('提供且仅提供 13 种动画类型（5 基础 + 6 形状 + 收起/模糊）', () => {
    expect(ThemeAnimationType).toEqual({
      CIRCLE: 'circle',
      CIRCLE_REVERT: 'circle-revert',
      CIRCLE_BLUR: 'circle-blur',
      LTR: 'ltr',
      RTL: 'rtl',
      TTB: 'ttb',
      BTT: 'btt',
      SQUARE: 'square',
      DIAMOND: 'diamond',
      RECTANGLE: 'rectangle',
      HEXAGON: 'hexagon',
      TRIANGLE: 'triangle',
      STAR: 'star',
    })
    expect(new Set(Object.values(ThemeAnimationType)).size).toBe(13)
  })
})

describe('resolveAnimationOptions', () => {
  it('缺省时全部回落到默认值', () => {
    expect(resolveAnimationOptions()).toEqual({
      animationType: 'circle',
      darkClassName: 'dark',
      duration: 750,
      easing: 'ease-in-out',
      blurAmount: 2,
    })
    expect(resolveAnimationOptions()).toEqual(THEME_ANIMATION_DEFAULTS)
  })

  it('逐项覆盖，undefined 视为未提供', () => {
    expect(
      resolveAnimationOptions({
        animationType: ThemeAnimationType.RTL,
        duration: 600,
        easing: 'linear(0, 0.25, 1)',
        darkClassName: undefined,
        blurAmount: 3,
      }),
    ).toEqual({
      animationType: 'rtl',
      darkClassName: 'dark',
      duration: 600,
      easing: 'linear(0, 0.25, 1)',
      blurAmount: 3,
    })
  })

  it('blurAmount 非法值（0 / 负数 / NaN / 无穷）回落默认 2', () => {
    for (const blurAmount of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(resolveAnimationOptions({ blurAmount }).blurAmount).toBe(2)
    }
  })

  it('忽略受控模式字段，只返回五个动画参数', () => {
    const resolved = resolveAnimationOptions({ isDark: true, onChange: () => {} })
    expect(Object.keys(resolved).sort()).toEqual([
      'animationType',
      'blurAmount',
      'darkClassName',
      'duration',
      'easing',
    ])
  })
})

describe('常量', () => {
  it('localStorage key 与 style id 与需求一致', () => {
    expect(THEME_STORAGE_KEY).toBe('theme-switch-animation')
    expect(THEME_ANIMATION_STYLE_ID).toBe('theme-switch-animation')
  })
})
