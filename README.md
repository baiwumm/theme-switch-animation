# 🌗 theme-switch-animation

[![npm version](https://img.shields.io/npm/v/theme-switch-animation.svg)](https://www.npmjs.com/package/theme-switch-animation)
[![npm downloads](https://img.shields.io/npm/dm/theme-switch-animation.svg)](https://www.npmjs.com/package/theme-switch-animation)
[![minzipped size](https://img.shields.io/bundlephobia/minzip/theme-switch-animation.svg)](https://bundlephobia.com/package/theme-switch-animation)
[![node](https://img.shields.io/node/v/theme-switch-animation.svg)](https://www.npmjs.com/package/theme-switch-animation)
[![CI](https://github.com/baiwumm/theme-switch-animation/actions/workflows/ci.yml/badge.svg)](https://github.com/baiwumm/theme-switch-animation/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

✨ 基于浏览器 View Transitions API 的主题切换动画库：切换 light / dark 主题时，新主题以指定形状（圆形扩散 / 四向擦除 / 多边形）"揭开"覆盖旧主题，而不是生硬跳变。

## 📸 预览

![theme-switch-animation 文档站首页](./assets/screen.jpg)

## ✨ 特性

- 🔀 **跨框架**：React 18+、Vue 3+、Next.js（App Router）、Nuxt 3+
- 🎨 **13 种动画类型**：圆形扩散 / 收起 / 模糊（`CIRCLE` / `CIRCLE_REVERT` / `CIRCLE_BLUR`）、四向擦除（`LTR` / `RTL` / `TTB` / `BTT`）、形状扩散（`SQUARE` / `DIAMOND` / `RECTANGLE` / `HEXAGON` / `TRIANGLE` / `STAR`）
- 🔌 **受控模式**：不独占主题状态管理，`next-themes`、`@nuxtjs/color-mode` 用户可直接接入
- 🔄 **非受控多实例同步**：同页多个实例的 `isDark` 以 `<html>` 暗色类名为事实源镜像，其它标签页经 storage 事件同步
- 🛟 **自动降级**：不支持 View Transitions 或 `prefers-reduced-motion: reduce` 时自动降级为直接切换（状态永远正确）

## 📦 安装

```bash
pnpm add theme-switch-animation
# React / Vue / Next.js 从主入口导入；Nuxt 3+ 走模块（自动导入，无需 import）
```

## 🚀 快速开始

### ⚛️ React / Next.js（App Router 组件加 `'use client'`）

```tsx
import { useState } from 'react'
import { useThemeAnimation, ThemeAnimationType } from 'theme-switch-animation/react'

function ThemeButton() {
  // 非受控：库管理 localStorage + <html> class；多实例、跨标签页自动同步
  const { ref, toggleTheme, isDark, finished } = useThemeAnimation({
    animationType: ThemeAnimationType.CIRCLE,
    duration: 750,
    easing: 'ease-in-out',
  })
  const [animating, setAnimating] = useState(false)
  return (
    <button
      ref={ref}
      disabled={animating}
      onClick={async () => {
        setAnimating(true)
        toggleTheme()
        await finished // 动画期间禁用；降级时立即结算，不会 reject
        setAnimating(false)
      }}
    >
      {isDark ? '🌙' : '☀️'}
    </button>
  )
}
```

`finished` 是最近一次切换动画的结束 Promise（点击触发的那次渲染更新后读取到最新值）。

受控模式（接入 `next-themes` 等）：同时提供 `isDark` + `onChange`，库不碰 localStorage、不改 class——在转场回调内调用 `onChange(next)` 并等待外部系统真实写入 DOM（300ms 超时兜底，超时则跳过动画直切）后截图：

```tsx
const { resolvedTheme, setTheme } = useNextThemes()
const { ref, toggleTheme } = useThemeAnimation({
  isDark: resolvedTheme === 'dark',
  onChange: (next) => setTheme(next ? 'dark' : 'light'),
  animationType: ThemeAnimationType.CIRCLE_REVERT,
})
```

### 💚 Vue 3

```vue
<script setup lang="ts">
// useThemeAnimation / ThemeAnimationType 由包内导出；Nuxt 下由模块自动导入
const { triggerRef, toggleTheme, isDark, finished } = useThemeAnimation<HTMLButtonElement>({
  animationType: ThemeAnimationType.CIRCLE,
})
</script>

<template>
  <button ref="triggerRef" @click="toggleTheme">{{ isDark ? '🌙' : '☀️' }}</button>
</template>
```

受控模式下 options 需传**响应式来源**（`reactive()` 包装并以 `watchEffect` 同步外部状态）；传普通对象字面量会按 setup 时的快照工作。模式判定是动态的（computed）——先按非受控使用、后补上 `isDark` + `onChange` 转受控时，切换路径与返回值都会随最新模式走。

### 💚 Nuxt 3+

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['theme-switch-animation/nuxt'],
})
```

`useThemeAnimation` / `ThemeAnimationType` / `SKIP_TRANSITION` / `observeThemeClass` / `THEME_STORAGE_KEY` 全部自动导入，无需 import。

## 🧩 API

### `useThemeAnimation(options)`

| 选项 | 类型 | 说明 |
| --- | --- | --- |
| `animationType` | `ThemeAnimationType` | 13 种动画类型之一，默认 `CIRCLE` |
| `duration` | `number` | 动画时长 ms，默认 750 |
| `easing` | `string` | 任意合法 CSS timing-function，默认 `ease-in-out` |
| `blurAmount` | `number` | 模糊蒙版强度系数，默认 2。仅 `CIRCLE_BLUR` 生效 |
| `darkClassName` | `string` | 暗色类名，默认 `dark`（与 next-themes / color-mode 默认一致） |
| `isDark` + `onChange` | — | 同时提供 → 受控模式；都缺省 → 非受控（localStorage key 为 `THEME_STORAGE_KEY` 常量 `theme-switch-animation`，`observeThemeClass` 可带自定义 key）；只提供其一 → 契约不完整（开发环境 console.warn，按非受控工作） |

返回值（React / Vue 形态一致，Vue 的 `isDark` / `finished` 是 Ref）：

| 字段 | 说明 |
| --- | --- |
| `ref` / `triggerRef` | 挂到触发元素；中心扩散类动画以该元素中心为圆心 |
| `toggleTheme` | 触发一次切换（内部走 `startViewTransition`） |
| `isDark` | 当前暗色状态；非受控多实例间自动同步 |
| `finished` | 最近一次切换动画的结束 Promise；库内已消化 rejection，快速连点不产生 unhandledrejection |

### 底层与自定义集成（`theme-switch-animation` 主入口）

- `runThemeTransition(params)`：编排一次转场。`domUpdate` 返回 `SKIP_TRANSITION` 表示"新截图尚未就绪"，浏览器立即 `skipTransition()` 跳过转场（受控模式超时、自定义外部系统等待的推荐写法）；`nextIsDark` 显式传目标状态，`CIRCLE_REVERT` 的方向感知不再依赖从 `<html>` class 反推（`data-theme` 型外部系统也可用）。
- `observeThemeClass(doc, className, onChange)`：以 `<html>` 暗色类名为事实源的观察器（MutationObserver + storage 跨标签页同步），返回停止函数。非受控多实例同步即基于它；页面级"全局主题指示器"等场景可直接复用。
- `waitForThemeSync(params)`：受控模式的等待协议（300ms 超时，`THEME_SYNC_TIMEOUT_MS`）。
- `supportsViewTransition()` / `prefersReducedMotion()` / `shouldSkipTransition()`：降级判定。
- 蒙版几何与样式构建（`getMaskGeometry` / `buildAnimationCSS` 等）亦从主入口公开导出，自定义动画 / SSR 预注入等场景可用。

## ✅ 行为契约

- **降级**：不支持 View Transitions（Safari < 18、Firefox < 144 等）、`prefers-reduced-motion: reduce`、SSR 渲染阶段——均直接切换，状态照常正确。
- **受控超时**：外部系统 300ms 内未把 DOM 同步到位时跳过动画直切，不播放"旧→旧"的空转动画；超时结算前会复查一次目标状态。
- **iframe / 多文档**：转场样式清理按 document 记账，互不干扰。
- **Vue 转场路线**：`startViewTransition` 回调内 `await nextTick()`，截图前 DOM 已更新。

## 📄 License

[MIT](./LICENSE)
