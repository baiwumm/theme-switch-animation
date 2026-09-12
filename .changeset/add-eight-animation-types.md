---
'theme-switch-animation': minor
---

新增 8 种动画类型（总 5 → 13）：`CIRCLE_REVERT`（方向感知的暗色圆：切到暗色时暗色圆从点击点扩散，切回亮色时暗色圆收起进点击点，来回切换自然产生一次扩散、一次收起）、`CIRCLE_BLUR`（圆形模糊扩散，新增 `blurAmount` 选项默认 2，模糊蒙版仅挂新截图层、旧层完整垫底）与 6 种中心扩散形状 `SQUARE` / `DIAMOND` / `RECTANGLE` / `HEXAGON` / `TRIANGLE` / `STAR`（观感对齐 magicui，内切半径保证完全覆盖视口）。全部仍走 mask 动画，Safari 兼容约束不变；React / Vue / Nuxt 适配层零改动，Nuxt 自动导入对新增类型值/类型自动生效。

**行为变更**：`duration` 默认值 400 → 750（体感反馈：400ms 偏快）；样式表内 `var(--theme-switch-duration, …)` 兜底同步。显式传入 `duration` 的调用方不受影响。
