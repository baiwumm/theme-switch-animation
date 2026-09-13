# Phase 6 执行汇报（动画类型扩展：5 → 13）

| 项目 | 内容 |
|---|---|
| 日期 | 2026-09-12 |
| 依据 | 需求文档 v1.5（§1 / §5.1 / §7 / §10）、magicui animated-theme-toggler（形状观感参考）、`useBlurCircleTheme`（next-daily-hot，模糊技术参考） |
| 范围 | Phase 6a（6 种形状）+ 6b（CIRCLE_REVERT）+ 6c（CIRCLE_BLUR + `blurAmount`）、四 playground 按钮矩阵改造、§9 动画类型独立性验收扩到 13 种。**Phase 5（文档站 + 发布）仍延后** |
| 基线 | `52a40e3 docs: phase-4 报告附录三` → 本阶段 commit 见文末 |

**结论**：13 种动画类型全部落地，lint / typecheck / **177 单测** / build / 四 playground 全绿。Nuxt production 构建上 `cdp-nuxt-animtypes.mjs` **13/13 PASS**（逐按钮断言注入的 `@keyframes` 与声明类型一致）；无头 Chrome 截图 + 像素探针验证了 REVERT 的"旧主题收缩"与 BLUR 的"模糊扩散"语义方向。全部新类型仍走 mask 动画（未引入 clip-path / WAAPI / CSS filter），Safari 兼容约束不破。React / Vue / Nuxt 适配层**零改动**。

---

## 1. 已完成项

| # | 子项 | 说明 |
|---|---|---|
| 6a | 6 种中心扩散形状 | `SQUARE` / `DIAMOND` / `RECTANGLE` / `HEXAGON` / `TRIANGLE` / `STAR`：SVG polygon data-URI 蒙版（顶点由极坐标计算，星形内顶点半径比 0.42、多边形顶点朝上，对齐 magicui）；终尺寸按"内切半径盖住视口最远角"逐形状推导（§7）；RECTANGLE 贴合视口宽高比（实心矩形蒙版 `preserveAspectRatio="none"`，与 SQUARE 共用） |
| 6b | CIRCLE_REVERT | `styles.ts` 引入**层选择**（`getAnimationLayerTarget`：new / old / both）：REVERT 的圆形蒙版挂在 `::view-transition-old(root)` 并置顶（`z-index: 1`），从全覆盖收缩到触发点 0 |
| 6c | CIRCLE_BLUR + `blurAmount` | `feGaussianBlur` 烘焙进 SVG data-URI（非 CSS filter）；`both` 层 = 新旧双层同蒙版联动（old 沉底 `z-index: -1`，透明区露出实时页面）；`blurAmount`（默认 2，×1.2 = stdDeviation，非法值回落）进 `ThemeAnimationOptions` / `ResolvedAnimationOptions`；终尺寸 `max(4×(长边+200), 2.5×maxRadius)` 封顶 8000 |
| — | 分组类型 | `ShapeAnimationType`（CIRCLE + 6 形状）；`DirectionalAnimationType` 从 `Exclude<…, CIRCLE>` 改为显式四向联合（原定义在类型扩展后会误纳新形状，属必要修正） |
| — | playground 矩阵 | 4 个 playground 五按钮 → 13 按钮响应式矩阵（`auto-fill minmax(220px,1fr)`），按钮带 `data-animation-type`，CIRCLE_BLUR 演示 750ms |
| — | 验收脚本 | `cdp-nuxt-animtypes.mjs` 改为从 DOM 读类型清单（新增类型零脚本改动），keyframes 正则扩到 `[a-z-]+` |
| — | 文档 | requirements v1.5（§1/§5.1/§7/§10）、README、changeset（minor） |

## 2. 验收结果

### §9 动画类型独立性（13/13 PASS，强证据）

Nuxt production 构建（`nuxt build` + `node .output/server/index.mjs`，端口 3100）+ 无头 Chrome（CDP 19222）：

```
circle ✓ circle-revert ✓ circle-blur ✓ ltr ✓ rtl ✓ ttb ✓ btt ✓
square ✓ diamond ✓ rectangle ✓ hexagon ✓ triangle ✓ star ✓
PASS: 13 个按钮各自播放声明的动画类型
```

### 语义方向像素探针（无头 Chrome，固定初始主题 light）

转场中段截屏 → 页内 canvas 采样"按钮下方 80px（蒙版内）"与"视口角（蒙版外）"：

