// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { runThemeTransition } from './orchestrate'
import type { DomUpdate, ViewTransitionLike } from './orchestrate'
import { removeAnimationStyle } from './styles'
import { THEME_ANIMATION_STYLE_ID, ThemeAnimationType } from './types'

type Deferred = { promise: Promise<void>; resolve: () => void; reject: (error: unknown) => void }

function deferred(): Deferred {
  let resolve!: () => void
  let reject!: (error: unknown) => void
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

/**
 * 模拟浏览器的 startViewTransition：立刻执行回调（同步抛错 → finished reject，
 * 返回 Promise → 等待），并允许测试手动控制 finished 的结算时机。
 */
function installFakeViewTransition(options: { manualFinish?: boolean } = {}) {
  const calls: { update: DomUpdate; finish: Deferred }[] = []
  const startViewTransition = vi.fn((update: DomUpdate): ViewTransitionLike => {
    const finish = deferred()
    calls.push({ update, finish })
    let done: Promise<void>
    try {
      done = Promise.resolve(update()).then(() => undefined)
    } catch (error) {
      done = Promise.reject(error)
    }
    const finished = options.manualFinish
      ? done.then(() => finish.promise)
      : done
    // 避免 fake 自身的 done 在未被消费时报 unhandled rejection
    finished.catch(() => {})
    return { finished }
  })
  Object.defineProperty(document, 'startViewTransition', {
    value: startViewTransition,
    configurable: true,
    writable: true,
  })
  return { startViewTransition, calls }
}

const styleNode = () => document.getElementById(THEME_ANIMATION_STYLE_ID)

describe('runThemeTransition 动画路径（jsdom + 模拟 startViewTransition）', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    removeAnimationStyle(document)
    delete (document as unknown as Record<string, unknown>).startViewTransition
    delete (window as unknown as Record<string, unknown>).matchMedia
    vi.restoreAllMocks()
  })

  it('注入样式 → 在转场回调内执行 domUpdate → 结束后延迟 duration 清理样式', async () => {
    const { startViewTransition } = installFakeViewTransition()
    const domUpdate = vi.fn()

    const result = runThemeTransition({
      domUpdate,
      options: { animationType: ThemeAnimationType.LTR, duration: 250, easing: 'steps(4)' },
    })

    expect(result.animated).toBe(true)
    expect(startViewTransition).toHaveBeenCalledTimes(1)
    expect(startViewTransition).toHaveBeenCalledWith(domUpdate)
    expect(domUpdate).toHaveBeenCalledTimes(1)

    const node = styleNode()
    expect(node).not.toBeNull()
    expect(node!.textContent).toContain('--theme-switch-duration: 250ms;')
    expect(node!.textContent).toContain('--theme-switch-easing: steps(4);')
    expect(node!.textContent).toContain('@keyframes theme-switch-ltr {')

    await result.finished
    expect(styleNode()).not.toBeNull()
    vi.advanceTimersByTime(249)
    expect(styleNode()).not.toBeNull()
    vi.advanceTimersByTime(1)
    expect(styleNode()).toBeNull()
  })

  it('CIRCLE 以触发元素中心为圆心，并按视口尺寸计算终值', () => {
    installFakeViewTransition()
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(800)
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(600)
    const trigger = { getBoundingClientRect: () => ({ left: 100, top: 50, width: 40, height: 20 }) }

    runThemeTransition({ domUpdate: () => {}, trigger, options: { animationType: ThemeAnimationType.CIRCLE } })

    const css = styleNode()!.textContent!
    // 中心 (120, 60)，最远角 (800, 600)：hypot(680, 540) × 2.1
    const endSize = Math.round(Math.hypot(680, 540) * 2.1 * 100) / 100
    expect(css).toContain('mask-position: 120px 60px;')
    expect(css).toContain(`mask-size: ${endSize}px ${endSize}px;`)
  })

  it('没有触发元素时圆心落在视口中心', () => {
    installFakeViewTransition()
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(800)
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(600)

    runThemeTransition({ domUpdate: () => {} })

    expect(styleNode()!.textContent).toContain('mask-position: 400px 300px;')
  })

  it('快速连点：新一轮注入替换旧样式，旧一轮的清理定时器不会误删新样式', async () => {
    const { calls } = installFakeViewTransition({ manualFinish: true })

    const first = runThemeTransition({ domUpdate: () => {}, options: { duration: 100, animationType: ThemeAnimationType.LTR } })
    calls[0]!.finish.resolve()
    await first.finished // 第一轮清理定时器已排期（100ms 后）

    const second = runThemeTransition({ domUpdate: () => {}, options: { duration: 100, animationType: ThemeAnimationType.RTL } })
    expect(document.querySelectorAll(`#${THEME_ANIMATION_STYLE_ID}`)).toHaveLength(1)
    expect(styleNode()!.textContent).toContain('theme-switch-rtl')

    // 第一轮的定时器到点：当前节点已是第二轮的，不得被删
    vi.advanceTimersByTime(100)
    expect(styleNode()).not.toBeNull()
    expect(styleNode()!.textContent).toContain('theme-switch-rtl')

    // 第二轮结束后再过 duration 才清理
    calls[1]!.finish.resolve()
    await second.finished
    vi.advanceTimersByTime(100)
    expect(styleNode()).toBeNull()
  })

  it('domUpdate 抛错：立即移除样式，finished reject 原错误', async () => {
    installFakeViewTransition()
    const error = new Error('render failed')

    const result = runThemeTransition({
      domUpdate: () => {
        throw error
      },
    })

    expect(result.animated).toBe(true)
    await expect(result.finished).rejects.toBe(error)
    expect(styleNode()).toBeNull()
  })

  it('转场被跳过（AbortError，快速连点竞态）：不视为错误，样式已清理', async () => {
    const abort = new DOMException('The view transition was skipped', 'AbortError')
    const startViewTransition = vi.fn(() => ({ finished: Promise.reject(abort) }))
    Object.defineProperty(document, 'startViewTransition', {
      value: startViewTransition,
      configurable: true,
      writable: true,
    })

    const result = runThemeTransition({ domUpdate: () => {} })

    expect(result.animated).toBe(true)
    await expect(result.finished).resolves.toBeUndefined()
    expect(styleNode()).toBeNull()
  })

  it('Safari 形态的 skipped transition（无 name 的 Error）：同样不视为错误', async () => {
    const startViewTransition = vi.fn(() => ({
      finished: Promise.reject(new Error('Transition was skipped because a new transition started')),
    }))
    Object.defineProperty(document, 'startViewTransition', {
      value: startViewTransition,
      configurable: true,
      writable: true,
    })

    const result = runThemeTransition({ domUpdate: () => {} })

    await expect(result.finished).resolves.toBeUndefined()
    expect(styleNode()).toBeNull()
  })

  it('prefers-reduced-motion: reduce 时即便支持 View Transitions 也降级', () => {
    const { startViewTransition } = installFakeViewTransition()
    // jsdom 没有 matchMedia，手动挂一个
    Object.defineProperty(window, 'matchMedia', {
      value: (query: string) => ({ matches: query === '(prefers-reduced-motion: reduce)' }),
      configurable: true,
      writable: true,
    })
    const domUpdate = vi.fn()

    const result = runThemeTransition({ domUpdate })

    expect(result.animated).toBe(false)
    expect(domUpdate).toHaveBeenCalledTimes(1)
    expect(startViewTransition).not.toHaveBeenCalled()
    expect(styleNode()).toBeNull()
  })

  it('jsdom 默认不支持 View Transitions：自动降级并照常更新', () => {
    expect(typeof (document as unknown as Record<string, unknown>).startViewTransition).toBe('undefined')
    const domUpdate = vi.fn()
    expect(runThemeTransition({ domUpdate }).animated).toBe(false)
    expect(domUpdate).toHaveBeenCalledTimes(1)
    expect(styleNode()).toBeNull()
  })
})
