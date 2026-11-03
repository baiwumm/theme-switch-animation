# theme-switch-animation 需求文档

| 项目 | 内容 |
|---|---|
| 版本 | v1.20（类型导出清理，breaking 走 minor 0.6.0、未发版；见 §10 修订记录） |
| 日期 | 2026-09-21 |
| 状态 | 已评审通过，持续开发中（进展见 §10 修订记录） |
| 仓库 / npm 包名 | `theme-switch-animation`（npm 已注册并发布） |
| 支持框架 | React 18+、Vue 3+、Next.js（App Router）、Nuxt 3+ |

---

## 1. 项目概述

做一个**主题切换动画库**：用户点击按钮切换 light / dark 主题时，新主题以指定形状"揭开"覆盖旧主题，而不是生硬跳变。定位参考 `react-theme-switch-animation`（React-only），差异点：

1. **跨框架**：同时支持 React、Vue、Next.js、Nuxt.js（参考库仅 React）。
2. **自定义图案**：15 种动画类型（`CIRCLE` / `CIRCLE_BLUR` / `SQUARE` / `DIAMOND` / `RECTANGLE` / `HEXAGON` / `TRIANGLE` / `STAR` / `BLINDS` / `SCAN` / `QR_GRID` / `RIPPLE` / `CLOCK_SWEEP` / `FAN` / `CURTAIN`，形状观感对齐 magicui 的 animated-theme-toggler，技术路线仅用 mask；`BLINDS` / `SCAN` / `QR_GRID` 由 `direction` 选项控制四方向，v1.6；`RIPPLE` 由 `waveWidth` 控制环带波长，v1.7；`CLOCK_SWEEP` / `FAN` 为角度驱动族、`FAN` 由 `bladeCount` 控制扇叶数，v1.8；`CURTAIN` 中线对开、无参数，v1.9（v1.15 起接入 `direction`：`ttb` / `btt` 为垂直幕布）；`QR_GRID` 由 `cellSize` 控制格距、`cellShape` 切换方块 / 圆点格，v1.15）。另有跨类型选项 `reverse`（三态 `boolean | 'auto'`，反向揭开；`CIRCLE` / `FAN` / `RIPPLE` / `CLOCK_SWEEP` / `CURTAIN` 五个生效，v1.10 起；v1.13 起独立的 `CIRCLE_REVERT` 类型移除，收起形态即 `CIRCLE + reverse`，故类型数 16 → 15；v1.14 补接 `SQUARE` / `RECTANGLE` / `CIRCLE_BLUR`，v1.16 补接 `DIAMOND`，接入面 5 → 9）。其余 6 个类型**不接入 `reverse`**：`BLINDS` / `SCAN` / `QR_GRID` 是 `direction` 已占那根轴（接入会留下重复组合），形状族其余 3 个（`HEXAGON` / `TRIANGLE` / `STAR`）反向只能动 `mask-size` / `mask-position`——那条路经实测判定做不到无副作用（重新引入已修完的像素对齐抖动），而 v1.14 / v1.16 验证的"静止盒子 + 渐变补集"绕路只对轴对齐洞边界（方形 / 矩形）与对角条带洞（菱形）成立，对斜线轮廓的一般情形（六边形 / 三角 / 星形的凹凸边）不成立，理由见 §7 与 `docs/animation-roadmap.md` §4。
3. **受控模式**：不独占主题状态管理，`next-themes`、`@nuxtjs/color-mode` 用户可直接接入复用动画能力。

## 2. 可行性评估（调研结论复述）

> 技术风险低，结论已随 0.1.0 发布实证。原始逐条调研记录见 git 历史（本文档早期版本），要点存档：

- **核心机制**：View Transitions API（`document.startViewTransition`）+ 对 `::view-transition-new(root)` 做 **mask 动画**，约 95% 代码与框架无关。
- **框架差异仅两处**：React 转场回调内 `flushSync` 强制同步渲染；Vue 回调写 `async () => { ...; await nextTick() }`。
- **兼容**：View Transitions 已 Baseline 2025（Chrome/Edge 111+、Safari 18+、Firefox 144+），不支持或 `prefers-reduced-motion: reduce` 时降级直切。
- **WebKit 硬约束**：忽略转场伪元素上的 clip-path 与 WAAPI，只能用 mask 动画；`linear()` 缓动需双 `animation:` 声明降级；主题 class 必须在转场回调内同步生效，否则截图捕获旧主题。

## 3. 命名

仓库与 npm 包**统一为 `theme-switch-animation`**，所有代码、文档、示例中的引用一致，不使用任何备选名。

## 4. 包结构与发布形态

**源码用 pnpm workspace 组织，最终只发布一个包**，通过 `exports` 子路径暴露各框架入口：

```
theme-switch-animation/                  # 仓库名 = 包名
├── packages/
│   ├── core/                           # 私有包（不发布），框架无关核心
│   │   └── src/
│   │       ├── types.ts                # ThemeAnimationType、options、返回值类型
│   │       ├── masks.ts                # 蒙版几何与规格（circle/多边形 SVG、BLINDS/SCAN/QR_GRID/RIPPLE/CLOCK_SWEEP/FAN/CURTAIN 渐变模板）
│   │       ├── styles.ts               # 样式注入/清理，CSS 变量化声明
│   │       ├── orchestrate.ts          # startViewTransition 编排 + 降级判断
│   │       ├── uncontrolled.ts         # 非受控状态：localStorage 读写 + darkClassName 同步（v1.3 补，React / Vue 适配层共用）
│   │       └── controlled-sync.ts      # 受控模式同步协议（§5.4）
│   ├── react/                          # useThemeAnimation（flushSync）
│   ├── vue/                            # useThemeAnimation（nextTick / flush:'sync'）
│   └── nuxt/                           # Nuxt Module（§6.3）
│       └── src/
│           ├── index.ts                # defineNuxtModule + addImportsDir
│           └── runtime/composables/
│               └── index.ts            # 从 core/vue 重新导出，供自动导入扫描
├── playgrounds/                        # react / vue / next（next-themes）/ nuxt（color-mode）
├── apps/docs/                          # 文档站（Next.js，每种动画 live demo，push main 由腾讯云 EdgeOne 自动构建发布）
├── docs/                               # 项目活文档（requirements / next-steps / roadmap / reverse 设计）
├── package.json                        # 根包 = 发布包 theme-switch-animation
└── tsup.config.ts / vitest / changesets / CI
```

发布清单（根 `package.json`）：

```json
{
  "name": "theme-switch-animation",
  "engines": {
    "node": ">=18",
    "pnpm": ">=9"
  },
  "exports": {
    ".":       { "types": "./dist/index.d.ts",  "import": "./dist/index.mjs" },
    "./react": { "types": "./dist/react.d.ts",  "import": "./dist/react.mjs" },
    "./vue":   { "types": "./dist/vue.d.ts",    "import": "./dist/vue.mjs" },
    "./nuxt":  { "types": "./dist/nuxt.d.ts",   "import": "./dist/nuxt.mjs" }
  },
  "peerDependencies": {
    "react": ">=18",
    "react-dom": ">=18",
    "vue": ">=3",
    "@nuxt/kit": ">=3"
  },
  "peerDependenciesMeta": {
    "react":     { "optional": true },
    "react-dom": { "optional": true },
    "vue":       { "optional": true },
    "@nuxt/kit": { "optional": true }
  },
  "files": ["dist"],
  "sideEffects": false
}
```

要点：

- **Next.js 不单独出子包**：复用 `theme-switch-animation/react`，组件顶部加 `'use client'`。
- **Nuxt 需要独立 `/nuxt` 子路径**：模块入口 `dist/nuxt.mjs`，旁边保留 `dist/nuxt-runtime/composables/` 目录（`addImportsDir` 指向目录，不是单文件）。
- `ThemeAnimationType` 用 `const` 对象 + `as const`，不用 TS `enum`（Nuxt 自动导入扫描命名导出，`const` 对象对打包和 `isolatedModules` 更稳）。
- 技术栈：pnpm workspace + tsup（构建）+ vitest（单测）+ Playwright（e2e）+ changesets（版本发布）。
- `engines` 字段（v1.2 新增，v1.3 澄清）：面向**发布产物的消费环境**——`engines.node >= 18`、`engines.pnpm >= 9`（构建产物为 es2020 ESM，Node 18 消费者可正常使用）。**参与本仓库开发**（跑测试与构建）需要 Node >= 22.13，这是 pnpm 11 / vitest 5 / jsdom 30 工具链的最低要求，在 `AGENTS.md` 注明，不写进 `engines`。

## 5. API 设计

### 5.1 参数

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `animationType` | `ThemeAnimationType` | `CIRCLE` | 动画类型：`CIRCLE` \| `CIRCLE_BLUR` \| `SQUARE` \| `DIAMOND` \| `RECTANGLE` \| `HEXAGON` \| `TRIANGLE` \| `STAR` \| `BLINDS` \| `SCAN` \| `QR_GRID` \| `RIPPLE` \| `CLOCK_SWEEP` \| `FAN` \| `CURTAIN`（v1.6：四向类型 `LTR`/`RTL`/`TTB`/`BTT` 移除，改由 `direction` 承接；v1.13：`CIRCLE_REVERT` 移除，改由 `CIRCLE` + `reverse` 承接） |
| `darkClassName` | `string` | `'dark'` | 暗色类名，可配置 |
| `duration` | `number` | `750` | 动画时长 ms |
| `easing` | `string` | `'ease-in-out'` | 任意合法 CSS timing-function |
| `blurAmount` | `number` | `2` | 模糊强度（仅 `CIRCLE_BLUR` 生效，v1.5 新增） |
| `direction` | `ThemeAnimationDirection` | `'ltr'` | 扫描方向（`BLINDS` / `SCAN` / `QR_GRID` 控制扫开方向与锚定；v1.15 起 `CURTAIN` 亦生效——`ltr`/`rtl` 水平幕布、`ttb`/`btt` 垂直幕布，其余类型忽略；非法值回落默认，v1.6 新增） |
| `slatWidth` | `number` | `72` | 百叶窗叶片宽度 px，合法区间 `[16, 200]`（仅 `BLINDS` 生效；越界静默回落默认，v1.6 新增） |
| `cellSize` | `number` | `64` | QR_GRID 格距 px（每格方块/圆点的边长与平铺周期），合法区间 `[16, 200]`（仅 `QR_GRID` 生效；越界静默回落默认，v1.15 新增） |
| `cellShape` | `'square' \| 'dot'` | `'square'` | QR_GRID 格子形状：`'square'` 双层 intersect 方块格；`'dot'` 单层平铺圆点格（免 `@supports`，圆点直径终值 ≥ 格距 × √2 保证末帧无缝；`direction` 对圆点格静默）。非法值静默回落默认（v1.15 新增） |
| `waveWidth` | `number` | `18` | 涟漪波长 px（相邻两圈波峰间距），合法区间 `[8, 60]`（仅 `RIPPLE` 生效；越界静默回落默认，v1.7 新增） |
| `bladeCount` | `number` | `8` | 扇叶数，合法区间 `[4, 16]` 的**整数**（仅 `FAN` 生效；非整数或越界静默回落默认，v1.8 新增） |
| `reverse` | `boolean \| 'auto'` | `false` | 反向揭开：`true` 恒反向、`'auto'` 切暗正向 / 切亮收起。与 `direction` 正交（后者定推进轴、前者定从内还是从外揭开）。`CIRCLE` / `FAN` / `RIPPLE` / `CLOCK_SWEEP` / `CURTAIN` / `SQUARE` / `RECTANGLE` / `CIRCLE_BLUR` / `DIAMOND` 生效（v1.10–v1.12 前五个、v1.14 补接后三个、v1.16 补接 DIAMOND），其余静默忽略（形状族其余 3 个动 `mask-size` 那条路做不到无副作用、`BLINDS` / `SCAN` / `QR_GRID` 由 `direction` 占那根轴，见 §7）；非法值静默回落 `false`（v1.10 新增） |
| `isDark` | `boolean` | 可选 | 受控模式：外部暗色状态 |
| `onChange` | `(next: boolean) => void` | 可选 | 受控模式：状态变更回调 |

