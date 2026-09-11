# Phase 4 执行汇报

| 项目 | 内容 |
|---|---|
| 日期 | 2026-09-11 |
| 依据 | `docs/requirements.md` v1.4 §4、§6.2 / §6.3、§8（Phase 4）、§9-3、§9-9 |
| 范围 | Nuxt 模块（`/nuxt` 子路径 + `addImportsDir` 自动导入 + `@nuxt/kit` optional peer）、Nuxt playground 接 `@nuxtjs/color-mode` 联调、§9-3 / §9-9 验收。**未开始 Phase 5（文档站）** |
| 基线 | `53658dc docs: 添加 Phase 3 执行汇报` → 本阶段共 4 个 commit（见 §1） |

**结论**：Phase 4 全部完成。**§9-9 通过（强证据）**：仅声明 `modules: ['theme-switch-animation/nuxt']` 的全新 Nuxt 项目里，`useThemeAnimation` / `ThemeAnimationType` / `THEME_STORAGE_KEY` 与**全部 5 个公开类型**无需 import 即可使用，类型是真实强类型——探针里故意注入的 2 处类型错误被精准报出，其余 0 报错，`nuxt prepare` / `nuxt typecheck` 均通过。**§9-3 两组均通过**：默认类名 `dark` 与可配置组（`classSuffix: '-mode'` + `darkClassName: 'dark-mode'`）下，`preference` / `<html>` class / 按钮文案三源始终一致。Phase 2b 的 next-themes 结论已在 `docs/phase-2b-report.md` §2 入档（本轮确认无需补充）。lint / typecheck / 129 单测 / build / 四 playground 全绿。

---

## 1. 已完成项

| # | 子项 | commit | 说明 |
|---|---|---|---|
| 1 | Nuxt 模块 + runtime 重导出 + 构建方案 B | `f9aeffb` | `packages/nuxt`：`defineNuxtModule` + `createResolver` + `addImportsDir`；`src/runtime/composables/index.ts` 从 core / vue 适配层重导出值导出与全部类型；`scripts/copy-nuxt-runtime.mjs` 纯 `node:fs` 跨平台复制（不依赖 cp / rsync），`postbuild` 钩子接入，`npm pack` 清单含 `dist/nuxt-runtime/` |
| 2 | 产物路径 + dts 可移植性修复 | `2ab65aa` | `addImportsDir` 指向 `./nuxt-runtime/composables`（原 `./runtime/composables` 与实际产物不符，导致扫描不到）；`defineNuxtModule` 推断类型引用 pnpm 虚拟路径下的 `@nuxt/schema` 触发 TS2742，显式标注 `NuxtModule` 修复；新增 Nuxt playground（Nuxt 3.21 + color-mode 3.5.2，五按钮布局 + `app.vue` 自动导入用法） |
| 3 | playground 受控联调修复 + §9-3 验收脚本 | `fd94640` | 修复 playground 的响应式缺陷（详见 §3.1）；`scripts/cdp-nuxt93.mjs`：相对翻转一致性断言（`nuxt-color-mode` / `<html>` class / 按钮文案三源），可配 `ACCEPTANCE_DARK_CLASS` 跑可配置组；`nuxt.config.ts` 由 `ACCEPTANCE_DARK_CLASS_SUFFIX` 驱动分组 |
| 4 | 全部公开类型显式注册 | `d1b723f` | `addImportsDir` 只扫描**值**导出，纯类型不登记（详见 §3.2）；改 `addImports({ type: true })` 显式注册 5 个公开类型；runtime 产物重构为 `internal/`（实现 + 类型块）+ `composables/`（仅干净入口），消除内部类型别名 `T,b,c,d,r` 被登记为自动导入名的污染 |

## 2. 验收结果

### §9-9 自动导入完整性（强证据）

模拟真实用户：playground 只声明 `modules: ['@nuxtjs/color-mode', 'theme-switch-animation/nuxt']`，`app.vue` 中 `useThemeAnimation` / `ThemeAnimationType` / `computed` / `useColorMode` 全部不写 import。

