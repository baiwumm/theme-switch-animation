---
'theme-switch-animation': minor
---

新增第 13 种动画类型 `ThemeAnimationType.RIPPLE`（水滴涟漪）与配套选项 `waveWidth`：

- **观感**：新主题仍以触发点为圆心向外揭开，但揭开前缘不是一条干净的边，而是主波峰 + 两圈衰减余波构成的环带（α 依次 0.5 / 0.275 / 0.151），呈水滴落入水面的涟漪感。`waveWidth`（默认 18，合法区间 `[8, 60]`，越界静默回落）控制相邻两圈波峰的间距。
- **零新机制**：复用 BLINDS / SCAN 那套属性驱动揭开（`@property --theme-switch-reveal` + 完全静止的蒙版盒子），只是渐变换成 `radial-gradient` 并把波源中心写进串里——浏览器支持面与 BLINDS / SCAN 完全一致；`@property` 不可用时同样退化为直切，状态仍然正确。
- **新增导出**：`getRippleRevealSpec` / `isRippleAnimationType` / `getRippleFrontExtentPx`，常量 `RIPPLE_TRAIL_COUNT` / `RIPPLE_CREST_ALPHA` / `WAVE_WIDTH_DEFAULT` / `MIN_WAVE_WIDTH` / `MAX_WAVE_WIDTH`。余波圈数与衰减系数固化为常量、未开放为选项（沿 `SCAN_BAND_*` / `QR_GRID_CELL_PX` 的先例）。
- 非破坏性：其余 12 种类型的行为与选项语义不变，`direction` 对 `RIPPLE` 静默无效；`ResolvedAnimationOptions` 多一个 `waveWidth` 字段。
- 文档同步：README 类型表与 options 表、需求文档 §10 v1.7、文档站画廊第 13 张卡（卡内波长档位 10 / 18 / 34px）与 hero / features / SEO 文案、四个 playground 的类型清单与 `waveWidth` 控件。
