// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'

import { getCircleMaskGeometry, getDirectionalMaskGeometry } from './masks'
import {
  DURATION_VAR,
  EASING_VAR,
  buildAnimationCSS,
  getAnimationName,
  injectAnimationStyle,
  removeAnimationStyle,
} from './styles'
import { THEME_ANIMATION_STYLE_ID, ThemeAnimationType } from './types'

const viewport = { width: 800, height: 600 }
const circle = getCircleMaskGeometry({ x: 400, y: 300 }, viewport)

/** 提取某个选择器块的正文（用于断言声明存在与顺序）；跳过作为分组选择器一部分（前面带逗号）的出现位置 */
function blockOf(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = css.match(new RegExp(`(?<!,\\s*)${escaped}\\s*\\{([^}]*)\\}`))
  if (!match) throw new Error(`selector not found: ${selector}`)
  return match[1]!
}

describe('buildAnimationCSS（CSS 变量化）', () => {
  const css = buildAnimationCSS({
    animationType: ThemeAnimationType.CIRCLE,
    geometry: circle,
    duration: 600,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  })

  it('duration / easing 写进同一份样式表的 :root 变量', () => {
    const root = blockOf(css, ':root')
    expect(root).toContain(`${DURATION_VAR}: 600ms;`)
    expect(root).toContain(`${EASING_VAR}: cubic-bezier(0.4, 0, 0.2, 1);`)
  })

  it('动画声明只引用变量并带默认兜底，不拼接用户输入', () => {
    const block = blockOf(css, '::view-transition-new(root)')
    expect(block).toContain(
      'animation: theme-switch-circle var(--theme-switch-duration, 400ms) var(--theme-switch-easing, ease-in-out) both;',
    )
    expect(block).not.toContain('cubic-bezier')
    expect(block).not.toContain('600ms')
  })

  it('双 animation 声明：先硬编码 ease-in-out 兜底，再引用变量（后者在支持 var() 的浏览器生效）', () => {
    const block = blockOf(css, '::view-transition-new(root)')
    const fallback = block.indexOf('animation: theme-switch-circle var(--theme-switch-duration, 400ms) ease-in-out both;')
    const variable = block.indexOf('var(--theme-switch-easing, ease-in-out)')
    expect(fallback).toBeGreaterThan(-1)
    expect(variable).toBeGreaterThan(fallback)
    expect(block.match(/animation:/g)).toHaveLength(2)
  })

  it('关闭 UA 默认交叉淡入淡出并还原混合模式', () => {
    const block = blockOf(css, '::view-transition-old(root),\n::view-transition-new(root)')
    expect(block).toContain('animation: none;')
    expect(block).toContain('mix-blend-mode: normal;')
  })

  it('keyframes 只动 mask-size / mask-position，并插值运行时几何', () => {
    const keyframes = css.match(/@keyframes theme-switch-circle \{([\s\S]*?)\n\}/)
    expect(keyframes).not.toBeNull()
    const body = keyframes![1]!
    expect(body).toContain(`mask-size: ${circle.startSize};`)
    expect(body).toContain(`mask-position: ${circle.startPosition};`)
    expect(body).toContain(`mask-size: ${circle.endSize};`)
    expect(body).toContain(`mask-position: ${circle.endPosition};`)
    expect(body).not.toMatch(/clip-path|opacity|transform/)
  })

  it('新截图伪元素带 mask-image / no-repeat / will-change（只走 mask，不碰 clip-path）', () => {
    const block = blockOf(css, '::view-transition-new(root)')
    expect(block).toContain(`mask-image: ${circle.maskImage};`)
    expect(block).toContain('mask-repeat: no-repeat;')
    expect(block).toContain('will-change: mask-size, mask-position;')
    expect(css).not.toContain('clip-path')
  })

  it('linear() / steps() 等任意 timing-function 原样进入变量', () => {
    for (const easing of ['linear(0, 0.25 75%, 1)', 'steps(4, end)', 'ease']) {
      const out = buildAnimationCSS({ animationType: ThemeAnimationType.LTR, geometry: circle, duration: 400, easing })
      expect(blockOf(out, ':root')).toContain(`${EASING_VAR}: ${easing};`)
    }
  })

  it('非法 duration（NaN / 负数）回落到默认 400ms', () => {
    for (const duration of [Number.NaN, -1, Number.POSITIVE_INFINITY]) {
      const out = buildAnimationCSS({ animationType: ThemeAnimationType.LTR, geometry: circle, duration, easing: 'ease' })
      expect(blockOf(out, ':root')).toContain(`${DURATION_VAR}: 400ms;`)
    }
    const zero = buildAnimationCSS({ animationType: ThemeAnimationType.LTR, geometry: circle, duration: 0, easing: 'ease' })
    expect(blockOf(zero, ':root')).toContain(`${DURATION_VAR}: 0ms;`)
  })

  it('动画名按类型区分', () => {
    for (const type of Object.values(ThemeAnimationType)) {
      expect(getAnimationName(type)).toBe(`theme-switch-${type}`)
      const out = buildAnimationCSS({
        animationType: type,
        geometry: type === ThemeAnimationType.CIRCLE ? circle : getDirectionalMaskGeometry(type),
        duration: 400,
        easing: 'ease',
      })
      expect(out).toContain(`@keyframes theme-switch-${type} {`)
    }
  })
})

describe('injectAnimationStyle / removeAnimationStyle（样式生命周期）', () => {
  afterEach(() => {
    removeAnimationStyle(document)
  })

  const query = () => document.querySelectorAll(`#${THEME_ANIMATION_STYLE_ID}`)

  it('以固定 id 注入 <head>，内容为传入 CSS', () => {
    const style = injectAnimationStyle(document, ':root { --a: 1; }')
    expect(style.tagName).toBe('STYLE')
    expect(style.id).toBe(THEME_ANIMATION_STYLE_ID)
    expect(style.parentElement).toBe(document.head)
    expect(style.textContent).toBe(':root { --a: 1; }')
    expect(query()).toHaveLength(1)
  })

  it('重复注入先移除旧节点，始终只有一份样式且内容为最新', () => {
    const first = injectAnimationStyle(document, '/* first */')
    const second = injectAnimationStyle(document, '/* second */')
    expect(query()).toHaveLength(1)
    expect(first.isConnected).toBe(false)
    expect(second.isConnected).toBe(true)
    expect(document.getElementById(THEME_ANIMATION_STYLE_ID)?.textContent).toBe('/* second */')
  })

  it('移除后节点消失；重复移除不报错', () => {
    injectAnimationStyle(document, '/* x */')
    removeAnimationStyle(document)
    expect(query()).toHaveLength(0)
    expect(() => removeAnimationStyle(document)).not.toThrow()
  })
})