| 检查 | 结果 |
|---|---|
| `nuxt prepare` | ✓ 通过（`.nuxt/imports.d.ts` 生成：值导出 3 个 + 类型导出 5 个） |
| `nuxt typecheck` | ✓ 0 错误 |
| 自动导入值 | ✓ `useThemeAnimation`、`ThemeAnimationType`、`THEME_STORAGE_KEY` |
| 自动导入类型 | ✓ `ThemeAnimationOptions`、`UseThemeAnimationOptions`、`UseThemeAnimationResult`、`DirectionalAnimationType`、`ResolvedAnimationOptions` |
| 类型真实性（非 any） | ✓ 探针文件内故意注入 2 处类型错误，`nuxt typecheck` **恰好报出这 2 条**（`Ref<boolean>` 赋给 `number`、`string` 赋给 `number`），其余 0 报错。探针用后即删 |

`.nuxt/imports.d.ts` 中的注册行（最终形态）：

```
export { THEME_STORAGE_KEY, ThemeAnimationType, useThemeAnimation } from '.../nuxt-runtime/internal/vue';
export { ThemeAnimationOptions, UseThemeAnimationOptions, UseThemeAnimationResult, DirectionalAnimationType, ResolvedAnimationOptions } from '.../nuxt-runtime/composables';
```

### §9-3 受控模式 × @nuxtjs/color-mode

production 构建（`nuxt build` + `node .output/server/index.mjs`）+ 无头 Chromium 实测，断言相对翻转后 `localStorage` 偏好 / `<html>` class / 按钮文案三源一致：

| 组 | 配置 | 初始 | 点击翻转 | 再次翻转 | 结果 |
|---|---|---|---|---|---|
| 一 | 默认（暗色类名 `dark`） | 三源一致 | 一致 | 一致 | **PASS** |
| 二 | `classSuffix: '-mode'` + `darkClassName: 'dark-mode'` | 三源一致 | 一致 | 一致 | **PASS** |

组二断言的是 `dark-mode` 类（`ACCEPTANCE_DARK_CLASS=dark-mode`），证明可配置性真实生效而非巧合。复跑：`node scripts/cdp-nuxt93.mjs`（组二加 `ACCEPTANCE_DARK_CLASS=dark-mode`；两组通过 `ACCEPTANCE_DARK_CLASS_SUFFIX` 环境变量重建 playground）。

### 发布清单

`npm pack --dry-run` 共 21 个文件，含 `dist/nuxt.mjs`(433B) / `dist/nuxt.d.ts`(368B) / `dist/nuxt-runtime/composables/{index.mjs,index.d.ts}` / `dist/nuxt-runtime/internal/{vue.mjs,vue.d.ts,types-<hash>.d.ts}`。

## 3. 遇到的问题与处理

### 3.1 受控模式在 Vue/Nuxt 下要求 options 是响应式来源（playground 接线缺陷）

§9-3 首轮实测症状：`status` 显示 `html class: dark` 但按钮文案是 `🌙 切到亮色`（应为 ☀️），点击后 `preference` 也停在 `light`。根因：playground 把 `{ isDark: computed(() => colorMode.value === 'dark'), ... }` 作为**普通对象字面量**传进 composable——composable 在 setup 时读取一次 `isDark` 判定模式并镜像该值，之后 `colorMode` 的变化完全进不来，受控模式的 `isDark` 冻结在初始值。

修复：options 用 `reactive({...})` 包装，并以 `watchEffect` 同步外部主题状态到 `options.isDark`（`playgrounds/nuxt/app.vue`）。**这是 Vue 版的重要用法约定，必须写进 Phase 5 文档**：受控模式的 options 需为响应式来源；传普通对象会让 `isDark` 快照化。组件测试（Phase 3）里用的是 `reactive`，所以单测没暴露这个问题——真机联调补上了这一课。

### 3.2 `addImportsDir` 只扫描值导出，类型需显式注册

按 §6.3 实现后，`ThemeAnimationType`（值）自动导入生效，但 `UseThemeAnimationOptions` 报 `Cannot find name`；`imports.d.ts` 里只登记了值导出与 3 个"恰好被扫到"的类型。查 `unimport` 源码确认：`addImportsDir` 走 `scanDirExports`（不含类型），而类型扫描（`scanExports(filepath, includeTypes)`）对 tsup 生成的合并 `export { … type X … }` 语句解析不完整。

修复：模块内保留 `addImportsDir`（值），另用 `addImports({ name, from, type: true })` 显式注册 5 个公开类型，并加注释要求新增类型时同步该表。这偏离了 §6.3 示例的"仅 addImportsDir 即可"的假设，但没有偏离 §9-9 的目标（用户无需 import 且类型完整）——建议在 Phase 5 文档或下轮需求修订中记录此事实。

