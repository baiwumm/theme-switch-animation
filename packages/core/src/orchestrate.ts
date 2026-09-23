import {
  getCircleRevertHoleGeometry,
  getMaskGeometry,
  getQrGridMaskSpec,
  getRevealMaskSpec,
  getRippleRevealSpec,
  getTriggerCenter,
  isQrGridAnimationType,
  isRevealAnimationType,
  isRippleAnimationType,
} from './masks'
import type { RectProvider, Size } from './masks'
import { buildAnimationCSS, injectAnimationStyle, removeAnimationStyle } from './styles'
import { ThemeAnimationType, resolveAnimationOptions } from './types'
import type { ThemeAnimationOptions } from './types'
import { hasThemeClass } from './uncontrolled'

/** 最小 ViewTransition 结构，不依赖特定版本 lib.dom 的声明 */
export interface ViewTransitionLike {
  finished: Promise<void>
  ready?: Promise<void>
  updateCallbackDone?: Promise<void>
  skipTransition?: () => void
}

/**
 * `domUpdate` 返回此哨兵表示"新截图尚未就绪，继续转场只会拍到旧主题"——
 * `runThemeTransition` 会立即 `skipTransition()`，把动画让位给无动画直切
 * （状态已由 domUpdate 落地，跳过的只是视觉效果）。
 */
export const SKIP_TRANSITION = Symbol.for('theme-switch-animation.skip-transition')

/** `domUpdate` 允许的返回值：任意 Promise（浏览器只等它结算，返回值被忽略），或 SKIP_TRANSITION */
export type DomUpdateResult = unknown | typeof SKIP_TRANSITION

export type DomUpdate = () => void | DomUpdateResult | Promise<DomUpdateResult>

type DocumentWithViewTransition = Document & {
  startViewTransition: (update: DomUpdate) => ViewTransitionLike
}

export interface RunThemeTransitionParams {
  /** 在转场回调内执行的 DOM 更新；降级时也会被原样调用，保证状态永远正确 */
  domUpdate: DomUpdate
  /** 动画参数，缺省项使用默认值 */
  options?: ThemeAnimationOptions
  /** 触发元素，CIRCLE 以其中心为圆心；缺省用视口中心 */
  trigger?: RectProvider | null
  /**
   * 目标 document。缺省取全局 `document`；SSR 下没有 `document`（或显式传 `null`）
   * 会直接走降级路径。
   */
  doc?: Document | null
  /**
   * 本次切换的目标暗色状态（CIRCLE_REVERT 方向感知用）。缺省按非受控契约推导：
   * 转场前 `<html>` 的类名即当前主题，toggle 后必为取反。
   * 受控模式下外部系统可能写 `data-theme` 而非 class，或状态与 class 短暂不同步，
   * 调用方已知 `next = !isDark`，应显式传入而不是让 core 从 class 反推。
   */
  nextIsDark?: boolean
}

export interface RunThemeTransitionResult {
  /** 是否真正启动了 View Transition；`false` 表示已降级为无动画直切 */
  animated: boolean
  /** 转场结束（降级时为 `domUpdate` 完成）。`domUpdate` 抛错时 reject */
  finished: Promise<void>
}

export function supportsViewTransition(doc: Document | null | undefined): doc is DocumentWithViewTransition {
  return !!doc && typeof (doc as Partial<DocumentWithViewTransition>).startViewTransition === 'function'
}

