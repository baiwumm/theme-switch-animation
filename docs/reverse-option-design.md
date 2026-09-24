# `reverse` 选项设计（PR1 已落地）

> 批准于 2026-09-24。0.3.0 已发布（npm `latest = 0.3.0`），本特性作为 0.4.0 落地。
> **当前进度**：PR1 + PR2 完成 —— `CIRCLE`（洞式）与 `FAN`（取补串）接入，文档站与四个
> playground 的 `Reverse` 控件、共 12 例单测。**PR2 缩了水**：原计划的形状族 6 个与 `CURTAIN`
> 在实现前被反证为**做不到无副作用**，已撤出（见 §4 表末两行与 roadmap §4）。
> PR3（`RIPPLE` / `CLOCK_SWEEP`）、PR4（删类型）未开始。
> 两处与设计原文的偏差已修正：① CSS 不可能逐字节相同（keyframes 名按类型生成），等价性锁走归一化比较；
> ② §4 原先给形状族写的"反色一处开关、成本≈0"是错的。
> 实现时以下文为准。

---

## 1. 七个决策（已定，不再讨论）

| # | 决策 | 结论 |
| --- | --- | --- |
| 1 | 取值形态 | **`boolean \| 'auto'` 三态**。纯布尔删不掉 `CIRCLE_REVERT`——见 §2 的语义核对，这是本设计最关键的一条 |
| 2 | 形状族 6 个（`SQUARE` / `DIAMOND` / `RECTANGLE` / `HEXAGON` / `TRIANGLE` / `STAR`） | ~~**开放**。反色只是 SVG 生成器的一处开关，成本≈0~~ —— **PR2 实现前反证，撤出**：形状蒙版是 SVG data-URI，反向必须动 `mask-size`，而那正是 phase-6 附录四/五排查过的设备像素对齐抖动病根。做不到无副作用，理由见 §4 表与 roadmap §4 |
| 3 | `FAN` | **开放，PR2 已落地**。扇叶合拢与展开是两种读感，且不与其他轴重叠；能干净的唯一理由是硬边无羽化（见 §4） |
| 4 | `CIRCLE_BLUR` | **暂缓，本批不做**。反色会让高斯模糊边出现在内侧，观感未验 |
| 4b | `CURTAIN` | ~~开放~~ —— **PR2 实测撤出**：24px 羽化带塌零时两斜坡交叉出凹陷，末帧约 38px 居中半透明带，违反约束 2；两种补救都只减小不消除 |
| 5 | 命名 | **`reverse`**。歧义靠 README 一句正交说明消掉（§2 末） |
| 6 | 与 0.3.0 的先后 | **先发包**。本特性有 3 块需要真机验观感，不压在已验完的发布前面 |
| 7 | 删 `CIRCLE_REVERT` 的方式 | **先 deprecated 跨一个 minor，再删**。拆成"加选项（非破坏）→ 删类型（破坏）"两步 |

---

## 2. 语义定义

```ts
/** 反向揭开：谁被揭开、从内还是从外。默认 `false`。仅 §4 标 ✅ 的类型生效 */
reverse?: boolean | 'auto'
```

| 取值 | 行为 |
| --- | --- |
| `false`（默认） | 总是正向 —— 与现状逐字节一致 |
| `true` | 总是反向 |
| `'auto'` | **切暗正向、切亮反向** |

**为什么必须是三态**：`orchestrate.ts:170` 现在是

```ts
const revertDirection = isRevert ? (toDark ? 'expand' : 'collapse') : undefined
```

即 `CIRCLE_REVERT` 的观感是"跟随切换方向"，不是"总是反向"。布尔的两个值里没有一个能复刻它——
`true` 会让切暗时也收起，`false` 就等于 `CIRCLE`。所以 `'auto'` 不是锦上添花，
它是"能不能删掉 `CIRCLE_REVERT`"的唯一出路。

**与 `direction` 正交**（README 与 options 表都要写这句）：`direction` 决定推进轴（往哪边走），
`reverse` 决定从内还是从外揭开（谁被揭开）。两者不互相覆盖。

非法值（`'yes'` / `1` / `null` 等）静默回落 `false`，与 `blurAmount` / `direction` 同策略。

---

## 3. 机制：蒙版求补 + 动画反向

库里现有三条蒙版路线，`reverse` 在每条上都是一个**确定的变换**，不是新写一套动画：

