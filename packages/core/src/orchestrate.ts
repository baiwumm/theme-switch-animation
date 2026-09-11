import { getMaskGeometry, getTriggerCenter } from './masks'
import type { RectProvider, Size } from './masks'
import { buildAnimationCSS, injectAnimationStyle, removeAnimationStyle } from './styles'
import { THEME_ANIMATION_STYLE_ID, resolveAnimationOptions } from './types'
import type { ThemeAnimationOptions } from './types'

/** 最小 ViewTransition 结构，不依赖特定版本 lib.dom 的声明 */
export interface ViewTransitionLike {
  finished: Promise<void>
  ready?: Promise<void>
  updateCallbackDone?: Promise<void>
  skipTransition?: () => void
}

/** 转场回调：适配层在其中同步更新 DOM（React `flushSync` / Vue `await nextTick()`）。
 * 允许返回任意 Promise（如受控模式的 `waitForThemeSync`），浏览器只等它结算，返回值被忽略 */
export type DomUpdate = () => void | Promise<unknown>

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

let pendingCleanup: ReturnType<typeof setTimeout> | undefined

/**
 * 转场结束后延迟 `duration` 再移除样式。只清理自己注入的那个节点：
 * 若期间已有新一轮转场重新注入，旧定时器不得误删新样式。
 */
function scheduleCleanup(doc: Document, delay: number, node: HTMLStyleElement): void {
  if (pendingCleanup !== undefined) clearTimeout(pendingCleanup)
  pendingCleanup = setTimeout(() => {
    pendingCleanup = undefined
    if (doc.getElementById(THEME_ANIMATION_STYLE_ID) === node) removeAnimationStyle(doc)
  }, delay)
}

function resolveDocument(doc: Document | null | undefined): Document | null {
  if (doc !== undefined) return doc
  return typeof document === 'undefined' ? null : document
}

/**
 * 编排一次主题切换：
 * - 可以动画：注入样式 → `startViewTransition(domUpdate)` → 结束后清理样式；
 * - 需要降级：直接调用 `domUpdate`，状态照常更新，只是没有动画。
 */
export function runThemeTransition(params: RunThemeTransitionParams): RunThemeTransitionResult {
  const { domUpdate, trigger } = params
  const doc = resolveDocument(params.doc)
  const resolved = resolveAnimationOptions(params.options)

  if (!supportsViewTransition(doc) || prefersReducedMotion(doc.defaultView)) {
    return { animated: false, finished: Promise.resolve(domUpdate()).then(() => undefined) }
  }

  const viewport = getViewportSize(doc)
  const center = getTriggerCenter(trigger, viewport)
  const geometry = getMaskGeometry(resolved.animationType, center, viewport)
  const css = buildAnimationCSS({
    animationType: resolved.animationType,
    geometry,
    duration: resolved.duration,
    easing: resolved.easing,
  })
  const node = injectAnimationStyle(doc, css)

  const transition = doc.startViewTransition(domUpdate)
  const finished = transition.finished.then(
    () => {
      scheduleCleanup(doc, resolved.duration, node)
    },
    (error: unknown) => {
      removeAnimationStyle(doc)
      throw error
    },
  )

  return { animated: true, finished }
}
