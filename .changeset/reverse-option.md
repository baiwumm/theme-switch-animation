---
'theme-switch-animation': minor
---

新增 `reverse` 选项（反向揭开），并把 `ThemeAnimationType.CIRCLE_REVERT` 标为废弃：

- **三态取值** `boolean | 'auto'`，默认 `false`：
  - `false` —— 总是正向（现状行为，不变）
  - `true` —— 总是反向：新主题从四周显出、向触发点收拢
  - `'auto'` —— 切暗正向、切亮收起，即 `CIRCLE_REVERT` 原本的语义
- **为什么不是布尔**：`CIRCLE_REVERT` 的语义是"跟随切换方向"，布尔的两个值都不等于它。做成布尔就只能让类型和选项两套写法并存，反而更乱。三态才能最终把那个类型删掉。
- **与 `direction` 正交**：`direction` 决定推进轴，`reverse` 决定从内还是从外揭开。`BLINDS` / `SCAN` / `QR_GRID` 有意不接入——它们的 `direction` 已经覆盖了那根轴。
- **`CIRCLE` / `FAN` / `RIPPLE` / `CLOCK_SWEEP` 四个生效**（依次：圆面向内收拢 / 扇叶合拢 / 水面内收 / **逆时针扫开**），其余类型传了静默忽略、非法值静默回落 `false`。`RIPPLE` / `CLOCK_SWEEP` 的接入排在后续版本；形状族与 `CURTAIN` 经实测判定**做不到无副作用**、不接入（理由见下）。
- **为什么不是所有类型都能反向**：`CURTAIN` 带 24px 羽化，反向时那条对称透明带塌到零宽会让两侧斜坡交叉出一个凹陷，末帧留下约 38px 的居中半透明带，违反"末帧必须完全覆盖"；形状族的反向必须动 `mask-size`，而那正是此前排查过的蒙版层设备像素对齐抖动病根。`FAN` 能做是因为它硬边无羽化——两组 stop 同归 0deg，带子塌零而不留缝（末帧扫描 0 残留，并以 start/mid 两点对照证明蒙版确实在生效）。
- **迁移**：`{ animationType: CIRCLE_REVERT }` → `{ animationType: CIRCLE, reverse: 'auto' }`。旧写法仍可用，开发环境会提示一次（生产静默），计划在 0.5.0 移除。
- 非破坏性：16 种类型的既有行为与选项语义均不变；`ResolvedAnimationOptions` 多一个 `reverse` 字段。
- 文档同步：README 类型表与 options 表、需求文档 §10 v1.10、文档站 CIRCLE 卡与四个 playground 各加 `Reverse` 三档控件。