### 3.3 内部类型别名污染自动导入

初版把类型共享 chunk 一起放进被扫描的 `composables/`，导致 Nuxt 把 chunk 的内部别名 `T, b, c, d, r` 也登记为自动导入名（`imports.d.ts` 里出现 `export { T, b, c, d, r } from '...types-<hash>.d'`）。虽不致命，但用户敲 `T` 会拿到无意义类型。重构产物为 `internal/`（实现 + chunk）+ `composables/`（仅 `export *` 入口），污染行消失。

### 3.4 其他

- **trustPolicy 再次触发**：Nuxt 3 依赖 `semver@6.3.1`（2023-07 发布）无 provenance——查证 semver 自 7.5.1（2024）才带 provenance，6.x 全线无证明属早期发布流程的正常情况。沿用既有原则在 `pnpm-workspace.yaml` 精确排除这一个版本。
- **color-mode 版本选择**：`@nuxtjs/color-mode@4` 依赖 `@nuxt/kit@4`，与需求指定的 Nuxt 3 不兼容，改用 3.5.2（Nuxt 3 对应线）。
- **`runtimeConfig.app` 命名空间被 Nuxt 保留**，暗色类名改注入 `runtimeConfig.public`。
- **SFC 模板 `:ref` 需要 `VNodeRef`**（与 Phase 3 同款），playground 用函数 ref 桥接；`### 3.4` 提到的用法约定一并写进 Phase 5 文档。

## 4. 验证结果

```
pnpm install --frozen-lockfile   ✓
pnpm lint                        ✓
pnpm typecheck                   ✓
pnpm test                        ✓ 12 files / 129 tests
pnpm build                       ✓ dist/{index,react,vue,nuxt}.{mjs,d.ts} + nuxt-runtime/
npm pack --dry-run               ✓ 21 files（含 dist/nuxt-runtime/ 全部 5 个文件）
playgrounds/react                ✓ typecheck + build
playgrounds/vue                  ✓ typecheck + build
playgrounds/next                 ✓ typecheck
playgrounds/nuxt                 ✓ nuxt prepare + nuxt typecheck + nuxt build（SSR 产物可跑）
§9-9（§2）                       ✓ 值 + 5 类型自动导入，强类型证据
§9-3（§2）                       ✓ 默认 dark 组 + classSuffix '-mode' 可配置组
git status                       ✓ clean
```

## 5. Phase 5（文档站 + 发布 0.1.0）前置条件检查

Phase 5 = 文档站（每种动画 live demo、双模式说明、两个第三方库接入指南、Firefox 手测说明）→ 发布 0.1.0。

| 前置条件 | 状态 | 说明 |
|---|---|---|
| 四个子路径产物齐备 | ✓ | `dist/{index,react,vue,nuxt}.mjs` + 对应 d.ts + `nuxt-runtime/` 均已入发布清单（§9-11 的 `npm pack` 内容要求已满足） |
| 四个 playground 可作 live demo 素材 | ✓ | React（Vite，非受控）、Next（next-themes 受控）、Vue（Vite，非受控）、Nuxt（color-mode 受控）各自的五按钮布局与说明文案已就绪，文档站可直接引用/移植 |
| 双模式与第三方库接入的实战结论 | ✓ | next-themes 结论见 `phase-2b-report.md` §2；color-mode 见本报告 §2；**三个必须写进文档的用法约定**已在本报告 §3 标注（options 需响应式、SFC `:ref` 桥接、`addImportsDir` 类型注册事实） |
| 验收脚本可复用 | ✓ | §9-2/§9-3/§9-5/§9-7/§9-9 的自动化脚本齐备，`pnpm test:acceptance` 一键串联 |
| changesets 发布链路 | ✓ | `@changesets/cli` v3 配置就绪（Phase 0）；发布前需补一条 changeset（0.0.0 → 0.1.0） |
| 文档站技术选型 | — | 未定（VitePress / Nuxt Content 等）。属 Phase 5 首个决策，与代码无耦合 |
| Firefox 手测（§9-8） | — | 待真机执行，文档需注明 Playwright 只跑 Chromium + WebKit 的矩阵理由（§9-8 已定） |

**判定：满足，可以开始 Phase 5。** 建议 Phase 5 首项先定文档站技术选型与目录，再把 §3 的三条用法约定写进接入指南（否则用户会重复踩到 §3.1 的响应式陷阱）。

## 附：本阶段 commit

