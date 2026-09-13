---
'theme-switch-animation': minor
---

可靠性与一致性修复，及小幅 API 增强（core / React / Vue / Nuxt）：

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