| 路线 | 用在 | reverse 变换 |
| --- | --- | --- |
| 注册属性驱动（`REVEAL_VAR` / `SWEEP_VAR`） | `CURTAIN` / `RIPPLE` / `CLOCK_SWEEP` / `FAN` | 渐变串里 `#000` ↔ `transparent` 互换 + `from`/`to` 互换 |
| 洞式（`HOLE_RADIUS_VAR`，`buildHoleAnimationCSS`） | `CIRCLE_REVERT` 的收起态 | 已经是"求补"形态，但**硬编码 radial**——要泛化成接收任意反色蒙版 + 任意静止蒙版盒子 |
| `mask-size` / `mask-position` 逐帧 | `CIRCLE` + 6 个形状 | SVG 蒙版换反色版（`polygonMaskImage` 加"白底 + 黑形"开关）+ `startSize`/`endSize` 互换 |

### 约束核对（roadmap §1 四条）

- **约束 2「末帧必须完全覆盖」在求补后换了一道**：变成"末帧的补洞面积必须为 0"。
  正向是 `mask 实心段 → 盖满`，反向是 `洞 → 收缩到 0`。两者都必须在末帧达到"新层完全不透明"，
  只是证明方向相反。**每个开放类型的单测都要锁这一条**，不能只锁正向。
- **约束 4「任意单帧必须能与同类项区分」对本特性成立**：反向动画的静止帧拓扑与正向完全不同
  （补集），所以它不像 `COMB` / `SPIRAL` 那样只在时间维度做文章。这也是它比那批有前途的原因。
- 约束 1（只用 mask）与约束 3（只有伪元素能动）自动满足——没有引入新机制。

### 一个必须写进文档的观感事实

`CLOCK_SWEEP` 的 `reverse: true` **等价于当初搁置的"逆时针扫开"**：补集扇形 `[θ, 360]` 的边界
随 θ 从 360→0 是**逆时针**回退的。所以这个类型上 `reverse` 白送了顺/逆时针特性——
但 12° 软尾会落到内缘，需要镜像（见 §4）。这条不写清楚，用户会误以为 reverse 只是"反过来放"。

---

## 4. 逐类型规格

| 类型 | 开放 | 反向观感 | 实现要点 / 待验点 |
| --- | --- | --- | --- |
| `CIRCLE` | ✅ **PR1 已落地** | 新主题从四周显出、向触发点收拢 | 复用洞式生成器。`'auto'` 与现 `CIRCLE_REVERT` 的等价性**不能按字面 CSS 相等来锁**——keyframes 名按类型生成，必然差 `theme-switch-circle` 与 `theme-switch-circle-revert`；单测归一化名字后比较 |
| `SQUARE` `DIAMOND` `RECTANGLE` `HEXAGON` `TRIANGLE` `STAR` | ❌ **撤出（PR2 反证）** | 同上，形状换成各自轮廓 | **原判断"反色一处开关、成本≈0"是错的。** 形状蒙版是 SVG data-URI，反向必须动 `mask-size` / `mask-position`，而那正是 phase-6 附录四/五排查过的**设备像素对齐抖动**病根（约 1 设备像素、与 dpr 无关、取整只缓解不根除）——当初正是为此才另造静止盒子的洞式方案。多边形硬直线比圆弧更显 hairline。做不到无副作用，不接入 |
| `CURTAIN` | ❌ **撤出（PR2 实测）** | 两侧向中线合拢 | 带 24px 羽化的对称透明带塌到零宽时，两侧斜坡必然交叉出凹陷。末帧扫描实测 40 全透 + 150 半透 / 6400（约 38px 居中半透明带），违反约束 2；终值过冲到 `-2×软边` 只剩 20/75，改"两侧不透明板向中心重叠生长"仍剩 20/75 —— 结构性，非调参可解 |
| `FAN` | ✅ **PR2 已落地** | 扇叶合拢 | `getFanReverseRevealSpec`：正向串取补 + `--sweep` 从 step 收到 0。**它能干净的唯一理由是硬边无羽化**——`transparent 0 var` 与 `#000 var step` 共用同一个 var，var→0 时两组 stop 同归 0deg，带子塌零而不留缝。三位置探针：start 6400/6400 全透、mid 3272 半揭、end 0/0 |
| `RIPPLE` | ⏳ PR3 未做 | 环带向内收 | 环带必须镜像：主峰 α 落在内缘、余波衰减方向翻转。**要先探针**——`CURTAIN` 的教训是软边在塌零时会交叉出凹陷，RIPPLE 的余波软边很可能同病 |
| `CLOCK_SWEEP` | ⏳ PR3 未做 | 逆时针扫开（见 §3） | 12° 软尾要镜像到内缘，否则起始帧会在 12 点留一道反向亮线 |
| `BLINDS` `SCAN` `QR_GRID` | ❌ | — | **不是做不到，是 `direction` 已占这根轴**：`SCAN` 的 reverse ≈ `direction:'rtl'`。两轴表达同一件事 → 四种组合必有两组重复，README 得写一堆仲裁规则 |
| `CIRCLE_BLUR` | ⏸ 暂缓 | — | 决策 4 |

