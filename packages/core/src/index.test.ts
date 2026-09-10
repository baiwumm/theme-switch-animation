import { describe, expect, it } from 'vitest'

import { CORE_PACKAGE_NAME } from './index'

describe('core package', () => {
  it('exposes its package name', () => {
    expect(CORE_PACKAGE_NAME).toBe('@theme-switch-animation/core')
  })
})
