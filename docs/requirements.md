# theme-switch-animation 需求文档

| 项目 | 内容 |
|---|---|
| 版本 | v1.5（动画类型扩展，见 §10 修订记录） |
| 日期 | 2026-09-12 |
| 状态 | 已评审通过，待开发指令 |
| 仓库 / npm 包名 | `theme-switch-animation`（npm 已确认未注册） |
| 支持框架 | React 18+、Vue 3+、Next.js（App Router）、Nuxt 3+ |

---

## 1. 项目概述

做一个**主题切换动画库**：用户点击按钮切换 light / dark 主题时，新主题以指定形状"揭开"覆盖旧主题，而不是生硬跳变。定位参考 `react-theme-switch-animation`（React-only），差异点：

1. **跨框架**：同时支持 React、Vue、Next.js、Nuxt.js（参考库仅 React）。
2. **自定义图案**：13 种动画类型（`CIRCLE` / `CIRCLE_REVERT` / `CIRCLE_BLUR` / `LTR` / `RTL` / `TTB` / `BTT` / `SQUARE` / `DIAMOND` / `RECTANGLE` / `HEXAGON` / `TRIANGLE` / `STAR`，形状观感对齐 magicui 的 animated-theme-toggler，技术路线仅用 mask），后续可扩展。
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
│   │       ├── masks.ts                # 5 种蒙版生成（circle SVG、四向 gradient 条）
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
| `animationType` | `ThemeAnimationType` | `CIRCLE` | 动画类型：`CIRCLE` \| `CIRCLE_REVERT` \| `CIRCLE_BLUR` \| `LTR` \| `RTL` \| `TTB` \| `BTT` \| `SQUARE` \| `DIAMOND` \| `RECTANGLE` \| `HEXAGON` \| `TRIANGLE` \| `STAR` |
| `darkClassName` | `string` | `'dark'` | 暗色类名，可配置 |
| `duration` | `number` | `400` | 动画时长 ms |
| `easing` | `string` | `'ease-in-out'` | 任意合法 CSS timing-function |
| `blurAmount` | `number` | `2` | 模糊强度（仅 `CIRCLE_BLUR` 生效，v1.5 新增） |
| `isDark` | `boolean` | 可选 | 受控模式：外部暗色状态 |
| `onChange` | `(next: boolean) => void` | 可选 | 受控模式：状态变更回调 |

前四项两种模式共用；`blurAmount` 亦为普通动画参数（非法值回落默认）；后两项仅受控模式出现。

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

