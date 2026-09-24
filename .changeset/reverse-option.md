---
'theme-switch-animation': minor
---

新增 `reverse` 选项（反向揭开），并移除 `ThemeAnimationType.CIRCLE_REVERT` 类型与导出函数 `getCircleRevertMaskGeometry`（**breaking**，动画类型 16 → 15 种）：

- **三态取值** `boolean | 'auto'`，默认 `false`：
  - `false` —— 总是正向（现状行为，不变）
  - `true` —— 总是反向：新主题从四周显出、向触发点收拢
  - `'auto'` —— 切暗正向、切亮收起，即 `CIRCLE_REVERT` 原本的语义
- **迁移**：`{ animationType: ThemeAnimationType.CIRCLE_REVERT }` → `{ animationType: ThemeAnimationType.CIRCLE, reverse: 'auto' }`。注入的 CSS 只在 keyframes 名上不同（`theme-switch-circle-revert` → `theme-switch-circle`），逐帧观感一致。想无论切哪个方向都收拢，写 `reverse: true`——那是 0.3.x 没有的形态。完整说明见 README「从 0.3.x 升级（0.4.0 破坏性变更）」。
- **为什么不是布尔**：`CIRCLE_REVERT` 的语义是"跟随切换方向"，布尔的两个值都不等于它。做成布尔就只能让类型和选项两套写法并存，反而更乱；三态才删得掉那个类型。
- **与 `direction` 正交**：`direction` 决定推进轴，`reverse` 决定从内还是从外揭开。`BLINDS` / `SCAN` / `QR_GRID` 有意不接入——它们的 `direction` 已经覆盖了那根轴，再接入会留下重复组合。
- **`CIRCLE` / `FAN` / `RIPPLE` / `CLOCK_SWEEP` / `CURTAIN` 五个生效**（依次：圆面向内收拢 / 扇叶合拢 / 水面内收 / **逆时针扫开** / 两扇幕布向中线合拢），其余 10 个类型传了静默忽略、非法值静默回落 `false`。
- **为什么形状族 6 个不能反向**：反向必须动 `mask-size`，而那正是此前排查过的蒙版层设备像素对齐抖动病根，做不到无副作用。`CURTAIN` 一度也按这条被判"做不到"（24px 羽化的对称透明带塌到零宽时两侧斜坡交叉出凹陷，末帧留约 38px 居中半透明带），**那是错判**——单渐变取补确实无解，换两层 + 默认 `mask-composite: add`（取最大 alpha）后末帧零残留。`FAN` 能做是因为它硬边无羽化：两组 stop 同归 0deg，带子塌零而不留缝。教训：证伪一个方案之前要先穷举构造空间。
- **`getCircleRevertHoleGeometry`（洞式收起的几何）保留原名导出**，现在由 `CIRCLE + reverse` 消费；`styles.ts` 一并删掉 V1.5 那条"收起挂旧截图层 + `z-index: 1`"的路径与 `revertDirection` 参数（V1.6 起洞式已是默认，那条分支只有公开 API 走得到）。
- 文档同步：README 类型表 / options 表 / 新增升级一节，需求文档 §10 v1.10–v1.13，文档站与四个 playground 的上述五个卡各加 `Reverse` 三档控件（CIRCLE_REVERT 卡移除），门面截图重拍。
