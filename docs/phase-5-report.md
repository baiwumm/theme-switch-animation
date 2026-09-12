# Phase 5 执行汇报（Logo 定稿）

| 项目 | 内容 |
|---|---|
| 日期 | 2026-09-13 |
| 范围 | 品牌 Logo 定稿与多尺寸产物。**Phase 5 主体（文档站）尚未开始**，本文件当前仅承载 Logo 交付内容，文档站启动后追加 |
| 定稿 | 方案 B「圆形扩散」（方案 A「日夜对分」、方案 C「拨动切换」经比稿后弃用） |

---

## 1. 定稿方案

**核心语义**：实心圆 = 点击位置（扩散中心）；波纹弧线 = `CIRCLE` 动画"新主题揭开旧主题"的扩散瞬间，断口留白指向扩散行进方向（右上）。

**本稿相对初版的微调**：

| # | 微调项 | 初版 | 定稿 |
|---|---|---|---|
| 1 | 断口张角 | 约 140° | **190°（+35%）**，方向保持右上，"未闭合感"明确 |
| 2 | 弧线结构 | 单段 | **两段同心**：内段 r=132 / stroke 16 / 实色；外段 r=160 / stroke 9 / 45% 透明度（正在消散的波前） |
| 3 | 小尺寸降级 | 无 | 24px / 16px 渲染时省略外段，仅保留 实心圆 + 内段（外段在该尺寸下糊成一团，按预案退回单段） |

**不变项**：实心圆 r=96 居中；圆角方块容器 rx=116（对齐 Better Nav 比例），容器不参与 logo 语义、无额外装饰；整体极简双色。

## 2. 产物清单（`assets/logo/`）

| 文件 | 说明 |
|---|---|
| `logo-light.svg` / `logo-dark.svg` | 矢量源（浅色底 `#F5F5F7` / 深色底 `#0F0F10`）；实心圆、内段、外段为三个独立 `<path>`，可单独调色 |
| `logo-light-48.png` / `logo-dark-48.png` | 48px 完整结构（双段波纹） |
| `logo-light-24.png` / `logo-dark-24.png` | 24px 降级结构（实心圆 + 内段） |
| `logo-light-16.png` / `logo-dark-16.png` | 16px（favicon）降级结构 |

## 3. 小尺寸识别性验证

48px 下双段波纹清晰分层；24px 降级后"圆 + 弧"明确可辨；16px 下弧线变细但仍能识别"圆 + 左侧弧"结构，明暗两版视觉重量一致。

| 浅色底 | 深色底 |
|---|---|
| ![logo-light-48](../assets/logo/logo-light-48.png) ![logo-light-24](../assets/logo/logo-light-24.png) ![logo-light-16](../assets/logo/logo-light-16.png) | ![logo-dark-48](../assets/logo/logo-dark-48.png) ![logo-dark-24](../assets/logo/logo-dark-24.png) ![logo-dark-16](../assets/logo/logo-dark-16.png) |

## 4. 遗留事项

- [ ] favicon / README 头图接入（待 Phase 5 文档站搭建时统一处理）
- [ ] 如需 og-image 等更多尺寸，从 SVG 源按同一降级规则渲染即可