// useThemeAnimation / ThemeAnimationType 由本库 nuxt 模块自动导入，无需 import
const { triggerRef, toggleTheme, isDark } = useThemeAnimation({
  animationType: ThemeAnimationType.LTR,
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
export { ThemeAnimationType } from '@theme-switch-animation/core'
export type { ThemeAnimationOptions, ... } from '@theme-switch-animation/core'
```

构建产物 `dist/nuxt-runtime/composables/index.js` 需保留同样的命名导出。

## 7. 实现要点

- **CIRCLE**：`getBoundingClientRect` 取触发元素中心，`Math.hypot` 算到视口四角最大距离定蒙版终值；SVG data-URI 圆形蒙版从 `mask-size: 0` 长到 `2.1 × maxRadius`（留余量防角落锯齿）。
- **形状家族（v1.5：SQUARE / DIAMOND / RECTANGLE / HEXAGON / TRIANGLE / STAR）**：与 CIRCLE 同构（SVG data-URI 多边形蒙版从触发点 0 长到终尺寸），形状观感对齐 magicui（六边形/三角形/星形顶点朝上、星形内顶点半径比 0.42）。终尺寸按各形状**内切半径盖住视口最远角**计算：SQUARE/RECTANGLE 用轴对齐半边界 × 1.05；DIAMOND/HEXAGON 用 `√2 × 1.05 × maxRadius` 外接圆；TRIANGLE 外接圆 `2.2 × maxRadius`（内切半径 1.1×）；STAR 外接圆 `2.5 × maxRadius`（内凹谷半径 0.42 × 2.5 = 1.05×）——**有意大于 magicui**：它的星形凹谷盖不住视口角落（clip-path 随转场组销毁所以它可接受），本库 mask 在样式移除前持续生效（fill both），必须保证完全覆盖。RECTANGLE 贴合视口宽高比（实心矩形蒙版 `preserveAspectRatio="none"`）。
- **CIRCLE_REVERT（v1.5）**：动画作用于**旧截图层**（`::view-transition-old(root)` 置顶 `z-index: 1`），圆形蒙版从全覆盖收缩到触发点 0——旧主题以圆形收起，新主题从四周显现。
- **CIRCLE_BLUR（v1.5）**：`feGaussianBlur` **烘焙进 SVG data-URI 蒙版本身**（非 CSS filter，Safari 兼容性同其余类型）；新旧两层以同一蒙版联动（old 层 `z-index: -1` 沉底），模糊边缘由双层构成，蒙版透明区露出实时页面（已是新主题）。强度由 `blurAmount`（默认 2，×1.2 得 stdDeviation）控制；终尺寸 `max(4 × (长边+200), 2.5 × maxRadius)` 封顶 8000px 防超大屏 GPU 纹理过大。技术参考 `useBlurCircleTheme`（next-daily-hot）。
- **LTR / RTL / TTB / BTT**：`linear-gradient(white, white)` 实心条蒙版，起始 4px 细条，`mask-position` 钉在对应边（LTR `0% 0%`、RTL `100% 0%`、TTB `0% 0%`、BTT `0% 100%`），蒙版条沿对应方向从起始边缘生长到 `100% 100%`（keyframes 只改 `mask-size`，被钉住的边由百分比 `mask-position` 固定不动）。
- **Safari 兼容**：只用 mask 动画，不碰 view-transition 伪元素上的 clip-path 和 WAAPI；`will-change: mask-size, mask-position`。
- **duration / easing 变量化注入**：注入的临时 `<style>` 中动画声明一律写
  `animation: <name> var(--theme-switch-duration, 400ms) var(--theme-switch-easing, ease-in-out) both;`
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
10. **单测**：mask 几何（四角最大距离、终尺寸、四向起始位置/尺寸）全覆盖；TS strict 通过。
11. **发布清单**：`npm pack` 内容 = dist（含 nuxt-runtime 目录）+ LICENSE + README；四个子路径（`.` / `./react` / `./vue` / `./nuxt`）exports 均可解析。

## 10. 修订记录

### v1.5（2026-09-12）

1. **动画类型 5 → 13 种**（§1 / §5.1 / §7）：新增 `CIRCLE_REVERT`（圆形收起，动画作用于旧截图层）、`CIRCLE_BLUR`（圆形模糊扩散，模糊烘焙进 SVG 蒙版、双层联动）与 6 种中心扩散形状（SQUARE / DIAMOND / RECTANGLE / HEXAGON / TRIANGLE / STAR，观感对齐 magicui animated-theme-toggler，技术路线仍仅用 mask 以保 Safari 兼容）。形状/收起/模糊类型的实现要点与覆盖系数见 §7。
2. **§5.1 新增 `blurAmount` 参数**（默认 2，仅 `CIRCLE_BLUR` 生效，非法值回落默认）。
3. **`DirectionalAnimationType` 语义收窄**：原定义 `Exclude<ThemeAnimationType, CIRCLE>` 在类型扩展后会把新形状误纳入"四向擦除"，改为显式 LTR/RTL/TTB/BTT 联合（对外形状不变，仅类型定义修正）。
4. **§9-8 Playwright 矩阵与 §9-6/真机视觉验收的适用范围扩展到全部 13 种**；Nuxt 自动导入（§9-9）对新增类型值/类型均自动生效（runtime 自包含声明扫描，无需改模块）。

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

**等待开发指令。当前状态：环境已验证（Node 24.15 / pnpm 11.24 / git 2.53），npm 包名已确认可注册，尚未创建任何代码。**
