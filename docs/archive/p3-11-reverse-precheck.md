# P3-11 预检：`reverse` 补接 TRIANGLE / HEXAGON

> **一次性预检报告**（2026-11-20 归档，按 `AGENTS.md` docs 约定放 `docs/archive/`）。
> 结论是「可做、范围待定」，实现另起一轮；本轮**没有改动 `packages/`**。
> 取证数据（逐帧 PNG / stdout / 对照图）在 gitignored 的 `scripts/.verify-engine-out/p311/`，不入库，
> 复跑方式见 §7。预检脚本 `scripts/jitter-lab/precheck-p311.mjs` 是一次性的，P3-11 落地后删除。

## 0. 结论

1. **TRIANGLE / HEXAGON 都能接上 `reverse`**，且不越界：3 层渐变、默认 `mask-composite: add`、
   蒙版盒子静止、只动注册属性 `--theme-switch-reveal`、±0.5px AA 斜坡（与 DIAMOND 同一路数），
   不需要 `@supports`，也不碰 roadmap §4 封掉的 `mask-size` / `mask-position` 动画。
2. 两者都是**逐像素精确**的洞：18 帧 × 两种 dsf，洞内像素与几何预测 0.000% 不一致，
   射线支撑函数误差 ≤1.8px（dsf=1）/ ≤1.0px（dsf=2）。末帧零残留，可见比例逐帧单调。
3. **真正的分界线是凸 vs 凹，不是「轴对齐 vs 斜边」**。HEXAGON（3 条条带）与 TRIANGLE（3 个半平面）
   与 DIAMOND（2 条条带）是同一构造类；STAR 是唯一真凹的，半平面/条带这条路过不去
   （只剩 ~10 个扇形层 + calc 顶点，不划算），维持不做。
4. 建议**只接 TRIANGLE**：身份感最强（同帧区分度 17.65% / 42.06，远超 DIAMOND vs CIRCLE 的
   7.06% / 16.84 基线）、构造最简单。HEXAGON 技术同样过关，但与 CIRCLE 的区分度只略高于
   DIAMOND 的水平，收益小、要多改一份测试/文档/画廊/playground。
5. **待决**：范围（只 TRIANGLE / 两个都接 / 都不接只修文档理由）。需求方本次会话未定。

## 1. 为什么会有这一项

`docs/animation-roadmap.md` §4 与 `docs/requirements.md` §7 记的理由是「形状族反向只支持轴对齐
（SQUARE / RECTANGLE）与菱形（DIAMOND）」。这个理由对 HEXAGON / TRIANGLE 是**错的**——它们和
DIAMOND 一样是凸多边形，洞就是「若干半平面/条带的交集」，不需要任何新机制。

历史事实：SQUARE / RECTANGLE / DIAMOND 三项是**预检过**的（P3-9 / P3-10，帧证据），
HEXAGON / TRIANGLE / STAR 是**靠推断排除**的，从没跑过预检。本次把推断补成证据。

## 2. 预检方法

`scripts/jitter-lab/precheck-p311.mjs`（一次性）在同一个 Chrome 会话、同一时间轴上抓 7 个候选：

| 候选 | 来源 |
|---|---|
| `circle-rev` / `diamond-rev` / `square-rev` | 库里已发布的实现（对照基线） |
| `triangle-rev` / `hexagon-rev` | 本次按「凸多边形 = 半平面/条带并集」现场拼的候选 CSS（不进 core，只替换注入的 style 节点） |
| `triangle-euclid` / `hexagon-euclid` | 同一构造，但 `from` 用欧氏最大半径（错判据），量化起手空转代价 |

- 时间轴：`[0,25,50,75,100,125,150,175,200,240,280,320,375,450,525,600,675,750]`（750ms 时长，
  前密后疏，为了看清起手空转）。
- 视口 1280×800，触发点 (853.59, 294)——**刻意不在视口中心**；`dsf=1` 与 `dsf=2` 各跑一遍。
- 判据（与 P3-9 / P3-10 同口径）：
  1. 首帧整屏旧主题、末帧整屏新主题（逐像素计数，不是抽样）；
  2. 洞内像素与几何预测逐像素比对（跳过边界 ±1.5px / ±3px 两档，并记录「不一致点距边界最远多少」，
     用来区分 AA 斜坡与真几何误差）；
  3. 12 条射线（每 30°）的支撑函数误差；
  4. 可见像素占比逐帧单调不减；
  5. 起手空转 = 首帧到「第一次出现新主题像素」的时长；
  6. 与 DIAMOND / CIRCLE 的同帧像素区分度。

