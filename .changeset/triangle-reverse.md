---
'theme-switch-animation': minor
---

`reverse` 补接 `TRIANGLE`（接入面 9 → 10 个类型）：顶点朝上的等边三角形洞从视口三边向触发点收拢。

- **构造**：三个半平面默认 `add`——三条边取内法向 0° / 120° / 240° 的 `linear-gradient`（边界靠视口外一侧 `#000`、洞内一侧 `transparent`），透明区取交集 = 三角形洞，免 `@supports`；与 DIAMOND 的洞式条带同一构造类（**凸多边形 = 半平面/条带的交集**）。内切半径 `a = v × 0.5`（外接圆 = 2a）；±0.5px 斜坡是洞边抗锯齿，同 DIAMOND。
- **几何**：`S = L/2 + (触发点 − 视口中心)·u` 烘进 px 常量（`L = |W·sinA| + |H·cosA|`）；`from = 1.05 × needed / 0.5`（`needed = max over (视口角 p, 内法向 u) of −(p−c)·u`，洞盖满视口的充要条件）、`to = 0`——不复用正向欧氏外接圆余量（照抄多留 ~12%，起手空转 125ms → 240ms）。
- **范围决策（P3-11 预检，2026-11-23）**：只接 `TRIANGLE`。预检同时证明 `HEXAGON` 构造可接（同为凸多边形），但与 `CIRCLE` 同帧区分度仅 6.75% / 15.87（基线 DIAMOND vs CIRCLE 7.06% / 16.84），收益不足未接；`STAR` 真凹、无半平面构造，维持不做。原「形状族斜线轮廓无静止盒子绕路」的理由经预检证伪，分界修正为**凸 vs 凹**（roadmap §4 / requirements §7 已同步）。文档站画廊 TRIANGLE 卡挂 `Reverse` 三档控件。
