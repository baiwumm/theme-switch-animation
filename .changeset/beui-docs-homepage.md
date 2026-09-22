---
'theme-switch-animation': patch
---

文档站首页 UI 层迁到 [beUI](https://beui.dev)（shadcn registry `@beui`，copy-paste 源码落在 `apps/docs/components/motion/**`）。**npm 包产物不变**，本条只记录门面与文档站的变更：

- FAQ 换 `BouncyAccordion`（弹簧高度 + 分组圆角），框架切换换 `Tabs`（共享布局滑块），复制按钮换 `StatefulButton`（复制 → 已复制），Hero 标题/副标题换 `TextReveal`（逐词 / 逐字级联），眉标与卡片标签换 `AnimatedBadge`
- 顶栏改胶囊圆角、锚点全部改用 beUI `Button`、新增 npm 入口，并支持滚动到哪一节高亮跟随；窄屏只保留 GitHub 图标以免 logo 折行
- Quick Start 代码块加语法高亮（`prism-react-renderer`，配色挂 CSS 变量，暗色切换不重渲染、不闪未着色代码；内置包缺 `vue` 语法，用 `markup` + `typescript` 注册了一个）
- 品牌图标自建（simple-icons 的 GitHub / npm 路径），替换已废弃的 lucide 品牌图标
- 滚动条改细（10px 轨道 / 6px 圆角滑块）、颜色跟随主题、hover 加深，代码块一并纳入自绘
- Hero 与 Quick Start / Playground 文案精简；`ThemeToggle` 的 ref 改为无条件挂载——motion 组件只转发一次 ref，原先延迟传法会让库拿不到触发元素、动画回落到视口中心

依赖面：移除 `@radix-ui/react-accordion`、`@radix-ui/react-slot`、`class-variance-authority`（beUI 只用到已有的 `clsx` / `tailwind-merge` / `motion` / `lucide-react`），新增 `prism-react-renderer`。
