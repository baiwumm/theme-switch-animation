---
'theme-switch-animation': minor
---

**首次发布 0.1.0**：跨框架主题切换动画库。用户点击切换 light / dark 时，新主题以指定形状"揭开"覆盖旧主题，而非生硬跳变。

- **实现路线**：基于 View Transitions API（`document.startViewTransition`），向 `<head>` 注入临时样式，对 `::view-transition-new(root)` 做 **mask 动画**；不使用 clip-path / WAAPI，兼容 Safari 18+（Chrome / Edge 111+、Firefox 144+）。
- **单包多入口**：`theme-switch-animation`（框架无关 core）/ `theme-switch-animation/react` / `theme-switch-animation/vue` / `theme-switch-animation/nuxt`，覆盖 React 18+、Vue 3+、Next.js（App Router，复用 `/react`）与 Nuxt 3+（模块 + 自动导入）。
- **13 种动画类型**（`ThemeAnimationType`）：圆形扩散 / 收起 / 模糊（`CIRCLE` / `CIRCLE_REVERT` / `CIRCLE_BLUR`）、四向擦除（`LTR` / `RTL` / `TTB` / `BTT`）、形状扩散（`SQUARE` / `DIAMOND` / `RECTANGLE` / `HEXAGON` / `TRIANGLE` / `STAR`）；中心扩散类以触发元素中心为圆心。
- **非受控模式**（默认）：库内管理 `localStorage`（key `theme-switch-animation`）与 `<html>` 上的 `darkClassName`，零配置开箱即用；多实例与跨标签页自动同步。
- **受控模式**：同时传 `isDark` + `onChange` 即接入 `next-themes`、`@nuxtjs/color-mode` 等外部主题状态；库不碰存储与类名，以 MutationObserver 等待外部 DOM 同步后截图，300ms 超时兜底直切。
- **降级**：不支持 View Transitions、`prefers-reduced-motion: reduce`、SSR 渲染阶段均直接切换，状态始终正确；Next RSC / Nuxt SSR 无 hydration 报错。
- **可定制**：`duration`（默认 750ms）/ `easing`（任意合法 CSS timing-function，经 CSS 变量注入）/ `darkClassName` / `blurAmount`；底层 `runThemeTransition`、蒙版几何与样式构建函数亦从主入口公开导出，供自定义集成。
