# theme-switch-animation

## 0.2.0

### Minor Changes

- caefb1b: 新增三种属性驱动动画类型与 `direction` / `slatWidth` 选项，并移除四向擦除类型（**breaking**）：
  
  - `BLINDS` 百叶窗：叶片逐条揭开，`direction` 控制叶片方向与扫开方向（LTR/RTL/TTB/BTT），`slatWidth` 控制叶片宽度（16–200px，默认 72，越界静默回落默认）
  - `SCAN` 扫描：硬边扫开 + 前缘半透明光束带，`direction` 控制扫开方向
  - `QR_GRID` 方块格子：百叶窗的二维版——"列约束 ∩ 行约束"双层渐变蒙版 intersect 出逐格方块，方块随动画同步生长、末帧融为整屏；`direction` 决定锚定方位（LTR 左上 / RTL 右上 / TTB 顶边中点 / BTT 底边中点）；经 `@supports (mask-composite: intersect)` 门控，不支持的引擎自动降级为推进轴单层条带（观感同百叶窗），状态始终正确
  - 新增 `direction` 选项（`ThemeAnimationDirection` 常量，默认 `ltr`），当前由以上三种类型消费，后续类型可复用；三种类型均无触发点、不消费 `ref` 中心
  
  **Breaking**：移除 `ThemeAnimationType.LTR / RTL / TTB / BTT` 四个类型与 `DirectionalAnimationType` 类型、`BAR_MASK_IMAGE` / `BAR_START_PX` / `getDirectionalMaskGeometry` / `isDirectionalAnimationType` 导出。四向扫开能力由 `SCAN` + `direction` 承接（SCAN 额外带前缘光束；如需纯硬边，视觉差异仅前缘 12px 光束带）。
  
  实现机制：三者为仓库首批"注册属性驱动"常规类型（`@property --theme-switch-reveal` + 静止蒙版盒子），与 CIRCLE_REVERT 收起方向的洞式蒙版同一机制。

## 0.1.0

### Minor Changes

- 67f59a8: 新增 8 种动画类型（总 5 → 13）：`CIRCLE_REVERT`（方向感知的暗色圆：切到暗色时暗色圆从点击点扩散，切回亮色时暗色圆收起进点击点，来回切换自然产生一次扩散、一次收起）、`CIRCLE_BLUR`（圆形模糊扩散，新增 `blurAmount` 选项默认 2，模糊蒙版仅挂新截图层、旧层完整垫底）与 6 种中心扩散形状 `SQUARE` / `DIAMOND` / `RECTANGLE` / `HEXAGON` / `TRIANGLE` / `STAR`（观感对齐 magicui，内切半径保证完全覆盖视口）。全部仍走 mask 动画，Safari 兼容约束不变；React / Vue / Nuxt 适配层零改动，Nuxt 自动导入对新增类型值/类型自动生效。
  
  **行为变更**：`duration` 默认值 400 → 750（体感反馈：400ms 偏快）；样式表内 `var(--theme-switch-duration, …)` 兜底同步。显式传入 `duration` 的调用方不受影响。
- 33077d4: **首次发布 0.1.0**：跨框架主题切换动画库。用户点击切换 light / dark 时，新主题以指定形状"揭开"覆盖旧主题，而非生硬跳变。
  
  - **实现路线**：基于 View Transitions API（`document.startViewTransition`），向 `<head>` 注入临时样式，对 `::view-transition-new(root)` 做 **mask 动画**；不使用 clip-path / WAAPI，兼容 Safari 18+（Chrome / Edge 111+、Firefox 144+）。
  - **单包多入口**：`theme-switch-animation`（框架无关 core）/ `theme-switch-animation/react` / `theme-switch-animation/vue` / `theme-switch-animation/nuxt`，覆盖 React 18+、Vue 3+、Next.js（App Router，复用 `/react`）与 Nuxt 3+（模块 + 自动导入）。
  - **13 种动画类型**（`ThemeAnimationType`）：圆形扩散 / 收起 / 模糊（`CIRCLE` / `CIRCLE_REVERT` / `CIRCLE_BLUR`）、四向擦除（`LTR` / `RTL` / `TTB` / `BTT`）、形状扩散（`SQUARE` / `DIAMOND` / `RECTANGLE` / `HEXAGON` / `TRIANGLE` / `STAR`）；中心扩散类以触发元素中心为圆心。
  - **非受控模式**（默认）：库内管理 `localStorage`（key `theme-switch-animation`）与 `<html>` 上的 `darkClassName`，零配置开箱即用；多实例与跨标签页自动同步。
  - **受控模式**：同时传 `isDark` + `onChange` 即接入 `next-themes`、`@nuxtjs/color-mode` 等外部主题状态；库不碰存储与类名，以 MutationObserver 等待外部 DOM 同步后截图，300ms 超时兜底直切。
  - **降级**：不支持 View Transitions、`prefers-reduced-motion: reduce`、SSR 渲染阶段均直接切换，状态始终正确；Next RSC / Nuxt SSR 无 hydration 报错。
  - **可定制**：`duration`（默认 750ms）/ `easing`（任意合法 CSS timing-function，经 CSS 变量注入）/ `darkClassName` / `blurAmount`；底层 `runThemeTransition`、蒙版几何与样式构建函数亦从主入口公开导出，供自定义集成。
