// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { runThemeTransition, SKIP_TRANSITION } from './orchestrate'
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
      options: { animationType: ThemeAnimationType.CIRCLE, duration: 250, easing: 'steps(4)' },
    })

    expect(result.animated).toBe(true)
    expect(startViewTransition).toHaveBeenCalledTimes(1)
    // domUpdate 被包进哨兵检测层（SKIP_TRANSITION 用），不再是裸引用
    expect(startViewTransition).toHaveBeenCalledWith(expect.any(Function))
    expect(domUpdate).toHaveBeenCalledTimes(1)

    const node = styleNode()
    expect(node).not.toBeNull()
    expect(node!.textContent).toContain('--theme-switch-duration: 250ms;')
    expect(node!.textContent).toContain('--theme-switch-easing: steps(4);')
    expect(node!.textContent).toContain('@keyframes theme-switch-circle {')

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
    const endSize = Math.round(Math.hypot(680, 540) * 2.1)
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

  it('REVERT 收起：注入"新层反向蒙版（洞）"CSS——静止蒙版盒子、无 z-index、无 mask-size 关键帧（§附录六）', () => {
    installFakeViewTransition()
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(800)
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(600)
    const trigger = { getBoundingClientRect: () => ({ left: 100, top: 50, width: 40, height: 20 }) }
    // 起始主题为亮色 → toggle 后为暗色？不：hasThemeClass 为 false 时 nextIsDark = true（扩散）。
    // 要拿到收起，先让 <html> 处于暗色。
    document.documentElement.classList.add('dark')

    runThemeTransition({
      domUpdate: () => {},
      trigger,
      options: { animationType: ThemeAnimationType.CIRCLE_REVERT },
    })

    const css = styleNode()!.textContent!
    expect(css).toContain('@property --theme-switch-radius')
    expect(css).toContain('transparent calc(var(--theme-switch-radius) - 0.5px), #000 calc(var(--theme-switch-radius) + 0.5px)')
    expect(css).toContain('mask-size: 100% 100%;')
    expect(css).toContain('mask-position: 0 0;')
    expect(css).not.toContain('z-index')
    // 洞的起始半径 = hypot(680,540) × 2.1 / 2，圆心是触发点中心 (120, 60)
    expect(css).toContain(`--theme-switch-radius: ${(Math.hypot(680, 540) * 2.1) / 2}px;`)
    expect(css).toContain('circle at 120px 60px')
    document.documentElement.classList.remove('dark')
  })

  /**
   * keyframes 名由 `getAnimationName(type)` 按类型生成，所以 `CIRCLE` 与 `CIRCLE_REVERT`
   * 产出的 CSS 不可能逐字节相同——差的就是那一个标识符。比较时把名字归一化掉，
   * 这样"两种写法等价"这条锁仍然成立，且不会误把名字差异当成回归。
   */
  const normalizeName = (css: string) => css.replace(/theme-switch-(circle-revert|circle)/g, '<name>')

  it('CIRCLE + reverse:true 与 CIRCLE_REVERT 收起态产出同一份 CSS（仅 keyframes 名不同）', () => {
    installFakeViewTransition()
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(800)
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(600)
    const trigger = { getBoundingClientRect: () => ({ left: 100, top: 50, width: 40, height: 20 }) }
    document.documentElement.classList.add('dark')

    runThemeTransition({ domUpdate: () => {}, trigger, options: { animationType: ThemeAnimationType.CIRCLE_REVERT } })
    const viaRevert = styleNode()!.textContent!
    removeAnimationStyle(document)

    runThemeTransition({
      domUpdate: () => {},
      trigger,
      options: { animationType: ThemeAnimationType.CIRCLE, reverse: true },
    })
    const viaReverse = styleNode()!.textContent!

    expect(viaReverse).not.toBe(viaRevert)
    expect(normalizeName(viaReverse)).toBe(normalizeName(viaRevert))
    expect(viaReverse).toContain('@property --theme-switch-radius')
    expect(viaReverse).toContain('circle at 120px 60px')
    document.documentElement.classList.remove('dark')
    removeAnimationStyle(document)
  })

  it("CIRCLE + reverse:'auto' 跟随切换方向：切亮收起、切暗正向", () => {
    installFakeViewTransition()
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(800)
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(600)
    const trigger = { getBoundingClientRect: () => ({ left: 100, top: 50, width: 40, height: 20 }) }

    // 切亮（<html> 处于暗色 → toDark = false）：走洞式收起
    document.documentElement.classList.add('dark')
    runThemeTransition({
      domUpdate: () => {},
      trigger,
      options: { animationType: ThemeAnimationType.CIRCLE, reverse: 'auto' },
    })
    const collapsing = styleNode()!.textContent!
    expect(collapsing).toContain('@property --theme-switch-radius')
    removeAnimationStyle(document)

    // 切暗（<html> 无暗色类 → toDark = true）：与完全不传 reverse 的 CIRCLE 一致
    document.documentElement.classList.remove('dark')
    runThemeTransition({
      domUpdate: () => {},
      trigger,
      options: { animationType: ThemeAnimationType.CIRCLE, reverse: 'auto' },
    })
    const expanding = styleNode()!.textContent!
    removeAnimationStyle(document)

    runThemeTransition({ domUpdate: () => {}, trigger, options: { animationType: ThemeAnimationType.CIRCLE } })
    expect(expanding).toBe(styleNode()!.textContent!)
  })

  it('reverse 已接入 FAN：取补串 + 区间反向，keyframes 从周期角度收到 0', () => {
    installFakeViewTransition()
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(800)
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(600)
    const trigger = { getBoundingClientRect: () => ({ left: 100, top: 50, width: 40, height: 20 }) }

    runThemeTransition({
      domUpdate: () => {},
      trigger,
      options: { animationType: ThemeAnimationType.FAN, bladeCount: 8, reverse: true },
    })
    const reversed = styleNode()!.textContent!
    removeAnimationStyle(document)
    runThemeTransition({
      domUpdate: () => {},
      trigger,
      options: { animationType: ThemeAnimationType.FAN, bladeCount: 8 },
    })
    const forward = styleNode()!.textContent!

    // 反向：透明带在前、实心段在后，且 --sweep 从 45deg 起、收到 0deg
    expect(reversed).toContain('transparent 0 var(--theme-switch-sweep)')
    expect(reversed).toContain('--theme-switch-sweep: 45deg;')
    expect(reversed).toContain('--theme-switch-sweep: 0deg;')
    // 正向不该被连带改动：仍是 #000 在前、0 → 45deg
    expect(forward).toContain('#000 0 var(--theme-switch-sweep)')
    expect(forward).not.toContain('transparent 0 var(--theme-switch-sweep)')
    // FAN 反向走的是角度属性，不该把 CIRCLE 的洞式半径属性带进来
    expect(reversed).not.toContain('@property --theme-switch-radius')
  })

  it('reverse 已接入 RIPPLE：补集串 + 起点去掉正向半径余量、终点过冲一整个前缘', () => {
    installFakeViewTransition()
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(800)
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(600)
    const trigger = { getBoundingClientRect: () => ({ left: 100, top: 50, width: 40, height: 20 }) }

    runThemeTransition({
      domUpdate: () => {},
      trigger,
      options: { animationType: ThemeAnimationType.RIPPLE, waveWidth: 18, reverse: true },
    })
    const reversed = styleNode()!.textContent!
    removeAnimationStyle(document)
    runThemeTransition({
      domUpdate: () => {},
      trigger,
      options: { animationType: ThemeAnimationType.RIPPLE, waveWidth: 18 },
    })
    const forward = styleNode()!.textContent!

    // 补集：实心水面换成 transparent 起头，波谷换成 #000
    expect(reversed).toContain('radial-gradient(circle at 120px 60px, transparent 0')
    expect(forward).toContain('radial-gradient(circle at 120px 60px, #000 0')
    // 起点 = 中心到视口最远角 + 一整个前缘（不是正向那个 2.1 倍余量）；终点 = -前缘。
    // 值按源同式推导，别写死——半径是无理数，四舍五入方式一改断言就假红
    const maxR = Math.hypot(800 - 120, 600 - 60)
    const front = 2.5 * 18
    expect(reversed).toContain(`--theme-switch-reveal: ${maxR + front}px;`)
    expect(reversed).toContain(`--theme-switch-reveal: ${-front}px;`)
    expect(reversed).not.toContain(`--theme-switch-reveal: ${2.1 * maxR + front}px;`)
    // 主峰 α=0.5 的补仍是 0.5，但两道余波的 α 必须翻成 0.725 / 0.849
    expect(reversed).toContain('rgba(0, 0, 0, 0.725)')
    expect(reversed).toContain('rgba(0, 0, 0, 0.849)')
    expect(reversed).not.toContain('rgba(0, 0, 0, 0.275)')
  })

  it('reverse 已接入 CLOCK_SWEEP：软尾镜像到内缘，观感即逆时针扫开', () => {
    installFakeViewTransition()
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(800)
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(600)
    const trigger = { getBoundingClientRect: () => ({ left: 100, top: 50, width: 40, height: 20 }) }

    runThemeTransition({
      domUpdate: () => {},
      trigger,
      options: { animationType: ThemeAnimationType.CLOCK_SWEEP, reverse: true },
    })
    const css = styleNode()!.textContent!
    expect(css).toContain('conic-gradient(from 0deg at 120px 60px, transparent 0 calc(var(--theme-switch-sweep) - 12deg)')
    expect(css).toContain('--theme-switch-sweep: 372deg;')
    expect(css).toContain('--theme-switch-sweep: 0deg;')
  })

  it('reverse 已接入 CURTAIN：两层 add 各从屏幕边缘向中线合拢，两端各留一个软边', () => {
    installFakeViewTransition()
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(800)
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(600)

    runThemeTransition({
      domUpdate: () => {},
      options: { animationType: ThemeAnimationType.CURTAIN, reverse: true },
    })
    const reversed = styleNode()!.textContent!
    removeAnimationStyle(document)
    runThemeTransition({
      domUpdate: () => {},
      options: { animationType: ThemeAnimationType.CURTAIN },
    })
    const forward = styleNode()!.textContent!

    // 两层：90deg 左板 + 270deg 右板，size / repeat 都是两项逗号列表
    expect(reversed).toContain('linear-gradient(90deg, #000 0 var(--theme-switch-reveal)')
    expect(reversed).toContain('linear-gradient(270deg, #000 0 var(--theme-switch-reveal)')
    expect(reversed).toContain('mask-size: 100% 100%, 100% 100%;')
    expect(reversed).toContain('mask-repeat: no-repeat, no-repeat;')
    // from = -软边（首帧两板整体在屏外）、to = 半屏 + 软边（两板都越过中线）
    expect(reversed).toContain('--theme-switch-reveal: -24px;')
    expect(reversed).toContain('--theme-switch-reveal: 424px;')
    // 正向仍是那条居中对称的三段渐变，没被连带改动
    expect(forward).toContain('#000 calc(50% - var(--theme-switch-reveal) / 2) calc(50% + var(--theme-switch-reveal) / 2)')
    expect(forward).toContain('mask-repeat: no-repeat;')
    expect(forward).not.toContain('270deg')
  })

  it('reverse 未接入的类型传 true 也静默无效：QR_GRID / BLINDS / SCAN 输出不变', () => {
    installFakeViewTransition()
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(800)
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(600)
    const trigger = { getBoundingClientRect: () => ({ left: 100, top: 50, width: 40, height: 20 }) }

    for (const animationType of [
      ThemeAnimationType.QR_GRID, ThemeAnimationType.BLINDS, ThemeAnimationType.SCAN,
    ]) {
      runThemeTransition({ domUpdate: () => {}, trigger, options: { animationType } })
      const baseline = styleNode()!.textContent!
      removeAnimationStyle(document)
      runThemeTransition({ domUpdate: () => {}, trigger, options: { animationType, reverse: true } })
      expect(styleNode()!.textContent!).toBe(baseline)
      removeAnimationStyle(document)
    }
  })

  it('BLINDS：注入"注册属性 + 叶片平铺蒙版"CSS，direction / slatWidth 选项生效', () => {
    installFakeViewTransition()
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(800)
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(600)

    runThemeTransition({
      domUpdate: () => {},
      options: { animationType: ThemeAnimationType.BLINDS, direction: 'rtl', slatWidth: 100 },
    })

    const css = styleNode()!.textContent!
    expect(css).toContain('@property --theme-switch-reveal')
    // RTL：渐变角 270deg；叶片 100px 平铺；软边 = round(100 × 0.28) = 20（上限）
    expect(css).toContain('linear-gradient(270deg, #000 0 var(--theme-switch-reveal), transparent calc(var(--theme-switch-reveal) + 20px))')
    expect(css).toContain('mask-size: 100px 100%;')
    expect(css).toContain('mask-repeat: repeat;')
    expect(css).toContain('--theme-switch-reveal: -20px;')
    expect(css).toContain('--theme-switch-reveal: 100px;')
    // 触发点无关：不消费 center，也没有 mask-size / mask-position 关键帧
    expect(css).not.toContain('mask-position: 400px')
    document.documentElement.classList.remove('dark')
  })

  it('SCAN：光束蒙版终值 = 推进轴视口长 + 光束总宽；direction 切轴', () => {
    installFakeViewTransition()
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(800)
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(600)

    runThemeTransition({
      domUpdate: () => {},
      options: { animationType: ThemeAnimationType.SCAN, direction: 'ttb' },
    })

    const css = styleNode()!.textContent!
    expect(css).toContain('linear-gradient(180deg')
    expect(css).toContain('mask-size: 100% 100%;')
    expect(css).toContain('mask-repeat: no-repeat;')
    // TTB 沿 y 轴推进：600 + 12 + 4
    expect(css).toContain('--theme-switch-reveal: 616px;')
  })

  it('CURTAIN：走 px 族同一生成器，中线对称三段渐变、终值 = 视口宽 + 2×软边', () => {
    installFakeViewTransition()
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(800)
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(600)

    runThemeTransition({
      domUpdate: () => {},
      options: { animationType: ThemeAnimationType.CURTAIN, direction: 'ttb' },
    })

    const css = styleNode()!.textContent!
    expect(css).toContain('@property --theme-switch-reveal')
    expect(css).toContain('syntax: "<length>"')
    expect(css).toContain('linear-gradient(90deg, transparent calc(50% - var(--theme-switch-reveal) / 2 - 24px)')
    expect(css).toContain('#000 calc(50% - var(--theme-switch-reveal) / 2) calc(50% + var(--theme-switch-reveal) / 2)')
    expect(css).toContain('mask-size: 100% 100%;')
    expect(css).toContain('mask-repeat: no-repeat;')
    // 800 + 2 × 24：两条软边都推出画面才算盖满
    expect(css).toContain('--theme-switch-reveal: 848px;')
    // direction 被忽略：渐变角恒为 90deg（水平轴）
    expect(css).not.toContain('linear-gradient(180deg')
  })

  it('CLOCK_SWEEP：注册属性改用 <angle> 的 SWEEP_VAR，keyframes 值带 deg 后缀', () => {
    installFakeViewTransition()
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(800)
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(600)
    const trigger = { getBoundingClientRect: () => ({ left: 100, top: 50, width: 40, height: 20 }) }

    runThemeTransition({
      domUpdate: () => {},
      trigger,
      options: { animationType: ThemeAnimationType.CLOCK_SWEEP },
    })

    const css = styleNode()!.textContent!
    // 与 px 族同名注册会因 syntax 不可改而非法，故必须另起一名
    expect(css).toContain('@property --theme-switch-sweep')
    expect(css).toContain('syntax: "<angle>"')
    expect(css).toContain('initial-value: 0deg')
    expect(css).not.toContain('@property --theme-switch-reveal')
    // 轴心 = 触发点中心；实心段止于 sweep-12°、软尾到 sweep
    expect(css).toContain('conic-gradient(from 0deg at 120px 60px')
    expect(css).toContain('#000 0 calc(var(--theme-switch-sweep) - 12deg)')
    // 0deg → 372deg：末帧实心段止于整周，与视口尺寸无关
    expect(css).toContain('--theme-switch-sweep: 0deg;')
    expect(css).toContain('--theme-switch-sweep: 372deg;')
    expect(css).toContain('mask-size: 100% 100%;')
    expect(css).toContain('mask-repeat: no-repeat;')
  })

  it('FAN：repeating-conic 扇叶周期 = 360 / bladeCount，bladeCount 选项生效', () => {
    installFakeViewTransition()
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(800)
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(600)

    runThemeTransition({
      domUpdate: () => {},
      options: { animationType: ThemeAnimationType.FAN, bladeCount: 6 },
    })

    const css = styleNode()!.textContent!
    expect(css).toContain('syntax: "<angle>"')
    expect(css).toContain('repeating-conic-gradient(from 0deg at 400px 300px')
    expect(css).toContain('transparent var(--theme-switch-sweep) 60deg)')
    // 无 trigger 时轴心回落视口中心；末帧 open 到周期末 60° 即拼成整圆
    expect(css).toContain('--theme-switch-sweep: 60deg;')
  })

  it('RIPPLE：复用静止蒙版盒子生成器，但 radial-gradient 圆心取触发点、waveWidth 决定环带间距', () => {
    installFakeViewTransition()
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(800)
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(600)
    const trigger = { getBoundingClientRect: () => ({ left: 100, top: 50, width: 40, height: 20 }) }

    runThemeTransition({
      domUpdate: () => {},
      trigger,
      options: { animationType: ThemeAnimationType.RIPPLE, waveWidth: 18 },
    })

    const css = styleNode()!.textContent!
    expect(css).toContain('@property --theme-switch-reveal')
    // 与 BLINDS / SCAN 同一机制：蒙版盒子完全静止，逐帧只有注册属性在动
    expect(css).toContain('mask-size: 100% 100%;')
    expect(css).toContain('mask-position: 0 0;')
    expect(css).toContain('mask-repeat: no-repeat;')
    expect(css).not.toContain('z-index')
    // 与 BLINDS / SCAN 的关键差别：RIPPLE 消费 center，波源钉在触发点中心 (120, 60)
    expect(css).toContain('radial-gradient(circle at 120px 60px')
    // 环带：实心水面止于 R−18px、主波峰在 R、最外圈波谷即前缘 R+45px
    expect(css).toContain('#000 0 calc(var(--theme-switch-reveal) - 18px)')
    expect(css).toContain('rgba(0, 0, 0, 0.5) var(--theme-switch-reveal)')
    expect(css).toContain('transparent calc(var(--theme-switch-reveal) + 45px)')
    // 终值 = CIRCLE 终半径 + 前缘外沿，保证末帧实心段盖满视口最远角
    expect(css).toContain('--theme-switch-reveal: 0px;')
    expect(css).toContain(`--theme-switch-reveal: ${Math.hypot(680, 540) * 2.1 + 45}px;`)
  })

  it('QR_GRID：蒙版挂新层的方块格子双层，@supports 增强 intersect，无 z-index', () => {
    installFakeViewTransition()
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(800)
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(600)

    runThemeTransition({
      domUpdate: () => {},
      options: { animationType: ThemeAnimationType.QR_GRID },
    })

    const css = styleNode()!.textContent!
    expect(css).toContain('@property --theme-switch-reveal')
    expect(css).toContain('mask-composite: intersect;')
    expect(css).toContain('@supports (mask-composite: intersect)')
    expect(css).not.toContain('z-index')
    // from = -2×软边（-36），to = 格距 64
    expect(css).toContain('--theme-switch-reveal: -36px;')
    expect(css).toContain('--theme-switch-reveal: 64px;')
    expect(css).toContain('@keyframes theme-switch-qr-grid')
  })

  it('快速连点：新一轮注入替换旧样式，旧一轮的清理定时器不会误删新样式', async () => {
    const { calls } = installFakeViewTransition({ manualFinish: true })

    const first = runThemeTransition({ domUpdate: () => {}, options: { duration: 100, animationType: ThemeAnimationType.CIRCLE } })
    calls[0]!.finish.resolve()
    await first.finished // 第一轮清理定时器已排期（100ms 后）

    const second = runThemeTransition({ domUpdate: () => {}, options: { duration: 100, animationType: ThemeAnimationType.STAR } })
    expect(document.querySelectorAll(`#${THEME_ANIMATION_STYLE_ID}`)).toHaveLength(1)
    expect(styleNode()!.textContent).toContain('theme-switch-star')

    // 第一轮的定时器到点：当前节点已是第二轮的，不得被删
    vi.advanceTimersByTime(100)
    expect(styleNode()).not.toBeNull()
    expect(styleNode()!.textContent).toContain('theme-switch-star')

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

  it('跳过竞态身份守卫：旧转场以 AbortError 结算时，不得误删新一轮注入的样式（闪屏修复）', async () => {
    const { calls } = installFakeViewTransition({ manualFinish: true })

    const first = runThemeTransition({ domUpdate: () => {}, options: { duration: 100, animationType: ThemeAnimationType.CIRCLE } })
    // 第二轮点击：注入已替换第一轮的节点
    const second = runThemeTransition({ domUpdate: () => {}, options: { duration: 100, animationType: ThemeAnimationType.STAR } })
    expect(styleNode()!.textContent).toContain('theme-switch-star')

    // 浏览器跳过第一轮 → finished 以 AbortError 结算；此时 id 上是第二轮的样式，不得被删
    calls[0]!.finish.reject(new DOMException('The view transition was skipped', 'AbortError'))
    await expect(first.finished).resolves.toBeUndefined()
    expect(styleNode()).not.toBeNull()
    expect(styleNode()!.textContent).toContain('theme-switch-star')

    calls[1]!.finish.resolve()
    await second.finished
    vi.advanceTimersByTime(100)
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

describe('runThemeTransition 新增行为（哨兵 / 跨文档清理 / 显式方向）', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    removeAnimationStyle(document)
    delete (document as unknown as Record<string, unknown>).startViewTransition
    vi.restoreAllMocks()
  })

  it('domUpdate 返回 SKIP_TRANSITION：立即调用 skipTransition，跳过结算不视为错误且样式即时清理', async () => {
    const skipTransition = vi.fn()
    const startViewTransition = vi.fn((update: DomUpdate): ViewTransitionLike => {
      void update()
      return { finished: Promise.reject(new DOMException('skipped', 'AbortError')), skipTransition }
    })
    Object.defineProperty(document, 'startViewTransition', {
      value: startViewTransition,
      configurable: true,
      writable: true,
    })

    const result = runThemeTransition({
      domUpdate: () => {
        // 模拟受控模式超时未同步
        return Promise.resolve(SKIP_TRANSITION)
      },
    })

    // wrapped 内有 await：skip 发生在 domUpdate 结算后的微任务里
    await result.finished
    expect(skipTransition).toHaveBeenCalledTimes(1)
    // 哨兵主动 skip → finished 以 AbortError 形态结算，不视为错误
    await expect(result.finished).resolves.toBeUndefined()
    expect(styleNode()).toBeNull()
  })

  it('domUpdate 正常结算值（true/false）：不触发 skipTransition', () => {
    const skipTransition = vi.fn()
    const startViewTransition = vi.fn((update: DomUpdate): ViewTransitionLike => {
      void update()
      return { finished: Promise.resolve(), skipTransition }
    })
    Object.defineProperty(document, 'startViewTransition', {
      value: startViewTransition,
      configurable: true,
      writable: true,
    })

    runThemeTransition({ domUpdate: () => Promise.resolve(false) })
    expect(skipTransition).not.toHaveBeenCalled()
  })

  it('跨文档：docB 的转场清理不会取消 docA 的待清理定时器（iframe / 多窗口场景）', async () => {
    const { calls, startViewTransition } = installFakeViewTransition({ manualFinish: true })
    const docA = document as Document
    const docB = document.implementation.createHTMLDocument('b')
    // docB 也装上同一 mock：两个 document 各自走完整的转场 + 清理
    Object.defineProperty(docB, 'startViewTransition', {
      value: startViewTransition,
      configurable: true,
      writable: true,
    })

    const first = runThemeTransition({
      domUpdate: () => {},
      doc: docA,
      options: { duration: 100, animationType: ThemeAnimationType.CIRCLE },
    })
    calls[0]!.finish.resolve()
    await first.finished

    // docB 排上自己的清理定时器：不得把 docA 的 clear 掉
    const second = runThemeTransition({
      domUpdate: () => {},
      doc: docB,
      options: { duration: 100, animationType: ThemeAnimationType.CIRCLE },
    })
    calls[1]!.finish.resolve()
    await second.finished

    vi.advanceTimersByTime(100)
    // 两个文档的样式都按各自的定时器清理，无残留
    expect(docA.querySelector(`style#${THEME_ANIMATION_STYLE_ID}`)).toBeNull()
    expect(docB.querySelector(`style#${THEME_ANIMATION_STYLE_ID}`)).toBeNull()
  })

  it('nextIsDark 显式传入时方向以它为准，不从 html class 反推（受控 + data-theme 系统）', () => {
    installFakeViewTransition()
    // html 处于暗色（收起方向），但受控调用方声明本次是切到暗色 → 应走扩散
    document.documentElement.classList.add('dark')

    runThemeTransition({
      domUpdate: () => {},
      nextIsDark: true,
      options: { animationType: ThemeAnimationType.CIRCLE_REVERT },
    })

    // 扩散方向：蒙版挂新层、无洞式 CSS
    const css = styleNode()!.textContent!
    expect(css).not.toContain('@property --theme-switch-radius')
    expect(css.match(/::view-transition-new\(root\)\s*\{/g)).toHaveLength(2)
    expect(css).not.toContain('z-index')
    document.documentElement.classList.remove('dark')
  })

  it('startViewTransition 同步抛错：回滚样式，domUpdate 仍执行一次（降级语义），错误冒泡', () => {
    const error = new Error('engine broken')
    const startViewTransition = vi.fn(() => {
      throw error
    })
    Object.defineProperty(document, 'startViewTransition', {
      value: startViewTransition,
      configurable: true,
      writable: true,
    })
    const domUpdate = vi.fn()

    expect(() => runThemeTransition({ domUpdate })).toThrow(error)
    expect(styleNode()).toBeNull()
    expect(domUpdate).toHaveBeenCalledTimes(1)
  })

  it('页面存在同 id 的非 style 元素：注入/清理不误删用户节点', () => {
    installFakeViewTransition()
    const impostor = document.createElement('div')
    impostor.id = THEME_ANIMATION_STYLE_ID
    document.body.appendChild(impostor)
    // 断言用 style 限定查询，绕开撞名 div 让 getElementById 先命中它的事实
    const queryStyle = () => document.querySelector(`style#${THEME_ANIMATION_STYLE_ID}`)

    try {
      runThemeTransition({ domUpdate: () => {} })
      expect(queryStyle()).not.toBeNull() // 库自己的 <style> 正常注入
      expect(impostor.isConnected).toBe(true) // 撞名元素未被删除

      removeAnimationStyle(document)
      expect(queryStyle()).toBeNull()
      expect(impostor.isConnected).toBe(true)
    } finally {
      impostor.remove()
    }
  })
})

describe('CIRCLE_REVERT 废弃提示', () => {
  /**
   * 提示位是 orchestrate 的模块级变量，同文件里前面的用例已经把 CIRCLE_REVERT 跑过一遍，
   * 直接断言会被"已经提示过了"污染。所以这里 resetModules + 动态 import 拿一份全新实例，
   * 让"只提示一次"这条能被干净地验证。
   */
  async function freshOrchestrate() {
    vi.resetModules()
    return await import('./orchestrate')
  }

  beforeEach(() => {
    // 与其它用例一致：样式清理走 setTimeout，冻结住不让它在断言前触发
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.useRealTimers()
    removeAnimationStyle(document)
  })

  it('开发环境下提示一次；同一页反复切换不重复刷日志', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    installFakeViewTransition()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { runThemeTransition: run } = await freshOrchestrate()

    document.documentElement.classList.add('dark')
    try {
      run({ domUpdate: () => {}, options: { animationType: ThemeAnimationType.CIRCLE_REVERT } })
      removeAnimationStyle(document)
      run({ domUpdate: () => {}, options: { animationType: ThemeAnimationType.CIRCLE_REVERT } })

      expect(warn).toHaveBeenCalledTimes(1)
      expect(warn.mock.calls[0][0]).toContain('CIRCLE_REVERT')
      expect(warn.mock.calls[0][0]).toContain("reverse: 'auto'")
    } finally {
      document.documentElement.classList.remove('dark')
      warn.mockRestore()
    }
  })

  it('非开发环境完全静默', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    installFakeViewTransition()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { runThemeTransition: run } = await freshOrchestrate()

    document.documentElement.classList.add('dark')
    try {
      run({ domUpdate: () => {}, options: { animationType: ThemeAnimationType.CIRCLE_REVERT } })
      expect(warn).not.toHaveBeenCalled()
    } finally {
      document.documentElement.classList.remove('dark')
      warn.mockRestore()
    }
  })

  it('改用 CIRCLE + reverse 不触发任何提示', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    installFakeViewTransition()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { runThemeTransition: run } = await freshOrchestrate()

    document.documentElement.classList.add('dark')
    try {
      run({ domUpdate: () => {}, options: { animationType: ThemeAnimationType.CIRCLE, reverse: 'auto' } })
      expect(warn).not.toHaveBeenCalled()
    } finally {
      document.documentElement.classList.remove('dark')
      warn.mockRestore()
    }
  })
})
