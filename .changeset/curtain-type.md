---
'theme-switch-animation': minor
---

新增第 16 种动画类型 `ThemeAnimationType.CURTAIN`（双开门）：

- **观感**：新主题自屏幕中线向两侧对称推开，像拉开幕布。起始帧中缝先透出一道约 24px 的光，随后向两边展开。
- **零新机制、零新参数**：属于"px 驱动 + 无触发点"一族，直接落进现成的 `isRevealAnimationType` / `getRevealMaskSpec` 分发器——`orchestrate.ts` 与 `styles.ts` 一行未改。不消费 `direction`（中线对称没有方向语义），也不消费触发元素几何。
- **新增导出**：`getCurtainRevealSpec` 与常量 `CURTAIN_FEATHER_PX`（软边宽度 24px；末帧要 `to = 视口宽 + 2 × 软边` 才能把两条软边都推出画面）。
- 非破坏性：其余 15 种类型的行为不变。
- 顺带：README 不再写死动画类型数量（特性清单与 options 表改成"分族 + 指向下方类型表"，首段枚举加"等"字），文档站 hero 仍保留数字作为门面卖点。
- 文档同步：README 类型表、需求文档 §10 v1.9、文档站 hero / features / SEO、画廊第 16 张卡、四个 playground 类型清单与文案、门面截图按既有规格重出。
