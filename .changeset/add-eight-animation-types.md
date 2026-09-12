---
'theme-switch-animation': minor
---

新增 8 种动画类型（总 5 → 13）：`CIRCLE_REVERT`（穿越缩放两段式：旧主题收起进触发点，新主题从触发点扩散）、`CIRCLE_BLUR`（圆形模糊扩散，新增 `blurAmount` 选项默认 2，模糊蒙版仅挂新截图层、旧层完整垫底）与 6 种中心扩散形状 `SQUARE` / `DIAMOND` / `RECTANGLE` / `HEXAGON` / `TRIANGLE` / `STAR`（观感对齐 magicui，内切半径保证完全覆盖视口）。形状与模糊仍走 mask 动画，REVERT 为 transform 缩放；React / Vue / Nuxt 适配层零改动，Nuxt 自动导入对新增类型值/类型自动生效。
