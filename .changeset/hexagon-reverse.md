---
'theme-switch-animation': minor
---

`reverse` 补接 `HEXAGON`（接入面 10 → 11 个类型）：尖顶朝上的六边形洞从视口六边向触发点收拢。

- **构造**：三条透明芯条带默认 `add`——轴取 90° / 150° / 210°（90° 法向水平 ⇒ 左右竖直边、上下出顶点 = 尖顶，与正向蒙版朝向一致），每层 `linear-gradient(Adeg, #000 0 calc(S−v×0.8661−0.5px), transparent …, #000 calc(S+v×0.8661+0.5px))`，透明区取交集 = 六边形洞，免 `@supports`；与 DIAMOND 的洞式条带同一构造类。边心距 `a = ceil4(cos30°) × v = 0.8661v`，向上取整防欠覆盖（round2 的 0.87 会让内切半径小 0.4%）。
- **几何**：`S = L/2 + (触发点 − 视口中心)·u` 烘进 px 常量；条带是**双侧**约束，`needed = max over (视口角 p, 轴法向 u) of |(p−c)·u|`（与 TRIANGLE 半平面的单侧 needed 不同）、`from = 1.05 × needed / 0.8661`、`to = 0`——不复用正向欧氏外接圆余量（多留 14.7%，起手空转 125ms → 240ms）。
- **范围决策（P3-11 补全，2026-11-23）**：预检（同 `TRIANGLE` 一份报告）早已逐像素过关；首轮「只接 TRIANGLE」因 HEXAGON 与 CIRCLE 同帧区分度仅 6.75% / 15.87（略高于 DIAMOND vs CIRCLE 基线 7.06% / 16.84），本次需求方改判都接、连同发版。`STAR` 真凹维持不做：add / intersect / subtract 三种合成的构造空间已穷举（交集恒凸；过中心扇区并集 = FAN@5 撞车；subtract 近似伤中腔）。文档站画廊 HEXAGON 卡挂 `Reverse` 三档控件。