## 3. 可直接落地的构造

### 3.1 共同骨架

与 DIAMOND reverse 完全同构：蒙版挂 `::view-transition-new(root)`，盒子 `mask-size: 100% 100%`、
`mask-position: 0 0`、`mask-repeat: no-repeat`，**合成用默认 `add`**（不写 `mask-composite`），
`@keyframes` 只动 `--theme-switch-reveal`，`from` → `0`。

每层是一条 `linear-gradient(<A>deg, …)`；渐变角 `A` 取该边的**内法向**（CSS 角度，0deg 朝上），
单位向量 `u = (sin A, −cos A)`，渐变线上点 `p` 的位置

```
S(p) = L(A)/2 + (p − 视口中心)·u ,   L(A) = |W·sin A| + |H·cos A|
S_i  = S(触发点)                     // 每层各自的常数，烘成 px
```

洞 = 各层透明芯的交集（`add` 合成下透明区取交集）。

### 3.2 TRIANGLE（3 个半平面）

- 轴 / 法向：`A = 0° / 120° / 240°`；洞是**顶点朝上**等边三角形（与正向 `TRIANGLE_MASK_IMAGE`
  的顶点极角 −90 / 30 / 150 一致）。
- 内切半径 `a = v / 2`（等边三角形外接圆 = 2a），`k = 0.5`。
- 层：

```
linear-gradient(Adeg, #000 0 calc(S_i px − v*0.5 − 0.5px),
                        transparent calc(S_i px − v*0.5 + 0.5px))
```

  即「边界靠视口外那一侧不透明、靠洞内一侧透明」。

### 3.3 HEXAGON（3 条透明芯条带）

- 轴：`A = 90° / 150° / 210°`（三条轴各自两侧成边，共 6 条边）。
  **必须是 90/150/210**：改 0/60/120 会得到**平顶**六边形，与正向 `HEXAGON_MASK_IMAGE`（尖顶朝上，
  顶点极角 −90 + 60k）朝向对不上。这一条预检里踩过，见 §5。
- 边心距 `a = cos30° · v`，`k = 0.8661`（向上取到 4 位，见 §3.5）。
- 层：

```
linear-gradient(Adeg, #000 0 calc(S_i px − v*k − 0.5px),
                        transparent calc(S_i px − v*k + 0.5px) calc(S_i px + v*k − 0.5px),
                        #000 calc(S_i px + v*k + 0.5px))
```

### 3.4 `from` 的推导（最容易写错的地方）

洞要盖满视口的**充要条件**是每条边的法向偏移都超过该边最靠外的视口角：

```
needed = max over (角 p, 法向 u_i) of  −(p − c)·u_i
from   = 1.05 × needed / k
```

**不是** `max over (p, u_i) of +(p−c)·u_i`（符号反了），**也不是**正向尺寸用的欧氏最大半径
`getMaxRadiusToCorners`——后者对三角形会多留 12%、对六边形多留 15%，代价是起手空转从 125ms
翻到 240ms（32% 的时长画面完全不动，同 RIPPLE 那次的教训）。

本机样本（视口 1280×800、触发点 853.59 / 294）：

| 类型 | needed | `from` | 欧氏判据 `from` | 多留 | 起手空转 |
|---|---|---|---|---|---|
| TRIANGLE | 886.23px | **1861.09px** | 2083.83px | 11.97% | 125ms → 240ms |
| HEXAGON | 865.01px | **1048.76px** | 1203.10px | 14.72% | 125ms → 240ms |

样本的各层常数：TRIANGLE `S = 506.00 / 886.23 / 516.28`；HEXAGON `S = 853.59 / 681.41 / 467.81`。
（`S` 随触发点变化，实现时按上式算，别抄。）

`1.05` 余量带来约 125ms 起手空转——这是 CIRCLE（`from = 1.05 × maxRadius = 1041.91`）与
DIAMOND（`from = 1.05 × v0 = 1009.45`）的**既有基线**，不是新增缺陷。要削就四类一起削，别单独改。