**判据（后续新类型照这条决定开不开）**：只有当 `reverse` 提供该类型现有选项**表达不了的轴向**时才开放。

---

## 5. 分期

| PR | 内容 | 破坏性 |
| --- | --- | --- |
| **PR1** | 加 `reverse?: boolean \| 'auto'` + `resolveAnimationOptions` 校验 + `CIRCLE` 全量（含 `'auto'` 复刻）+ `CIRCLE_REVERT` 标 deprecated（开发环境 warn 一次）+ README / options 表 / 需求文档 | 非破坏 |
| **PR2** | ~~形状族 6 个 + `FAN` + `CURTAIN` —— 纯机械~~ → **实际只落 `FAN`**：形状族与 `CURTAIN` 反证/实测做不到无副作用，撤出进 §4 | 非破坏 |
| **PR3** | `RIPPLE` + `CLOCK_SWEEP` —— 环带 / 软尾镜像，**先探针再落码** | 非破坏 |
| **PR4** | 删 `ThemeAnimationType.CIRCLE_REVERT` 枚举项 + `getCircleRevertMaskGeometry`（mask-size 的旧收起路径，已被洞式取代、仅留作降级）+ 画廊那张独立卡片 + 各处文案 | **破坏**，按 0.2.0 先例走 minor + 条目标 **breaking** |

**PR4 不要误删的东西**：`CircleHoleGeometry` / `getCircleRevertHoleGeometry` / `buildHoleAnimationCSS` /
`HOLE_RADIUS_VAR` 这套洞式机制**不是要删的**——PR1 里 `CIRCLE + reverse` 正是靠它工作，
而且 §3 说要把它从"硬编码 radial"泛化成接收任意反色蒙版。删的是**类型**，留的是**机制**。
实测这套机制的非测试引用只散在 `masks.ts` / `styles.ts` / `orchestrate.ts` 三个文件加 `index.ts` 导出，
收敛面很小。

deprecated 期至少跨一个 minor，给用户迁移窗口；不要在同一版本里既加又删。

---

## 6. 验收计划

- **单测**：每个开放类型至少三条断言——① 反向起始帧新层**完全不透明可见**（洞 = 全屏）；
  ② 反向末帧洞面积为 0（等价"完全覆盖"）；③ `reverse:'auto'` 在 `toDark` 两态下的输出
  与 `reverse:false` / `reverse:true` 分别一致。`CIRCLE` 额外锁"`'auto'` ≡ 旧 `CIRCLE_REVERT`"。
- **探针**（一次性脚本，建在仓库外，用完即删）：`RIPPLE` 与 `CLOCK_SWEEP` 各取 4 帧，
  验软边/环带镜像后起始帧有没有漏光——`COMB` 那轮的 `max(...,0px)` 漏光是同类风险，
  求补之后这类边界泄漏更容易出现，**这是本特性最可能的坑**。
- **真机**：Safari / Firefox 各跑一遍开放类型的 reverse 态；dpr 125% / 150% 与 0.3.0 遗留项合并验。
- **画廊**：文档站不要为 reverse 新增卡片——它是选项不是类型。在消费它的卡片上加一个
  `Reverse` 三态控件（`off` / `on` / `auto`），与现有 `direction` / `slatWidth` 控件同构。

---

## 7. 迁移面

`CIRCLE_REVERT` 的引用共 23 个文件，但**必须区分活代码与历史记录**：

- **要改**：`types.ts` / `masks.ts` / `styles.ts` / `orchestrate.ts` + 4 个测试文件 +
  4 个 playground + `gallery.tsx` + `README.md` + `requirements.md` / `next-steps.md` +
  `verify-engine.mjs` / `verify-firefox-video.mjs`。
- **绝不改写**：`CHANGELOG.md`、`docs/phase-*-report.md`、`docs/release-0.1.0-smoke-report.md`
  —— 那是历史事实，改它等于伪造发布历史。
