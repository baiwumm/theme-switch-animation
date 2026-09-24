---
'theme-switch-animation': minor
---

新增第 17 种动画类型 `ThemeAnimationType.COMB`（梳齿交错）：

- **观感**：奇数叶片先展开、偶数叶片错半拍跟上，两批交替推进。动画中段会出现"一批已经封顶、另一批刚起步"的高对比画面——同步的 `BLINDS` 全程到不了这个状态。
- **零新参数**：复用 `direction`（决定渐变角与平铺轴）与 `slatWidth`（叶片宽），不消费触发元素几何。属于"属性驱动 + 静止蒙版盒子"一族，`orchestrate.ts` 与 `styles.ts` 一行未改。
- **新增导出**：`getCombRevealSpec` 与常量 `COMB_STAGGER_RATIO`（交错量 = 叶宽 × 0.5）。平铺周期翻倍成 `2 × slatWidth`，一个 tile 内左右两半各归一层渐变，`from = -软边` / `to = 交错量 + 叶宽`。
- **类型面**：`RevealMaskSpec.maskRepeat` 从 `'no-repeat' | 'repeat'` 放宽为 `string`，多层蒙版要按层数写逗号列表（`maskSize` 本来就是 `string`）。这是内部规格类型，不影响公开调用签名。
- 非破坏性：其余 16 种类型的行为不变。
- 两个值得记的取值约束（都已写成单测断言）：交错量比例必须严格落在 `(0, 1)` 内——取 `1` 时奇数段 `0..W` 与偶数段 `W..r` 首尾相接拼成单条 `0..r`，会退化成"叶宽 2W 的 BLINDS"；每层钳值只能用 `min()` 而**不能加 `max(..., 0px)` 下界**，钳到 0 会让起始帧在每片叶片左沿留一条实边漏光。
- 文档同步：README 类型表与 options 表、需求文档 §10 v1.10、文档站 hero / features / SEO、画廊第 17 张卡、四个 playground 类型清单与文案、门面截图按既有规格重出。
