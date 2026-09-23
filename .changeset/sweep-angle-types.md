---
'theme-switch-animation': minor
---

新增角度驱动族两个类型 `ThemeAnimationType.CLOCK_SWEEP`（时钟扇形）与 `ThemeAnimationType.FAN`（扇叶旋开），以及配套选项 `bladeCount`：

- **`CLOCK_SWEEP`**：新主题以触发点为轴心，从 12 点方向顺时针扫出扇形，前缘带 12° 软尾（`CLOCK_SWEEP_TAIL_DEG`）。
- **`FAN`**：`bladeCount` 片楔形扇叶（默认 8，合法区间 `[4, 16]` 的**整数**，非法静默回落）同时从各自周期的起始边旋开，末帧拼成整屏。观感是"扇叶旋开"而不是相机光圈的"中央孔径收缩"——后者需要半径维度，conic 表达不了，故定名 FAN。
- **注册属性分名**：角度族用新的 `--theme-switch-sweep`（`@property` 的 syntax 一经注册不可改，`<angle>` 不能与 `<length>` 的 `--theme-switch-reveal` 同名）。为此 `buildRevealAnimationCSS` 不再把单位写死，改由蒙版规格的 `varName` / `unit` 决定——px 族（BLINDS / SCAN / RIPPLE）的输出逐字节不变。
- **角度族免掉覆盖半径计算**：conic 覆盖的是角度而不是面积，扫满一周即盖住整平面，不存在 CIRCLE 家族那套"终半径要够到视口最远角"的系数。
- **新增导出**：`getClockSweepRevealSpec` / `getFanRevealSpec` / `getFanBladeStepDeg` / `getSweepMaskSpec` / `isSweepAnimationType`，常量 `SWEEP_VAR` / `FULL_CIRCLE_DEG` / `CLOCK_SWEEP_TAIL_DEG` / `BLADE_COUNT_DEFAULT` / `MIN_BLADE_COUNT` / `MAX_BLADE_COUNT`。
- 非破坏性：其余 13 种类型的行为不变，`direction` / `waveWidth` 对这两个新类型静默无效。旋转方向（顺 / 逆）暂未开放，也没新增参数。
- 文档同步：README 类型表与 options 表、需求文档 §10 v1.8、文档站画廊第 14–15 张卡（FAN 卡带扇叶数 6 / 8 / 12 档位）与 hero / features / SEO 文案、四个 playground 的类型清单与 `bladeCount` 控件；门面截图按既有规格重出。
