---
'theme-switch-animation': minor
---

新增 8 种动画类型（总 5 → 13）：`CIRCLE_REVERT`（圆形收起，旧主题收缩进触发点）、`CIRCLE_BLUR`（圆形模糊扩散，新增 `blurAmount` 选项默认 2）与 6 种中心扩散形状 `SQUARE` / `DIAMOND` / `RECTANGLE` / `HEXAGON` / `TRIANGLE` / `STAR`（观感对齐 magicui，内切半径保证完全覆盖视口）。全部仍走 mask 动画，Safari 兼容约束不变；React / Vue / Nuxt 适配层零改动，Nuxt 自动导入对新增类型值/类型自动生效。
