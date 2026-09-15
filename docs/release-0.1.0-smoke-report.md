# theme-switch-animation 发布前冒烟测试与验证报告（0.1.0）

| 项目 | 内容 |
|---|---|
| 执行方式 | 定时任务自动执行（2026-09-15 03:00 触发），全程只验证 + 最小修复 |
| 执行环境 | `E:\personal-project\theme-switch-animation`，HEAD `388aea9`（main，起始工作树干净） |
| 报告结论 | **可发布**（自动化全绿；2 处发布物缺陷已最小修复并提交 `db82ad0`；Safari / iOS 真机由需求方决策记为默认通过，反馈驱动修复） |
| 修复提交 | `db82ad0 fix: 发布前冒烟修复——根包补 react-dom 可选 peer（v1.4 §4）+ README Vue 示例 :ref 改字符串 ref`（2 files, +5/−1） |
| 归档说明 | 本文档为执行当轮的原始记录 + 报告后更新（见文末附录 A / B）；证据日志副本在执行机 `%TEMP%\tsa-verify\` |

---

## 1. 执行摘要

**结论：可发布。** 全部可自动化项（基础门禁、产物、四个 playground、7 个 CDP 验收 + §9-3 组二、§9 全部 11 项、四引擎矩阵 + Firefox 视频取证、changeset）均通过；发现并修复了 **2 处会随 npm 包一起发出去的发布物缺陷**（§11 第 1、2 条），未改任何功能逻辑、未改测试断言、未关检查、未引入依赖、未 push / version / publish / tag。

**报告后更新（2026-09-15 白天）**：
1. 两处修复已经需求方审阅并提交为 `db82ad0`，工作树干净。
2. playground 由需求方在 **Google Chrome 人工验证通过**。
3. **Safari / iOS 真机清单由需求方决策记为默认通过**——不做发布前真机验证，如有用户反馈再修复（WebKit 引擎级证据见 §7，风险边界见 §11-9）。

---

## 2. 环境记录

| 项 | 值 |
| --- | --- |
| OS | Windows 11 专业工作站版 10.0.26200 build 26200 |
| Node / pnpm / git | v24.15.0 / 11.24.0 / 2.53.0.windows.2 |
| Chrome（真实安装） | 152.0.7977.83（`C:\Program Files\Google\Chrome\Application`） |
| Edge（真实安装） | 153.0.4234.32（`C:\Program Files (x86)\Microsoft\Edge\Application`） |
| Firefox（真实安装） | 默认路径未装；本轮 Firefox 用 Playwright 构建 155.0 |
| Playwright | 1.63.0，装在 `%TEMP%\pw-webkit`（临时方案，未入仓库依赖）；浏览器缓存 webkit-2359（Safari 26.6 内核）/ firefox-1543 / chromium-1223 / ffmpeg-1011 |
| CDP | 无头 Chrome 152 `--headless=new --remote-debugging-port=19222`，独立 `--user-data-dir=%TEMP%\tsa-cdp-profile` |
| 端口 | Next 5222 / Vue 5224 / Nuxt 3000 / verify-engine 自带 3211 / §9-6 探针 3212；开始前全部空闲且不在 WinNAT 保留区间，结束后全部释放 |

---

## 3. 基础门禁结果

| 步骤 | 命令 | 结果 | 数字 / 说明 |
| --- | --- | --- | --- |
| install | `pnpm install --frozen-lockfile` | PASS | 10 个 workspace 项目 "Already up to date"，311ms；修复 package.json 后复跑仍 PASS（lockfile 无变化） |
| lint | `pnpm lint`（eslint .） | PASS | 退出码 0，0 报错（pipefail 复核真实退出码） |
| typecheck | `pnpm typecheck`（tsc --noEmit） | PASS | 退出码 0 |
| test | `pnpm test`（vitest run） | PASS | **12 文件 / 196 / 196 通过**，2.13s；无 `.skip/.only/.todo/xit/xdescribe` 残留；修复后复跑仍 196/196 |
| build | `pnpm build`（tsup + copy-nuxt-runtime） | PASS | ESM：index 21.7 KB / react 23.0 KB / vue 22.5 KB / nuxt 1.0 KB；DTS：index 7.0 KB / react 2.4 KB / vue 2.6 KB / nuxt 1.4 KB / uncontrolled-Cg0SjI93 18.4 KB；nuxt-runtime/composables index.mjs 22.5 KB + index.d.ts 19.3 KB |

---

## 4. 产物与发布清单

**dist 清单（15 文件）**：`index.{mjs,mjs.map,d.ts}`、`react.{mjs,mjs.map,d.ts}`、`vue.{mjs,mjs.map,d.ts}`、`nuxt.{mjs,mjs.map,d.ts}`、`uncontrolled-Cg0SjI93.d.ts`、`nuxt-runtime/composables/{index.mjs,index.d.ts}` —— 齐备。

**四个 exports 子路径解析**（Node 24 `import.meta.resolve` + 实际 `import()`，仓库内自引用）：

| 子路径 | 解析到 | 命名导出 |
| --- | --- | --- |
| `.` | `dist/index.mjs` | 60+ 项，含 `ThemeAnimationType`、`runThemeTransition`、`SKIP_TRANSITION`、`observeThemeClass`、`HOLE_RADIUS_VAR`、`getCircleRevertHoleGeometry`、全部 13 类几何函数 |
| `./react` | `dist/react.mjs` | `SKIP_TRANSITION, THEME_STORAGE_KEY, ThemeAnimationType, observeThemeClass, useThemeAnimation` |
| `./vue` | `dist/vue.mjs` | 同 react（`observeThemeClass` 四入口对齐已确认） |
| `./nuxt` | `dist/nuxt.mjs` | `default`（Nuxt 模块） |

**npm pack --dry-run（§9-11）**：18 文件 = dist 15 + `LICENSE` + `README.md` + `package.json`；unpacked 355,623 B，tarball 87,754 B（peer 修复后 87,770 B）。无多余文件、无源码泄漏。当时版本 0.0.0，`changeset version` 后为 **0.1.0**。

---

## 5. CDP 验收结果（`pnpm test:acceptance`，退出码 0）

| 脚本 | 结果 | 关键指标 |
| --- | --- | --- |
| cdp-consistency（§9-2） | PASS | 挂载断言 ✓（非占位文案）；3 秒 10 连点后 storage / html class / 按钮文案三者一致；同帧 5 连击后一致 |
| cdp-darkcycle | PASS | dark 存储加载 → 🌙 + class=dark；受控切回 light 三源一致 |
| cdp-hydration（§9-5） | PASS | stored=dark / light 两种初始态 **hydration 错误各 0 个** |
| cdp-measure（§9-7） | PASS | 4 档位 × 25 样本 = 100 次，**超时（>300ms）0 次**；p95：基线 19ms / CPU 4x 28ms / CPU 6x 36ms / 6x+Slow 3G 41ms；max 47ms |
| cdp-vue-rapid（§9-1） | PASS | 挂载 13 按钮；基线 300ms 间隔 + CPU 4x 150ms 间隔两轮，**window/console 报错 0 条**，终态一致 |
| cdp-nuxt93 组一（§9-3，darkClass=dark） | PASS | preference / html class / 按钮文案三源一致翻转 ×2 |
| cdp-nuxt-animtypes | PASS | **13/13** 按钮各自注入匹配的 `@keyframes theme-switch-<type>` |
| **cdp-nuxt93 组二**（§9-3，`ACCEPTANCE_DARK_CLASS_SUFFIX='-mode'` 重建 + `ACCEPTANCE_DARK_CLASS='dark-mode'`，验收链之外手动补跑） | PASS | SSR HTML 中 `darkClassName:"dark-mode"`；三源一致翻转 ×2；跑完已恢复默认构建 |

全程无 window error / console error / unhandled rejection。

---

## 6. §9 验收项逐条核对

| 编号 | 判据 | 结果 | 证据 | 需人工 |
| --- | --- | --- | --- | --- |
| §9-1 | Vue 3 秒 10 连点：无错位 / 不失步 / 无 skipped 报错 / class 与 isDark 一致 | PASS | cdp-vue-rapid 两轮 0 报错、终态一致 | 视觉错位已由需求方 Chrome 人工验证覆盖 |
| §9-2 | 受控 × next-themes：蒙版下为目标截图；连点后三者一致 | PASS | cdp-consistency + darkcycle + measure（Next playground = next-themes） | 否 |
| §9-3 | 受控 × color-mode：默认 dark 组 + classSuffix '-mode' 组 | PASS | nuxt93 组一 + 组二均 PASS | 否 |
| §9-4 | 无 VT → 瞬切且状态正确；reduced-motion → 无动画 | PASS | 14 条单测覆盖 SSR 无 document / 不支持 VT / reduced-motion / localStorage 不可用，core 与 React/Vue 适配层（jsdom 无 VT 自动降级）均有 | 否 |
| §9-5 | Next RSC + Nuxt SSR 无 hydration 报错、无服务端 localStorage | PASS | cdp-hydration 0 错误；Nuxt SSR 两组初始态正确渲染；`ssr.test.tsx/.ts` 覆盖服务端路径 | 否 |
| §9-6 | cubic-bezier / linear() computed style 生效；自定义 duration 生效 | PASS | 7 条单测 + **运行时探针（真实 Chrome 152，lab 页）**：`::view-transition-new(root)` computed `animationTimingFunction` = `cubic-bezier(0.4, 0, 0.2, 1)` 与 `linear(0 0%, 0.25 25%, 1 100%)`（浏览器规范序列化），`animationDuration` 1s / 1.234s，keyframe easing 一致，0 报错 | 否 |
| §9-7 | CPU 4x/6x + Slow 3G 下 300ms 超时频率 | PASS | cdp-measure 100 样本 0 超时，p95 ≤ 41ms | 否 |
| §9-8 | Playwright Chromium + WebKit；Firefox 注明 | PASS | WebKit 26.6 内核 + 真实 Chrome/Edge 全绿（§7）；Firefox 超出要求做了 Playwright 155 + 视频取证；docs 站 FAQ 已写明 Firefox 155 实测、README 写明 <144 降级 | Firefox 真机（可选） |
| §9-9 | 仅加 module，值 + 全部类型零 import 可用且强类型 | PASS | `nuxt prepare` 生成 5 个值 + 全部公开类型；**强类型探针**（零 import 使用 5 值 + 13 类型）`nuxt typecheck` 0 错误；负样本（不存在成员）按预期报错证明探针生效；探针已删 | 否 |
| §9-10 | mask 几何全覆盖；TS strict | PASS | masks.test.ts 34 条：四角最大距离 4 条、CIRCLE/各形状终尺寸与覆盖系数、四向起始 4px、REVERT、BLUR 封顶、分发；根 tsc 通过 | 否 |
| §9-11 | pack = dist（含 nuxt-runtime）+ LICENSE + README；四子路径可解析 | PASS（修复后） | §4；peer 声明缺失已补 | 否 |

---

## 7. 四引擎矩阵（`verify-engine.mjs`）+ Firefox 视频取证

| 引擎 | 支持面 | CIRCLE_REVERT 收起（@property 洞半径） | 13 类型 | 报错 | 退出码 |
| --- | --- | --- | --- | --- | --- |
| Playwright WebKit（Safari 26.6 内核） | 5/5 | 计算样式 1041.9→0.0px **14 点单调**；亮度 15→255 11 取值单调 | 13/13 推进 + finished ok | 0 | 0 |
| 真实 Chrome 152 | 5/5 | 同上 14 点单调 | 13/13 | 0 | 0 |
| 真实 Edge 153 | 5/5 | 同上 14 点单调 | 13/13 | 0 | 0 |
| Playwright Firefox 155 | 5/5 | **CSS 层 ✓**：计算样式 1041.9→0.0px 14 点单调；**截图亮度判据 ✗**（恒为终态 255/15，14 项 FAIL） | 13/13 `outcome=ok`，蒙版动画均捕获；截图判据 ✗ | consoleErrors 0 / pageErrors 0 | **1** |

Firefox 退出码 1 与 next-steps §2-D 记录的现象完全一致：Playwright `page.screenshot()` 在 Firefox 上不合成 `::view-transition` 伪元素层，是取证管道限制而非库缺陷。未为此改脚本判据，按"以最严格环境为准并记录差异"处理，用独立手段取证：

**`verify-firefox-video.mjs`（recordVideo 合成器输出，退出码 0）**：A 自由播放——收起 21 帧 / 18 个互异中间态取值、扩散 23 帧 / 20 个（若不画 VT 伪元素只会有 2 个取值）；B 暂停 + 逐档 seek——收起亮度 54→255 单调、拟合半径 696.1→610.2→521→431.7→345.8→266.2→195.3px 7 点单调（t=375ms 的 521px 与 WebKit/Chrome 计算样式值逐点吻合），扩散 203→15 单调、半径 266→696px 单调。**结论：Firefox 合成器逐帧绘制了两个方向的蒙版，四引擎全绿。**

---

## 8. 发布链路检查

- `pnpm exec changeset status --verbose`：可解析，**仅根包** `theme-switch-animation` 被 bump，**minor → 0.1.0**；`config.json` `privatePackages.version=false`，`packages/*` 不参与。
- **实际有 3 个 changeset**：
  - `add-eight-animation-types.md`（minor）：8 种新类型、`blurAmount`、duration 400→750 行为变更 ✓
  - `reliability-and-sync.md`（minor）：Vue 模式动态判定、`nextIsDark`、跨文档清理、超时直切语义、`finished` / `SKIP_TRANSITION` / `observeThemeClass`、多实例与跨标签同步、防御性修复 ✓
  - `circle-revert-hole-mask.md`（patch）：收起方向改新层反向蒙版 + `@property` 半径、新导出 `HOLE_RADIUS_VAR` / `getCircleRevertHoleGeometry` ✓
- 覆盖核对：对照 dist 公开导出与 v1.5 变更，用户可见变更均有对应描述。两处可选缺口（发布前由需求方决定是否补）：① `react-dom` peer 声明无 changeset 记录；② 无"首次发布"changeset——0.0.0 从未发布，CHANGELOG 0.1.0 只会描述增量。

---

## 9. 文档一致性

| 对象 | 13 类型 | blurAmount | duration 750 | Vue 受控 options 需响应式 | SFC :ref 桥接 | Nuxt 类型自动导入事实 |
| --- | --- | --- | --- | --- | --- | --- |
| README | ✓（行 6、98） | ✓（行 101，默认 2） | ✓（行 30、99） | ✓（行 79） | **已修复**（行 75，见 §11-2） | ✓（行 90） |
| apps/docs 文档站 | ✓（site.ts / hero / features / gallery / faq） | **缺**（全站无提及；落地页形态、无 options 表，属覆盖不全非表述错误） | ✓（gallery 750ms） | ✓（faq.tsx 行 25） | ✓（quick-start 行 83 注释），但代码块写法有隐患（§11-3） | ✓（features / quick-start） |
| 四个 playground | ✓ 各 13 项矩阵 + `data-animation-type` | 未暴露（非要求） | ✓ 各 750ms 预设 | Vue/Nuxt ThemeButton 用 reactive + watchEffect ✓ | `setTrigger` 函数桥接（带显式 cast）✓ | Nuxt 组件零 import ✓ |

无 "400ms" / "5 种动画" 残留。Firefox 表述：docs 站 FAQ 已更新为 155 实测结论。

---

## 10. 需人工完成的清单

**处理结果（2026-09-15 需求方决策）**：**Safari / iOS 真机与 Windows 分数缩放肉眼观感——默认通过，不再作为发布前条件；如有用户反馈再修复。** 原始清单保留在 `docs/next-steps.md` §2 末尾，供日后反馈排查时使用；WebKit 引擎级证据见 §7。

---

## 11. 阻塞项与风险（按严重程度）

1. **[已修复，`db82ad0`] 根包缺 `react-dom` 可选 peer**——证据：`grep from dist/react.mjs` → `"react"`、`"react-dom"`；`packages/react/src/index.ts:5` `import { flushSync } from 'react-dom'`；`git log -S '"react-dom"' -- package.json` 仅 441b6b1（devDependency），根包 peer 从未声明。影响：pnpm `node-linker=isolated` + `hoist=false` 等严格布局下 `theme-switch-animation/react` 解析不到 `react-dom`；与需求 v1.4 §4 不符。修复：`package.json` +4 行（peer + meta optional），frozen-lockfile / pack 复核通过。
2. **[已修复，`db82ad0`] README Vue 示例 `:ref="triggerRef"`**——证据：临时 SFC 在 playgrounds/vue 跑 vue-tsc → `TS2322: Type 'HTMLButtonElement | null' is not assignable to type 'VNodeRef | undefined'`（`<script setup>` 模板自动解包）；运行时初值 null 导致 ref 永不写入，圆心回落视口中心。修复：改为字符串 `ref="triggerRef"`（需求 §6.2 原文写法，实测 vue-tsc 通过）。
3. **[低] docs 站 quick-start 的 `:ref="(el) => (triggerRef = el)"`**——复制到真实 vue-tsc 项目报 TS2322（`Element | ComponentPublicInstance | null` 不可赋给 `HTMLButtonElement | null`）；docs 站代码块是 TSX 字符串、自身不参与类型检查所以未暴露。建议改为 `ref="triggerRef"` 或加 cast（未改：不在发布物内，且避免触碰 apps/docs）。
4. **[低] docs 站无 `blurAmount` 说明**——phase-6 报告要求文档站覆盖；README API 表已有。建议补一句。
5. **[低·DX] Nuxt 自动导入"幽灵类型项"**——`.nuxt/imports.d.ts` 把自包含 d.ts 里的核心函数声明（`resolveAnimationOptions`、`runThemeTransition`、`getMaskGeometry` 等）登记为 type-only；零 import 当值用会报 `TS1362 cannot be used as a value because it was exported using 'export type'`。runtime `.mjs` 只导出 5 个值，与 README 第 90 行契约一致，§9-9 不受影响；但 IDE 会把它们当全局补全。可后续在 `copy-nuxt-runtime.mjs` 剔除非导出函数声明或让 runtime 转发全部 core。
6. **[信息] 首次发布的 CHANGELOG 叙事**——见 §8。
7. **[信息·上游] `nuxt build` 出现 `DEP0155` 弃用告警**——来自 `@nuxt/nitro-server` 内部对 `@vue/shared` 的 `"./"` 尾斜杠 exports 映射，与本库无关，构建成功。
8. **[已知遗留，未触碰] apps/docs Biome lint**——`biome.json` 的 `vcs.useIgnoreFile` 指向不存在的 ignore 文件 + 存量格式不符，另行处理。
9. **[已接受风险] Safari / iOS 真机、Windows 分数缩放肉眼观感**——WebKit 引擎级（VT 伪元素上 `@property` 插值、mask 动画、13 类几何）已全绿；Apple GPU 合成与触控坐标未真机验证。需求方决策默认通过，反馈驱动修复（原始排查清单在 `docs/next-steps.md` §2）。

---

## 12. 未覆盖 / 未验证项及原因

- **Safari / iOS 真机、Windows 分数缩放肉眼观感**：无设备 / 需真人观感；需求方决策默认通过（§10）。
- **有头真机 jitter-lab（next-steps §2-C 场景）**：本轮未复跑；上一轮记录 42 次切换 0 异常，本轮引擎矩阵与视频取证已覆盖相同渲染路径的等价判据。
- **Firefox 真实安装版**：本机默认路径未装，用 Playwright Firefox 155 替代；Firefox 截图判据因工具限制未通过，已用视频取证替代（§7）。
- **apps/docs `next build`**：不在本轮 10 步范围（仅核对文案），未重跑；next-steps 记录 09-14 已通过。
- **§9-7 的"Chrome DevTools UI"**：用 CDP `Emulation.setCPUThrottlingRate` + 网络节流等价实现（脚本既有设计）。
- **§9-3 组二**：`pnpm test:acceptance` 本身不包含，按记录手动补跑通过。

---

## 附录 A：本轮对仓库的全部改动

| 文件 | 改动 | 提交 |
| --- | --- | --- |
| `package.json` | peerDependencies / peerDependenciesMeta 补 `react-dom: ">=18"`（optional） | `db82ad0` |
| `README.md` | Vue 快速开始 `:ref="triggerRef"` → `ref="triggerRef"` | `db82ad0` |
| 本文档 | 归档冒烟报告（新增） | 见附录 B 提交 |

其余一切（测试、脚本判据、功能代码、changeset、apps/docs）零改动。执行过程中的临时探针（`.tmp-verify-exports.mjs`、`__tsa-autoimport-probe.ts`、`__TsaRefProbe*.vue`、`%TEMP%\tsa-verify\*.mjs`）均已删除，后台服务与端口已全部清理。

## 附录 B：发布步骤清单（0.1.0）

前置状态：`db82ad0` 已提交、工作树干净、`changeset status` = minor → 0.1.0（3 个 changeset 就位）。

```bash
# 0.（可选，发布前最后决定）补 changeset
#    - 在 .changeset/reliability-and-sync.md 加一句 react-dom 可选 peer 声明
#    - 视需要补一条"首次发布"changeset，让 CHANGELOG 0.1.0 说清 React/Vue/Next/Nuxt 支持与 5 种基础类型

# 1. 消费 changeset：0.0.0 → 0.1.0，生成/更新 CHANGELOG.md，删除 .changeset/*.md
pnpm changeset version
git diff  # 核对 package.json version=0.1.0 与 CHANGELOG.md 内容

# 2. 提交版本变更（config commit:false，不自动提交）
git add -A && git commit -m "chore(release): version 0.1.0"

# 3. 构建 + 最终自检
pnpm build
pnpm lint && pnpm typecheck && pnpm test        # 期望 196/196
npm pack --dry-run                              # 期望 18 文件，文件名 theme-switch-animation-0.1.0.tgz

# 4. 发布（需要 npm 登录；--otp 按 2FA 情况携带）
pnpm exec changeset publish
#    - 只会发布根包 theme-switch-animation；并在本地打 tag：theme-switch-animation@0.1.0

# 5. 推送（发布动作由需求方手动执行；tag 与提交一起推）
git push && git push origin theme-switch-animation@0.1.0

# 6. 发布后验证
npm view theme-switch-animation version         # 期望 0.1.0
#    - 临时目录 npm i theme-switch-animation@0.1.0，四子路径 import 各跑一遍
#    - npmjs.com 页面核对 README / files

# 7. 收尾
#    - docs/next-steps.md 待办 4 打勾，链接本报告
#    - GitHub Releases（可选）：以 CHANGELOG.md 0.1.0 段落为正文
```