| 类型 | 蒙版内 | 蒙版外 | 判定 |
|---|---|---|---|
| CIRCLE_REVERT | **亮（旧主题）** L=255 | 暗（新主题） L=18 | ✓ 旧主题收缩进触发点 |
| CIRCLE_BLUR | 暗（新主题） L=28 | 中间调 L=75（模糊淡出边缘） | ✓ 模糊扩散，软边缘真实渲染 |
| CIRCLE（对照） | 暗（新主题） L=28 | —（探针时机偏晚，角落已被覆盖） | 方向正确（near=新） |

9 张中段截图目检：圆/方/菱/六边/三角/星形轮廓清晰、REVERT 收缩方向正确、BLUR 高斯软边明显。

### 全量验证

```
pnpm lint / typecheck / test   ✓ 12 files / 177 tests（新增 48：形状几何 19 + REVERT 7 + BLUR 9 + 类型/导出守护等）
pnpm build                     ✓ dist 四子路径 + nuxt-runtime/ 不变
npm pack --dry-run             ✓ 18 files 不变（无新增发布物）
playgrounds/react / vue        ✓ build
playgrounds/next               ✓ typecheck
playgrounds/nuxt               ✓ prepare + typecheck + build（§9-3 / §9-9 所用产物）
```

## 3. 关键实现决策

1. **STAR 外接圆 2.5 × maxRadius，有意大于 magicui（≈1.45）**：五角星内凹谷半径 = 0.42 × 外接圆，magicui 的尺寸盖不住视口角落——它的 clip-path 随转场组销毁故可接受；本库 mask 以 `fill both` 持续生效到样式移除，凹谷漏出旧主题会在末帧可见，故按"内切半径 ≥ maxRadius × 1.05"取值。形状与朝向保持一致，仅终尺寸更大。
2. **模糊不是 CSS filter**：参考实现的核心技巧是把 `feGaussianBlur` 写进 SVG data-URI 内部，本质仍是 mask-image 动画，WebKit 兼容性与其余类型同路；本库用 `encodeURIComponent` 完整编码（参考实现手工 `%23` 转义）。
3. **REVERT / BLUR 共享层选择机制**：`buildAnimationCSS` 按 `getAnimationLayerTarget(type)` 分发 new / old / both 三种挂载方式，既有 5 类型的产物 CSS 逐字节不变（有快照测试守护）。
4. **高分屏分支不搬**：参考实现的 `isHighResolution` 双档系数不引入，仅保留尺寸上限；如真机高分屏有问题再评估。
5. **真机（Safari / Firefox）视觉验证仍欠**：BLUR 的烘焙模糊蒙版在 WebKit 的渲染是最大未知数，Playwright WebKit 与真机 Safari 验证归入 Phase 5 前的验收清单。

## 4. 遇到的问题与处理

1. **`require.resolve` vs `import.meta.resolve` 的教训重现**：无（本阶段未涉及）；但 Phase 2b 报告记录的"Bash 内联脚本写盘会静默丢失"问题本阶段再次出现两次（`node -e` 对 index.test.ts / masks.test.ts 的多段替换只落了一部分），均经复读发现后用 Edit 工具修复——**结论维持：本仓库一律用 Edit/Write 工具改文件**。
2. **测试自身的数学错误**：形状几何首轮断言把 `maxRadius`（半对角线 500）误按对角线 1000 计算、浮点期望值未做两位取整、STAR 顶点正则未考虑顶点对以空格分隔——三处均为测试错误，实现无误，修正断言后全绿。
3. **styles.ts 的 `ThemeAnimationType` 原为 `import type`**：层选择需要把它当值用（`ThemeAnimationType.CIRCLE_REVERT`），TS1361 报错后改为值导入。
4. **playground 数组 `as const` 与可选 `duration`**：部分条目无 `duration` 字段时联合类型访问报错，改为显式 `Array<{...}>` 标注。

## 5. Phase 5（文档站 + 发布 0.1.0）前置条件更新

| 前置条件 | 状态 | 说明 |
|---|---|---|
| 13 种动画产物 | ✓ | 四子路径 + nuxt-runtime 不变，`npm pack` 18 文件 |
| changeset | ✓ | `.changeset/add-eight-animation-types.md`（minor，0.0.0 → 0.1.0 由它驱动） |
| live demo 素材 | ✓ | 四 playground 13 按钮矩阵即文档站素材 |
| 文档站选型 | — | 未定（Phase 5 首个决策） |
| Playwright e2e + WebKit 真机 | — | §9-8 仍欠；BLUR 的 Safari 渲染验证归入此项 |
| Firefox 真机手测 | — | §9-8 注明理由后暂缓 |

**判定：可以开始 Phase 5。** 文档站需覆盖三条既有用法约定（Vue 受控 options 响应式、SFC `:ref` 桥接、Nuxt 类型自动导入事实）+ 本阶段新增的 `blurAmount` 说明与 STAR 尺寸偏离 magicui 的原因。

