# theme-switch-animation 需求文档

| 项目 | 内容 |
|---|---|
| 版本 | v1.12（`reverse` 接入 `CURTAIN`，翻案 PR2 的错判；见 §10 修订记录） |
| 日期 | 2026-09-21 |
| 状态 | 已评审通过，待开发指令 |
| 仓库 / npm 包名 | `theme-switch-animation`（npm 已确认未注册） |
| 支持框架 | React 18+、Vue 3+、Next.js（App Router）、Nuxt 3+ |

---

## 1. 项目概述

做一个**主题切换动画库**：用户点击按钮切换 light / dark 主题时，新主题以指定形状"揭开"覆盖旧主题，而不是生硬跳变。定位参考 `react-theme-switch-animation`（React-only），差异点：

1. **跨框架**：同时支持 React、Vue、Next.js、Nuxt.js（参考库仅 React）。
2. **自定义图案**：16 种动画类型（`CIRCLE` / `CIRCLE_REVERT` / `CIRCLE_BLUR` / `SQUARE` / `DIAMOND` / `RECTANGLE` / `HEXAGON` / `TRIANGLE` / `STAR` / `BLINDS` / `SCAN` / `QR_GRID` / `RIPPLE` / `CLOCK_SWEEP` / `FAN` / `CURTAIN`，形状观感对齐 magicui 的 animated-theme-toggler，技术路线仅用 mask；`BLINDS` / `SCAN` / `QR_GRID` 由 `direction` 选项控制四方向，v1.6；`RIPPLE` 由 `waveWidth` 控制环带波长，v1.7；`CLOCK_SWEEP` / `FAN` 为角度驱动族、`FAN` 由 `bladeCount` 控制扇叶数，v1.8；`CURTAIN` 中线对开、无参数，v1.9）。另有跨类型选项 `reverse`（三态 `boolean | 'auto'`，反向揭开；`CIRCLE` / `FAN` / `RIPPLE` / `CLOCK_SWEEP` / `CURTAIN` 五个生效，v1.10 起）。其余类型**经实测判定无法无副作用地接入**（形状族、`CURTAIN`），理由见 §7 与 `docs/animation-roadmap.md` §4。
3. **受控模式**：不独占主题状态管理，`next-themes`、`@nuxtjs/color-mode` 用户可直接接入复用动画能力。

## 2. 可行性评估（调研结论复述）

- **核心机制**：建立在浏览器 View Transitions API（`document.startViewTransition`）上。切换时向 `<head>` 注入临时 `<style>`，对 `::view-transition-new(root)` 伪元素做 **mask 动画**（keyframes 只改 `mask-size` / `mask-position`），让新主题截图以指定形状揭示。约 95% 代码与框架无关。
- **框架差异点**（仅两处）：
  - React：转场回调内需 `flushSync` 强制同步渲染，保证截图前 DOM 已更新。
  - Vue：`startViewTransition` 回调允许返回 Promise，写 `async () => { ...; await nextTick() }` 即可，浏览器等 DOM 更新完再截图（**需实测验证**，见 §9 验收 1）。
- **浏览器兼容**：View Transitions 已 Baseline 2025（Chrome/Edge 111+、Safari 18+、Firefox 144+）。不支持或 `prefers-reduced-motion: reduce` 时降级为直接切换，旧浏览器不构成障碍。
- **Safari 坑**（从参考库源码调研确认）：WebKit 忽略 view-transition 伪元素上的 clip-path 和 WAAPI，**只能用 mask 动画**；缓动用 `linear()` 时需双 `animation:` 声明降级；主题 class 必须在转场回调内同步生效，否则截图捕获到旧主题。
- **结论**：技术风险低，架构为 1 个框架无关 core + 2 个薄适配层（React / Vue）+ 1 个 Nuxt 模块壳。可行。

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
├── docs/                               # 文档站，每种动画 live demo
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
- `engines` 字段（v1.2 新增，v1.3 澄清）：面向**发布产物的消费环境**——`engines.node >= 18`、`engines.pnpm >= 9`（构建产物为 es2020 ESM，Node 18 消费者可正常使用）。**参与本仓库开发**（跑测试与构建）需要 Node >= 22.13，这是 pnpm 11 / vitest 5 / jsdom 30 工具链的最低要求，在 README 开发段注明，不写进 `engines`。

## 5. API 设计

