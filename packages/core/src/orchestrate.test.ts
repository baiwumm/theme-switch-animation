import { describe, expect, it, vi } from 'vitest'

import {
  prefersReducedMotion,
  runThemeTransition,
  shouldSkipTransition,
  supportsViewTransition,
} from './orchestrate'

/** node 环境下用最小假对象模拟 document / window，验证降级判定与降级路径 */
const fakeDoc = (overrides: Record<string, unknown> = {}) => overrides as unknown as Document

const withViewTransition = (defaultView?: unknown) =>
  fakeDoc({ startViewTransition: () => ({ finished: Promise.resolve() }), defaultView })

const matchMediaOf = (matches: boolean) => ({ matchMedia: () => ({ matches }) }) as unknown as Window

describe('supportsViewTransition', () => {
  it('缺少 document 或 startViewTransition 不是函数 → false', () => {
    expect(supportsViewTransition(undefined)).toBe(false)
    expect(supportsViewTransition(null)).toBe(false)
    expect(supportsViewTransition(fakeDoc())).toBe(false)
    expect(supportsViewTransition(fakeDoc({ startViewTransition: 'nope' }))).toBe(false)
  })

  it('有 startViewTransition 函数 → true', () => {
    expect(supportsViewTransition(withViewTransition())).toBe(true)
  })
})

describe('prefersReducedMotion', () => {
  it('没有 window / matchMedia 时视为无偏好', () => {
    expect(prefersReducedMotion(undefined)).toBe(false)
    expect(prefersReducedMotion(null)).toBe(false)
    expect(prefersReducedMotion({} as unknown as Window)).toBe(false)
  })

  it('按 (prefers-reduced-motion: reduce) 的匹配结果返回', () => {
    expect(prefersReducedMotion(matchMediaOf(true))).toBe(true)
    expect(prefersReducedMotion(matchMediaOf(false))).toBe(false)
  })

  it('查询的是 prefers-reduced-motion: reduce', () => {
    const matchMedia = vi.fn(() => ({ matches: false }))
    prefersReducedMotion({ matchMedia } as unknown as Window)
    expect(matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)')
  })

  it('matchMedia 抛错时视为无偏好，不向外抛', () => {
    const win = {
      matchMedia: () => {
        throw new Error('boom')
      },
    } as unknown as Window
    expect(prefersReducedMotion(win)).toBe(false)
  })
})

describe('shouldSkipTransition（降级判定）', () => {
  it('SSR（无 document）→ 跳过', () => {
    expect(shouldSkipTransition(undefined)).toBe(true)
    expect(shouldSkipTransition(null)).toBe(true)
  })

  it('浏览器不支持 View Transitions → 跳过', () => {
    expect(shouldSkipTransition(fakeDoc({ defaultView: matchMediaOf(false) }))).toBe(true)
  })

  it('prefers-reduced-motion: reduce → 跳过', () => {
    expect(shouldSkipTransition(withViewTransition(matchMediaOf(true)))).toBe(true)
  })

  it('支持且无减少动效偏好 → 不跳过（matchMedia 缺失亦不跳过）', () => {
    expect(shouldSkipTransition(withViewTransition(matchMediaOf(false)))).toBe(false)
    expect(shouldSkipTransition(withViewTransition(undefined))).toBe(false)
  })
})

describe('runThemeTransition 降级路径（状态照常更新，无动画）', () => {
  it('SSR：显式 doc = null 时同步调用 domUpdate 且不触碰 DOM', async () => {
    const domUpdate = vi.fn()
    const result = runThemeTransition({ domUpdate, doc: null })
    expect(domUpdate).toHaveBeenCalledTimes(1)
    expect(result.animated).toBe(false)
    await expect(result.finished).resolves.toBeUndefined()
  })

  it('SSR：node 环境无全局 document 时自动降级', () => {
    expect(typeof document).toBe('undefined')
    const domUpdate = vi.fn()
    expect(runThemeTransition({ domUpdate }).animated).toBe(false)
    expect(domUpdate).toHaveBeenCalledTimes(1)
  })

  it('不支持 View Transitions：调用 domUpdate，不注入样式', () => {
    const domUpdate = vi.fn()
    const getElementById = vi.fn()
    const createElement = vi.fn()
    const doc = fakeDoc({ getElementById, createElement })
    expect(runThemeTransition({ domUpdate, doc }).animated).toBe(false)
    expect(domUpdate).toHaveBeenCalledTimes(1)
    expect(createElement).not.toHaveBeenCalled()
  })

  it('prefers-reduced-motion: reduce：不调用 startViewTransition', () => {
    const startViewTransition = vi.fn()
    const domUpdate = vi.fn()
    const doc = fakeDoc({ startViewTransition, defaultView: matchMediaOf(true) })
    expect(runThemeTransition({ domUpdate, doc }).animated).toBe(false)
    expect(domUpdate).toHaveBeenCalledTimes(1)
    expect(startViewTransition).not.toHaveBeenCalled()
  })

  it('异步 domUpdate（Vue nextTick 路线）：finished 等待其完成', async () => {
    let settled = false
    const domUpdate = () =>
      new Promise<void>((resolve) =>
        setTimeout(() => {
          settled = true
          resolve()
        }, 0),
      )
    const result = runThemeTransition({ domUpdate, doc: null })
    expect(settled).toBe(false)
    await result.finished
    expect(settled).toBe(true)
  })
})
