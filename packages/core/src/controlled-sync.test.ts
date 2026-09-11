// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { THEME_SYNC_TIMEOUT_MS, waitForThemeSync } from './controlled-sync'

const html = () => document.documentElement

/** fake timers 下：推进 0ms 排空微任务（MutationObserver 回调），且不影响 300ms 兜底计时 */
const flushUnderFakeTimers = () => vi.advanceTimersByTimeAsync(0)

describe('waitForThemeSync（受控模式同步协议 §5.4）', () => {
  beforeEach(() => {
    html().className = ''
    html().removeAttribute('data-theme')
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('默认兜底超时为 300ms', () => {
    expect(THEME_SYNC_TIMEOUT_MS).toBe(300)
  })

  it('目标状态已达成：立即 resolve(true)，不建立观察', async () => {
    html().className = 'dark'
    const observe = vi.spyOn(MutationObserver.prototype, 'observe')
    await expect(waitForThemeSync({ doc: document, darkClassName: 'dark', nextIsDark: true })).resolves.toBe(true)
    expect(observe).not.toHaveBeenCalled()
  })

  it('class 翻转到期望状态：及时 resolve(true)', async () => {
    const promise = waitForThemeSync({ doc: document, darkClassName: 'dark', nextIsDark: true })
    const settled = vi.fn()
    promise.then(settled)

    html().classList.add('dark')
    await expect(promise).resolves.toBe(true)
    expect(settled).toHaveBeenCalledTimes(1)
  })

  it('class 移除（暗→亮）也算翻转', async () => {
    html().className = 'dark'
    const promise = waitForThemeSync({ doc: document, darkClassName: 'dark', nextIsDark: false })
    html().classList.remove('dark')
    await expect(promise).resolves.toBe(true)
  })

  it('data-* 属性变化：resolve(true)（data-theme 写入模式）', async () => {
    const promise = waitForThemeSync({ doc: document, darkClassName: 'dark', nextIsDark: true })
    html().setAttribute('data-theme', 'dark')
    await expect(promise).resolves.toBe(true)
  })

  it('非主题属性（style 等）变化不触发，超时后 resolve(false)', async () => {
    vi.useFakeTimers()
    const promise = waitForThemeSync({ doc: document, darkClassName: 'dark', nextIsDark: true })
    const settled = vi.fn()
    promise.then(settled)

    html().style.color = 'red'
    await flushUnderFakeTimers()
    expect(settled).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(THEME_SYNC_TIMEOUT_MS)
    expect(settled).toHaveBeenCalledWith(false)
    await expect(promise).resolves.toBe(false)
  })

  it('外部系统不写 DOM：300ms 超时兜底 resolve(false)，不悬挂', async () => {
    vi.useFakeTimers()
    const promise = waitForThemeSync({ doc: document, darkClassName: 'dark', nextIsDark: true })
    const settled = vi.fn()
    promise.then(settled)

    await vi.advanceTimersByTimeAsync(THEME_SYNC_TIMEOUT_MS - 1)
    expect(settled).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    expect(settled).toHaveBeenCalledWith(false)
    await expect(promise).resolves.toBe(false)
  })

  it('超时值可配置', async () => {
    vi.useFakeTimers()
    const promise = waitForThemeSync({ doc: document, darkClassName: 'dark', nextIsDark: true, timeoutMs: 50 })
    const settled = vi.fn()
    promise.then(settled)

    await vi.advanceTimersByTimeAsync(49)
    expect(settled).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(settled).toHaveBeenCalledWith(false)
  })

  it('超时后 observer 断开：迟到的 class 变化不再触发', async () => {
    vi.useFakeTimers()
    const promise = waitForThemeSync({ doc: document, darkClassName: 'dark', nextIsDark: true })
    const settled = vi.fn()
    promise.then(settled)

    await vi.advanceTimersByTimeAsync(THEME_SYNC_TIMEOUT_MS)
    await expect(promise).resolves.toBe(false)

    html().classList.add('dark')
    await flushUnderFakeTimers()
    expect(settled).toHaveBeenCalledTimes(1)
  })

  it('外部系统异常（从不写 class）时：超时降级，dev 环境给出可观测告警', async () => {
    vi.useFakeTimers()
    const proc = (globalThis as unknown as { process: { env: { NODE_ENV?: string } } }).process
    const originalNodeEnv = proc.env.NODE_ENV
    proc.env.NODE_ENV = 'development'
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const promise = waitForThemeSync({ doc: document, darkClassName: 'dark', nextIsDark: true })
    await vi.advanceTimersByTimeAsync(THEME_SYNC_TIMEOUT_MS)
    await expect(promise).resolves.toBe(false)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('降级为无动画直切'))

    proc.env.NODE_ENV = originalNodeEnv
  })

  it('无 MutationObserver 的环境：立即 resolve(false) 不悬挂', async () => {
    vi.stubGlobal('MutationObserver', undefined)
    await expect(waitForThemeSync({ doc: document, darkClassName: 'dark', nextIsDark: true })).resolves.toBe(false)
  })

  it('快速连点：并发的多个等待互不干扰，各自结算', async () => {
    vi.useFakeTimers()
    const first = waitForThemeSync({ doc: document, darkClassName: 'dark', nextIsDark: true })
    const second = waitForThemeSync({ doc: document, darkClassName: 'dark', nextIsDark: true })

    html().classList.add('dark')
    await flushUnderFakeTimers()
    // 两个等待可能被同一次翻转结算（外部已到达目标态）
    await expect(Promise.all([first, second])).resolves.toEqual([true, true])

    // 目标态已就位的新等待立即返回；反向等待则等下一次翻转
    await expect(waitForThemeSync({ doc: document, darkClassName: 'dark', nextIsDark: true })).resolves.toBe(true)
    const back = waitForThemeSync({ doc: document, darkClassName: 'dark', nextIsDark: false })
    html().classList.remove('dark')
    await flushUnderFakeTimers()
    await expect(back).resolves.toBe(true)
  })
})