### 5.1 参数

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `animationType` | `ThemeAnimationType` | `CIRCLE` | 动画类型：`CIRCLE` \| `CIRCLE_REVERT` \| `CIRCLE_BLUR` \| `SQUARE` \| `DIAMOND` \| `RECTANGLE` \| `HEXAGON` \| `TRIANGLE` \| `STAR` \| `BLINDS` \| `SCAN` \| `QR_GRID` \| `RIPPLE` \| `CLOCK_SWEEP` \| `FAN` \| `CURTAIN`（v1.6：四向类型 `LTR`/`RTL`/`TTB`/`BTT` 移除，改由 `direction` 承接） |
| `darkClassName` | `string` | `'dark'` | 暗色类名，可配置 |
| `duration` | `number` | `750` | 动画时长 ms |
| `easing` | `string` | `'ease-in-out'` | 任意合法 CSS timing-function |
| `blurAmount` | `number` | `2` | 模糊强度（仅 `CIRCLE_BLUR` 生效，v1.5 新增） |
| `direction` | `ThemeAnimationDirection` | `'ltr'` | 扫描方向（仅 `BLINDS` / `SCAN` / `QR_GRID` 生效，其余类型忽略；非法值回落默认，v1.6 新增） |
| `slatWidth` | `number` | `72` | 百叶窗叶片宽度 px，合法区间 `[16, 200]`（仅 `BLINDS` 生效；越界静默回落默认，v1.6 新增） |
| `waveWidth` | `number` | `18` | 涟漪波长 px（相邻两圈波峰间距），合法区间 `[8, 60]`（仅 `RIPPLE` 生效；越界静默回落默认，v1.7 新增） |
| `bladeCount` | `number` | `8` | 扇叶数，合法区间 `[4, 16]` 的**整数**（仅 `FAN` 生效；非整数或越界静默回落默认，v1.8 新增） |
| `reverse` | `boolean \| 'auto'` | `false` | 反向揭开：`true` 恒反向、`'auto'` 切暗正向 / 切亮收起。与 `direction` 正交（后者定推进轴、前者定从内还是从外揭开）。`CIRCLE` / `FAN` / `RIPPLE` / `CLOCK_SWEEP` / `CURTAIN` 生效，其余静默忽略（形状族做不到无副作用，见 §7）；非法值静默回落 `false`（v1.10 新增） |
| `isDark` | `boolean` | 可选 | 受控模式：外部暗色状态 |
| `onChange` | `(next: boolean) => void` | 可选 | 受控模式：状态变更回调 |

前四项两种模式共用；`blurAmount` / `direction` / `slatWidth` / `waveWidth` / `bladeCount` / `reverse` 亦为普通动画参数（非法值回落默认）；后两项仅受控模式出现。

### 5.2 模式判定

- `isDark` 与 `onChange` **同时提供** → 受控模式。
- 两者**都缺省** → 非受控模式（默认）。
- 只提供其一 → 按非受控处理，dev 环境 `console.warn`（契约不完整）。

### 5.3 行为契约