## 附：本阶段 commit

见 git log（6a / 6b / 6c / playground / docs 分组提交）。

---

## 附录（桌面真机反馈修复，2026-09-13）

**反馈**（React playground 桌面验证）：
1. CIRCLE_REVERT 语义不对——期望"一次收起，然后一次扩散"，实际每次只有收起；
2. CIRCLE_BLUR 有问题——主题一下就全变了，然后圆形才模糊扩散。

### 问题一：REVERT 只做了"收起"半段 → 改为穿越缩放（transform）

原实现用 mask 在旧截图层做圆形收缩（iris 收拢），内容不动、只被裁剪，没有"扩散"半段。而"扩散"半段用 mask **做不出来**：蒙版外露出的永远是已翻转的实时页面（新主题），新截图层的蒙版扩散与背景重合、不可见。改为**穿越缩放**（常见 zoom-through 主题切换的实现方式）：

- `::view-transition-old(root)`：`scale 1 → 0`（收起），`z-index: 1` 置顶；
- `::view-transition-new(root)`：`scale 0 → 1`（扩散，keyframes 名 `-expand` 后缀）；
- `transform-origin` 钉在触发点，同长同时进行——旧页面内容缩进点击点，新页面内容从点击点长出，两段都可见。

**架构影响**：Phase 6b 引入的层选择机制（`AnimationLayerTarget` / `getAnimationLayerTarget` / `layerRule`）随之移除——REVERT 在 `buildAnimationCSS` 内独立分支（不使用 MaskGeometry），`buildAnimationCSSParams` 新增必填 `origin`（orchestrate 传入触发点）；`getCircleRevertMaskGeometry` / `isRevertAnimationType` 删除；BLUR 回到与普通类型相同的"仅 new 层"路径。`getMaskGeometry` 对 REVERT 占位回落 CIRCLE 几何（下游不消费）。

**命名**：保留 `CIRCLE_REVERT`——相对 CIRCLE（新主题先到、盖住旧主题），它是交接顺序反转（旧先走、新后到）。如需更直白的 `CIRCLE_ZOOM`，发布前改名成本很低。

**Safari 注意**：transform 动画在 WebKit 的表现需真机验证（需求 §2 的限制针对 clip-path 与 WAAPI，未涉及 CSS transform）——归入 Phase 5 前的 Safari 验收清单。

### 问题二：BLUR"瞬间全变" → 蒙版只挂新截图层

根因是**误读参考实现**：`useBlurCircleTheme` 只给 `::view-transition-new(root)` 挂了模糊蒙版，old 层只有一段 `maskScale` 动画——没有 `mask-image`，实为无效代码（`z-index: -1` 同样多余，默认堆叠本就是新在旧上）。我照着"双层同蒙版"的误读实现，导致蒙版外新旧截图全部透明、露出已翻转的实时页面 → 主题瞬间全变，只剩圈内模糊边缘可辨。

修复：模糊蒙版**只挂新截图层**，旧截图层完整垫底——蒙版外是旧主题，直到模糊圆扫过。`buildAnimationCSS` 的 `both` 分支删除。

### 复验（Nuxt production 构建 + 无头 Chrome 19222，端口 3100）

| 检查 | 结果 |
|---|---|
| `pnpm lint` / `typecheck` / `test` / `build` | ✓ 12 files / **175 tests**（REVERT 蒙版用例删除、缩放用例新增；既有类型字节快照不变） |
| §9 动画类型独立性 | ✓ **13/13 PASS**（revert 的收起 keyframes 名即主名，脚本无需改动） |
| REVERT 中段截图 | ✓ 旧浅色页面内容可见地缩进触发点，四周为新主题（收起半段成立） |
| BLUR 中段截图 + 探针 | ✓ 旧主题残留在蒙版外的远端（L=144 过渡带），近端为新主题（L=28）——不再瞬间全变 |
| `npm pack --dry-run` | ✓ 18 files 不变 |

**本附录 commit**：
```
fix(core): 真机反馈修复——REVERT 改穿越缩放（收起+扩散）、BLUR 蒙版仅挂新截图层
```

---

## 附录二（REVERT 定稿：方向感知，更正附录一的穿越缩放方案，2026-09-13）

**反馈**（React playground 第二轮桌面验证）：CIRCLE_BLUR 已正常；CIRCLE_REVERT 不对——不是圆形效果（整个页面在缩放收起），而且每次都是收起。

### 更正说明

