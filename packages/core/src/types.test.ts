import { describe, expect, it } from 'vitest'

import {
  THEME_ANIMATION_DEFAULTS,
  THEME_ANIMATION_STYLE_ID,
  THEME_STORAGE_KEY,
  ThemeAnimationType,
  resolveAnimationOptions,
} from './types'

describe('ThemeAnimationType', () => {
  it('提供且仅提供 5 种动画类型', () => {
    expect(ThemeAnimationType).toEqual({
      CIRCLE: 'circle',
      LTR: 'ltr',
      RTL: 'rtl',
      TTB: 'ttb',
      BTT: 'btt',
    })
    expect(new Set(Object.values(ThemeAnimationType)).size).toBe(5)
  })
})

describe('resolveAnimationOptions', () => {
  it('缺省时全部回落到默认值', () => {
    expect(resolveAnimationOptions()).toEqual({
      animationType: 'circle',
      darkClassName: 'dark',
      duration: 400,
      easing: 'ease-in-out',
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
      }),
    ).toEqual({
      animationType: 'rtl',
      darkClassName: 'dark',
      duration: 600,
      easing: 'linear(0, 0.25, 1)',
    })
  })

  it('忽略受控模式字段，只返回四个动画参数', () => {
    const resolved = resolveAnimationOptions({ isDark: true, onChange: () => {} })
    expect(Object.keys(resolved).sort()).toEqual(['animationType', 'darkClassName', 'duration', 'easing'])
  })
})

describe('常量', () => {
  it('localStorage key 与 style id 与需求一致', () => {
    expect(THEME_STORAGE_KEY).toBe('theme-switch-animation')
    expect(THEME_ANIMATION_STYLE_ID).toBe('theme-switch-animation')
  })
})
