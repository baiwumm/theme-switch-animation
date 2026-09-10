import { describe, expect, it } from 'vitest'

import * as core from './index'

describe('core 公开导出', () => {
  it('导出 ThemeAnimationType 与选项工具', () => {
    expect(core.ThemeAnimationType.CIRCLE).toBe('circle')
    expect(typeof core.resolveAnimationOptions).toBe('function')
    expect(core.THEME_STORAGE_KEY).toBe('theme-switch-animation')
  })
})