附录一的"穿越缩放"（transform 双 keyframes）方案作废：它确实能呈现"收起 + 扩散"两段，但缩放的是整张页面截图——边界是矩形不是圆形，且与用户期望的"圆形收起/扩散"不符。根因是需求理解偏差："一次收起，然后一次扩散"在一次点击内**物理上不可行**（收起结束时屏幕已是新主题，紧随的扩散圆与背景重合不可见——mask 与 transform 两种实现都绕不开），经与需求方确认改为**方向感知**。

### 定稿设计：方向感知的暗色圆

- **切到暗色**：暗色圆从点击点**扩散**（复用 CIRCLE 几何，蒙版挂新截图层）；
- **切回亮色**：暗色圆**收起**进点击点（蒙版挂旧截图层并置顶 `z-index: 1`，从全覆盖收缩到 0）；
- 方向由 core 在转场前读取 `<html>` 类名推导（toggle 后必为取反，`nextIsDark = !hasThemeClass(doc, darkClassName)`），来回切换自然产生一次扩散、一次收起，无点击奇偶等隐藏状态；
- 仍纯 mask 实现（transform 分支删除，`buildAnimationCSS` 以 `revertDirection` 参数选择挂载层），Safari 约束不变，适配层零改动。

### 复验（Nuxt production 构建 + 无头 Chrome，端口 3100）

| 检查 | 结果 |
|---|---|
| 第一击（亮→暗，expand） | ✓ 蒙版挂新层；near 暗（新圆内）/ far 亮（旧层在圆外） |
| 第二击（暗→亮，collapse） | ✓ 蒙版挂旧层（z-index: 1）；near 暗（旧暗盘内）/ far 亮（新主题四周） |
| 中段截图 | ✓ 暗色圆清晰收缩进点击点、四周露出新亮色主题（圆形边界） |
| §9 动画类型独立性 | ✓ 13/13 PASS（两个方向 keyframes 名同为 `theme-switch-circle-revert`） |
| `pnpm lint` / `typecheck` / `test` / `build` | ✓ 175 tests（REVERT 方向用例 3 个：collapse / expand / 缺省回落 collapse） |

**本附录 commit**：
```
fix(core): REVERT 定稿为方向感知——切暗扩散、切亮收起（更正附录一穿越缩放方案）
```

---

## 附录三（playground 预设 chips + duration 默认值调整，2026-09-13）

**反馈**：第三轮桌面验证——① CIRCLE_REVERT 收起时偶现屏幕闪动一下；② 标准 400ms 还是偏快；③ easing 选 `linear()` 不是平滑过渡。

### 处理

1. **偶现闪屏（core 缺陷，跳过竞态样式误删）**：快速连点时浏览器跳过上一个转场（`finished` 以 AbortError 结算），结算处理器无条件按固定 id 删样式——此时 id 上已是新一轮注入的样式，新转场被剥掉蒙版/重置规则一帧（UA plus-lighter 叠加发白）。修复：rejection 路径补"只删自己注入的节点"身份守卫（与 `scheduleCleanup` 同款），新增回归测试。
2. **四 playground 加 duration / easing 全局预设 chips**：duration 500 / 750 / 1000（默认 750），easing `ease-in-out` / `cubic-bezier(0.4, 0, 0.2, 1)` / `linear`（原 `linear(0, 0.25 75%, 1)` 是"慢进急收"曲线并非匀速，标签误导，按反馈改真匀速）。选中后所有按钮的下一次切换立即生效——React 侧经 `optionsRef` 每渲染同步；Vue / Nuxt 侧 options 以 `reactive` 承接 + `watchEffect` 同步（Phase 4 §3.1 响应式约定的直接复用）。
3. **库默认 `duration` 400 → 750**（需求文档 v1.5 §5.1 / §7 / §10 同步；`var(--theme-switch-duration, …)` 兜底改为引用 `THEME_ANIMATION_DEFAULTS.duration` 常量，防再漂移）。显式传 `duration` 的调用方不受影响。

### 复验

| 检查 | 结果 |
|---|---|
| `pnpm lint` / `typecheck` / `test` / `build` | ✓ **176 tests**（+1 跳过竞态身份守卫回归；字节快照同步 750ms） |
| 无头：默认（不点 chips）注入 | ✓ `750ms / ease-in-out` |
| 无头：点 500ms + linear chips 后下一次切换 | ✓ 注入 `500ms / linear` |
| `npm pack --dry-run` | ✓ 18 files 不变 |

**本附录 commit**：
```
fix(core): 跳过竞态身份守卫修复偶现闪屏；playgrounds 加 duration/easing 全局预设
fix(core): 库默认 duration 400 → 750（需求文档 v1.5 同步）
```

---

## 附录四（"收起时偶现线条抖动"排查与加固，2026-09-13）

**反馈**：CIRCLE_REVERT 收起时屏幕偶尔出现线条抖动（不是整屏抖动）。