### 3.5 系数精度

写进 `calc` 的 `k` 一律**向上**取到 4 位（同 `masks.ts` 的 `ceil4` 口径）：`ceil4(cos30°) = 0.8661`。
`round2(cos30°) = 0.87` 会让内切半径小 0.4%（v=1048 时 4.2px），把覆盖余量吃掉一截——
预检第一版就是这个错，量到六边形边界整体偏内 3~5px，改回 0.8661 后立刻变 0.000% 不一致。

## 4. 证据

### 4.1 首帧 / 末帧 / 单调性 / 起手空转（逐像素，dsf=1 与 dsf=2 一致）

| 候选 | t=0 新主题像素 | t=750 旧主题像素 | 可见比例单调 | 起手空转 | 空转占比 |
|---|---|---|---|---|---|
| circle-rev | 0 | 0 | 是 | 125ms | 16.7% |
| diamond-rev | 0 | 0 | 是 | 125ms | 16.7% |
| square-rev | 0 | 0 | 是 | 25ms | 3.3% |
| **triangle-rev** | 0 | 0 | 是 | **125ms** | 16.7% |
| **hexagon-rev** | 0 | 0 | 是 | **125ms** | 16.7% |
| triangle-euclid | 0 | 0 | 是 | 240ms | 32.0% |
| hexagon-euclid | 0 | 0 | 是 | 240ms | 32.0% |

### 4.2 洞的轮廓是否就是那个形状

| 候选 | 不一致@1.5px | 不一致@3px | 不一致点距边界最远 | 射线支撑函数误差 |
|---|---|---|---|---|
| triangle-rev（dsf=1） | 0.000%（18/18 帧） | 0.000% | 0px | ≤1.8px |
| triangle-rev（dsf=2） | 0.000% | 0.000% | 0px | ≤1.0px |
| hexagon-rev（dsf=1） | 0.000% | 0.000% | 0px | ≤1.4px |
| hexagon-rev（dsf=2） | 0.000% | 0.000% | 0px | ≤0.8px |

即洞**就是**几何预测的那个三角/六边形，误差全在 AA 斜坡内。

### 4.3 与既有 reverse 的区分度（同一时间轴 = 同一相对进度）

| 对比 | 峰值（\|ΔL\|>8 的像素占比 / 平均 \|ΔL\|） |
|---|---|
| triangle vs diamond | **17.65% / 42.06** |
| triangle vs circle | **14.98% / 35.56** |
| hexagon vs diamond | 11.94% / 28.47 |
| hexagon vs circle | 6.75% / 15.87 |
| diamond vs circle（既有基线） | 7.06% / 16.84 |

关键细节：t=375 时 CIRCLE 半径 520.96、HEXAGON 外接圆 524.4，**尺寸几乎相同**，所以 6.75% 是纯
形状差；同刻 DIAMOND（半径 504.7）与 CIRCLE 只有 5.34%。即 HEXAGON reverse 与 CIRCLE 的区分度
**略高于已发布的 DIAMOND vs CIRCLE**，不算「像圆」，但也就到这个量级。

TRIANGLE 同刻半径 930.5（三角形外接圆必须是 2 倍内切半径，天然更大），边移动速度是 `dv/dt ÷ 2`，
观感扫速与其他族对齐。

时间轴对照图（4 行 × 8 列，可直接看观感）：`scripts/.verify-engine-out/p311/strip-dsf1.png`。

## 5. 预检里踩到的三个坑（实现时别再踩）

1. **`from` 判据符号反了**：写成 `max +(p−c)·u` 得到的是「角在多远之外」，不是「洞要多大」，
   结果 `from` 放大 10% 以上、起手空转 240ms。正确式见 §3.4。
2. **六边形朝向**：轴 0/60/120 → 平顶；正向是尖顶朝上，轴必须 90/150/210。
   逐像素判据是**自洽**的（预测跟着轴走），所以这个错**抓不到**，只能对照正向蒙版顶点。
3. **系数取整方向**：`round2(cos30°) = 0.87` 让洞偏小 0.4%；要用 `ceil4` 向上取（0.8661）。

