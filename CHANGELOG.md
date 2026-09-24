# theme-switch-animation

## 0.3.0

### Minor Changes

- 5997b7c: 新增第 16 种动画类型 `ThemeAnimationType.CURTAIN`（双开门）：
  
  - **观感**：新主题自屏幕中线向两侧对称推开，像拉开幕布。起始帧中缝先透出一道约 24px 的光，随后向两边展开。
  - **零新机制、零新参数**：属于"px 驱动 + 无触发点"一族，直接落进现成的 `isRevealAnimationType` / `getRevealMaskSpec` 分发器——`orchestrate.ts` 与 `styles.ts` 一行未改。不消费 `direction`（中线对称没有方向语义），也不消费触发元素几何。
  - **新增导出**：`getCurtainRevealSpec` 与常量 `CURTAIN_FEATHER_PX`（软边宽度 24px；末帧要 `to = 视口宽 + 2 × 软边` 才能把两条软边都推出画面）。
  - 非破坏性：其余 15 种类型的行为不变。
  - 顺带：README 不再写死动画类型数量（特性清单与 options 表改成"分族 + 指向下方类型表"，首段枚举加"等"字），文档站 hero 仍保留数字作为门面卖点。
  - 文档同步：README 类型表、需求文档 §10 v1.9、文档站 hero / features / SEO、画廊第 16 张卡、四个 playground 类型清单与文案、门面截图按既有规格重出。
- 60a3377: 新增第 13 种动画类型 `ThemeAnimationType.RIPPLE`（水滴涟漪）与配套选项 `waveWidth`：
  
  - **观感**：新主题仍以触发点为圆心向外揭开，但揭开前缘不是一条干净的边，而是主波峰 + 两圈衰减余波构成的环带（α 依次 0.5 / 0.275 / 0.151），呈水滴落入水面的涟漪感。`waveWidth`（默认 18，合法区间 `[8, 60]`，越界静默回落）控制相邻两圈波峰的间距。
  - **零新机制**：复用 BLINDS / SCAN 那套属性驱动揭开（`@property --theme-switch-reveal` + 完全静止的蒙版盒子），只是渐变换成 `radial-gradient` 并把波源中心写进串里——浏览器支持面与 BLINDS / SCAN 完全一致；`@property` 不可用时同样退化为直切，状态仍然正确。
  - **新增导出**：`getRippleRevealSpec` / `isRippleAnimationType` / `getRippleFrontExtentPx`，常量 `RIPPLE_TRAIL_COUNT` / `RIPPLE_CREST_ALPHA` / `WAVE_WIDTH_DEFAULT` / `MIN_WAVE_WIDTH` / `MAX_WAVE_WIDTH`。余波圈数与衰减系数固化为常量、未开放为选项（沿 `SCAN_BAND_*` / `QR_GRID_CELL_PX` 的先例）。
  - 非破坏性：其余 12 种类型的行为与选项语义不变，`direction` 对 `RIPPLE` 静默无效；`ResolvedAnimationOptions` 多一个 `waveWidth` 字段。
  - 文档同步：README 类型表与 options 表、需求文档 §10 v1.7、文档站画廊第 13 张卡（卡内波长档位 10 / 18 / 34px）与 hero / features / SEO 文案、四个 playground 的类型清单与 `waveWidth` 控件。
- c322383: 新增角度驱动族两个类型 `ThemeAnimationType.CLOCK_SWEEP`（时钟扇形）与 `ThemeAnimationType.FAN`（扇叶旋开），以及配套选项 `bladeCount`：
  
  - **`CLOCK_SWEEP`**：新主题以触发点为轴心，从 12 点方向顺时针扫出扇形，前缘带 12° 软尾（`CLOCK_SWEEP_TAIL_DEG`）。
  - **`FAN`**：`bladeCount` 片楔形扇叶（默认 8，合法区间 `[4, 16]` 的**整数**，非法静默回落）同时从各自周期的起始边旋开，末帧拼成整屏。观感是"扇叶旋开"而不是相机光圈的"中央孔径收缩"——后者需要半径维度，conic 表达不了，故定名 FAN。
  - **注册属性分名**：角度族用新的 `--theme-switch-sweep`（`@property` 的 syntax 一经注册不可改，`<angle>` 不能与 `<length>` 的 `--theme-switch-reveal` 同名）。为此 `buildRevealAnimationCSS` 不再把单位写死，改由蒙版规格的 `varName` / `unit` 决定——px 族（BLINDS / SCAN / RIPPLE）的输出逐字节不变。
  - **角度族免掉覆盖半径计算**：conic 覆盖的是角度而不是面积，扫满一周即盖住整平面，不存在 CIRCLE 家族那套"终半径要够到视口最远角"的系数。
  - **新增导出**：`getClockSweepRevealSpec` / `getFanRevealSpec` / `getFanBladeStepDeg` / `getSweepMaskSpec` / `isSweepAnimationType`，常量 `SWEEP_VAR` / `FULL_CIRCLE_DEG` / `CLOCK_SWEEP_TAIL_DEG` / `BLADE_COUNT_DEFAULT` / `MIN_BLADE_COUNT` / `MAX_BLADE_COUNT`。
  - 非破坏性：其余 13 种类型的行为不变，`direction` / `waveWidth` 对这两个新类型静默无效。旋转方向（顺 / 逆）暂未开放，也没新增参数。
  - 文档同步：README 类型表与 options 表、需求文档 §10 v1.8、文档站画廊第 14–15 张卡（FAN 卡带扇叶数 6 / 8 / 12 档位）与 hero / features / SEO 文案、四个 playground 的类型清单与 `bladeCount` 控件；门面截图按既有规格重出。

### Patch Changes

- eaa2e3d: 文档站首页 UI 层迁到 [beUI](https://beui.dev)（shadcn registry `@beui`，copy-paste 源码落在 `apps/docs/components/motion/**`）。**npm 包产物不变**，本条只记录门面与文档站的变更：
  
  - FAQ 换 `BouncyAccordion`（弹簧高度 + 分组圆角），框架切换换 `Tabs`（共享布局滑块），复制按钮换 `StatefulButton`（复制 → 已复制），Hero 标题/副标题换 `TextReveal`（逐词 / 逐字级联），眉标与卡片标签换 `AnimatedBadge`
  - 顶栏改胶囊圆角、锚点全部改用 beUI `Button`、新增 npm 入口，并支持滚动到哪一节高亮跟随；窄屏只保留 GitHub 图标以免 logo 折行
  - Quick Start 代码块加语法高亮（`prism-react-renderer`，配色挂 CSS 变量，暗色切换不重渲染、不闪未着色代码；内置包缺 `vue` 语法，用 `markup` + `typescript` 注册了一个）
  - 品牌图标自建（simple-icons 的 GitHub / npm 路径），替换已废弃的 lucide 品牌图标
  - 滚动条改细（10px 轨道 / 6px 圆角滑块）、颜色跟随主题、hover 加深，代码块一并纳入自绘
  - Hero 与 Quick Start / Playground 文案精简；`ThemeToggle` 的 ref 改为无条件挂载——motion 组件只转发一次 ref，原先延迟传法会让库拿不到触发元素、动画回落到视口中心
  
  依赖面：移除 `@radix-ui/react-accordion`、`@radix-ui/react-slot`、`class-variance-authority`（beUI 只用到已有的 `clsx` / `tailwind-merge` / `motion` / `lucide-react`），新增 `prism-react-renderer`。

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