### 排查过程与证据

| 假设 | 验证方式 | 结论 |
|---|---|---|
| 滚动状态下坐标基准错位（根快照框是否含滚动溢出） | 无头 Chrome 滚动到中部点击 CIRCLE，中段截图量圆弧 | **排除**：圆心精确落在按钮上，坐标基准正确 |
| SVG 蒙版栅格化锯齿（2×2 viewBox 放大后边缘爬行） | 2 倍缩放 clip 连拍收起中段 4 帧 | **排除**：圆弧边缘平滑无锯齿 |
| 样式误删竞态（跳过转场时删掉新一轮样式） | 上一附录已修 + 回归测试 | **已修复**（身份守卫） |
| 底边欠覆盖细缝（文档远端超出蒙版覆盖） | 滚动到底部/顶部收起连拍对比 | **未复现**（且新层完整垫底，理论上无缝隙露出路径） |

### 锁定的主因：分数像素接缝（dpr 相关，本机无法复现）

所有中心类蒙版几何由 `Math.hypot` 计算，此前保留 2 位小数（如 `-1273.46px`）。对快照层逐帧动画 `mask-size` / `mask-position` 会迫使 GPU 每帧重栅格化，**分数像素偏移在栅格分块（tile）边界上会暴露 1px 级接缝**，随逐帧偏移闪烁——即"偶尔、线条状、不整屏"。收起方向最显眼：旧层经 `z-index: 1` 提升 + 暗色边缘对亮色新主题高对比。该伪影依赖显示缩放（Windows 125% / 150% 等**分数 dpr** 把 CSS px 落在分数设备像素上），无头环境 dpr=1 无法复现；属社区已知模式（参见 Andy Bell《Why are my view transitions blinking?》等对 VT 快照层 hairline 问题的讨论）。

### 加固

`masks.ts` 的 `px()` 从保留 2 位小数改为**取整到整数 px**（位置用未取整边长计算后再取整，保证圆心钉扎精度）。覆盖余量 ≥5%（约 50px 量级）远大于取整损失（≤0.5px），覆盖性不受影响；CIRCLE / 形状 / BLUR / REVERT 全部中心类几何一并受益。

### 验证

| 检查 | 结果 |
|---|---|
| `pnpm lint` / `typecheck` / `test` / `build` | ✓ 176 tests（几何取整期望同步：masks 3 处 + orchestrate.dom 1 处） |
| 无头回归：滚动状态收起中段截图 | ✓ 圆心跟随、圆弧平滑、13/13 PASS |

**最终确认需真机**：请在出现问题的机器（分数缩放）上复测收起动画；若仍有残影，下一步备选是把 REVERT 的蒙版边缘加微高斯羽化（软边缘对栅格接缝不敏感，代价是圆形边缘不再完全锐利）。

**真机复测结果（2026-09-13）**：取整后抖动**频率降低但仍偶现**，暂接受。原因分析：取整只稳定了起止帧的栅格起点，而动画**逐帧插值**的中间值天然是分数（750ms 内每帧都在分数偏移上），合成路径下接缝无法因此根除。若日后要彻底解决，两条路：① 蒙版边缘微羽化（对插值偏移不敏感，代价是边缘不再锐利）；② 换不逐帧重栅格化的实现（如 transform 化蒙版，Safari 兼容性需重新验证）。暂不再投入。

**本附录 commit**：
```
fix(core): 蒙版几何取整到整数 px（缓解分数 dpr 下 mask 动画的接缝抖动）
```

---

## 附录五（"收起时线条抖动"二次排查：定位为蒙版层的设备像素对齐抖动，2026-09-13 续）

**反馈**：附录四加固（几何取整）后，CIRCLE_REVERT 收起时**仍偶现线条抖动**（不是整屏抖动）。

### 结论（先给结论，再给证据）

**附录四把主因判为"分数 dpr 下的 1px 接缝"是不准确的**。真实主因：

> **Chrome 逐帧重栅格化蒙版时，会把蒙版层的 `mask-position` 与 `mask-size` 对齐到设备像素网格**（实测步进 ≈0.5 设备 px）。动画里这两个值**逐帧都是分数**（750ms 内每一帧都不在网格上），于是**每一帧的舍入误差都不同**——整圆连同它的高对比圆弧边缘，在帧间被"推"了 **1px 级**，且 **x / y 各自独立**（还叠加半径的 ±0.25px 对齐误差）。肉眼看到的就是圆弧那条"线"在抖。