前四项两种模式共用；`blurAmount` / `direction` / `slatWidth` / `cellSize` / `cellShape` / `waveWidth` / `bladeCount` / `reverse` 亦为普通动画参数（非法值回落默认）；后两项仅受控模式出现。

### 5.2 模式判定

- `isDark` 与 `onChange` **同时提供** → 受控模式。
- 两者**都缺省** → 非受控模式（默认）。
- 只提供其一 → 按非受控处理，dev 环境 `console.warn`（契约不完整）。

### 5.3 行为契约

- **非受控（默认）**：库内部管理状态——读写 `localStorage`（key 为 `'theme-switch-animation'`），并在转场回调内同步 toggle `documentElement` 上的 `darkClassName`。开箱即用。
- **受控**：库**不碰 localStorage、不自己改 class**，只做两件事：注入动画样式；在 `startViewTransition` 回调里调用 `onChange(next)` 并等 DOM 真实变化后让浏览器截图。
- **返回值**：React 版 `{ ref, toggleTheme, isDark, finished }`；Vue 版 `{ triggerRef, toggleTheme, isDark, finished }`（`triggerRef` 避免与 Vue 的 `ref` 解构冲突；Vue 的 `isDark` / `finished` 是 Ref）。`finished` 是最近一次切换动画的结束 Promise，库内已消化 rejection，快速连点不产生 `unhandledrejection`。

### 5.4 受控模式同步协议（v1.1 修订 #1）

**背景**：next-themes / color-mode 都是**异步**把 class 写到 `<html>`（React passive effect / Nuxt 插件 watch），直接 `onChange()` 后立刻返回会截到旧主题。受控模式下类名归属外部，库只能**等**而不是替它写。

**协议**（core 层实现，两个适配层复用）：

```
startViewTransition 回调返回的 Promise 内：
  1. 调用 onChange(next)
  2. 建立 MutationObserver 监听 documentElement 的 class + data-* 属性
  3. 观察到 darkClassName 翻转（或任意 data 属性变化）→ resolve
  4. 兜底：300ms 超时也 resolve（外部系统异常时降级为无动画直切，不悬挂）
```

**v1.1 修订内容**：

1. 超时兜底值从 150ms **调整为 300ms**。理由：MutationObserver 是 DOM 变更后触发的微任务，理论上 resolve 后浏览器下一帧截图时序成立，但浏览器实现可能有差异；且 next-themes 用 `useEffect` 写 class、color-mode 用插件 watch，通常很快但并非绝对，300ms 提供更充足的余量。
2. **实现顺序**：Phase 2b 先按 MutationObserver 方案实现，跑通后再评估是否需要换方案。备选方案（仅在超时频繁触发时启用）：**混合模式**——库在转场回调内直接改 class，但同步通知外部状态（`onChange` 仍被调用，外部状态源保持同步）。
3. 新增验收项（见 §9 验收 7）：低性能设备 / 慢网络下实测 next-themes / color-mode 的超时触发频率，据此决定是否切换混合模式。

### 5.5 降级策略

`!document.startViewTransition`、`prefers-reduced-motion: reduce`、SSR 环境 → 跳过 `startViewTransition`，**状态照常更新**（非受控：更新 class + localStorage；受控：正常调用 `onChange(next)`），只是没有动画。状态永远正确。

## 6. 第三方库接入示例

### 6.1 next-themes（Next.js App Router，受控模式）

```tsx
'use client'
import { useTheme } from 'next-themes'
import { useThemeAnimation, ThemeAnimationType } from 'theme-switch-animation/react'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const { ref, toggleTheme, isDark } = useThemeAnimation({
    animationType: ThemeAnimationType.CIRCLE,
    darkClassName: 'dark',          // next-themes attribute="class" 的默认值
    duration: 600,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    isDark: resolvedTheme === 'dark',
    onChange: (next) => setTheme(next ? 'dark' : 'light'),
  })

  return (
    <button ref={ref} onClick={toggleTheme}>
      {isDark ? '🌙' : '☀️'}
    </button>
  )
}
```

### 6.2 @nuxtjs/color-mode（Nuxt，受控模式 + 自动导入）

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@nuxtjs/color-mode', 'theme-switch-animation/nuxt'],
})
```

```vue
<script setup lang="ts">
const colorMode = useColorMode()   // @nuxtjs/color-mode

// useThemeAnimation / ThemeAnimationType / ThemeAnimationDirection 由本库 nuxt 模块自动导入，无需 import
const { triggerRef, toggleTheme, isDark } = useThemeAnimation({
  animationType: ThemeAnimationType.SCAN,
  direction: ThemeAnimationDirection.TTB,   // 仅 BLINDS / SCAN / QR_GRID 消费
  // @nuxtjs/color-mode 的暗色类名取决于 classPrefix 和 classSuffix 配置，
  // 默认两者都是空串，所以是 dark。如果你的项目配置了 classSuffix: '-mode'，
  // 请把 darkClassName 改成 'dark-mode'。
  darkClassName: 'dark',
  isDark: colorMode.value === 'dark',
  onChange: (next) => { colorMode.preference = next ? 'dark' : 'light' },
})
</script>

<template>
  <button ref="triggerRef" @click="toggleTheme">
    {{ isDark ? '🌙' : '☀️' }}
  </button>
</template>
```

（v1.1 修订 #3：文档与示例注释统一使用上述表述，不写"color-mode v4 默认类名就是 dark"这类依赖版本号假设的话。）

### 6.3 Nuxt 模块本体（packages/nuxt/src/index.ts）

```ts
import { defineNuxtModule, createResolver, addImportsDir } from '@nuxt/kit'