另外两个只有实测才会发现的量：`from` 的 1.05 余量 ≈ 125ms 起手空转（既有基线）；
`±0.5px` 斜坡在 120° 顶点处两坡相交，1.5px 容差会漏 0.16% 的「假不一致」，3px 容差归零。

## 6. 实现清单（若立项）

**core**

- `packages/core/src/masks.ts`：新增 `getTriangleReverseRevealSpec` / `getHexagonReverseRevealSpec`；
  建议抽一个 `convexPolygonReverseRevealSpec(center, viewport, { axes, normals, k, strip })`
  （`strip: false` = 半平面，`true` = 透明芯条带），复用 `roundTo`；**`from` 走 `needed` 推导，
  不复用 `getMaxRadiusToCorners`**；边处理跟 DIAMOND 的 ±0.5px AA，不用 `SHAPE_REVERSE_FEATHER_PX`
  （24px 软边在多边形顶点处会互相吃掉，且与 DIAMOND 观感不一致）。
- `packages/core/src/orchestrate.ts`（约 L175–217）：`reverseCapable` 列表 + reveal 分发链。
- `packages/core/src/types.ts`（约 L86–92）：`reverse` 注释里的类型清单（9 → 10 或 11）。
- `packages/core/src/orchestrate.dom.test.ts`（约 L415–433）：现有用例断言 HEXAGON / TRIANGLE / STAR
  `reverse: true` 时输出不变，要拆开（STAR 仍不变；另外两个改成新断言）。

**门面（攒批，见 roadmap §6）**

- `README.md`（L15「9 of them support reverse」、L110–131 options 表）、`docs/README.zh-CN.md` 同步计数。
- `apps/docs/components/landing/gallery.tsx`（L221 / L360 的 `initialReverse` 与卡片开关）、
  `hero.tsx`（L16）、`features.tsx`（L25）里的硬编码「9」。
- `playgrounds/{react,vue,next,nuxt}`：类型表 `initialReverse` + 提示文案 + 「9 个类型各有 reverse 三档」。

**文档**

- `docs/animation-roadmap.md`：§3 新增 P3-11 条目；§2 维度表（约 L32）；§4（约 L180）**那句错理由要改**
  ——改成「凸多边形可接，凹多边形（STAR）不接」。
- `docs/requirements.md`：§7（约 L265–267）同上理由 + 类型计数；§10 新增修订条目。
- `docs/reverse-option-design.md`：§4 逐类型表 + 准入判据处补一行。

**验收**

- 门禁四件套 + `pnpm verify:package` + `pnpm test:acceptance` + 引擎矩阵（WebKit + Firefox 录像取证）。
  引擎侧风险低：构造与 DIAMOND 同构，`add` 是默认合成值，不引入新语法。

## 7. 复跑

```bash
# 需要先 pnpm build（lab.html 消费 /dist/index.mjs）
node scripts/jitter-lab/precheck-p311.mjs            # dsf=1
node scripts/jitter-lab/precheck-p311.mjs --dsf=2    # dsf=2
```

产物落在 `scripts/.verify-engine-out/p311/`（gitignored）：`stdout-dsf{1,2}.txt`、
`report-dsf{1,2}.json`、`candidate-*.css`、逐帧 PNG、`strip-dsf{1,2}.png`。

脚本依赖：本机 Chrome（`CHROME_PATH` 可覆盖）、`scripts/cdp-lib.mjs`、`scripts/jitter-lab/png.mjs`。
脚本判定完即删；要复跑请先 `git log --all -- scripts/jitter-lab/precheck-p311.mjs` 找回来。

## 8. 未做 / 风险

- **引擎矩阵未跑**：只在 Chromium（本机 Chrome）上取证。WebKit / Firefox 属实现阶段验收项。
- **只测了一个触发点**（853.59 / 294，非居中）与一个视口（1280×800）。多边形反向对触发点的
  依赖只体现在 `needed` 与各层 `S`，公式已闭式化；但极端位置（贴边、贴角）建议实现时补两个点。
- **CIRCLE_BLUR / RIPPLE / 角度族**不在本次范围；它们本来就有 `reverse`。
- STAR 仍是「不做」：真凹，没有半平面/条带构造，只剩扇形层方案，判断为不划算。