export function prefersReducedMotion(win: Pick<Window, 'matchMedia'> | null | undefined): boolean {
  if (!win || typeof win.matchMedia !== 'function') return false
  try {
    return win.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/** 降级判定：SSR、无 `startViewTransition`、`prefers-reduced-motion: reduce` 任一命中即跳过动画 */
export function shouldSkipTransition(doc: Document | null | undefined): boolean {
  if (!supportsViewTransition(doc)) return true
  return prefersReducedMotion(doc.defaultView)
}

export function getViewportSize(doc: Document): Size {
  const win = doc.defaultView
  return {
    width: win?.innerWidth ?? doc.documentElement.clientWidth,
    height: win?.innerHeight ?? doc.documentElement.clientHeight,
  }
}

/** 每个文档至多一个待清理定时器；跨文档（iframe / 多窗口）互不清除对方的 */
const pendingCleanups = new WeakMap<Document, ReturnType<typeof setTimeout>>()

/**
 * 转场结束后延迟 `duration` 再移除样式。只清理自己注入的那个节点：
 * 若期间已有新一轮转场重新注入，旧定时器不得误删新样式。
 */
function scheduleCleanup(doc: Document, delay: number, node: HTMLStyleElement): void {
  const previous = pendingCleanups.get(doc)
  if (previous !== undefined) clearTimeout(previous)
  const timer = setTimeout(() => {
    if (pendingCleanups.get(doc) === timer) pendingCleanups.delete(doc)
    // 身份用节点引用判定：注入从不复用旧节点，新一轮注入会先 removeAnimationStyle
    // 把旧节点摘下（isConnected = false），此处自然跳过，免疫与页面元素撞 id 的误删
    if (node.isConnected) removeAnimationStyle(doc)
  }, delay)
  pendingCleanups.set(doc, timer)
}

/** 立即清掉 doc 的待清理定时器（新一轮转场已接管样式时，旧定时器不再有意义） */
function cancelCleanup(doc: Document): void {
  const timer = pendingCleanups.get(doc)
  if (timer !== undefined) {
    clearTimeout(timer)
    pendingCleanups.delete(doc)
  }
}

function resolveDocument(doc: Document | null | undefined): Document | null {
  if (doc !== undefined) return doc
  return typeof document === 'undefined' ? null : document
}

/**
 * 转场被跳过时浏览器以 AbortError（DOMException，name === 'AbortError'）结算 finished。
 * Safari 的 view transition 实现不置 name（领域内已知差异），同时兜底匹配消息文本。
 * 不用 instanceof（Error / DOMException）：jsdom 等环境的 DOMException 不继承全局 Error，
 * 且跨 realm 的 instanceof 不可靠，只按结构判断。
 */
function isSkippedTransitionError(error: unknown): boolean {
  if (error === null || typeof error !== 'object') return false
  const name = (error as { name?: unknown }).name
  if (typeof name === 'string' && name === 'AbortError') return true
  const message = (error as { message?: unknown }).message
  return typeof message === 'string' && /transition.*skip|skip.*transition/i.test(message)
}

/**
 * 编排一次主题切换：
 * - 可以动画：注入样式 → `startViewTransition(wrapped)` → 结束后清理样式；
 * - 需要降级：直接调用 `domUpdate`，状态照常更新，只是没有动画。
 *
 * `domUpdate` 返回 `SKIP_TRANSITION` 时（新截图尚未就绪），立即 `skipTransition()`
 * 让动画让位给直切——状态已经落地，直切是此时唯一不产生"旧→旧"空转动画的处理。
 */
export function runThemeTransition(params: RunThemeTransitionParams): RunThemeTransitionResult {
  const { domUpdate, trigger, nextIsDark } = params
  const doc = resolveDocument(params.doc)
  const resolved = resolveAnimationOptions(params.options)

  if (!supportsViewTransition(doc) || prefersReducedMotion(doc.defaultView)) {
    return { animated: false, finished: Promise.resolve(domUpdate()).then(() => undefined) }
  }

  const viewport = getViewportSize(doc)
  const center = getTriggerCenter(trigger, viewport)
  // 方向感知（CIRCLE_REVERT §7）：nextIsDark 显式传入（受控模式调用方已知 next = !isDark）；
  // 缺省按非受控契约推导——转场前 <html> 的类名即当前（旧）主题，toggle 后必为取反——
  // 切到暗色 = 暗色圆扩散（新截图层），切回亮色 = 暗色圆收起（旧截图层）。
  const toDark = nextIsDark ?? !hasThemeClass(doc, resolved.darkClassName)
  const isRevert = resolved.animationType === ThemeAnimationType.CIRCLE_REVERT
  const revertDirection = isRevert ? (toDark ? 'expand' : 'collapse') : undefined
  // 收起方向：蒙版挂新截图层、掏一个收缩的"洞"（层序与 CIRCLE 一致，不需要给旧层 z-index），
  // 蒙版盒子静止、只有注册半径在动（详见 §附录六）。
  const holeGeometry = isRevert && revertDirection === 'collapse' ? getCircleRevertHoleGeometry(center, viewport) : undefined
  // 属性驱动揭开（BLINDS / SCAN / RIPPLE）：蒙版盒子静止、注册属性在动，共用同一 CSS 生成器。
  // BLINDS / SCAN 无触发点；RIPPLE 以触发点为波源中心（见 masks.ts RevealMaskSpec）。
  const reveal = isRevealAnimationType(resolved.animationType)
    ? getRevealMaskSpec(resolved.animationType, resolved.direction, resolved.slatWidth, viewport)
    : isRippleAnimationType(resolved.animationType)
      ? getRippleRevealSpec(center, viewport, resolved.waveWidth)
      : undefined
  // QR_GRID：新层"列 ∩ 行"方块格子双层蒙版，同样无触发点。
  const qrGrid = isQrGridAnimationType(resolved.animationType)
    ? getQrGridMaskSpec(resolved.direction)
    : undefined
  const geometry = reveal || qrGrid ? undefined : getMaskGeometry(resolved.animationType, center, viewport, resolved.blurAmount)
  const css = buildAnimationCSS({
    animationType: resolved.animationType,
    geometry,
    reveal,
    qrGrid,
    revertDirection,
    holeGeometry,
    duration: resolved.duration,
    easing: resolved.easing,
  })
  const node = injectAnimationStyle(doc, css)

  // 包一层：捕获 domUpdate 的结算值。SKIP_TRANSITION 表示新截图尚未就绪（外部主题系统
  // 超时未写入），此时浏览器结算回调后照样截图、播放一段"旧→旧"的空转动画——检测到哨兵
  // 当场调用 skipTransition 让位给无动画直切。回调是异步调用的，此刻 transition 已赋值；
  // skip 对已结束的转场是 no-op，快速连点下前一轮已被浏览器自动跳过也不会出错。
  let transition: ViewTransitionLike | undefined
  const wrapped: DomUpdate = async () => {
    const result = await domUpdate()
    if (result === SKIP_TRANSITION) transition?.skipTransition?.()
  }

  try {
    transition = doc.startViewTransition(wrapped)
  } catch (error) {
    // 个别环境的 startViewTransition 可能同步抛错：回滚样式并按降级语义处理——
    // 同步调用一次 domUpdate 让状态落地，错误原样冒泡给调用方。
    removeAnimationStyle(doc)
    domUpdate()
    throw error
  }

  const finished = transition.finished.then(
    () => {
      scheduleCleanup(doc, resolved.duration, node)
    },
    (error: unknown) => {
      // 只清理自己注入的那个节点：跳过竞态下本转场结算时，固定 id 上挂的已是
      // 新一轮注入的样式——误删会让新转场裸奔（UA 默认交叉淡入淡出 + plus-lighter
      // 叠加发白），表现为屏幕闪动一下。引用判定：旧节点已被新一轮注入摘下时
      // isConnected 为 false，自然跳过。
      if (node.isConnected) {
        cancelCleanup(doc)
        removeAnimationStyle(doc)
      }
      // 快速连点时浏览器会跳过未完成的转场（finished 以 AbortError 结算），哨兵主动
      // skip 也走同一形态。这是正常路径：状态已由 domUpdate 落地，跳过只影响视觉效果。
      if (isSkippedTransitionError(error)) return
      throw error
    },
  )
  // 适配层可能不消费 finished：库内挂一个静默 catch，避免潜在 rejection 变成全局
  // unhandledrejection 噪音；显式消费方（适配层 / 用户 await）仍能拿到 rejection。
  // ready / updateCallbackDone 同理——规范上转场被跳过 / 回调抛错时它们也会 reject
  // （实测 Chromium 快速连点会以 InvalidStateError 中止），同样无人消费。
  finished.catch(() => {})
  transition.ready?.catch(() => {})
  transition.updateCallbackDone?.catch(() => {})

  return { animated: true, finished }
}