- **非受控（默认）**：库内部管理状态——读写 `localStorage`（key 为 `'theme-switch-animation'`），并在转场回调内同步 toggle `documentElement` 上的 `darkClassName`。开箱即用。
- **受控**：库**不碰 localStorage、不自己改 class**，只做两件事：注入动画样式；在 `startViewTransition` 回调里调用 `onChange(next)` 并等 DOM 真实变化后让浏览器截图。
- **返回值**：React 版 `{ ref, toggleTheme, isDark }`；Vue 版 `{ triggerRef, toggleTheme, isDark }`（避免与 Vue 的 `ref` 解构冲突）。

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
- **CIRCLE_REVERT（v1.5，桌面真机反馈两轮后定稿）**：**方向感知的暗色圆**——切到暗色：暗色圆从点击点**扩散**（复用 CIRCLE 几何，蒙版挂新截图层）；切回亮色：暗色圆**收起**进点击点（蒙版挂旧截图层并置顶 `z-index: 1`，从全覆盖收缩到 0）。方向由 core 在转场前读取 `<html>` 类名推导（toggle 后必为取反），来回切换自然产生一次扩散、一次收起；无点击奇偶等隐藏状态。仍纯 mask 实现，Safari 约束不变。**单次点击内"收起 → 扩散"两段不可行**：收起结束时屏幕已是新主题，紧随的扩散圆与背景重合不可见（transform 整页缩放与双层蒙版两种实现试错后，与需求方确认本方案）。
- **CIRCLE_BLUR（v1.5，桌面真机反馈后修正）**：`feGaussianBlur` **烘焙进 SVG data-URI 蒙版本身**（非 CSS filter，Safari 兼容性同其余类型）；模糊蒙版**只挂新截图层**，旧截图层完整垫底——蒙版外是旧主题，直到模糊圆扫过（若两层同蒙版，透明区露出的是已翻转的实时页面，主题会瞬间全变）。强度由 `blurAmount`（默认 2，×1.2 得 stdDeviation）控制；终尺寸 `max(4 × (长边+200), 2.5 × maxRadius)` 封顶 8000px 防超大屏 GPU 纹理过大。技术参考 `useBlurCircleTheme`（next-daily-hot；其 old 层的 maskScale 动画无 mask-image，实为无效代码，勿照抄"双层同蒙版"的误读）。
- **BLINDS / SCAN / QR_GRID（v1.6，属性驱动揭开）**：仓库首批"注册属性驱动"的常规类型，与 CIRCLE_REVERT 收起方向的洞式蒙版同一机制——`@property --theme-switch-reveal`（`REVEAL_VAR`，`syntax: "<length>"`、`inherits: false`）注册后，蒙版盒子完全静止、keyframes 只动该属性，引用它的 `mask-image` 渐变逐帧重新解析（`mask-image` 本身不可动画）。三者均**无触发点、不消费 `ref` 中心**；旧截图层完整垫底、蒙版挂新层。
- **BLINDS**：叶片宽 `slatWidth`（默认 72）的条带平铺（`mask-repeat: repeat`），每根叶片的不透明段从 `-feather` 长到 `slatWidth`；软边 `feather = min(20, round(slatWidth × 0.28))`（`BLINDS_FEATHER_RATIO` / `BLINDS_MAX_FEATHER_PX`），超出叶片边界的部分被平铺裁掉，形成相邻叶片硬边相接的百叶窗观感。`direction` 决定渐变角与平铺轴（LTR/RTL 竖条沿 x、TTB/BTT 横条沿 y）。
- **SCAN**：单层满铺（`no-repeat`），实心段之后跟一条 12px、α=0.4 的前缘光束 + 4px 渐隐尾（`SCAN_BAND_WIDTH_PX` / `SCAN_BAND_ALPHA` / `SCAN_FADE_WIDTH_PX`）；`to = 推进轴全长 + 光束总宽`，保证末帧实心段盖满视口、光束整体扫出画面（覆盖余量同 CIRCLE 的哲学）。
- **QR_GRID**：百叶窗的二维版——"列约束 ∩ 行约束"两条渐变以 `mask-composite: intersect` 求交，交集即每格一个方块（格距 `QR_GRID_CELL_PX` = 64，软边比例同 BLINDS）；推进轴层从格子起始边生长、垂直轴层从格子中心对称生长，`direction` 决定锚定方位（LTR 左上 / RTL 右上 / TTB 顶边中点 / BTT 底边中点）。双层交集写在 `@supports (mask-composite: intersect)` 内，不支持的引擎落回基线的推进轴单层条带（观感同百叶窗），状态始终正确；**不写 `-webkit-mask-composite`**——仅支持旧语法的引擎落入基线即可，避免新旧两套 composite 关键字的级联歧义。
- **RIPPLE（v1.7，环带前缘）**：属性驱动揭开族的第四个成员，复用 `REVEAL_VAR` 与 `buildRevealAnimationCSS` 的静止蒙版盒子（`styles.ts` 零改动），差别只在渐变换成 `radial-gradient` 且**波源中心写进 `mask-image` 串**（同 CIRCLE_REVERT 洞式的写法）——它是该族里唯一消费 `ref` 几何的类型。环带以波长 `waveWidth`（默认 18，合法区间 `[8, 60]`）为格：实心水面止于 `R − 1×W`，其后波峰落在整数格、波谷落在半整数格，主峰 α = `RIPPLE_CREST_ALPHA`(0.5)，余波按 0.55 逐圈相乘共 `RIPPLE_TRAIL_COUNT`(2) 圈（α 0.275 / 0.151）。波峰用部分 α 而非 >1：蒙版 α 就是新截图层的不透明度，半幅环带叠在完整垫底的旧层上即透亮的水线。`to = 2.1 × maxRadius + (TRAIL + 0.5) × W`，末帧实心段仍远超视口最远角（覆盖约束同其余类型）。`from = 0` 时实心段落在负半径，靠渐变规范的 stop 单调化夹成 0 长度——起始帧只剩中心一圈极淡水纹，不提前漏出新主题（无头 Chrome 冻结半径截图已核）。
- **CLOCK_SWEEP / FAN（v1.8，角度驱动族）**：与 RIPPLE 同一套静止蒙版盒子，只是动画量从 `<length>` 换成 `<angle>`、渐变换成 conic。**注册属性必须另起一名** `SWEEP_VAR`（`--theme-switch-sweep`）——`@property` 的 syntax 一经注册不可改，与 `<length>` 的 `REVEAL_VAR` 同名属非法注册；为此 `buildRevealAnimationCSS` 不再把 px / `<length>` 写死，改按 `RevealMaskSpec.varName` / `unit` 出 syntax 与值后缀（px 族输出逐字节不变）。**conic 覆盖的是角度而不是面积**：从轴心出发的任意射线都有颜色，扫满一周即盖住整平面，不需要 CIRCLE 家族"终半径够到视口最远角"的那套计算；CSS conic 的 `0deg` 就是 12 点方向、顺时针为正，做时钟擦除不需要角度偏移。`CLOCK_SWEEP` 是单层 conic + 12° 前缘软尾（`CLOCK_SWEEP_TAIL_DEG`），`to = 360 + 12`。`FAN` 用 `repeating-conic-gradient`，周期 `step = 360 / bladeCount`、`to = step`；**叶片是硬边**——软尾会在每个周期末留下渐变淡出，末帧必留一条永不闭合的缝，违反覆盖约束，`bladeCount` 限整数同理。命名：观感是"扇叶从各自起始边旋开"，不是相机光圈的"中央孔径收缩"（后者要半径维度，conic 表达不了），故定名 `FAN` 而非 `IRIS`。旋转方向（顺 / 逆）本轮**有意未开放**：options 里"仅某类型生效"的局部参数已占 5 个，再加第 6 个性价比低；真要加，首选让方向跟随 `toDark`（复用 `CIRCLE_REVERT` 的编排、零参数），次选复用 `direction` 的 `ltr`/`rtl`，最差才是新选项。
- **CURTAIN（v1.9，中线对开）**：px 驱动族的第四个成员，落在现成的 `isRevealAnimationType` / `getRevealMaskSpec` 分发里——`orchestrate.ts` 与 `styles.ts` 零改动。蒙版是单层满铺的"从中心向两侧对称生长"三段渐变（`transparent calc(50% - r/2 - f)` / `#000 calc(50% - r/2) calc(50% + r/2)` / `transparent calc(50% + r/2 + f)`），与 QR_GRID 的垂直轴层同构。软边固定 `CURTAIN_FEATHER_PX` = 24，`to = 视口宽 + 2 × 软边`——两条软边都要推出画面才算盖满。**既不消费 `direction`**（中线对称没有方向语义）**也不消费触发点**。起始帧 `r = 0` 时实心段零宽、两侧各留一条软边，表现为中缝先透出一道光，是幕布观感的一部分而非缺陷（同 RIPPLE 起始帧的中心淡纹）。
- **`reverse` 选项（v1.10，跨类型）**：语义是**蒙版求补 + 动画反向**，不是新写一套动画——正向是"实心段长到盖满"，反向是"洞收缩到 0"，两者都必须在末帧达到"新层完全不透明"，只是证明方向相反（约束 2 换了一道验证）。当前只接通 `CIRCLE`：复用已有的洞式生成器 `buildHoleAnimationCSS`（`HOLE_RADIUS_VAR` + 静止蒙版盒子），`orchestrate.ts` 里把原来单一的 `isRevert` 判定换成 `collapse` 三源判定——`CIRCLE_REVERT` 仍走 `!toDark`（行为与 0.3.0 逐字节一致），`CIRCLE + reverse:true` 恒收起，`CIRCLE + reverse:'auto'` 等价于前者。**必须是三态而不是布尔**：`CIRCLE_REVERT` 的语义是"跟随切换方向"（`toDark ? 'expand' : 'collapse'`），布尔的两个值都不等于它，用布尔就删不掉那个类型、只会多出一个语义重叠的选项。`CIRCLE_REVERT` 自 v1.10 标 `@deprecated`，开发环境提示一次（模块级 flag 去重，生产静默），计划在 0.5.0 移除。`BLINDS` / `SCAN` / `QR_GRID` **有意不接入**：`direction` 已占那根轴，两轴表达同一件事会留下重复组合。逐类型接入判据与分期见 `docs/reverse-option-design.md`。
- **`reverse` 的接入面：`CIRCLE` / `FAN` / `RIPPLE` / `CLOCK_SWEEP` / `CURTAIN` 五个，为什么不是全部（v1.10–v1.12 实测判定）**：设计阶段写过"形状族反色成本≈0"，实现前反证，**不成立**。
  - **形状族 6 个**：蒙版是 SVG data-URI（`polygonMaskImage` 生成白色多边形），反向要"洞收缩到 0"就必须动 `mask-size` / `mask-position` —— 而这正是 phase-6 附录四/五排查过的**蒙版层设备像素对齐抖动**的病根（约 1 设备像素、与 dpr 无关、取整只缓解不根除），当初正是为此才造了静止盒子的洞式方案。多边形的硬直线比圆弧更容易显出 hairline。做不到干净，故不接入。
  - **`CURTAIN` 曾被判"做不到"，那是错判，PR3 后翻案**：错在**只试了单渐变**。正向串取补得到的居中透明带被钉在 50%，无论 `r` 收到多负都消不掉（末帧实测 40 全透 + 150 半透 / 6400；过冲与"单渐变两侧板"两种改法都只减小不消除）。换**两层 + 默认 `mask-composite: add`（取最大 alpha）**就干净了：左板 `90deg`、右板 `270deg`，软边都朝内，两板在中央重叠时取 max 而不是相互抵消。`from = -软边`（首帧两板整体在屏外）/ `to = 半屏 + 软边`（两板都越过中线），探针实测首帧 6400/6400 全隐、末帧 0 残留、推进近似线性。**教训：证伪一个方案之前要先穷举构造空间**，"单渐变取补"只是其中一类。
  - **`FAN` 能做的根本原因**：它是**硬边**（`getFanRevealSpec` 的注释就写明软尾会留下永不闭合的淡缝）。透明带 `transparent 0 var` 与实心段 `#000 var step` 共用同一个 var，var→0 时两组 stop 同时归位到 0deg，带子塌成零宽而不留缝。对照实验（三位置探针）：start 6400/6400 全透、mid 3272 半揭、end **0 全透 0 半透** —— 末帧的干净由 start/mid 证明蒙版确实在生效，不是解析失败的假阳性。
  - **`RIPPLE` 反向的两端都不能照抄正向（PR3 实测）**：① 终点必须过冲到 `-前缘宽度`（`(TRAIL + 0.5) × waveWidth`）而不是 0——主峰 α=0.5 取补后仍是 0.5，收到 0 会在中心留一个约半透明圆点（末帧实测 18 个半透明采样点）；只过冲 `-1W` 仍剩 4，过冲整个前缘才归零。② 起点必须去掉正向那个 `2.1 ×` 系数（取 `maxRadius + 前缘` 而非 `2.1 × maxRadius + 前缘`）——那个 2.1 是为**正向**覆盖留的余量，反向用不上；照抄会让透明核先空收掉视口最远角以外那一大段，实测**前 60% 的时间里屏幕毫无变化**。与 SPIRAL 那轮「照抄 CIRCLE 的 2.1」是同一类错误，这次踩的是它的镜像。
  - **`CLOCK_SWEEP` 反向的观感就是当初搁置的「逆时针扫开」**：补集扇形 `[v, 360]` 的边界随 v 从 372 收到 0 是逆时针回退的，所以不必再单开顺/逆参数。它的 `from` 可以直接沿用正向 `to`——conic 覆盖角度不是面积，没有半径余量那段时间要浪费（推进分布 0→7→20→39→49→59→71→91→100%）。12° 软尾镜像到内缘后末帧仍零残留。
  - 正向与反向**共用同一份 stop 生成器**（`rippleStops(waveWidth, invert)`），补集靠 `alpha → 1 - alpha` 落在同一批位置上，单测锁「两串 stop 位置一格不差」，避免两条波带结构各自演化后失配。
  - **`BLINDS` / `SCAN` / `QR_GRID`** 是另一类理由：不是做不到，是 `direction` 已占那根轴，接入会留下重复组合。
