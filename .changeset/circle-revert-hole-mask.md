---
'theme-switch-animation': patch
---

修复 `CIRCLE_REVERT` 收起（暗 → 亮）时的抖动与横带闪烁：收起方向不再给旧截图层加蒙版并 `z-index: 1` 置顶，改为在**新截图层**上用"反向蒙版（圆内透明、圆外不透明）"露出旧主题——层序回到 UA 默认，与 `CIRCLE` 的渲染结构完全一致。

同时把蒙版盒子完全静止（`mask-size: 100% 100%` / `mask-position: 0 0`），只动画一个新注册的自定义属性 `--theme-switch-radius`（`@property` 注册为 `<length>`）来改变"洞"的半径。原先逐帧动画 `mask-size` / `mask-position` 会被合成器按设备像素对齐，实测圆心每帧被推 0.5–1px（`σ 0.329px`），改为静止盒子后降到 `σ 0.011px`；逐像素回归对比两种实现的渲染差异 ≤0.068/255（仅圆弧 1px 抗锯齿边不同），视觉等价。

- 新增导出：`HOLE_RADIUS_VAR`、`getCircleRevertHoleGeometry`；`buildAnimationCSS` 新增可选参数 `holeGeometry`
- `::view-transition-old(root)` 在收起方向不再被加蒙版（仅保留 `animation: none` / `mix-blend-mode: normal` 重置）
- 兼容性：`@property` 在 Chrome 85+ / Safari 16.4+ / Firefox 128+ 均可用，覆盖全部支持 View Transition 的版本；仍是纯 mask 实现（无 clip-path / WAAPI），但"在 view-transition 伪元素上动画注册自定义属性"尚未在 Safari 真机验证