```
d1b723f fix(nuxt): 显式 addImports(type) 注册全部公开类型（addImportsDir 只扫值导出）；runtime 产物改为 internal + 干净入口，消除内部别名污染自动导入
fd94640 feat(playground): Nuxt playground 受控联调修复（reactive options 保证 isDark 响应式）+ §9-3 两组验收脚本（dark / dark-mode）
2ab65aa fix(nuxt): 模块产物指向 dist/nuxt-runtime/composables；显式 NuxtModule 注解修复 dts 不可移植；添加 Nuxt playground（color-mode 受控联调，§9-9 自动导入通过）
f9aeffb feat(nuxt): 添加 Nuxt 模块（addImportsDir 自动导入）与 runtime 重导出；postbuild 跨平台复制 nuxt-runtime 目录入发布清单
```

仍按约定未 push（本阶段 4 个 commit 待你 review 后推送）。

---

## 附录（真机反馈修复，2026-09-11）

**反馈**：Nuxt playground 服务正常，但点击任何按钮都只播 CIRCLE 动画；终端出现 `WARN [unimport] failed to resolve ".../nuxt-runtime/internal/vue.js", skip scanning` 与 `Failed to load source map for .../internal/vue.mjs`。

**问题一：五按钮均为 CIRCLE（playground 缺陷）**
初版 `app.vue` 为图省事让五个按钮共享**同一个** `useThemeAnimation` 实例（模板里即注明"共享同一个 toggleTheme"），于是 `animationType` 只有一份 = CIRCLE，按钮点击全部走 CIRCLE。React / Vue playground 都是每按钮独立实例，Nuxt 版漏了。**修复**：抽出 `components/ThemeButton.vue`（每实例自持 reactive options + 自己的 colorMode 受控接线），`app.vue` 只负责布局与全局指示器——与非受控的 Vue playground 结构对齐，受控语义不变。

**问题二：unimport 解析警告 + source map 警告（产物生成缺陷）**
- `composables/index.d.ts` 原本写 `export * from '../internal/vue.js'`：物理文件只有 `vue.d.ts`/`vue.mjs`，unimport 按真实文件解析 `.js` 失败 → `skip scanning`（类型当时靠显式 `addImports(type)` 兜住，功能正常但警告刺眼，且值扫描的 `from` 记录也变得不可预期）。改为**无扩展名** `export * from '../internal/vue'`——TS 按 bundler 解析规则映射到 `.d.ts`，unimport 也能解析（对齐它自身生成的 `from '.../internal/vue'` 形态）。
- 复制 `vue.mjs` 时剥离 `//# sourceMappingURL=` 注释：runtime 目录不发布 source map，留着会让 Vite 每次加载都报 `ENOENT ... vue.mjs.map`。

**验证**（均在 production 构建上）：
- `nuxt prepare` / `nuxt typecheck` / `nuxt build` 的 unimport 与 source map 警告数 **0**（修复前每次构建必现）；
- 新增 `scripts/cdp-nuxt-animtypes.mjs`：逐个点击五按钮，断言注入的 `@keyframes theme-switch-<type>` 与按钮声明类型一致——**五类全对**（这是本 bug 的针对性回归，已接入 `pnpm test:acceptance`）；
- §9-3 两组回归通过、§9-9 强证据（5 类型自动导入、故意错误恰好 2 条）复测通过；
- 全量：lint / typecheck / 129 单测 / build / 四 playground 全绿，`npm pack` 21 文件不变。

**本附录 commit**：
```
73e90de fix(nuxt): playground 每按钮独立 useThemeAnimation 实例（修复五按钮均为 CIRCLE）；runtime 产物改无扩展名 specifier 消除 unimport 解析警告、剥离 sourceMappingURL；新增动画类型独立性验收脚本
```
累计待推送 6 个 commit（Phase 4 主体 4 + 本附录 1 + Phase 4 汇报 1）。

---

## 附录二（第二轮真机反馈，2026-09-11）

**反馈**：dev 正常启动可用，但终端报 `ERROR Pre-transform error: Failed to resolve import "#app-manifest" from .../nuxt/dist/app/composables/manifest.js`。

### 结论：该报错是上游 Nuxt/Vite 的 dev 期问题，与我们的模块无关

**对照实验（关键证据）**：把 playground 的 `modules` 改成只留 `@nuxtjs/color-mode`（**完全不含我们的模块**），清空 `.nuxt` 后重复跑 `nuxt dev` 两次：