- **Safari 兼容**：只用 mask 动画，不碰 view-transition 伪元素上的 clip-path 和 WAAPI；`will-change: mask-size, mask-position`。
- **duration / easing 变量化注入**：注入的临时 `<style>` 中动画声明一律写
  `animation: <name> var(--theme-switch-duration, 750ms) var(--theme-switch-easing, ease-in-out) both;`
  两个变量定义在同一份样式表的 `:root` 规则里。用户传任意合法 timing-function（`cubic-bezier(...)`、`linear(...)`、`steps(...)`）直接生效，零字符串拼接。说明：点击坐标和蒙版终尺寸是逐次计算的运行时值，仍需插值进 keyframes——变量化只覆盖 duration / easing 两项。
- **样式生命周期**：固定 styleId，注入前先移除旧节点（防快速连点叠加样式），转场结束后 `setTimeout(duration)` 清理。
- **SSR 安全**：core 全部入口有 `typeof window/document` 守卫；React 侧要求 `'use client'`，Vue composable 天然客户端安全。
- **非受控持久化**：`localStorage` key 为 `'theme-switch-animation'`（v1.2 修订 #1）。

## 8. 里程碑（v1.1 修订 #4：Phase 2 拆分）

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
8. **Playwright e2e 矩阵**（v1.1 修订 #5）：**只跑 Chromium 和 WebKit**。理由：Playwright 的 WebKit 引擎与 Safari 存在差异；Firefox 的 View Transitions 自 144 才支持，Playwright 自带的 Firefox 版本可能未默认启用。Firefox 用**真机手动测试**，暂时跳过，并在文档（README + 文档站）注明。
9. **Nuxt 自动导入完整性**（v1.1 修订 #2 新增）：全新 Nuxt 项目仅加 `modules: ['theme-switch-animation/nuxt']`，`useThemeAnimation`、`ThemeAnimationType` 及所有类型**无需 import 即可使用且有完整类型提示**（`nuxt prepare` 通过、TS 无报错）。
10. **单测**：mask 几何（四角最大距离、终尺寸）与 v1.6 的属性驱动规格（BLINDS / SCAN / QR_GRID 的起止值、渐变角、平铺尺寸、`@supports` 双层与降级基线）、v1.7 的 RIPPLE 环带（stop 序列与衰减 alpha、波长缩放、末帧实心段覆盖最远角、波源取自触发点）、v1.8 的角度族（conic 串与软尾、`to = 360 + 尾宽` 与视口无关、扇叶周期随 bladeCount 缩放及非整除精度、注册属性分名、守卫互斥）、v1.9 的 CURTAIN（三段对称渐变串、`to = 视口宽 + 2×软边`、四个 direction 取值结果一致、分发命中与守卫互斥）、v1.10 的 reverse（三态校验与非法值回落、`CIRCLE + true` 与 `CIRCLE_REVERT` 收起态归一化后 CSS 相同、`'auto'` 两态分别等于 `false` / `true`、`FAN` / `RIPPLE` / `CLOCK_SWEEP` 反向取补串与端点（RIPPLE 起点去掉 2.1 余量、终点过冲整个前缘）、`CURTAIN` 反向的两层 add 结构与两端软边、补集与正向的 stop 位置一格不差、分发 reverse 位对已接入类型都生效、未接入类型传 `true` 输出不变、废弃提示仅开发环境且只提示一次）全覆盖；TS strict 通过。
11. **发布清单**：`npm pack` 内容 = dist（含 nuxt-runtime 目录）+ LICENSE + README；四个子路径（`.` / `./react` / `./vue` / `./nuxt`）exports 均可解析。