export default defineNuxtModule({
  meta: { name: 'theme-switch-animation', configKey: 'themeSwitchAnimation' },
  setup() {
    const { resolve } = createResolver(import.meta.url)
    addImportsDir(resolve('./runtime/composables'))
  },
})
```

（`addImportsDir` 签名已对照 `@nuxt/kit@4.5.2` 类型声明核实：`addImportsDir(dirs: string | string[], opts?: { prepend?: boolean }): void`。）

**v1.1 修订 #2 —— 自动导入范围**：`addImportsDir` 扫描的是目录下文件的**命名导出**。`ThemeAnimationType` 等定义在 core 包，必须在 `packages/nuxt/src/runtime/composables/index.ts` 中**从 core 重新导出**，确保可被扫描到：

```ts
// packages/nuxt/src/runtime/composables/index.ts
export { useThemeAnimation } from '@theme-switch-animation/vue'   // vue 适配层的 composable
export { ThemeAnimationType, ThemeAnimationDirection } from '@theme-switch-animation/core'
export type { ThemeAnimationOptions, ... } from '@theme-switch-animation/core'
```

构建产物 `dist/nuxt-runtime/composables/index.js` 需保留同样的命名导出。

## 7. 实现要点

- **CIRCLE**：`getBoundingClientRect` 取触发元素中心，`Math.hypot` 算到视口四角最大距离定蒙版终值；SVG data-URI 圆形蒙版从 `mask-size: 0` 长到 `2.1 × maxRadius`（留余量防角落锯齿）。
- **形状家族（v1.5：SQUARE / DIAMOND / RECTANGLE / HEXAGON / TRIANGLE / STAR）**：与 CIRCLE 同构（SVG data-URI 多边形蒙版从触发点 0 长到终尺寸），形状观感对齐 magicui（六边形/三角形/星形顶点朝上、星形内顶点半径比 0.42）。终尺寸按各形状**内切半径盖住视口最远角**计算：SQUARE/RECTANGLE 用轴对齐半边界 × 1.05；DIAMOND/HEXAGON 用 `√2 × 1.05 × maxRadius` 外接圆；TRIANGLE 外接圆 `2.2 × maxRadius`（内切半径 1.1×）；STAR 外接圆 `2.5 × maxRadius`（内凹谷半径 0.42 × 2.5 = 1.05×）——**有意大于 magicui**：它的星形凹谷盖不住视口角落（clip-path 随转场组销毁所以它可接受），本库 mask 在样式移除前持续生效（fill both），必须保证完全覆盖。RECTANGLE 贴合视口宽高比（实心矩形蒙版 `preserveAspectRatio="none"`）。
- **CIRCLE_BLUR（v1.5，桌面真机反馈后修正）**：`feGaussianBlur` **烘焙进 SVG data-URI 蒙版本身**（非 CSS filter，Safari 兼容性同其余类型）；模糊蒙版**只挂新截图层**，旧截图层完整垫底——蒙版外是旧主题，直到模糊圆扫过（若两层同蒙版，透明区露出的是已翻转的实时页面，主题会瞬间全变）。强度由 `blurAmount`（默认 2，×1.2 得 stdDeviation）控制；终尺寸 `max(4 × (长边+200), 2.5 × maxRadius)` 封顶 8000px 防超大屏 GPU 纹理过大。技术参考 `useBlurCircleTheme`（next-daily-hot；其 old 层的 maskScale 动画无 mask-image，实为无效代码，勿照抄"双层同蒙版"的误读）。
- **BLINDS / SCAN / QR_GRID（v1.6，属性驱动揭开）**：仓库首批"注册属性驱动"的常规类型，与 `CIRCLE + reverse` 的洞式蒙版同一机制——`@property --theme-switch-reveal`（`REVEAL_VAR`，`syntax: "<length>"`、`inherits: false`）注册后，蒙版盒子完全静止、keyframes 只动该属性，引用它的 `mask-image` 渐变逐帧重新解析（`mask-image` 本身不可动画）。三者均**无触发点、不消费 `ref` 中心**；旧截图层完整垫底、蒙版挂新层。v1.15 起 `QR_GRID` 的格距由 `cellSize`（区间 `[16, 200]`，默认 64）控制、格子形状由 `cellShape` 选择：`'square'`（默认）维持双层 `intersect` 方块格；`'dot'` 切换为**单层平铺 `radial-gradient` 圆点格**——圆从每格中心同步生长，`radial-gradient(circle, #000 0 var, transparent calc(var + 软边))`、`mask-size` = 格距、`repeat` 平铺，**免 `@supports`**（不需要 intersect，完全复用 `buildRevealAnimationCSS`，styles.ts 零改动）。末帧覆盖数学：相邻圆心距 = 格距，圆要盖住整格需半径 ≥ 半对角线，故 `to = ceil(格距 × √2 / 2)`（**直径终值 ≥ 格距 × √2**）；`from = -软边` 首帧圆半径为负被 stop 单调化夹成零宽。**`direction` 对圆点格静默**：单层平铺没有推进轴，四向的圆都是同步生长（方块格的方向感来自 lead 层起始边生长，圆点格没有这一层）——探针四向注入 CSS 逐字节一致；静默正是不撞约束 4 的原因（它是既有类型的参数变体而非新类型）。
- **BLINDS**：叶片宽 `slatWidth`（默认 72）的条带平铺（`mask-repeat: repeat`），每根叶片的不透明段从 `-feather` 长到 `slatWidth`；软边 `feather = min(20, round(slatWidth × 0.28))`（`BLINDS_FEATHER_RATIO` / `BLINDS_MAX_FEATHER_PX`），超出叶片边界的部分被平铺裁掉，形成相邻叶片硬边相接的百叶窗观感。`direction` 决定渐变角与平铺轴（LTR/RTL 竖条沿 x、TTB/BTT 横条沿 y）。
- **SCAN**：单层满铺（`no-repeat`），实心段之后跟一条 12px、α=0.4 的前缘光束 + 4px 渐隐尾（`SCAN_BAND_WIDTH_PX` / `SCAN_BAND_ALPHA` / `SCAN_FADE_WIDTH_PX`）；`to = 推进轴全长 + 光束总宽`，保证末帧实心段盖满视口、光束整体扫出画面（覆盖余量同 CIRCLE 的哲学）。
- **QR_GRID**：百叶窗的二维版——"列约束 ∩ 行约束"两条渐变以 `mask-composite: intersect` 求交，交集即每格一个方块（格距 `QR_GRID_CELL_PX` = 64，软边比例同 BLINDS）；推进轴层从格子起始边生长、垂直轴层从格子中心对称生长，`direction` 决定锚定方位（LTR 左上 / RTL 右上 / TTB 顶边中点 / BTT 底边中点）。双层交集写在 `@supports (mask-composite: intersect)` 内，不支持的引擎落回基线的推进轴单层条带（观感同百叶窗），状态始终正确；**不写 `-webkit-mask-composite`**——仅支持旧语法的引擎落入基线即可，避免新旧两套 composite 关键字的级联歧义。
- **RIPPLE（v1.7，环带前缘）**：属性驱动揭开族的第四个成员，复用 `REVEAL_VAR` 与 `buildRevealAnimationCSS` 的静止蒙版盒子（`styles.ts` 零改动），差别只在渐变换成 `radial-gradient` 且**波源中心写进 `mask-image` 串**（同 `CIRCLE + reverse` 洞式的写法）——它是该族里唯一消费 `ref` 几何的类型。环带以波长 `waveWidth`（默认 18，合法区间 `[8, 60]`）为格：实心水面止于 `R − 1×W`，其后波峰落在整数格、波谷落在半整数格，主峰 α = `RIPPLE_CREST_ALPHA`(0.5)，余波按 0.55 逐圈相乘共 `RIPPLE_TRAIL_COUNT`(2) 圈（α 0.275 / 0.151）。波峰用部分 α 而非 >1：蒙版 α 就是新截图层的不透明度，半幅环带叠在完整垫底的旧层上即透亮的水线。`to = 2.1 × maxRadius + (TRAIL + 0.5) × W`，末帧实心段仍远超视口最远角（覆盖约束同其余类型）。`from = 0` 时实心段落在负半径，靠渐变规范的 stop 单调化夹成 0 长度——起始帧只剩中心一圈极淡水纹，不提前漏出新主题（无头 Chrome 冻结半径截图已核）。
- **CLOCK_SWEEP / FAN（v1.8，角度驱动族）**：与 RIPPLE 同一套静止蒙版盒子，只是动画量从 `<length>` 换成 `<angle>`、渐变换成 conic。**注册属性必须另起一名** `SWEEP_VAR`（`--theme-switch-sweep`）——`@property` 的 syntax 一经注册不可改，与 `<length>` 的 `REVEAL_VAR` 同名属非法注册；为此 `buildRevealAnimationCSS` 不再把 px / `<length>` 写死，改按 `RevealMaskSpec.varName` / `unit` 出 syntax 与值后缀（px 族输出逐字节不变）。**conic 覆盖的是角度而不是面积**：从轴心出发的任意射线都有颜色，扫满一周即盖住整平面，不需要 CIRCLE 家族"终半径够到视口最远角"的那套计算；CSS conic 的 `0deg` 就是 12 点方向、顺时针为正，做时钟擦除不需要角度偏移。`CLOCK_SWEEP` 是单层 conic + 12° 前缘软尾（`CLOCK_SWEEP_TAIL_DEG`），`to = 360 + 12`。`FAN` 用 `repeating-conic-gradient`，周期 `step = 360 / bladeCount`、`to = step`；**叶片是硬边**——软尾会在每个周期末留下渐变淡出，末帧必留一条永不闭合的缝，违反覆盖约束，`bladeCount` 限整数同理。命名：观感是"扇叶从各自起始边旋开"，不是相机光圈的"中央孔径收缩"（后者要半径维度，conic 表达不了），故定名 `FAN` 而非 `IRIS`。旋转方向（顺 / 逆）本轮**有意未开放**：options 里"仅某类型生效"的局部参数已占 5 个，再加第 6 个性价比低；真要加，首选让方向跟随 `toDark`（复用 `reverse: 'auto'` 的编排、零新参数），次选复用 `direction` 的 `ltr`/`rtl`，最差才是新选项。
- **CURTAIN（v1.9，中线对开；v1.15 接入 `direction`）**：px 驱动族的第四个成员，落在现成的 `isRevealAnimationType` / `getRevealMaskSpec` 分发里。蒙版是单层满铺的"从中心向两侧对称生长"三段渐变（`transparent calc(50% - r/2 - f)` / `#000 calc(50% - r/2) calc(50% + r/2)` / `transparent calc(50% + r/2 + f)`），与 QR_GRID 的垂直轴层同构（共用 `centerBandGradient`）。软边固定 `CURTAIN_FEATHER_PX` = 24，`to = 开合轴全长 + 2 × 软边`——两条软边都要推出画面才算盖满。**v1.15 起 `direction` 映射开合轴**：`ltr`/`rtl` → 90deg 水平（`to` = 视口宽 + 2f，观感一致——中线对称没有左右之分）；`ttb`/`btt` → 180deg **垂直幕布**（`to` = 视口高 + 2f）。默认 `ltr` 下注入 CSS 与 v1.14 逐字节一致。`reverse` 的两层板随轴切换（垂直轴 = 上板 180deg + 下板 0deg，`to` = 半高 + f）。**消费触发点仍然为否**。起始帧 `r = 0` 时实心段零宽、两侧各留一条软边，表现为中缝先透出一道光，是幕布观感的一部分而非缺陷（同 RIPPLE 起始帧的中心淡纹；探针取证口径 = 带外零漏光 + 透光点全部落在中缝带内）。
- **`reverse` 选项（v1.10，跨类型；v1.13 起 `CIRCLE` 的收起形态也由它承担）**：语义是**蒙版求补 + 动画反向**，不是新写一套动画——正向是"实心段长到盖满"，反向是"洞收缩到 0"，两者都必须在末帧达到"新层完全不透明"，只是证明方向相反（约束 2 换了一道验证）。`CIRCLE` 复用洞式生成器 `buildHoleAnimationCSS`（`HOLE_RADIUS_VAR` + 静止蒙版盒子），`orchestrate.ts` 里一个 `collapse` 判定决定是否走反向：`reverse: true` 恒收起，`reverse: 'auto'` 在 `!toDark` 时收起（`toDark` 取显式传入的 `nextIsDark`，缺省时从转场前 `<html>` 类名推导——toggle 后必为取反；无点击奇偶等隐藏状态）。**必须是三态而不是布尔**：0.3.x 的 `CIRCLE_REVERT` 语义是"跟随切换方向"，布尔的两个值都不等于它，用布尔就删不掉那个类型、只会多出一个语义重叠的选项。v1.13 按此把 `CIRCLE_REVERT` 删除（连带 `styles.ts` 里 V1.5 那条"挂旧截图层 + `z-index: 1`"的路径——V1.6 起已被洞式取代、当时就不再是默认）。**单次点击内"收起 → 扩散"两段不可行**：收起结束时屏幕已是新主题，紧随的扩散圆与背景重合不可见（transform 整页缩放与双层蒙版两种实现试错后，与需求方确认本方案）。`BLINDS` / `SCAN` / `QR_GRID` **有意不接入**：`direction` 已占那根轴，两轴表达同一件事会留下重复组合。逐类型接入判据与分期见 `docs/reverse-option-design.md`。
- **`reverse` 的接入面：`CIRCLE` / `FAN` / `RIPPLE` / `CLOCK_SWEEP` / `CURTAIN`（v1.10–v1.12）+ `SQUARE` / `RECTANGLE` / `CIRCLE_BLUR`（v1.14）+ `DIAMOND`（v1.16）共 9 个，为什么不是全部**：设计阶段写过"形状族反色成本≈0"，实现前反证，**不成立**。
  - **形状族其余 3 个（`HEXAGON` / `TRIANGLE` / `STAR`）**：蒙版是 SVG data-URI（`polygonMaskImage` 生成白色多边形），反向要"洞收缩到 0"就必须动 `mask-size` / `mask-position` —— 而这正是 phase-6 附录四/五排查过的**蒙版层设备像素对齐抖动**的病根（约 1 设备像素、与 dpr 无关、取整只缓解不根除），当初正是为此才造了静止盒子的洞式方案。多边形的硬直线比圆弧更容易显出 hairline。**v1.14 / v1.16 的翻案有边界**：「静止盒子 + 渐变补集」只对**轴对齐洞边界**（方形 / 矩形）与**对角条带洞**（菱形）成立，斜线轮廓的一般情形（六边形 / 三角 / 星形的凹凸边）不成立，故这 3 个维持不接入。
  - **`DIAMOND`（v1.16）= 两条对角「洞式条带」默认 `add`**：菱形洞 |dx|+|dy| < v 可写成两条对角条带透明芯的**交集**（max(|dx+dy|, |dx−dy|) = |dx|+|dy|），每条 = `#000 0 calc(S−v−0.5px), transparent …, #000 calc(S+v+0.5px)` 的透明芯条带，add 下透明区 = 两芯交集 = 菱形洞。**roadmap 原猜的 intersect + `@supports` 门控被预检证伪**（intersect 给的是两芯并集 = 八角星洞；add 是默认合成，免门控，"基线降级 = 径向洞"一说作废）。几何：`S = L/2 + (触发点 − 视口中心)·u` 烘进 px 常量（`L = (宽+高)×√2/2`）；`v0 = 四角 (|dx|+|dy|)/√2 的最大值`（菱形盖住视口的充要条件）；`from = 1.05 × v0`、`to = 0`。探针帧证据：菱形洞左顶点精确落在预测位置、四条 45° 直边围绕触发点收缩；与 CIRCLE-reverse 的区分度（5.0–6.4%）与家族自身量级（SQUARE-vs-CIRCLE 正向 1.1–7.2%）相同。
  - **`CURTAIN` 曾被判"做不到"，那是错判，PR3 后翻案**：错在**只试了单渐变**。正向串取补得到的居中透明带被钉在 50%，无论 `r` 收到多负都消不掉（末帧实测 40 全透 + 150 半透 / 6400；过冲与"单渐变两侧板"两种改法都只减小不消除）。换**两层 + 默认 `mask-composite: add`（取最大 alpha）**就干净了：左板 `90deg`、右板 `270deg`，软边都朝内，两板在中央重叠时取 max 而不是相互抵消。`from = -软边`（首帧两板整体在屏外）/ `to = 半屏 + 软边`（两板都越过中线），探针实测首帧 6400/6400 全隐、末帧 0 残留、推进近似线性。**教训：证伪一个方案之前要先穷举构造空间**，"单渐变取补"只是其中一类。
  - **`FAN` 能做的根本原因**：它是**硬边**（`getFanRevealSpec` 的注释就写明软尾会留下永不闭合的淡缝）。透明带 `transparent 0 var` 与实心段 `#000 var step` 共用同一个 var，var→0 时两组 stop 同时归位到 0deg，带子塌成零宽而不留缝。对照实验（三位置探针）：start 6400/6400 全透、mid 3272 半揭、end **0 全透 0 半透** —— 末帧的干净由 start/mid 证明蒙版确实在生效，不是解析失败的假阳性。
  - **`RIPPLE` 反向的两端都不能照抄正向（PR3 实测）**：① 终点必须过冲到 `-前缘宽度`（`(TRAIL + 0.5) × waveWidth`）而不是 0——主峰 α=0.5 取补后仍是 0.5，收到 0 会在中心留一个约半透明圆点（末帧实测 18 个半透明采样点）；只过冲 `-1W` 仍剩 4，过冲整个前缘才归零。② 起点必须去掉正向那个 `2.1 ×` 系数（取 `maxRadius + 前缘` 而非 `2.1 × maxRadius + 前缘`）——那个 2.1 是为**正向**覆盖留的余量，反向用不上；照抄会让透明核先空收掉视口最远角以外那一大段，实测**前 60% 的时间里屏幕毫无变化**。与 SPIRAL 那轮「照抄 CIRCLE 的 2.1」是同一类错误，这次踩的是它的镜像。
  - **`CLOCK_SWEEP` 反向的观感就是当初搁置的「逆时针扫开」**：补集扇形 `[v, 360]` 的边界随 v 从 372 收到 0 是逆时针回退的，所以不必再单开顺/逆参数。它的 `from` 可以直接沿用正向 `to`——conic 覆盖角度不是面积，没有半径余量那段时间要浪费（推进分布 0→7→20→39→49→59→71→91→100%）。12° 软尾镜像到内缘后末帧仍零残留。
  - 正向与反向**共用同一份 stop 生成器**（`rippleStops(waveWidth, invert)`），补集靠 `alpha → 1 - alpha` 落在同一批位置上，单测锁「两串 stop 位置一格不差」，避免两条波带结构各自演化后失配。
  - **`BLINDS` / `SCAN` / `QR_GRID`** 是另一类理由：不是做不到，是 `direction` 已占那根轴，接入会留下重复组合。
- **`reverse` 补接 `SQUARE` / `RECTANGLE` / `CIRCLE_BLUR`（v1.14，P3-7）——「形状族做不到」收窄为「动 `mask-size` / `mask-position` 这条路做不到」**：三个都改用**静止盒子 + 渐变补集**（蒙版盒子完全静止、只动 `REVEAL_VAR`，与 CURTAIN 反向同路数），完全不碰 SVG 蒙版的 `mask-size` / `mask-position`，抖动病根不出现。
  - **SQUARE / RECTANGLE = 四块边缘板 `add`**（默认合成，免 `@supports`）：左 `90deg` / 右 `270deg` / 上 `180deg` / 下 `0deg`，中心掏「触发点 ± 半宽」的洞，触发点偏移烘进 stop 的 px 常量（同 RIPPLE 圆心写法）。端值不照抄任何正向余量：`from = max(halfW, halfH) + 软边`（每块板的斜坡外端恰好出屏，首帧全隐；正向的 1.05 覆盖余量是给末帧 mask-size 的，照抄只会空转）、`to = 0`（相邻板实心段相接、重叠处 `add` 取最大，末帧零残留）。软边 `SHAPE_REVERSE_FEATHER_PX = 24`，与 `CURTAIN_FEATHER_PX` 同值但独立定义（语义一个是幕布、一个是洞边斜坡）。RECTANGLE 的洞按轴归一保持视口比例（不然两轴共用一个 v 会退化成正方形洞、撞 SQUARE 的身份）：归一因子 = (半边 + 软边) / 基准，且**向上舍入**（ceil 到 4 位）——四舍五入偏小时首帧在窄轴漏 0.01px 级淡边（实测踩到，单测穷举锁住）；软边必须留在因子内一起归一，否则 k < 1 的轴漏一段淡边。
  - **CIRCLE_BLUR = 径向洞 + 宽羽化**（机制同 `CIRCLE` reverse 洞式）：羽化半宽取正向 feGaussianBlur 的像素 σ（`blurAmount × 1.2 × 正向终尺寸 / 100`，终尺寸公式与正向几何共用同一函数防漂移；1280 视口默认参数下 ≈142px），让收拢的软边与正向扩散的模糊边观感一致。端值同样两端都不照抄：`from = maxRadius + 羽化`（首帧全透明段恰好盖住视口最远角；正向 `4 × (长边 + 200)` 是 mask-size 的覆盖余量，照抄成起点只会空转）、`to = −羽化`——软边残留用 RIPPLE 反向已验证的**过冲技巧**：主斜坡中点归零时中心 α 仍 < 1（羽化越宽越明显），必须过冲一整段羽化宽让 #000 段从 0 起盖满全屏。
  - 探针取证（jitter-lab，seek 模式 80×80 = 6400 采样点）：三类型首帧 6400/6400 全隐、末帧 6400/6400 零残留、推进单调。引擎矩阵 WebKit（截图判据，`verify-engine.mjs --reverse-types`）与 Firefox（录像取证，`verify-firefox-video.mjs --reverse-types` D 阶段）三类型全绿。
- **Safari 兼容**：只用 mask 动画，不碰 view-transition 伪元素上的 clip-path 和 WAAPI；`will-change: mask-size, mask-position`。
- **duration / easing 变量化注入**：注入的临时 `<style>` 中动画声明一律写
  `animation: <name> var(--theme-switch-duration, 750ms) var(--theme-switch-easing, ease-in-out) both;`
  两个变量定义在同一份样式表的 `:root` 规则里。用户传任意合法 timing-function（`cubic-bezier(...)`、`linear(...)`、`steps(...)`）直接生效，零字符串拼接。说明：点击坐标和蒙版终尺寸是逐次计算的运行时值，仍需插值进 keyframes——变量化只覆盖 duration / easing 两项。
- **样式生命周期**：固定 styleId，注入前先移除旧节点（防快速连点叠加样式），转场结束后 `setTimeout(duration)` 清理。
- **SSR 安全**：core 全部入口有 `typeof window/document` 守卫；React 侧要求 `'use client'`，Vue composable 天然客户端安全。
- **非受控持久化**：`localStorage` key 为 `'theme-switch-animation'`（v1.2 修订 #1）。

## 8. 里程碑（v1.1 修订 #4：Phase 2 拆分）

> 2026-09-24 注：Phase 0–6 已全部交付，0.4.0 已发布，本节保留作规划原貌，不再更新。

- **Phase 0**：脚手架——pnpm workspace、tsup、vitest、changesets、CI（lint + typecheck + test + build），theme-switch-animation 包名、exports 与 engines 字段就位。
- **Phase 1**：core——5 种动画类型、CSS 变量化样式注入、降级逻辑；mask 几何计算（四角距离、终尺寸）单测。
- **Phase 2a**：React 适配 + **非受控模式**——先跑通基本动画、localStorage/class 管理、flushSync 渲染。**不含受控协议**。
- **Phase 2b**：**受控模式**——MutationObserver 同步协议（§5.4）+ 与 next-themes 联调。**单独成阶段**：受控同步协议是核心难点，若遇阻不影响 core 与非受控模式的发布；先按 MutationObserver 方案跑通，再评估是否换混合模式。
- **Phase 3**：Vue 适配——转场回调 `async () => { ...; await nextTick() }` 路线，`flush: 'sync'` 作为备案；Vue playground。
- **Phase 4**：Nuxt 模块（`/nuxt` 子路径、`addImportsDir` 自动导入含 core 重导出、`@nuxt/kit` optional peer）+ Next playground 接 next-themes、Nuxt playground 接 @nuxtjs/color-mode 联调 + Vue Promise 回调实测（见 §9 验收 1）。
- **Phase 5**：文档站（每种动画 live demo、双模式说明、两个第三方库接入指南，Firefox 手测说明见 §9 验收 8）→ 发布 0.1.0。

## 9. 验收标准

1. **Vue Promise 回调实测**（Phase 4 硬性）：Vue playground 中 3 秒内连续快击 10 次——无动画错位、无状态不同步、无 skipped-transition 报错、最终 class 与 `isDark` 一致；若失败，切换 `flush: 'sync'` 或手动等待渲染完成后再 resolve 回调，重测通过。
2. **受控 × next-themes 联调**：Next playground 中每次切换的蒙版下都是目标主题截图（不允许"新蒙版展开但底下是旧主题"或白闪）；快速连点后 `resolvedTheme`、`isDark`、`<html>` class 三者一致。
3. **受控 × @nuxtjs/color-mode 联调**：Nuxt playground 默认配置（类名 `dark`）通过；再配一组 `classSuffix: '-mode'` + `darkClassName: 'dark-mode'` 验证可配置性。
4. **降级**：不支持 View Transitions 的环境 → 瞬切且受控/非受控状态均正确；`prefers-reduced-motion: reduce` → 无动画。
5. **SSR**：Next RSC + Nuxt SSR 下无 hydration 报错、无服务端 localStorage 访问。
6. **变量化**：分别传 `cubic-bezier(...)` 与 `linear(...)`，DevTools computed style 确认生效；自定义 duration 生效。
7. **受控协议超时压力测试**（v1.1 修订 #1、v1.2 微调 #2）：在 Chrome DevTools 中开启 CPU 4x/6x throttling + Slow 3G 网络节流，实测 next-themes / color-mode 的 300ms 超时触发频率；若频繁触发，按 §5.4 备选方案改混合模式（库回调内直接改 class + 同步通知外部状态），并重测。
8. **Playwright e2e 矩阵**（v1.1 修订 #5）：**只跑 Chromium 和 WebKit**。理由：Playwright 的 WebKit 引擎与 Safari 存在差异；Firefox 的 View Transitions 自 144 才支持，Playwright 自带的 Firefox 版本可能未默认启用。Firefox 用**真机手动测试**，暂时跳过，并在文档（README + 文档站）注明。（**口径已演进，本条按当时规划保留原文**：Firefox 144+ 支持 View Transitions 后，现行验收走录像取证矩阵——`AGENTS.md`「引擎矩阵」，v1.14–v1.16 各轮均记录「Firefox 录像全绿」。）
9. **Nuxt 自动导入完整性**（v1.1 修订 #2 新增）：全新 Nuxt 项目仅加 `modules: ['theme-switch-animation/nuxt']`，`useThemeAnimation`、`ThemeAnimationType` 及所有类型**无需 import 即可使用且有完整类型提示**（`nuxt prepare` 通过、TS 无报错）。
10. **单测**：mask 几何（四角最大距离、终尺寸）与 v1.6 的属性驱动规格（BLINDS / SCAN / QR_GRID 的起止值、渐变角、平铺尺寸、`@supports` 双层与降级基线）、v1.7 的 RIPPLE 环带（stop 序列与衰减 alpha、波长缩放、末帧实心段覆盖最远角、波源取自触发点）、v1.8 的角度族（conic 串与软尾、`to = 360 + 尾宽` 与视口无关、扇叶周期随 bladeCount 缩放及非整除精度、注册属性分名、守卫互斥）、v1.9 的 CURTAIN（三段对称渐变串、`to = 视口宽 + 2×软边`、四个 direction 取值结果一致、分发命中与守卫互斥）、v1.10 的 reverse（三态校验与非法值回落、`CIRCLE + true` 的洞式 CSS 结构基线（注册属性声明、渐变两侧 stop、静止蒙版盒子、末帧半径收零、无 `z-index`）、`'auto'` 两态分别等于 `false` / `true`、`FAN` / `RIPPLE` / `CLOCK_SWEEP` 反向取补串与端点（RIPPLE 起点去掉 2.1 余量、终点过冲整个前缘）、`CURTAIN` 反向的两层 add 结构与两端软边、补集与正向的 stop 位置一格不差、分发 reverse 位对已接入类型都生效、未接入类型传 `true` 输出不变）、v1.14 的三类型反向（`SQUARE` / `RECTANGLE` 四板 add 串结构与四条 extent、首帧全隐不等式对中心与四角穷举、末帧四板相接覆盖全屏、RECTANGLE 归一因子向上舍入与软边归一、`CIRCLE_BLUR` 径向洞宽羽化串与两端值（起点 = maxRadius + 羽化、终点过冲一整段羽化宽）、羽化随 blurAmount 缩放、未接入的形状族 4 个传 `true` 输出不变）、v1.15 的参数化（`CURTAIN` 的 direction 两轴映射与 reverse 随轴、`QR_GRID` cellSize 缩放平铺周期与软边、圆点格串结构与 `to = ceil(格距 × √2 / 2)` 覆盖数学、`from = -软边` 首帧全隐、direction 静默的结构保证、cellSize / cellShape 非法值回落）、v1.16 的 DIAMOND 反向（对角透明芯条带 add 串结构与两条 S 常量、`from = 1.05 × v0` 端值（v0 = 四角 (|dx|+|dy|)/√2 最大值，不照抄正向 √2×1.05 外接圆余量）、首帧全隐不等式对中心与四角穷举、末帧零残留的结构保证、免 `@supports` / 无 mask-composite、未接入的形状族 3 个传 `true` 输出不变）全覆盖；TS strict 通过。
11. **发布清单**：`npm pack` 内容 = dist（含 nuxt-runtime 目录）+ LICENSE + README；四个子路径（`.` / `./react` / `./vue` / `./nuxt`）exports 均可解析。

## 10. 修订记录

### v1.20（2026-11-03）

类型导出清理（需求方定性"重构遗留"，批准删除）。**未发版**，changeset 已备、待下次 `changeset version` 消费为 **minor 0.6.0**。

1. **从公开入口收回 11 个零消费类型导出**：`ShapeAnimationType`、`MaskGeometry`、`Point`、`QrGridMaskSpec`、`Size`、`BuildAnimationCSSParams`、`DomUpdateResult`、`RunThemeTransitionParams`、`RunThemeTransitionResult`、`StoredTheme`、`WaitForThemeSyncOptions`。删前逐一 `git grep -w` 复核（`packages/` + `apps/docs` + `playgrounds/` + `scripts/` + 测试），确认仓内零消费。11 个定义全部**保留**——它们仍是公开/内部函数的参数或返回值签名（如 `getCircleMaskGeometry(): MaskGeometry`、`runThemeTransition(params: RunThemeTransitionParams)`），删定义会删坏实现；收回的只是 `packages/core/src/index.ts` 的 `export type` 再导出。react / vue / nuxt 子路径本就只 re-export 公开 API 类型，零改动。
2. **产物形态变化（实测 `pnpm build` 后核）**：`dist/index.d.ts` 不再按名导出这 11 个类型；其中 `MaskGeometry` / `QrGridMaskSpec` / `BuildAnimationCSSParams` 等仍以非导出 interface 存在于 d.ts 内（作为 `buildAnimationCSS` 等公开函数签名的结构类型），消费者推断不受影响，仅失去按名 `import type` 的能力。运行时 mjs 产物逐字节不变（纯类型面）。
3. **破坏性承载方式**：0.x 阶段按 minor 承载 breaking（沿 0.2.0 删四向类型、0.4.0 删 `CIRCLE_REVERT` 先例），changeset `.changeset/remove-unused-type-exports.md` 记 minor 并列明名单与迁移含义。
4. **闸门**：`lint` / `typecheck` / `test`（12 文件 294 例）/ `build` / `verify:package` 全绿，`apps/docs` typecheck 对新 d.ts 面 exit 0。注意 `apps/docs` typecheck 解析的是 workspace 源码（root tsconfig paths），`dist` 形态由 `verify:package` 与 build 兜底。

### v1.19（2026-11-03）

验收收口 + `apps/docs` biome 存量收敛。**无 `packages/` 代码改动**、无产物变化（tarball 逐字节不变），**不记 changeset**。

1. **挂起项确认（需求方 2026-11-03 确认继续挂起，本轮未动）**：P2-2 LOGO_MASK 设计稿（解冻未立项，前置仍是 `docs/logo-mask-design.md`）与两条等外部反馈的真机排查项（OS 整屏缩放 125% / 150%、Safari / iOS 真机清单）维持现状，`docs/next-steps.md` §1 / §2 原样保留。
2. **biome 存量收敛完成**：`biome check --write` 一次修完 20 个文件（基线 20 errors = 19 format + 1 `lint/style/useImportType`，另 1 warning）；逐文件复核非空白 diff，全部为缩进 / 换行 / 引号风格 / `import type` 内联标记，**零语义改动**。验收线全过：`pnpm -C apps/docs lint` 转绿（0 诊断）、`typecheck` exit 0、`pnpm -C apps/docs build`（next build 静态导出）exit 0——顺带补上 v1.17 轮未跑的文档站构建。`next-steps.md` §3「工程卫生」按"做完即删"整节移除；AGENTS.md 的"跑红属预期"表述同步改为"已收敛转绿、保持常绿"。
3. **v1.14 / v1.15 / v1.16 验收收口**：roadmap §3 三条状态「已落地（待需求方验收）」→「已落地（需求方验收通过 2026-11-03）」（需求方口述确认）。roadmap 状态栏是活状态字段（文件头约定"每开工一个就把那一行的状态改掉"），原地更新，不涉历史改写。
4. **v1.17 宣传片音频验收收口**：需求方 2026-11-03 人耳验收通过（v1.17 第 1 条当时记的是"未经人耳验收"＋实测口径）。**这条验收此前只在 v1.17 条目里以当时状态存在，没进 next-steps 台账**（登记位置不一致），本轮随 v1.19 一并收口。处理方式按 v1.9 第 5 条的先例（历史条目内的当时状态句不删改，在原句后加带日期的补注括弧）：v1.17 原句保留，句后已补注验收结论与本条指针。
5. **遗留登记**：11 个零消费类型导出（`ShapeAnimationType` / `MaskGeometry` / `Point` / `QrGridMaskSpec` / `Size` / `BuildAnimationCSSParams` / `DomUpdateResult` / `RunThemeTransitionParams` / `RunThemeTransitionResult` / `StoredTheme` / `WaitForThemeSyncOptions`，均随 `.` 入口进公开 d.ts）本轮**不动**，待需求方确认破坏性变更口径后单独交代。
6. **闸门**：根 `lint` / `typecheck` / `test`（12 文件 294 例）+ `apps/docs` 的 lint / typecheck / build 全绿。biome 收敛后基线清零，之后新诊断即修、不再攒。

### v1.18（2026-11-03）

文档校准 + CI 门禁补位。**无 `packages/` 代码改动**，动画类型与 options 均未变，tarball 逐字节不变，**不记 changeset**（沿 2026-09-22 纯文档轮次先例；本轮触碰的 `apps/docs`、`ci.yml`、`AGENTS.md` 均不进 tarball）。

1. **文档站 FAQ 的 direction 文案修正**：旧文案"direction 只对 BLINDS / SCAN / QR_GRID 三种类型生效，其余类型静默忽略"与 v1.15 起的现行为矛盾（CURTAIN 已消费 direction）。补上 v1.15 第 6 条要求门面写明的两条行为说明：CURTAIN 的 direction 是开合轴（`ltr`/`rtl` 水平、`ttb`/`btt` 垂直，只有两种视觉形态）；QR_GRID 圆点格的 direction 静默（单层平铺无推进轴）。措辞以 README options 表与画廊 hint 为准对齐。
2. **"门面批次"核销**：v1.14–v1.16 三条修订记录里"门面攒批押后（next-steps §1 门面批次条目）"所指事项已核实全部落地——README options 表两条行为说明、四个 playground 的 reverse 三档 / QR_GRID 格距与形状控件与提示文案、文档站画廊控件均在。next-steps 侧条目已按"做完即删"移除；历史修订条目不回填（§10 只增不改），仅在此记一笔关闭。
3. **CI 补 typecheck 盲区**：根 `tsconfig.json` 的 `include` 仅 `packages/*/src`，文档站与四个 playground 的编译此前无门禁兜底——该盲区已在 v1.15 第 6 条致两起事故（`ThemeAnimationCellShape` 类型漏转发、`BLADE_OPTIONS` 误删的运行时 ReferenceError）。本轮：`apps/docs` 补 `typecheck` 脚本（`tsc --noEmit`）；`ci.yml` 在 Build 之后加「Typecheck docs & playgrounds」步，逐目录跑五处 typecheck，根门禁四件套行为不变。干净环境前提实测：`.next/` 与 `next-env.d.ts` 均不存在时 docs tsc exit 0（next 类型经 next 包自身 d.ts 解析）；`playground-nuxt` 的 typecheck 内含 `pnpm -w run build && nuxt prepare`，依赖前序 Build 步，故排在其后。
4. **页脚状态同步**：npm latest 0.5.0 → 0.5.1、本文档 v1.16 → v1.18、日期 2026-09-28 → 2026-11-03。v1.17 第 7 条定的头部版本行同步约定本轮照做（v1.17 → v1.18）。
5. **闸门**：根 `lint` / `typecheck` / `test`（12 文件 294 例）+ `apps/docs` 与四个 playground 的 typecheck 全绿；`build` / `verify:package` 未跑（无 packages 改动）。`apps/docs` biome 存量诊断（20 errors = 19 format + 1 useImportType，另 1 warning）维持原样，不在本轮范围。
6. **头部 `| 日期 |` 行校准（2026-11-03，本条修订内的补充）**：该行含义是**文档初版日期**，需求方确认以 v1.17 第 7 条的说法为准——2026-09-29 是笔误，已改回 **2026-09-21**。注意它与页脚"当前状态（2026-11-03）"不是同一含义：后者是最后同步日，保持不变。§10 各历史条目标题里的日期（如"### v1.17（2026-09-29）"）是该轮修订的发生日，不在本次校准范围。
7. **P2-2 LOGO_MASK 维持待办（需求方 2026-11-03 决定）**：本轮不动，保持"解冻但未立项"状态；`docs/next-steps.md` §1 的 P2-2 条目原样保留，启动前置仍是消毒规则设计稿 `docs/logo-mask-design.md`。
8. **biome 存量收敛择期执行（需求方 2026-11-03 批准，本轮不执行）**：`apps/docs` 的 20 errors + 1 warning 属还开着的待办，已按 docs/ 约定登记进 `docs/next-steps.md` §3（新增小节，写明完成后即删、范围限 `apps/docs`、验收 = `pnpm -C apps/docs lint` 转绿）。

### v1.17（2026-09-29）

宣传片交付 + README 门面改版，顺带修掉 npm 包首页的裂图。**无 `packages/` 代码改动**，动画类型与 options 均未变。

1. **宣传片（工程在仓库外）**：`E:\personal-project\.video-work\theme-switch-film\`，横版 `renders/final.mp4`（1920×1080·57s·含 9 句中文口播）、竖版 `renders/final-vertical.mp4`（1080×1920·硬字幕）、三张封面 `covers/cover-{16x9,4x3,3x4}.png`；无口播版另存。产品仓库代码零改动，所有适配（真组件挂载、把不可 seek 的 View Transition 暂停后按电影时钟写 `currentTime`、`matchMedia('(prefers-reduced-motion)')` 按时钟命中以实拍降级镜头）都在视频工程侧。配乐/口播的自动检查全绿，但**音频未经需求方人耳验收**（实测口径：−16.0 LUFS / −1.5 dBTP，口播窗口 2–8kHz 能量 +4–5.5 dB）。（2026-11-03 补注：已经需求方人耳验收通过，见 v1.19 第 4 条。）
2. **README 门面改版**：删掉 `## 📸 预览` 小节与文档站首页截图，改成居中入口链接行（文档站 / 产品宣传片 / npm / 开发规范）+ 一张整块可点的 16:9 封面跳抖音短链。判据来自需求方两轮反馈：「预览太多了，显示一个封面跳转抖音就可以了」→「和 better-admin 的 README 一样」。封面规格 1760×990 / 288KB，命名对齐 `assets/video/<pkg>-promo-cover-16x9.png`。
3. **npm 裂图根因（实测）**：`package.json` 的 `files: ['dist']`，`assets/` 不进 tarball，而 npm 的 README 渲染不解析 `./assets/...` 相对路径——同一份 Markdown 在 GitHub 正常、在 npm 页面是裂图。2026-09-29 探测 registry 的 `readme` 字段确认线上 0.5.0 仍是 `![…](./assets/screen.jpg)`，即**该缺陷当时已在生产环境存在**。修法：门面图片改 `https://raw.githubusercontent.com/<owner>/<repo>/main/<path>`（探测返回 200），两处 `LICENSE` 链接改 GitHub blob 页，README 内留注释防止被改回相对写法。两条连带口径：raw 地址解析的是**远端分支**，push 之前图必然 404（不是 bug）；npm 页面是 JS 渲染，`curl` 只拿回约 5KB 空壳，**渲染结果无法自证**，只能核 URL 可达 + 人工确认。
4. **门面截图资产作废**：`assets/screen.jpg` 删除（README 是它唯一消费者，全仓 grep 无代码引用）。`docs/animation-roadmap.md` §5 撤回清单第 6 项与「顺序建议」里的重拍表述同步去掉。**不改写的两处**：本文件 v1.7 第 5 条、`docs/reverse-option-design.md` §7 的「门面截图…必须重拍」——分别是历史修订记录与 PR4 迁移面记录，按归档规则保留原文。
5. **changeset 判定：本轮记 patch**（`.changeset/readme-promo-cover.md`）。与 2026-09-22 那轮「纯文档站轮次不记 changeset」的区别：那次 tarball 逐字节不变，本轮 **README 本身随包发布**，npm 页面内容确实改变且修的是线上现存缺陷。`changeset status` 实测：`patch / theme-switch-animation`。代价照旧——下次 `changeset version` 会切出一个 `dist/` 与 0.5.0 相同、只有 README 不同的版本。
6. **文档站 hero 是另一条链路**：`apps/docs/public/video/theme-switch-promo-16x9-57s.mp4` + `cover.jpg` + `components/landing/promo-video.tsx`，与 README 门面互不带动。需求方要求 hero 内**只留播放器本体**——不加边框/bezel、不加下方说明文案。
7. **头部表格 `| 版本 |` 行的同步约定**：我把两种读法摆出来（每轮 §10 都跟着涨 / 只记 spec 文档自身的大版本），需求方判「对齐」，即这行跟随 §10 最新条目——本轮按此更新到 v1.17，先例是 `15f4ead` 把 v1.14 改成 v1.15。v1.16 那轮漏同步，**不回填**（历史条目改不出第二版），只在本行括注里记一笔。`| 日期 |` 仍是 2026-09-21 = 文档初版日期，历轮修订均未动它，不是遗漏。
8. **闸门**：根 `lint` / `typecheck` / `test`（12 文件 294 例全过）/ `build` + `verify:package` 全绿（`pnpm build` 而非 `npx tsup`，保住 `postbuild` 的 nuxt-runtime 拷贝）；`dist/` 不入库，build 未污染工作树。未跑：文档站 `next build` 与四个 playground typecheck——本轮未触碰 `apps/docs` 与 `playgrounds/`，且 `apps/docs` 有并行会话的未提交改动在写，避免互相覆盖。

### v1.16（2026-09-28）

`reverse` 补接第二批（roadmap P3-10）：`DIAMOND`，接入面 8 → 9。

1. **预检先行（P3-9 确立的门槛沿用）**：候选构造在 jitter-lab（clean 变体，750ms ease-in-out 同一时间轴）与 CIRCLE reverse / SQUARE reverse / DIAMOND 正向 A/B，6400 点网格探针 + 帧存档。
2. **机制修正：roadmap 原猜的「两条对角反带 `intersect` + `@supports` 门控」被预检证伪**。intersect（取交集）给出的是两条透明芯的**并集**洞（八角星），不是菱形；可用的构造是**两条对角「洞式条带」默认 `add`**：每条 = `#000 0 calc(S − v − 0.5px), transparent calc(S − v + 0.5px) calc(S + v − 0.5px), #000 calc(S + v + 0.5px)` 的透明芯条带，add 下透明区 = 两芯的**交集** = 菱形洞；条带两端实心保证 v = 0 末帧全盖满。**免 `@supports`**（add 是默认合成，无需门控，原「基线降级 = 径向洞」一说作废）。
3. **几何**：`S = L/2 + (触发点 − 视口中心)·u` 烘进 px 常量（`L = (宽 + 高) × √2/2`，u 为 135°/45° 渐变方向单位向量，与渐变线的"魔法角"起点约定一致）；`v0 = 四角 (|dx| + |dy|)/√2 的最大值`（菱形洞盖住视口的充要条件——max(|dx+dy|, |dx−dy|) = |dx|+|dy|）；`from = 1.05 × v0`（同 SQUARE_COVERAGE_MARGIN 口径）、`to = 0`。0.5px 斜坡是洞边抗锯齿（同 CIRCLE reverse 的 ±0.5px）；v→0 时两带各留一条亚像素 dip 线、仅在触发点交叉处留 ~1px 半透明点——与 CIRCLE reverse 中心像素同类容忍（6400 点网格探针不可见，末帧 6400/6400 实测）。
4. **预检判据的校准教训（诚实记档）**：预注册阈值「vs 双同类项帧差 ≥8%」未命中（vs CIRCLE-reverse 中段 5.0–6.4%）——但**家族基线校准**（已发布 SQUARE 正向 vs CIRCLE 正向，同为形状族、需求方已接受为可区分的独立类型）中段帧差 1.1–7.2%，候选与 CIRCLE-reverse 的区分度（5.0–6.4%）与家族自身量级相同。8% 是未量基线就拍的口径错误（P1-4 教训的又一实例：阈值必须先量基线再定，预注册 ≠ 免校准）。最终按 next-steps P3-10 原文拓扑判据判定 GREEN：帧证据（t=375 帧左顶点 kink 精确落在双条带菱形的预测左顶点 (140.4, 294.2)；t=469 帧完整菱形洞、四条 45° 直边围绕触发点收缩）证明「菱形洞收拢」是 CIRCLE reverse（圆弧洞）与 SQUARE reverse（轴对齐方洞）都给不出的拓扑。需求方观感权威保留——验收不过按 §5 整体撤回。
5. **验收线**：门禁四件套 + `verify:package` + `test:acceptance` + 引擎矩阵（WebKit / chromium:chrome 截图判据 + Firefox 录像，`--reverse-types=DIAMOND` 口子沿用 v1.14）。
6. **文档站画廊**：DIAMOND 卡挂 `Reverse` 三档控件；playground / README 门面继续攒批押后（next-steps §1 门面批次条目）。

### v1.15（2026-09-28）

参数化小项（roadmap P3-8，不占类型名额）：`CURTAIN` 接入 `direction`；`QR_GRID` 格距与格子形状放开为选项。

1. **`CURTAIN` + `direction`（①）**：`direction` 从静默改为映射开合轴——`ltr`/`rtl` 水平幕布（观感一致）、`ttb`/`btt` 垂直幕布（上下开）。默认 `ltr` 下注入 CSS 与 v1.14 逐字节一致（零破坏）。`reverse` 的两层板随轴切换。**中缝透光带的探针口径**：CURTAIN 正向首帧的开合轴中线 ±24px 透光是设计观感（P0-1 已记录），探针判据改为"带外零漏光 + 透光点全部落在带内"，不能照搬"首帧 6400/6400 全隐"。
2. **`QR_GRID` + `cellSize`（②）**：`QR_GRID_CELL_PX` 常量放开为选项，区间 `[16, 200]` 同 slatWidth 策略，默认 64；软边沿用按比例封顶（`getBlindsFeatherPx`）。
3. **`QR_GRID` + `cellShape: 'dot'`（③）**：单层平铺圆点格，免 `@supports`、完全复用 `buildRevealAnimationCSS`（styles.ts 零改动）。末帧覆盖数学 `to = ceil(格距 × √2 / 2)`（直径 ≥ 格距 × √2）。**`direction` 对圆点格静默**——单层平铺没有推进轴，四向注入 CSS 逐字节一致（探针取证）；静默正是不撞约束 4 的原因（参数变体而非新类型）。
4. **P0-1 遗留的分数缩放 dpr 档顺带核销**：垂直幕布在 `--dsf=1.25 / 1.5` + `--variant=clean` 下各仅 1 帧含真极值线且为 t=0 起始帧中缝透光（与 next-steps §2 的 CURTAIN 基线判据一致），无伪影。**取证命令必须带 `--variant=clean`**：非 clean 变体的卡片/文字边缘会把极值线帧数抬高到 9~14 帧，全是内容边缘不是蒙版伪影。
5. **验收线**：门禁四件套（288 单测）+ `verify:package` + `test:acceptance` + 引擎矩阵（WebKit + Firefox 录像，全类型正向 + P3-7 三类型反向回归）。CURTAIN ttb 与 QR_GRID dot 变体的跨引擎证据 = Chrome 6400 点探针 + 机制同构论证（180deg 对称带与 90deg 仅轴向差，两轴的 linear/radial + calc(var) 组合已在 FF 15/15 全类型覆盖）；矩阵脚本未为变体加参数，避免为一次性取证扩共享脚本面。
6. **文档站画廊**：CURTAIN 卡挂 Direction 控件、QR_GRID 卡挂 Cell（方块/圆点 × 32/64/128px）控件；playground / README 门面按 roadmap §5/§6 继续攒批押后。**react / vue 适配层补转发 `ThemeAnimationCellShape` 类型**（gallery 引它写控件类型时 tsc 抓到缺失——根/包的 typecheck 不覆盖 apps/docs，文档站的编译错误只能靠 apps/docs 自己的 `tsc --noEmit` 或 next build 兜底）；gallery 一次编辑误删 `BLADE_OPTIONS` 常量（FAN 卡运行时 ReferenceError，需求方报出）同属这个盲区，两处均已修复。**门面批次必须写明的两条行为说明（需求方 2026-09-28 真机确认预期内，要求文档落地）**：① QR_GRID 圆点格的 `direction` 静默——单层平铺无推进轴、圆点从各格中心同步生长，四向观感一致；② CURTAIN 的 `direction` 是开合轴而非四向——`ltr`/`rtl` 同为水平、`ttb`/`btt` 同为垂直，只有两种视觉形态（与 BLINDS / SCAN / QR_GRID 共用同一枚举，落到 CURTAIN 折叠成两轴）。README options 表、文档站 options/features 文案、四个 playground 引导文案都要带上。
7. **脚本健壮性**：`verify-firefox-video.mjs` 对 `FF_WORK_DIR` 先 `mkdir -p` 再 `mkdtemp`——该目录与 verify-engine 共享 OUT_DIR，后者启动即清空，父目录经常刚被删（本项实测两次踩中 ENOENT）。

### v1.14（2026-09-28）

`reverse` 补接第一批（roadmap P3-7）：`SQUARE` / `RECTANGLE` / `CIRCLE_BLUR`，接入面 5 → 8。

1. **机制：静止盒子 + 渐变补集，不动 `mask-size` / `mask-position`**。v1.10 的「形状族 6 个做不到无副作用」收窄为「动 `mask-size` / `mask-position` 这条路做不到」——抖动病根只在逐帧动画蒙版盒子尺寸 / 位置时出现；蒙版盒子完全静止、只动注册属性 `REVEAL_VAR` 的渐变补集（CURTAIN 反向同路数）不在此列。构造细节与端值推导见 §7 专条。
2. **SQUARE / RECTANGLE = 四块边缘板 `add`**（免 `@supports`），CIRCLE_BLUR = 径向洞 + 宽羽化（过冲一整段羽化宽，RIPPLE 反向同技巧）。**RECTANGLE 必须按轴归一**保持洞的视口比例，否则退化成正方形洞、撞 SQUARE 的身份；归一因子向上舍入（四舍五入偏小时首帧漏 0.01px 级淡边，实测踩到后修正）。
3. **端值全部探针实测**（取补串两端值是 CURTAIN / RIPPLE 反向各踩过两处的历史雷区）：三类型 seek 模式首帧 6400/6400 全隐、末帧 6400/6400 零残留、推进单调，一次通过；`from` 都不照抄正向覆盖余量（SQUARE 的 1.05、CIRCLE_BLUR 的 4×(长边+200) 照抄只会空转）。
4. **验收线全绿**：门禁四件套 + `verify:package` + `test:acceptance`（7/7）+ 引擎矩阵（WebKit 截图判据；Firefox 录像取证）。两个矩阵脚本各加 `--reverse-types` 口子（默认不传 = 行为不变，历史调用零影响），Firefox 侧为反向形态新增 D 阶段。两处取证管线经验：**FF_WORK_DIR 必须传绝对路径**（相对路径会让 ffmpeg 的 `cwd: work` 把输出路径双重解析成不存在目录，实测 I/O error）；`judgeStepped` 的假档过滤改为「中位段长 ≥5 **或** 最长档 ≥8」——每档 450ms dwell 在 ~25fps 下 ≈11 帧，最长档 ≥8 即帧率正常、len ≤ 2 的短段必是 webm 乱序假档，只看中位会被过渡帧压低门槛放行假档（复跑时 CIRCLE 正向 `36×2`、RECTANGLE 反向 `251×2` 各吃到一次假非单调）。**两脚本不能并行跑**：verify-engine 启动即清空共享的 `scripts/.verify-engine-out/`，会端掉 verify-firefox-video 正在用的抽帧目录（表现为 ffmpeg 随机 ENOENT，极易误判成 flaky）。
5. **文档站画廊**：`CIRCLE_BLUR` / `SQUARE` / `RECTANGLE` 三张卡补 `Reverse` 三档控件（控件本体 v1.10 已有，本次只挂卡）；README / 文档站文案 / playground 门面按 roadmap §5/§6 攒批押后。

### v1.13（2026-09-24）

`reverse` PR4：**删除 `CIRCLE_REVERT` 类型**（破坏性，与 PR1–PR3 一起进 0.4.0）。

1. **移除 `ThemeAnimationType.CIRCLE_REVERT`（值 `'circle-revert'`）与导出函数 `getCircleRevertMaskGeometry`**，动画类型 16 → 15 种。等价写法 `CIRCLE + reverse: 'auto'`（无论切哪个方向都收拢则 `reverse: true`）。需求方指令"PR4 一起改了，在迁移文档上标明就行"，**覆盖了设计文档决策 7** 原定的"先 deprecated 跨一个 minor 再删"——`@deprecated` 标记、开发环境一次性提示、两个 release 的迁移窗口随之作废，迁移说明落到 README「从 0.3.x 升级」一节。
2. **`styles.ts` 一并删掉 V1.5 那条"收起挂旧截图层 + `z-index: 1`"的路径**（`revertDirection` 参数与 `onOld` 分支），`::view-transition-new(root)` 选择器从此写死：V1.6 起洞式已是默认，那条分支只剩公开 API 的兜底，`orchestrate` 从未走到。
3. **洞式机制整体保留**：`CircleHoleGeometry` / `getCircleRevertHoleGeometry` / `buildHoleAnimationCSS` / `HOLE_RADIUS_VAR` 就是 `CIRCLE + reverse` 的实现，函数名沿用（纯改名另轮再做）。
4. **等价性锁改为结构基线**：原断言"归一化 keyframes 名后与 `CIRCLE_REVERT` 输出相同"无法再与被删类型对拍，换成整串结构断言（注册属性声明、渐变两侧 stop、静止蒙版盒子、起始半径算式、末帧半径收零、无 `z-index`、旧层不参与）。
5. **探测与验收脚本跟进**：`scripts/jitter-lab/lab.html` 默认改为 `CIRCLE` + `reverse: true`（该实验台测的正是洞式收起，默认语义不变），`verify-engine.mjs` / `verify-firefox-video.mjs` 显式传 `reverse` 位，不再依赖类型名。

### v1.12（2026-09-24）

`reverse` PR3 追加：`CURTAIN` 接入 —— 同时**翻掉自己在 PR2 下的错判**。

1. **`CURTAIN` 能做，此前"结构性、非调参可解"的结论是错的**。错因：证伪时只试了单渐变的三种写法
   （取补、过冲、单渐变两侧板），全失败就下了结论。实际可行的构造是**两层 + 默认 `mask-composite: add`
   （取最大 alpha）**——左右两板各自从屏幕边缘向中线长、软边朝内，重叠时取 max 而非相互抵消。
   探针实测首帧 6400/6400 全隐、末帧 0 残留、推进近似线性。
2. **两端各留一个软边宽度**：`from = -CURTAIN_FEATHER_PX`（首帧两板整体在屏外，否则边缘各漏 24px 软边）、
   `to = 半屏 + 软边`（两板都越过中线）。与正向的 `0 → 整宽 + 2 软边` 恰好对称。
3. **`RevealMaskSpec.maskRepeat` 从两个字面量放宽为 `string`**：多层蒙版要按层数写逗号列表
   （`maskSize` 本来就是 `string`）。这是内部规格类型，不影响公开调用签名。
4. **方法论记进 roadmap**：证伪一个方案前要先穷举构造空间。`COMB` / `SPIRAL` / 这次的 `CURTAIN`
   三个案例的共同点是"在有限的几种写法里找失败"，而不是"把所有可行类别试完再判"。
5. **接入面至此 5 个类型**；只剩形状族 6 个是真的做不到（必须动 `mask-size` → 像素对齐抖动）。

### v1.11（2026-09-24）

`reverse` PR3：`RIPPLE` 与 `CLOCK_SWEEP` 接入。接入面至此为 4 个类型。

1. **先探针后落码，两个类型都过**：三位置对照（start 全隐 / mid 推进 / end 零残留），末帧扫描 6400 采样点全 0。
2. **RIPPLE 撞出两个照抄正向就会中的坑**：主峰 α=0.5 的补集仍是 0.5 → 终点必须过冲整个前缘才收干净；正向 `to` 里那个 `2.1 × maxRadius` 是为覆盖留的余量，反向照抄会让前 60% 时间屏幕毫无变化 → 起点改成 `maxRadius + 前缘`。后者与 SPIRAL 那轮「照抄 2.1」是同一类错误的镜像，已写进 §7。
3. **CLOCK_SWEEP 反向 = 当初搁置的逆时针扫开**：补集边界随 v 递减是逆时针回退的，所以顺/逆方向不必再单开选项（§8 那条「留着需要时再开」正式由 reverse 吸收）。
4. **重构**：环带 stop 序列抽成 `rippleStops(waveWidth, invert)`，正向与反向共用一份定义；单测锁两串的 stop 位置一格不差。
5. **新增导出**：`getRippleMaskSpec` / `getRippleReverseRevealSpec` / `getClockSweepReverseRevealSpec`。

### v1.10（2026-09-24）

`reverse` 选项 PR1。设计定稿与分期在 `docs/reverse-option-design.md`，本节只记落地结果。

1. **新增 `reverse` 选项（§1 / §5.1 / §7）**：三态 `boolean | 'auto'`，默认 `false`。非破坏性变更，16 种类型的既有行为不变。
2. **`CIRCLE_REVERT` 标 `@deprecated`**：等价写法 `CIRCLE + reverse: 'auto'`。开发环境提示一次（模块级 flag 去重，避免每次切换都刷日志；生产构建静默），计划在 0.5.0 移除。**类型本身保留**——PR1 只做"加选项"，删类型是 PR4，两步拆开才有迁移窗口。
3. **等价性锁的一处修正**：设计文档原话是"`'auto'` 必须与现 `CIRCLE_REVERT` 逐字节等价"，实测**做不到也不该要求做到**——keyframes 名由 `getAnimationName(type)` 按类型生成（`theme-switch-circle` vs `theme-switch-circle-revert`），两份 CSS 必然差这一个标识符。单测改为**归一化名字后比较**，既保住"两种写法等价"这条锁，又不把命名差异误判成回归。
4. **`isDevEnvironment` 挪进 `types.ts`**：原先是 `controlled-sync.ts` 的私有函数，`reverse` 的废弃提示也要用它。`types.ts` 零 import、在依赖图的根上，放这里不产生环；`controlled-sync.ts` 反过来引它。
5. **`reverse` 的校验不用 `typeof`**：`isValidReverse` 逐字面量比对 `true` / `false` / `'auto'`。写成 `typeof value === 'boolean' || value === 'auto'` 的话，`'AUTO'`、`'Yes'` 这类近义值会被静默当成真值——反向是用户看得见的行为，宁可回落也不要猜。
6. **UI 面**：文档站 CIRCLE 卡与四个 playground 的 CIRCLE 卡各加 `Reverse` 三档控件（`off` / `on` / `auto`）。Vue 侧有个坑：既有控件用 `v-if="initialXxx"` 判存在，而 `reverse` 的合法值含 `false`，那样写控件永远不显示，必须 `!== undefined`。
7. **验证**：253 例（新增 7）/ lint 0 / tsc 0；四个 playground 各自工具链通过（注意根 `tsconfig.json` 的 `include` 只有 `packages/*/src`，playground 不在其中，要单独跑；Vue 侧必须用 `vue-tsc`，裸 `tsc` 不认 SFC 会假报 `Cannot find module './App.vue'`）。

### v1.9（2026-09-23）

需求方批准了 `docs/animation-roadmap.md` 的执行顺序，本轮做掉其中的 P0-1；节奏仍是"先落 core + 画廊拿结论 → 验证通过 → 补门面"。

1. **新增 `CURTAIN` 类型（§1 / §5.1 / §7）**：动画类型 15 → 16 种。无新选项、无新注册属性、非破坏性变更。
2. **比候选池预估的还便宜**：它属于"px 驱动 + 无触发点"，正好落进现成的 `isRevealAnimationType` / `getRevealMaskSpec` 分发器，`orchestrate.ts` 与 `styles.ts` 一行未改——只加了守卫里一个 `||` 与分发里一个 `if`。roadmap 把它排在 P0-1 的判断成立。
3. **探针先行验掉了 roadmap 列的待验点**：中缝无可见接缝、两侧软边对称、末帧整平面实心；起始帧中缝透出一道约 ±24px 的光，判定为加分观感而非缺陷。**分数缩放 dpr 一档仍未验**，留真机。
4. **README 的计数方式改了（需求方批准）**：特性清单与 options 表不再写死类型数量，改成"动画类型分族 + 指向下方类型表"，首段枚举加"等"字。目的是让"每加一个类型要改五处数字"的固定成本塌缩——现在 README 侧只剩表格追加行。文档站 hero 仍保留数字（那是门面卖点），因此 hero 一改门面截图就得重出，本轮照做。
5. **登记一处未合并的重复（本轮未动）**：`masks.ts` 的私有函数 `qrCenterGradient(90, feather)` 返回的渐变串与 `getCurtainRevealSpec` 逐字符相同（QR_GRID 的垂直轴层在用）。干净做法是把它重命名成中性名后两处共用，QR_GRID 的输出有单测锁死不会变；属本轮范围外的重构，等排期。（2026-09-25 已完成：重命名为 `centerBandGradient`，CURTAIN 主层与 QR_GRID 垂直轴层共用，输出串逐字符不变。）
6. **文档同步**：README 类型表与家族枚举、文档站 hero / features / `site.ts`、画廊第 16 张卡（无参数控件）、四个 playground 类型清单与"N 个按钮"文案、changeset、门面截图按既有规格重出；roadmap 的 P0-1 状态改「已落地」。

### v1.8（2026-09-23）

需求方看完涟漪后要求"把之前列的角度族两个类型做进来"；实现期间就命名与是否开放旋转方向各起一轮讨论，最终定名 `FAN`、方向不开放。

1. **新增 `CLOCK_SWEEP` / `FAN` 与 `bladeCount` 选项（§1 / §5.1 / §7）**：动画类型 13 → 15 种。`bladeCount` 默认 8、区间 `[4, 16]` 且**必须整数**（非整数会让 `360 / bladeCount` 不整除，末帧留一条永不闭合的缝），非法静默回落。非破坏性变更。
2. **`styles.ts` 首次泛化（§7）**：`buildRevealAnimationCSS` 原先把 px 与 `<length>` 写死，现按 `RevealMaskSpec.varName` / `unit` 决定注册 syntax 与值后缀。角度族必须另起注册属性名 `SWEEP_VAR`——`@property` 的 syntax 一经注册不可改，同名不同 syntax 是非法注册。px 族（BLINDS / SCAN / RIPPLE）输出逐字节不变，由既有单测锁住。
3. **角度族免掉了覆盖计算**：conic 覆盖角度而非面积，扫满一周即盖住整平面，不存在 CIRCLE 家族那套"终半径够视口最远角"的系数；`FAN` 末帧 `open = step` 天然拼成整圆。这是选它做旋转维度的主要工程理由。
4. **命名定稿 `FAN` 而非 `IRIS`**：实现出来是"楔形扇叶从各自起始边旋开"（风车感），不是相机光圈的"中央孔径收缩"——后者需要半径维度，conic 表达不了。需求方认可改名，`bladeCount` 保留（对扇叶依然准确）。
5. **旋转方向有意不开放（§7）**：options 中"仅某类型生效"的局部参数已占 5 个（`blurAmount` / `direction` / `slatWidth` / `waveWidth` / `bladeCount`），再加第 6 个会让 README 的 options 表必须靠"谁消费它"的列注释才读得懂。若将来要加，首选让方向跟随 `toDark`（复用 `CIRCLE_REVERT` 已有的编排、零新参数），次选复用 `direction` 的 `ltr`/`rtl`。
6. **实测**：先用一次性 headless Chrome 探针定案三个前提（conic / repeating-conic 作为 mask 被接受、`@property <angle>` 真逐帧插值即 seek 25% 得 `93deg`、`to = 372deg` 末帧整平面实心），再写实现；实现完成后另跑一次探针喂**库真实生成的 CSS**，确认 `calc(var(--theme-switch-sweep) - 12deg)` 这类"注册属性参与 stop 计算"的形式被逐帧求值（93° 时 computed 出 `81deg`）——手写探针当时用的是硬编码角度，覆盖不到这一层。根 236 例单测（新增 16 例）+ lint / tsc / build / verify-package + 文档站 build + 四个 playground typecheck 全绿。
7. **文档同步**：README 首段与特性清单、动画类型表两行、属性驱动段（"唯一消费 ref 几何"的表述已失效，改为 RIPPLE 与角度族三者都消费）、options 表；文档站 hero / features / `site.ts`、画廊第 14–15 张卡（FAN 卡带扇叶数 6 / 8 / 12 档位）；四个 playground 类型清单与 `bladeCount` 控件；门面截图按既有规格重出（hero 13→15 触发）。

### v1.7（2026-09-23）

需求方提出加"水滴波纹涟漪"，并定调"先看效果、不行再撤回"，故本轮走两步：先落 core 实现 + 文档站画廊，效果通过后再补齐门面文案与其余文档面。

1. **新增 `RIPPLE` 类型与 `waveWidth` 选项（§1 / §5.1 / §7）**：动画类型 12 → 13 种。`waveWidth` 合法区间 `[8, 60]`、默认 18，越界静默回落（与 `slatWidth` 同策略）；余波圈数与衰减系数固化为导出常量 `RIPPLE_TRAIL_COUNT` / `RIPPLE_CREST_ALPHA`（沿 `SCAN_BAND_*` / `QR_GRID_CELL_PX` 的先例，不做选项膨胀）。非破坏性变更，其余 12 种类型的行为逐帧不变。
2. **零新机制（§7）**：涟漪复用属性驱动揭开族的 `REVEAL_VAR` + 静止蒙版盒子，`styles.ts` 一行未改；新增导出只有 `getRippleRevealSpec` / `isRippleAnimationType` / `getRippleFrontExtentPx` 与三个常量。兼容面与 BLINDS / SCAN 完全一致（同样依赖 `@property`；未注册的引擎取 `to` 值即直切，状态仍正确）。
3. **该族首个消费触发点几何的成员**：`RevealMaskSpec` 的"无触发点"叙事随之修正——BLINDS / SCAN 仍不消费 `center`，RIPPLE 把波源写进 `radial-gradient` 串。`getRevealMaskSpec` 的公开签名保持不变（涟漪在 `orchestrate` 里走独立分支），避免对已导出函数做破坏性改动。
4. **实测**：无头 Chrome + CDP 冻结半径截图，核了起始帧（负 stop 单调化后只剩中心一圈极淡水纹）与中段环带；波源圆心与按钮中心逐位一致（读注入 `<style>` 的 `circle at X Y`）；末帧覆盖由几何断言锁死（`to − waveWidth > maxRadius`）。根 220 例单测（新增 10 例）+ lint / tsc / build + 文档站 `tsc` 全绿。
5. **文档同步**：README 数量与两张表、文档站 hero / features / `site.ts` 的 SEO description、画廊第 13 张卡（卡内波长档位 10 / 18 / 34px）、四个 playground 的类型清单与 `waveWidth` 控件；hero 文案数字变动按既有规格重出门面截图 `assets/screen.jpg`。FAQ 的 0.2.0 迁移条目属历史归档不改写。

### v1.6（2026-09-21）

需求方两点意见：四向类型并入 `direction`；`QR_GRID` 的观感应是"方块格子"而非二维码图案。

1. **动画类型 13 → 12 种，四向类型并入 `direction` 选项（§1 / §5.1 / §7）——破坏性**：移除 `ThemeAnimationType.LTR` / `RTL` / `TTB` / `BTT` 四个类型值与 `DirectionalAnimationType` 类型、`BAR_MASK_IMAGE` / `BAR_START_PX` / `getDirectionalMaskGeometry` / `isDirectionalAnimationType` 四个导出；新增 `direction` 选项（`ThemeAnimationDirection` 常量 + 同名类型，默认 `'ltr'`，非法值静默回落）。四向扫开能力由 `SCAN` + `direction` 承接，观感差异仅前缘 12px 半透明光束带。迁移写法见 README「从 0.1.x 升级」。
2. **新增三种属性驱动类型（§7）**：`BLINDS`（配套新增 `slatWidth` 选项，合法区间 `[16, 200]`、默认 72，越界静默回落）、`SCAN`、`QR_GRID`（方块格子，格距常量 `QR_GRID_CELL_PX` = 64）。三者为仓库首批"注册属性驱动"的常规类型（机制同 CIRCLE_REVERT 收起方向的洞式蒙版），均无触发点、不消费 `ref` 中心。
3. **`QR_GRID` 观感定稿（需求方第二轮反馈）**：初版按二维码图案思路实现，与预期不符；改为"列约束 ∩ 行约束"双层渐变 `mask-composite: intersect` 求交出逐格方块，`@supports` 门控 + 推进轴单层条带降级（降级后观感同百叶窗，状态始终正确）。
4. **`direction` 定为通用选项而非某类型专属**：命名取 `direction` 而非 `scanDirection`，后续新增类型可复用；它与 `ThemeAnimationType` 同样是"常量对象 + 同名类型"双含义，Nuxt 侧 `addTypeTemplate` 需一并补全局类型别名（§6.3），四个入口（`.` / `./react` / `./vue` / `./nuxt`）同步导出。
5. **验收范围调整（§9-8 / §9-10）**：Playwright 矩阵与真机视觉验收的类型清单改为 12 种；新增三类型的 4 方向 × 3 = 12 组注入 CSS（渐变角、平铺尺寸、`mask-composite`）与逐帧观感已在无头 Chrome CDP 逐组核对 + 截图。**Safari / iOS 真机需重点覆盖 `QR_GRID` 的 `mask-composite: intersect` 支持面**——不支持时落条带降级，功能与状态不受影响，但观感与百叶窗无差别。
6. **文档同步**：README 新增「动画类型」一览表与「从 0.1.x 升级（破坏性变更）」节；文档站画廊删四向卡、BLINDS / SCAN / QR_GRID 三卡各带**独立**的 direction 选择（卡片级状态，互不影响），BLINDS 卡另带叶宽档位选择（32 / 72 / 128px），features / hero / FAQ / `site.ts` 的"13 种"表述改为 12 种；四个 playground 同步类型清单与 direction / slatWidth 选择（触发按钮外裹 `.switch-card`，方向按钮与触发按钮同级以避免嵌套 button）。

### v1.5（2026-09-12）

1. **动画类型 5 → 13 种**（§1 / §5.1 / §7）：新增 `CIRCLE_REVERT`（方向感知：切到暗色暗色圆扩散、切回亮色暗色圆收起进点击点）、`CIRCLE_BLUR`（圆形模糊扩散，模糊烘焙进 SVG 蒙版、仅挂新截图层）与 6 种中心扩散形状（SQUARE / DIAMOND / RECTANGLE / HEXAGON / TRIANGLE / STAR，观感对齐 magicui animated-theme-toggler，技术路线仍仅用 mask 以保 Safari 兼容）。形状/收起/模糊类型的实现要点与覆盖系数见 §7。
2. **§5.1 新增 `blurAmount` 参数**（默认 2，仅 `CIRCLE_BLUR` 生效，非法值回落默认）。
3. **`DirectionalAnimationType` 语义收窄**：原定义 `Exclude<ThemeAnimationType, CIRCLE>` 在类型扩展后会把新形状误纳入"四向擦除"，改为显式 LTR/RTL/TTB/BTT 联合（对外形状不变，仅类型定义修正）。
4. **§9-8 Playwright 矩阵与 §9-6/真机视觉验收的适用范围扩展到全部 13 种**；Nuxt 自动导入（§9-9）对新增类型值/类型均自动生效（runtime 自包含声明扫描，无需改模块）。
5. **`duration` 默认值 400 → 750**（§5.1 / §7，桌面真机体感反馈：400ms 偏快），样式表内 `var(--theme-switch-duration, …)` 的兜底值同步；§5.1 的其余默认值不变。

### v1.4（2026-09-11）

1. **§4 peerDependencies 补充 `react-dom: ">=18"`**（optional）：`theme-switch-animation/react` 的 `useThemeAnimation` 在转场回调内通过 `react-dom` 的 `flushSync` 强制同步渲染，`react-dom` 与 `react` 同为可选 peer。随 Phase 2a 实际交付同步，避免发布后子路径缺少依赖声明。

### v1.3（2026-09-11）

1. **engines 措辞澄清**（§4）：`engines.node >= 18` / `pnpm >= 9` 面向发布产物的消费环境；参与开发需 Node >= 22.13（pnpm 11 / vitest 5 / jsdom 30 工具链最低要求），README 注明，不写进 `engines`。
2. **§7 四向擦除措辞修正**：删除"横条 / 竖条"表述，统一为"蒙版条沿对应方向从起始边缘生长"。原文 TTB / BTT 标注"竖条"与钉扎位置矛盾（竖条钉在顶边生长的效果是 LTR），实现按物理正确几何：LTR / RTL 起始 `4px 100%`、TTB / BTT 起始 `100% 4px`，钉扎位置与原文一致，单测已固化。
3. **§4 core 文件树补充 `uncontrolled.ts`**：非受控状态助手（localStorage 读写、`darkClassName` 同步）随 Phase 2a 交付，放在 core 供 React / Vue 适配层共用，不在适配层重复实现。

### v1.2（2026-09-10）

1. localStorage key 变更：非受控模式的 key 从 `'theme'` 改为 `'theme-switch-animation'`，避免与 next-themes 等库冲突（§5.3、§7）。
2. 验收 7 补细节：明确用 Chrome DevTools 的 CPU 4x/6x throttling + Slow 3G 作为压力测试档位（§9-7）。
3. Phase 0 补 engines：package.json 增加 engines 字段，明确 Node >= 18、pnpm >= 9（§4、§8）。

### v1.1（2026-09-10）

1. **受控模式同步协议调整**：超时兜底 150ms → **300ms**；Phase 2b 先按 MutationObserver 实现、跑通后评估；新增低性能/慢网络压力测试验收（§9-7）；明确备选混合模式。
2. **Nuxt 自动导入范围明确**：`runtime/composables/index.ts` 必须从 core 重新导出 `useThemeAnimation`、`ThemeAnimationType` 及全部类型；新增自动导入完整性验收（§9-9）。
3. **darkClassName 表述修正**：删除"color-mode v4 默认类名就是 dark"的版本号假设，统一改为基于 `classPrefix`/`classSuffix` 配置的表述（§6.2）。
4. **Phase 2 拆分**：拆为 Phase 2a（React + 非受控）与 Phase 2b（受控模式 + next-themes 联调），受控协议受阻时不影响 core 与非受控发布。
5. **Playwright 矩阵调整**：e2e 只跑 Chromium + WebKit；Firefox 真机手测或暂缓，文档注明。

### v1.0（2026-09-10）

初版方案：确定包名 `theme-switch-animation`、Core-Adapter 架构、单包 + 子路径发布、受控/非受控双模式、5 种动画类型、CSS 变量化注入、Nuxt 模块（`/nuxt` 子路径 + `addImportsDir`）。

---

**当前状态（2026-11-03）**：**0.1.0 / 0.2.0 / 0.3.0 / 0.4.0 / 0.5.0 / 0.5.1 均已发布**，npm `latest = 0.5.1`（0.2.0 起走 OIDC Trusted Publishing，provenance 已实测挂上；0.5.0 = P3 批次三项 minor：reverse 接入面 5 → 9、CURTAIN direction、QR_GRID cellSize/cellShape；0.5.1 = README 门面封面 patch）。本文档随实现推进到 v1.20。动画类型扩展已冻结（v1.13 起 15 种，理由见 `docs/animation-roadmap.md` §4），`reverse` 的接入判据与分期见 `docs/reverse-option-design.md`；剩余事项（P2-2 LOGO_MASK 设计稿讨论、真机缩放与 Safari/iOS 反馈排查）见 `docs/next-steps.md`。