| 运行 | 模块 | app-manifest 报错 |
|---|---|---|
| 第一次 | 无我们的模块 | 0 |
| 第二次 | 无我们的模块 | **10** |
| 有模块（多次） | 含我们的模块 | 0 或 10（不确定） |

同一个裸 Nuxt 项目、同一台机器，两次运行结果不同 → **非确定性**，触发点与项目内容无关。`#app-manifest` 是 `@nuxt/vite-builder` 注册的虚拟别名（指向 `mocked-exports/empty`），报错出现在 Vite 依赖优化/预热阶段重转换 Nuxt 自身 app 文件时，属 Nuxt 3.21.11 + Vite 7.3.6 在本环境（Windows + pnpm）的竞态。

**是否影响使用：不影响。** 实测在报错出现（10 条）的同时：dev 页面 200、五个按钮各自播放正确动画类型、受控切换三源一致——报错是 Vite 预转换阶段的日志噪声，不阻塞编译与运行。若要消除噪声，可 `experimental: { appManifest: false }`（会关掉多 App/增量部署相关能力，不建议）或等待 Nuxt 上游修复；本仓库选择如实记录、不改动上游行为。

**更正说明**：我在排查过程中一度把该报错归因于模块里的 `addImports()`（依据是当时几组对照），后续用更严格的对照（固定端口、等预热完成、实际请求页面后再统计、每配置跑两次）证明原结论是**测量假象**。特此更正——附录一里"不要用 addImports，因为它会引发 app-manifest 报错"的表述不成立，不作为技术依据保留（模块仍不使用 addImports，原因是下文第二条）。

### 同时修复的两个真问题

**问题一：`ThemeAnimationType` 作类型使用时不可用（TS2749 / TS1362）**
`ThemeAnimationType` 在源码里既是常量对象（值）又是同名类型（`declare const` + `type` 声明合并）。Nuxt 自动导入对扫描到的**值**只生成 `const X: typeof import(...)['X']`（仅值含义）→ 用 `animationType: ThemeAnimationType` 作类型报 TS2749；改用 `addImports({ type: true })` 补类型又会变成仅类型含义 → `ThemeAnimationType.LTR` 报 TS1362。两种机制互相覆盖，无法同时满足。

**修复**：用 `addTypeTemplate` 注入一个**全局类型别名**（`type ThemeAnimationType = import('theme-switch-animation/vue').ThemeAnimationType`）。TS 的值/类型命名空间独立，全局 `type` 与自动导入的全局 `const` 自然合并——两种用法同时可用（`nuxt typecheck` 0 错误）。这也顺带修好了 playground 的 `defineProps<{ animationType: ThemeAnimationType }>`。

**问题二：runtime d.ts 的转发语句导致类型扫描不全**
`addImportsDir` 的类型扫描只识别文件内**显式的 export 声明**，对 `export {...} from` 转发语句里带 `type` 修饰的名字会漏掉（`UseThemeAnimationOptions` 等曾无法自动导入）。
**修复**：`scripts/copy-nuxt-runtime.mjs` 现在把 tsup 产物的声明**内联**成自包含 `composables/index.d.ts`（逐条 `export interface/type/declare const/function`），并把实现 `index.mjs` 直接放在同一目录（不再用 `internal/` 转发）。产物收敛为 2 个文件（不再随包携带类型块），`npm pack` 18 个文件。

### 本轮验证

- `nuxt prepare` / `nuxt typecheck`：**0 错误**（含 `ThemeAnimationType` 的值/类型双用法）
- 强证据探针：故意注入 2 处类型错误 → `nuxt typecheck` **恰好报出 2 条**，其余 0 → 5 个类型 + 双含义 `ThemeAnimationType` 均为真实强类型
- `nuxt build`（production）+ §9-3 两组、动画类型独立性 5 项：全部通过
- dev：`unimport failed to resolve` 与 `Failed to load source map` 均为 **0**；app-manifest 报错按上游非确定性出现，但不影响页面 200 与功能（见上）
- 全量：lint / typecheck / 129 单测 / build / 四 playground / `npm pack` 全绿

**本附录 commit**：
```
6b72d50 fix(nuxt): 自包含 runtime 声明 + addTypeTemplate 补 ThemeAnimationType 同名类型（值/类型双用法），去掉 addImports 与 internal 转发
```
累计待推送 8 个 commit。