- 551bdde: 可靠性与一致性修复，及小幅 API 增强（core / React / Vue / Nuxt）：
  
  **行为修复**
  
  - **Vue 适配层模式快照脱钩**：`mode` 改为动态判定（computed）——options 传响应式来源时，先按非受控使用、后补上 `isDark` + `onChange` 转受控，`isDark` 返回值与真实切换路径不再脱钩；移除永不触发的死 `watch`。
  - **CIRCLE_REVERT 方向感知在受控模式下失准**：`runThemeTransition` 新增 `nextIsDark` 参数，适配层受控模式显式传入目标状态。此前从 `<html>` class 反推，`data-theme` 型外部系统（如 color-mode `attribute="data-theme"`）永远没有 dark class，方向恒判"扩散"。
  - **动画样式清理定时器跨文档互删**：清理定时器按 document 记账——此前 iframe / 多文档场景下，B 文档的转场会取消 A 文档的清理定时器，导致 A 的 `::view-transition-*` 样式永久残留。
  - **受控模式超时降级语义**：外部系统 300ms 未同步时立即 `skipTransition()` 跳过转场，不再播放一段"旧→旧"的空转动画；超时结算前会复查一次目标状态（观察回调异常或极端时序的兜底）。
  
  **API 增强**
  
  - `useThemeAnimation`（React / Vue）返回值新增 **`finished`**：最近一次切换动画的结束 Promise，可用于动画期间禁用按钮等；库内已消化 rejection，不产生 unhandledrejection 噪音。
  - 新增公开导出 **`SKIP_TRANSITION`**：`domUpdate` 返回它表示"新截图尚未就绪"，`runThemeTransition` 会立即跳过转场（自定义集成场景用）。
  - 新增公开导出 **`observeThemeClass`**：以 `<html>` 暗色类名为事实源的观察器（含 storage 跨标签页同步）。
  - **非受控多实例 / 跨标签页状态同步**：同页多个 `useThemeAnimation` 实例的 `isDark` 现以 html class 为事实源镜像（此前各自为政，只有被点击的实例更新）；其它标签页的切换经 storage 事件同步。
  
  **防御性修复**
  
  - 样式注入 / 清理只匹配 `<style>` 节点（固定 id 与页面元素撞名时不误删）；转场样式身份判定改用节点引用。
  - `startViewTransition` 同步抛错时回滚已注入样式，`domUpdate` 仍按降级语义执行一次，错误原样冒泡。
  - 修正 `CIRCLE_BLUR` 的注释漂移（模糊蒙版只挂新截图层，旧层完整垫底）。
  
  **打包**
  
  - peerDependencies 补 **`react-dom: ">=18"`**（optional，与 `react` 同级）：`theme-switch-animation/react` 在转场回调内经 `react-dom` 的 `flushSync` 同步渲染，此前只声明了 `react`，pnpm 严格隔离（`node-linker=isolated` + `hoist=false`）等布局下子路径可能解析不到 `react-dom`。npm / yarn 与 pnpm 默认布局不受影响。

### Patch Changes

- 8eec036: 修复 `CIRCLE_REVERT` 收起（暗 → 亮）时的抖动与横带闪烁：收起方向不再给旧截图层加蒙版并 `z-index: 1` 置顶，改为在**新截图层**上用"反向蒙版（圆内透明、圆外不透明）"露出旧主题——层序回到 UA 默认，与 `CIRCLE` 的渲染结构完全一致。
  
  同时把蒙版盒子完全静止（`mask-size: 100% 100%` / `mask-position: 0 0`），只动画一个新注册的自定义属性 `--theme-switch-radius`（`@property` 注册为 `<length>`）来改变"洞"的半径。原先逐帧动画 `mask-size` / `mask-position` 会被合成器按设备像素对齐，实测圆心每帧被推 0.5–1px（`σ 0.329px`），改为静止盒子后降到 `σ 0.011px`；逐像素回归对比两种实现的渲染差异 ≤0.068/255（仅圆弧 1px 抗锯齿边不同），视觉等价。
  
  - 新增导出：`HOLE_RADIUS_VAR`、`getCircleRevertHoleGeometry`；`buildAnimationCSS` 新增可选参数 `holeGeometry`
  - `::view-transition-old(root)` 在收起方向不再被加蒙版（仅保留 `animation: none` / `mix-blend-mode: normal` 重置）
  - 兼容性：`@property` 在 Chrome 85+ / Safari 16.4+ / Firefox 128+ 均可用，覆盖全部支持 View Transition 的版本；仍是纯 mask 实现（无 clip-path / WAAPI），但"在 view-transition 伪元素上动画注册自定义属性"尚未在 Safari 真机验证
