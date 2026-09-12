// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'

import {
  getBlurCircleMaskGeometry,
  getCircleMaskGeometry,
  getMaskGeometry,
} from './masks'
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
const origin = { x: 400, y: 300 }
const circle = getCircleMaskGeometry(origin, viewport)

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
    origin,
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
      const out = buildAnimationCSS({ animationType: ThemeAnimationType.LTR, geometry: circle, origin, duration: 400, easing })
      expect(blockOf(out, ':root')).toContain(`${EASING_VAR}: ${easing};`)
    }
  })

  it('非法 duration（NaN / 负数）回落到默认 400ms', () => {
    for (const duration of [Number.NaN, -1, Number.POSITIVE_INFINITY]) {
      const out = buildAnimationCSS({ animationType: ThemeAnimationType.LTR, geometry: circle, origin, duration, easing: 'ease' })
      expect(blockOf(out, ':root')).toContain(`${DURATION_VAR}: 400ms;`)
    }
    const zero = buildAnimationCSS({ animationType: ThemeAnimationType.LTR, geometry: circle, origin, duration: 0, easing: 'ease' })
    expect(blockOf(zero, ':root')).toContain(`${DURATION_VAR}: 0ms;`)
  })

  it('动画名按类型区分', () => {
    for (const type of Object.values(ThemeAnimationType)) {
      expect(getAnimationName(type)).toBe(`theme-switch-${type}`)
      const out = buildAnimationCSS({
        animationType: type,
        geometry: getMaskGeometry(type, origin, viewport),
        origin,
        duration: 400,
        easing: 'ease',
      })
      // CIRCLE_REVERT 的收起 keyframes 名即主名；其余类型唯一 keyframes 同名
      expect(out).toContain(`@keyframes theme-switch-${type} {`)
    }
  })
})

describe('buildAnimationCSS（CIRCLE_REVERT：穿越缩放，收起 + 扩散）', () => {
  const css = buildAnimationCSS({
    animationType: ThemeAnimationType.CIRCLE_REVERT,
    geometry: circle,
    origin,
    duration: 400,
    easing: 'ease',
  })

  it('两个 keyframes：旧层 scale 1→0（收起），新层 scale 0→1（扩散）', () => {
    const collapse = css.match(/@keyframes theme-switch-circle-revert \{([\s\S]*?)\n\}/)
    expect(collapse).not.toBeNull()
    expect(collapse![1]).toContain('transform: scale(1);')
    expect(collapse![1]).toContain('transform: scale(0);')
    const expand = css.match(/@keyframes theme-switch-circle-revert-expand \{([\s\S]*?)\n\}/)
    expect(expand).not.toBeNull()
    expect(expand![1]).toContain('transform: scale(0);')
    expect(expand![1]).toContain('transform: scale(1);')
  })

  it('旧层置顶（z-index: 1）并缩放，transform-origin 钉在触发点', () => {
    const block = blockOf(css, '::view-transition-old(root)')
    expect(block).toContain('transform-origin: 400px 300px;')
    expect(block).toContain('z-index: 1;')
    expect(block).toContain('will-change: transform;')
    expect(block.match(/animation: theme-switch-circle-revert /g)).toHaveLength(2)
  })

  it('新层扩散动画用 -expand keyframes，不置顶', () => {
    const block = blockOf(css, '::view-transition-new(root)')
    expect(block).toContain('transform-origin: 400px 300px;')
    expect(block).toContain('will-change: transform;')
    expect(block).not.toContain('z-index')
    expect(block.match(/animation: theme-switch-circle-revert-expand /g)).toHaveLength(2)
  })

  it('REVERT 不使用蒙版（transform 实现，内容随缩放移动）', () => {
    expect(css).not.toContain('mask-image')
    expect(css).not.toContain('mask-size')
  })

  it('transform-origin 保留两位小数', () => {
    const out = buildAnimationCSS({
      animationType: ThemeAnimationType.CIRCLE_REVERT,
      geometry: circle,
      origin: { x: 100.12345, y: 50 },
      duration: 400,
      easing: 'ease',
    })
    expect(out).toContain('transform-origin: 100.12px 50px;')
  })
})

describe('buildAnimationCSS（CIRCLE_BLUR：仅新层挂模糊蒙版，旧层完整垫底）', () => {
  const blurGeometry = getBlurCircleMaskGeometry(origin, viewport, 2)
  const css = buildAnimationCSS({
    animationType: ThemeAnimationType.CIRCLE_BLUR,
    geometry: blurGeometry,
    origin,
    duration: 750,
    easing: 'ease-in-out',
  })

  it('蒙版只挂 ::view-transition-new(root)；旧层只出现在重置规则里（完整可见，防止露出实时页面）', () => {
    // old(root) 仅以分组选择器形式出现在重置规则（后跟逗号），没有独立的旧层规则（后跟 {）
    const inReset = css.match(/::view-transition-old\(root\),/g) ?? []
    const standalone = css.match(/::view-transition-old\(root\)\s*\{/g) ?? []
    expect(inReset).toHaveLength(1)
    expect(standalone).toHaveLength(0)
    const newBlock = blockOf(css, '::view-transition-new(root)')
    expect(newBlock).toContain(`mask-image: ${blurGeometry.maskImage};`)
    expect(newBlock).toContain('mask-repeat: no-repeat;')
    expect(newBlock).toContain('will-change: mask-size, mask-position;')
    expect(newBlock.match(/animation:/g)).toHaveLength(2)
  })

  it('旧层不被加蒙版、不加 z-index（默认位于新层之下）', () => {
    expect(css).not.toContain('z-index')
    const resetBlock = css.match(/::view-transition-old\(root\),\s*\n::view-transition-new\(root\)\s*\{([^}]*)\}/)
    expect(resetBlock).not.toBeNull()
    expect(resetBlock![1]).not.toContain('mask-image')
  })
})

describe('buildAnimationCSS（既有类型产物字节稳定）', () => {
  it('CIRCLE 的完整 CSS 与重构前逐字节一致（guard：改结构不得影响默认类型）', () => {
    const geometry = getCircleMaskGeometry({ x: 100, y: 50 }, { width: 800, height: 600 })
    expect(
      buildAnimationCSS({
        animationType: ThemeAnimationType.CIRCLE,
        geometry,
        origin: { x: 100, y: 50 },
        duration: 400,
        easing: 'ease',
      }),
    ).toBe(`:root {
  --theme-switch-duration: 400ms;
  --theme-switch-easing: ease;
}
::view-transition-old(root),
::view-transition-new(root) {
  animation: none;
  mix-blend-mode: normal;
}
@keyframes theme-switch-circle {
  from {
    mask-size: 0px 0px;
    mask-position: 100px 50px;
  }
  to {
    mask-size: ${geometry.endSize};
    mask-position: ${geometry.endPosition};
  }
}
::view-transition-new(root) {
  mask-image: ${geometry.maskImage};
  mask-repeat: no-repeat;
  will-change: mask-size, mask-position;
  animation: theme-switch-circle var(--theme-switch-duration, 400ms) ease-in-out both;
  animation: theme-switch-circle var(--theme-switch-duration, 400ms) var(--theme-switch-easing, ease-in-out) both;
}
`)
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