- 与 dpr 无关：`deviceScaleFactor=1`（本机 2560×1440、100% 缩放）就能稳定复现，dsf=1.5 同样有（抖动幅度按**设备像素**计约 1px，与缩放无关）。附录四"无头 dpr=1 无法复现"的判断只是因为当时没有能测亚像素位移的手段（只看截图肉眼看圆弧，1px 位移看不出来）。
- 与"起止几何取整"无关：取整只固定了首末帧，中间帧仍是分数（附录四的真机复测结论方向对了，但归因（"接缝"）不对——**没有任何接缝/错位**：拟合出的圆弧径向 RMS 只有 0.02–0.04px，圆是完美解析圆，动的是**圆心**）。
- 与跳过竞态、滚动基准、SVG 锯齿无关（附录四已排除的那些继续成立）。

### 排查方法（新增实验台 `scripts/jitter-lab/`）

之前"看截图"的方法测不到亚像素位移。这次的做法是**测边缘几何**而不是看图：

1. `lab.html`：用真实 `dist/index.mjs` 跑真转场（触发点/时长/缓动/几何全部走库），并提供 `?variant=clean`（隐藏一切文字/卡片/按钮外观，只剩纯色背景 + 一个不可见的触发矩形）——**保证画面里唯一的边缘就是蒙版圆弧**，排除内容边缘干扰；
2. `run.mjs`：无头 Chrome（实测走 ANGLE/D3D11 真 GPU）+ CDP；两种取样：`--mode=live` 用 screencast 抓**每一合成帧**（≈42fps），`--mode=seek` 暂停 WAAPI 动画后按毫秒 seek（**确定性**取样，可重复）；
3. `analyze.mjs` / `probe.mjs` / `fit.mjs` / `steps.mjs`：对每帧用"亮度阈值穿越 + 线性插值"求亚像素边缘点（无偏，精度 ~0.05px），再最小二乘拟合圆心/半径（Kasa + 一轮粗差剔除），于是能测出**圆心在帧间跳了多少**。

```bash
node scripts/jitter-lab/run.mjs --mode=live --width=2560 --height=1400 --variant=clean --direction=collapse --out=%TEMP%\j1
node scripts/jitter-lab/steps.mjs %TEMP%\j1     # 圆心/半径逐帧 + 帧间跳变统计
node scripts/jitter-lab/fit.mjs   %TEMP%\j1     # 圆心偏移轨迹（Δcx/Δcy 的 σ）
```

### 证据

收起（暗→亮）、2560×1400、dsf=1、真 GPU、49 帧实时抓帧（23 个相邻帧对）。**圆心本应纹丝不动**（只有半径在缩）：

| 指标 | 现行实现（SVG 蒙版 + 动画 mask-size/position） | 候选修复（见下） |
|---|---|---|
| 相邻帧圆心跳变 Δcx | max **1.00px**，σ 0.314；>0.25px **14/23** 帧对，>0.5px 9/23，>0.75px 3/23 | max **0.04px**，σ 0.009；>0.25px **0/23** |
| 相邻帧圆心跳变 Δcy | max **1.00px**，σ 0.244；>0.25px 7/23，>0.5px 3/23 | max **0.00px**，σ 0.001；>0.25px 0/23 |
| 拟合半径 | 落在 0.25px 网格上（size 被对齐到 0.5 设备 px） | 连续小数，无对齐 |
| 圆弧径向 RMS | 0.02–0.04px（圆本身是解析圆） | 0.03–0.05px（同量级） |
| screencast 帧率 | 42.3 fps | 42.5 fps（无性能代价） |

扩散方向（亮→暗）同样存在：Δcx max 1.00px、σ 0.253、**21/23** 帧对 >0.25px。

**注入 CSS 与渲染位置的对应关系**（同一帧重复截图 4 次结果完全一致 → 渲染对"给定状态"是确定的，抖动来自**状态本身在网格上跳**，不是随机噪声）：
`mask-position` 的渲染值 ≈ `round(动画插值值)`；`mask-size` 同样被对齐。因此圆心 = `round(pos) + size/2`，其相对真实触发点的偏移 = `-frac(pos)`，随帧变化在 ±0.5px（x/y 独立）内跳，合成后边缘位移可达 1px 级。

**A/B 排除**：去掉 `will-change: mask-size, mask-position` 结果**逐位相同**（不是它）；`z-index: 1` 是收起效果的必需项（去掉后新层完整盖住旧层，圆弧不可见），不参与抖动成因。

### 修复方向（已在实验台验证，未落库）

把**蒙版盒子完全静止**，只让"圆"在盒子内部变化——盒子不动，就没有像素对齐误差：

