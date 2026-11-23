# 🌗 theme-switch-animation

**[English](https://github.com/baiwumm/theme-switch-animation/blob/main/README.md) · 中文**

[![npm version](https://img.shields.io/npm/v/theme-switch-animation.svg)](https://www.npmjs.com/package/theme-switch-animation)
[![npm downloads](https://img.shields.io/npm/dm/theme-switch-animation.svg)](https://www.npmjs.com/package/theme-switch-animation)
[![minzipped size](https://img.shields.io/bundlephobia/minzip/theme-switch-animation.svg)](https://bundlephobia.com/package/theme-switch-animation)
[![node](https://img.shields.io/node/v/theme-switch-animation.svg)](https://www.npmjs.com/package/theme-switch-animation)
[![CI](https://github.com/baiwumm/theme-switch-animation/actions/workflows/ci.yml/badge.svg)](https://github.com/baiwumm/theme-switch-animation/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/baiwumm/theme-switch-animation/blob/main/LICENSE)

✨ 基于浏览器 View Transitions API 的主题切换动画库：切换 light / dark 主题时，新主题以指定形状（圆形扩散 / 多边形 / 百叶窗 / 方块格子 / 水滴涟漪 / 扇形扫开 等）"揭开"覆盖旧主题，而不是生硬跳变。

<p align="center">
  📚 <a href="https://theme-switch-animation.baiwumm.com">在线文档站</a> ·
  🎬 <a href="https://v.douyin.com/Wz6_MZOcwOE/">产品宣传片</a> ·
  📦 <a href="https://www.npmjs.com/package/theme-switch-animation">npm</a> ·
  🤖 <a href="https://github.com/baiwumm/theme-switch-animation/blob/main/AGENTS.md">开发规范</a>
</p>

<!-- 图片走 raw.githubusercontent 绝对地址：npm 的 README 页不解析 `assets/...` 相对路径
     （发布产物只含 dist + README，assets/ 不随包走），相对写法在 GitHub 正常、在 npm 上是裂图。 -->
<p align="center">
  <a href="https://v.douyin.com/Wz6_MZOcwOE/">
    <img src="https://raw.githubusercontent.com/baiwumm/theme-switch-animation/main/assets/video/theme-switch-animation-promo-cover-16x9.png" width="880"
         alt="theme-switch-animation 产品宣传片（57 秒，含中文口播）" />
  </a>
</p>

## ✨ 特性

- 🔀 **跨框架**：React 18+、Vue 3+、Next.js（App Router）、Nuxt 3+
- 🎨 **动画类型分族**：圆形扩散（含边缘模糊变体）、几何形状扩散、条带与格子（由 `direction` 控制四方向）、中线对开（`direction` 控开合轴）、环带前缘（由 `waveWidth` 控制波长）、角度扫开（由 `bladeCount` 控制扇叶数）；其中 11 个类型支持 `reverse` 改为反向揭开。完整清单与逐个的观感说明见下方「🎬 动画类型」表
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
  animationType: ThemeAnimationType.CIRCLE,
  reverse: 'auto', // 切暗向外扩散、切亮向触发点收起
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

## 🎬 动画类型

| 类型 | 观感 | 起收点 | 消费的选项 |
| --- | --- | --- | --- |
| `CIRCLE` | 圆形扩散；`reverse` 改为"新主题从四周显出、向触发点收拢" | 触发元素中心 | `reverse` |
| `CIRCLE_BLUR` | 边缘高斯模糊的圆形扩散；`reverse` 为模糊边界的圆洞收拢 | 触发元素中心 | `blurAmount` / `reverse` |
| `SQUARE` / `DIAMOND` / `RECTANGLE` / `HEXAGON` / `TRIANGLE` / `STAR` | 多边形从触发点扩散（朝向见文档站画廊）；`SQUARE` / `DIAMOND` / `RECTANGLE` / `TRIANGLE` / `HEXAGON` 的 `reverse` 为对应形状的洞从四周收拢 | 触发元素中心 | `reverse`（除 `STAR` 外） |
| `BLINDS` | 百叶窗：叶片逐条揭开 | 无触发点（全屏按叶宽平铺） | `direction` / `slatWidth` |
| `SCAN` | 硬边扫开 + 前缘半透明光束 | 无触发点（沿推进轴） | `direction` |
| `QR_GRID` | 方块格子逐格生长、末帧融为整屏；`cellShape: 'dot'` 切换为圆点格（单层平铺，免 `@supports`），`cellSize` 控格距。**圆点格的 `direction` 静默**（单层无推进轴，四向观感一致） | 无触发点（按 `direction` 锚定方位） | `direction` / `cellSize` / `cellShape` |
| `RIPPLE` | 水滴涟漪：实心水面外推，前缘是主波峰 + 两圈衰减余波的环带；`reverse` 让水面从四周向内收拢 | 触发元素中心（波源） | `waveWidth` / `reverse` |
| `CLOCK_SWEEP` | 时钟扇形：扇形自 12 点顺时针扫开，前缘带 12° 软尾；`reverse` 即**逆时针**扫开 | 触发元素中心（轴心） | `reverse` |
| `FAN` | 扇叶旋开：`bladeCount` 片楔形扇叶同时从轴心旋开，末帧拼成整屏；`reverse` 改为合拢 | 触发元素中心（轴心） | `bladeCount` / `reverse` |
| `CURTAIN` | 双开门：新主题自屏幕中线对称推开，起始帧中缝先透一道光；`reverse` 改为两扇幕布向中线合拢。**`direction` 是开合轴而非四向**：`ltr`/`rtl` 水平（观感一致）、`ttb`/`btt` 垂直，只有两种视觉形态 | 无触发点（全屏按开合轴对称） | `direction` / `reverse` |

`BLINDS` / `SCAN` / `QR_GRID` / `CURTAIN` 是属性驱动蒙版（`@property --theme-switch-reveal` + 静止蒙版盒子），不读触发元素几何——`ref` 只用于点击与状态。`RIPPLE` / `CLOCK_SWEEP` / `FAN` 用同一机制但把轴心写进渐变串，因此消费 `ref` 几何；角度族另用 `--theme-switch-sweep`（`@property` 的 syntax 一经注册不可改，`<angle>` 不能与 `<length>` 同名）。`QR_GRID` 的"列 ∩ 行"双层蒙版交集经 `@supports (mask-composite: intersect)` 门控，不支持的引擎自动降级为推进轴单层条带（观感同百叶窗），状态始终正确。

## 🧩 API

### `useThemeAnimation(options)`

| 选项 | 类型 | 说明 |
| --- | --- | --- |
| `animationType` | `ThemeAnimationType` | 取上方「🎬 动画类型」表之一，默认 `CIRCLE` |
| `duration` | `number` | 动画时长 ms，默认 750 |
| `easing` | `string` | 任意合法 CSS timing-function，默认 `ease-in-out` |
| `blurAmount` | `number` | 模糊蒙版强度系数，默认 2。仅 `CIRCLE_BLUR` 生效 |
| `direction` | `'ltr' \| 'rtl' \| 'ttb' \| 'btt'` | 扫描方向，默认 `ltr`。`BLINDS` / `SCAN` / `QR_GRID` 控扫开方向与锚定；`CURTAIN` 控开合轴（`ltr`/`rtl` 水平、`ttb`/`btt` 垂直——只有两种视觉形态）（可用 `ThemeAnimationDirection` 常量），其余类型忽略，非法值静默回落默认 |
| `slatWidth` | `number` | 百叶窗叶片宽度 px，范围 `[16, 200]`，默认 72。仅 `BLINDS` 生效，越界静默回落默认 |
| `cellSize` | `number` | QR_GRID 格距 px（每格方块/圆点的边长与平铺周期），范围 `[16, 200]`，默认 64。仅 `QR_GRID` 生效，越界静默回落默认 |
| `cellShape` | `'square' \| 'dot'` | QR_GRID 格子形状，默认 `'square'`。`'dot'` 为单层平铺圆点格（免 `@supports`，圆点直径终值 ≥ 格距 × √2 保证末帧无缝）；**圆点格的 `direction` 静默**。非法值静默回落默认 |
| `waveWidth` | `number` | 涟漪波长 px（相邻两圈波峰间距），范围 `[8, 60]`，默认 18。仅 `RIPPLE` 生效，越界静默回落默认 |
| `bladeCount` | `number` | 扇叶数，范围 `[4, 16]` 的**整数**，默认 8。仅 `FAN` 生效，非整数或越界静默回落默认（非整数会让 `360 / bladeCount` 不整除，末帧留一条永不闭合的缝） |
| `reverse` | `boolean \| 'auto'` | 反向揭开，默认 `false`。`true` 恒反向；`'auto'` 切暗正向、切亮收起（跟随本次切换方向）。**与 `direction` 正交**：`direction` 决定推进轴，`reverse` 决定从内还是从外揭开。已接入 `CIRCLE` / `FAN` / `RIPPLE` / `CLOCK_SWEEP` / `CURTAIN` / `SQUARE` / `RECTANGLE` / `CIRCLE_BLUR` / `DIAMOND` / `TRIANGLE` / `HEXAGON` 十一个类型，其余静默忽略——形状族的分界是凸 vs 凹：`STAR` 真凹，半平面/条带构造表达不了凹轮廓（扇形层近似还与 `FAN` 撞车），维持不接（见 `docs/animation-roadmap.md` §4）。非法值静默回落 `false` |
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

- `runThemeTransition(params)`：编排一次转场。`domUpdate` 返回 `SKIP_TRANSITION` 表示"新截图尚未就绪"，浏览器立即 `skipTransition()` 跳过转场（受控模式超时、自定义外部系统等待的推荐写法）；`nextIsDark` 显式传目标状态，`reverse: 'auto'` 的取向不再依赖从 `<html>` class 反推（`data-theme` 型外部系统也可用）。
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

[MIT](https://github.com/baiwumm/theme-switch-animation/blob/main/LICENSE)
