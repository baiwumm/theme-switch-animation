---
'theme-switch-animation': minor
---

新增三种属性驱动动画类型与 `direction` / `slatWidth` 选项，并移除四向擦除类型（**breaking**）：

- `BLINDS` 百叶窗：叶片逐条揭开，`direction` 控制叶片方向与扫开方向（LTR/RTL/TTB/BTT），`slatWidth` 控制叶片宽度（16–200px，默认 72，越界静默回落默认）
- `SCAN` 扫描：硬边扫开 + 前缘半透明光束带，`direction` 控制扫开方向
- `QR_GRID` 方块格子：百叶窗的二维版——"列约束 ∩ 行约束"双层渐变蒙版 intersect 出逐格方块，方块随动画同步生长、末帧融为整屏；`direction` 决定锚定方位（LTR 左上 / RTL 右上 / TTB 顶边中点 / BTT 底边中点）；经 `@supports (mask-composite: intersect)` 门控，不支持的引擎自动降级为推进轴单层条带（观感同百叶窗），状态始终正确
- 新增 `direction` 选项（`ThemeAnimationDirection` 常量，默认 `ltr`），当前由以上三种类型消费，后续类型可复用；三种类型均无触发点、不消费 `ref` 中心

**Breaking**：移除 `ThemeAnimationType.LTR / RTL / TTB / BTT` 四个类型与 `DirectionalAnimationType` 类型、`BAR_MASK_IMAGE` / `BAR_START_PX` / `getDirectionalMaskGeometry` / `isDirectionalAnimationType` 导出。四向扫开能力由 `SCAN` + `direction` 承接（SCAN 额外带前缘光束；如需纯硬边，视觉差异仅前缘 12px 光束带）。

实现机制：三者为仓库首批"注册属性驱动"常规类型（`@property --theme-switch-reveal` + 静止蒙版盒子），与 CIRCLE_REVERT 收起方向的洞式蒙版同一机制。