```css
@property --ts-radius { syntax: '<length>'; inherits: false; initial-value: 0px; }
@keyframes ts-radius-shrink { from { --ts-radius: 1986px; } to { --ts-radius: 0px; } }
::view-transition-old(root) {
  --ts-cx: 854px; --ts-cy: 294px;
  mask-image: radial-gradient(circle at var(--ts-cx) var(--ts-cy),
    #000 calc(var(--ts-radius) - 0.5px), transparent calc(var(--ts-radius) + 0.5px));
  mask-size: 100% 100%; mask-position: 0 0; mask-repeat: no-repeat; z-index: 1;
  animation: ts-radius-shrink var(--theme-switch-duration) var(--theme-switch-easing) both;
}
```

要点与实测：

| 项 | 结果 |
|---|---|
| 抖动 | 圆心 σ 0.343px → **0.008px**；帧间最大 1.00px → **0.04px** |
| 帧率 | 42.5 fps，与现行实现持平 |
| 边缘质量 | 1px 渐隐带：径向 RMS 0.04px，与 SVG 抗锯齿同量级。**不能**用硬停（`#000 r, transparent r`）——实测 RMS 劣化到 0.25px（硬停栅格化有明显锯齿） |
| 兼容性 | `@property` 在 Chrome 85+/Safari 16.4+/Firefox 128+ 均已支持，**覆盖全部支持 View Transition 的版本**（Chrome 111+/Safari 18+/Firefox 144+）；仍是纯 mask、无 clip-path/WAAPI（Safari 约束不变）。**但"VT 伪元素上动画注册自定义属性"未在 Safari 真机验证** |
| 适用面 | 只解决"圆"类（CIRCLE / CIRCLE_REVERT，CIRCLE_BLUR 可把模糊做成渐变软边）；SQUARE/多边形/四向擦除仍是老路（同一机制，同样有 1px 级抖动），要一起解决需为形状补 `conic-gradient`/多段渐变近似，收益与风险需另评 |

备选（附录四提过的两条仍在）：① 蒙版边缘微羽化（1px 软边即可让 0.5px 抖动不可见，代价是边缘不再锐利）——本质是"掩盖"而非消除；② transform 化蒙版（Safari 兼容性需重新验证，且会缩放蒙版层内容）。

**本附录未提交代码改动**（实验台脚本除外），修复是否落库待定。

**本附录 commit**：
```
test(scripts): 新增 scripts/jitter-lab 抖动/闪屏实验台（亚像素几何拟合 + 逐帧抓帧 + 横带检测 + diffdirs 回归）
docs: 附录五——REVERT 收起抖动定因为蒙版层像素对齐抖动，附验证过的修复方向
```

---

## 附录六（第三次反馈：收起时"像电视机故障那样闪一下、出现一条横带"，2026-09-13 续）

**反馈（真机，React playground + Chrome，20% 概率）**：`CIRCLE` 看不到，`CIRCLE_REVERT` **收起**时会出现——**像电视机故障，闪一下屏，出现一条横带/错位（撕裂）**，时机无规律。

这一轮症状与附录五的"1px 圆弧抖动"**不是同一个东西**：这是"某一帧画面局部不对"的**撕裂/横带**，属于**合成器/栅格层面**的伪影，不是样式或动画状态丢失（后者会是整屏同色闪一下，而不是一条带）。

### 复现尝试（未能复现，但排除了大量可能）

| 场景 | 次数 | 结果 |
|---|---|---|
| 无头 Chrome（headless=new，真 GPU ANGLE/D3D11）+ clean 实验台，收起 | 60+ | 无异常帧 |
| 无头 + 真 React playground（重建产物）连续切换 | 30（15 次收起） | 无异常帧 |
| 同上 + 点击间隔随机抖动 ±200ms（避免与 60Hz 锁相）+ CPU 节流 4x | 30 | 无异常帧 |
| headless=old（旧无头合成路径） | 12 | 无异常帧 |
| headful Chrome（真实窗口/vsync） | 待补（首轮因 Windows 原生遮挡检测导致窗口不被认为可见、转场被跳过、screencast 0 帧；已加 `--disable-features=CalculateNativeWinOcclusion` 重跑） | — |

每帧指标：全帧平均亮度跳变、|ΔL|>100 的像素数（整块翻转）、行亮度剖面的**横带**离群（用户描述的形状）、孤立像素 ppm、纯色占比。以上均在噪声本底内。

**结论**：这类撕裂需要真实呈现路径（窗口/vsync/栅格截止时间），无头环境不产生"某块瓷砖没跟上就呈现上一帧"的压力，所以测不到。它属于**逐帧重栅格化全屏蒙版的代价**：收起时被蒙版的是**旧快照层且被 `z-index: 1` 顶到最上层**，等于每帧都要重新栅格化/上传一张全屏蒙版贴图，一旦某一行瓷砖没赶上截止时间，那一带呈现的就是上一帧的蒙版位置 → 横带/撕裂；亮暗高对比圆弧把它放大。（`CIRCLE` 走的是"蒙版挂新层、层序默认"，用户反馈干净——这是唯一的结构差异。）