## 10. 修订记录

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
5. **登记一处未合并的重复（本轮未动）**：`masks.ts` 的私有函数 `qrCenterGradient(90, feather)` 返回的渐变串与 `getCurtainRevealSpec` 逐字符相同（QR_GRID 的垂直轴层在用）。干净做法是把它重命名成中性名后两处共用，QR_GRID 的输出有单测锁死不会变；属本轮范围外的重构，等排期。
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

**当前状态（2026-09-24）**：**0.1.0 / 0.2.0 / 0.3.0 均已发布**，npm `latest = 0.3.0`（tag 分别是不带前缀的 `theme-switch-animation@0.1.0`、换成 tag 触发流程后的 `v0.2.0` 与 `v0.3.0`；0.2.0 起走 OIDC Trusted Publishing，provenance 已实测挂上）。本文档随实现推进到 v1.11。v1.10（`reverse` PR1 + PR2 + `CIRCLE_REVERT` 标废弃）与 v1.11（PR3：`RIPPLE` / `CLOCK_SWEEP` 接入）已落地、文档已同步，**尚未发版**——`.changeset/` 下有一条待切，攒够后走 0.4.0。动画类型扩展已冻结在 16 种（理由见 `docs/animation-roadmap.md` §4），`reverse` 的后续接入见 `docs/reverse-option-design.md`；剩余真机验证与发版事项见 `docs/next-steps.md`。