### 已落库的修复（本次已实现 + 回归验证）

把**收起的蒙版从"旧层 + z-index:1"改成"新层 + 反向蒙版（掏洞）"**，层序回到 UA 默认，与 `CIRCLE` 结构完全一致；同时把蒙版盒子**完全静止**（`mask-size: 100% 100%` / `mask-position: 0 0`），只让洞的半径变化（`@property` 注册半径 + `radial-gradient`）——顺带把附录五测到的 0.5px 像素对齐抖动一起消掉。

```css
@property --ts-radius { syntax: '<length>'; inherits: false; initial-value: 0px; }
@keyframes shrink { from { --ts-radius: 1986px } to { --ts-radius: 0px } }
/* 注意：挂 ::view-transition-new(root)，不再需要 z-index */
::view-transition-new(root) {
  --ts-cx: 854px; --ts-cy: 294px;
  mask-image: radial-gradient(circle at var(--ts-cx) var(--ts-cy),
    transparent calc(var(--ts-radius) - 0.5px), #000 calc(var(--ts-radius) + 0.5px));
  mask-size: 100% 100%; mask-position: 0 0; mask-repeat: no-repeat;
  animation: shrink var(--theme-switch-duration) var(--theme-switch-easing) both;
}
```

**等价性实测（已落库，改前 vs 改后，同一批 seek 时刻逐像素对比，clean 实验台 2560×1400 @dsf=1）**：

| t(ms) | 平均\|Δ\|(0-255) | 最大\|Δ\| | >2 的像素占比 |
|---|---|---|---|
| 0 / 50 / 100 / 750 | **0.000（逐位相同）** | 0 | 0.00% |
| 150–700（中段） | 0.001–0.068 | 50–236 | 0.00–0.13% |

平均差 ≤0.068/255，差异只出现在圆弧那 1px 抗锯齿边上（两种实现生成边缘的方式略有不同）——**视觉等价**。

**圆心抖动同步消除（同一回归的几何测量）**：

| 指标 | 改前（旧层蒙版 + z-index） | 改后（新层反向蒙版 + 静止盒子） |
|---|---|---|
| Δcx | σ **0.329px**（min −0.84 / max +0.31） | σ **0.011px**（min −0.01 / max +0.03） |
| Δcy | σ **0.180px** | σ **0.001px** |

### 落库改动（本次已实现，不再是"待定"）

| 文件 | 改动 |
|---|---|
| `packages/core/src/masks.ts` | 新增 `getCircleRevertHoleGeometry`（洞心 + 起始半径）与 `CircleHoleGeometry`；旧 `getCircleRevertMaskGeometry` 保留为公开 API / 降级路径 |
| `packages/core/src/styles.ts` | 新增 `HOLE_RADIUS_VAR`；`buildAnimationCSS` 新增可选 `holeGeometry`，命中时输出"静止蒙版盒子 + `@property --theme-switch-radius` 动画 + 新层反向蒙版"（不再输出 `z-index` / `will-change` / `mask-size`·`mask-position` 关键帧） |
| `packages/core/src/orchestrate.ts` | 收起方向改用 `getCircleRevertHoleGeometry`（扩散方向与其余类型路径不变） |
| 测试 | 新增 2 个用例（`buildAnimationCSS` 的 hole 分支、`runThemeTransition` 收起注入的 CSS 结构），公开导出面测试同步；**178 tests / tsc / eslint 全绿** |
| playgrounds/react | 已重建产物（开发服务器请重启以拾取新的 `dist/`） |

**仍需真机复测**：无头环境复现不到横带，所以"改了之后横带是否消失"只能由真机判断（20% → 期望 0%）。若仍出现，说明撕裂与"哪一层被蒙版"无关，而是"逐帧全屏蒙版重栅格"本身，下一步要换掉 mask 路线（transform 化 / `clip-path`，Safari 兼容性重新评估）。另：`@property` 虽然覆盖全部支持 VT 的版本，但"在 VT 伪元素上动画注册自定义属性"**未在 Safari 真机验证**，发布前需补一次 Safari 18+ 复测。

**本附录 commit**：
```
fix(core): CIRCLE_REVERT 收起改为"新层反向蒙版（洞）+ 静止蒙版盒子"，消除 z-index 置顶旧层与逐帧蒙版像素对齐抖动
docs: 附录六——收起横带/撕裂判定为逐帧全屏蒙版重栅格的合成器伪影；记录落库改动与像素级等价性回归
```



