# Phase 0 / Phase 1 执行汇报

| 项目 | 内容 |
|---|---|
| 日期 | 2026-09-11 |
| 依据 | `docs/requirements.md` v1.2 §4、§7、§8（Phase 0 / Phase 1）、§9-10 |
| 范围 | Phase 0（脚手架）+ Phase 1（core 层）。**未开始 Phase 2a** |
| 基线 | `98183e7 docs: 添加 theme-switch-animation 需求文档` → 本阶段共 11 个 commit（见 §1） |
| 环境 | Node 24.15.0 / pnpm 11.24.0 / git 2.53（与需求文档记录一致） |

**结论**：Phase 0 与 Phase 1 全部完成，lint / typecheck / test（66 个用例）/ build 全绿，`npm pack` 清单符合预期。有 4 项需要你拍板的遗留问题（§4），其中 2 项是需求文档本身的表述与现实不一致；**Phase 2a 的前置条件已满足**（§5）。

---

## 1. 已完成项

每个子项一个 commit，conventional commits 格式。

### Phase 0 —— 脚手架

| # | 子项 | commit | 说明 |
|---|---|---|---|
| 0.1 | pnpm workspace + 根包配置 | `e58e7bf` | `pnpm-workspace.yaml`（`packages/*`、`playgrounds/*`）；根 `package.json` 按 §4 发布清单就位：`name: theme-switch-animation`、`engines { node >=18, pnpm >=9 }`、四个子路径 `exports`（`.` / `./react` / `./vue` / `./nuxt`）、`files: ["dist"]`、`sideEffects: false`、三个 optional peer（react / vue / @nuxt/kit）。另加 `LICENSE`（MIT）、`.gitignore`、README |
| 0.2 | `packages/core` 私有包 | `041eb50` | `@theme-switch-animation/core`，`private: true`，`main/types` 指向 `src/index.ts`（根构建直接从源码打包，不单独发布） |
| 0.3 | ESLint + TypeScript | `de04f2d` | ESLint 10 flat config + typescript-eslint；根 `tsconfig.json` `strict` + `verbatimModuleSyntax` + `isolatedModules`；脚本 `lint` / `typecheck` |
| 0.4 | tsup 构建 | `5a5a6a5` | 单 `dist/`、ESM `.mjs` + `.d.ts` + sourcemap；四个入口对应 exports，**源码尚不存在的入口自动跳过**（适配层逐阶段落地无需改配置）；core 以 `noExternal` 打进各入口，react / vue / @nuxt/kit 保持 external |
| 0.5 | vitest | `df8b102` | 默认 node 环境跑纯逻辑，DOM 用例文件头 `// @vitest-environment jsdom`；脚本 `test` / `test:watch` |
| 0.6 | changesets | `156b2f8` | `@changesets/cli` v3；`access: public`、`baseBranch: main`、私有包不参与版本与 tag；脚本 `changeset` / `version` |
| 0.7 | CI | `bd1a899` | `.github/workflows/ci.yml`：push main / PR 触发，Node 22 与 24 矩阵，`pnpm install --frozen-lockfile` → lint → typecheck → test → build |

### Phase 1 —— core 层（`packages/core/src/`）

| # | 子项 | commit | 文件 | 用例 |
|---|---|---|---|---|
| 1.1 | 类型与默认值 | `1a6219a` | `types.ts` | 5 |
| 1.2 | 5 种动画类型的蒙版几何 | `30702ad` | `masks.ts` | 25 |
| 1.3 | CSS 变量化样式生成 + 注入/清理 | `f61ae15` | `styles.ts` | 12 |
| 1.4 | `startViewTransition` 编排 + 降级 | `31d925d` | `orchestrate.ts` | 15（node）+ 7（jsdom） |
| — | 公开导出面守护 | `31d925d` | `index.ts` | 2 |

对照需求 §7 实现要点：

- **CIRCLE**：`getBoundingClientRect` 取触发元素中心，`Math.hypot` 到视口四角取最大值，终尺寸 `2.1 × maxRadius`；SVG data-URI 实心圆，`mask-size` 从 `0` 长到终值，`mask-position` 同步从触发点移到 `触发点 - 边长/2`，圆心钉住不动。无触发元素时回落到视口中心。
- **LTR / RTL / TTB / BTT**：`linear-gradient(#fff, #fff)` 实心条，起始 4px 细条，`mask-position` 钉在对应边（LTR `0% 0%`、RTL `100% 0%`、TTB `0% 0%`、BTT `0% 100%`），只让 `mask-size` 长到 `100% 100%`。
- **Safari 兼容**：只动 `mask-size` / `mask-position`，不碰 clip-path / WAAPI；`will-change: mask-size, mask-position`；`::view-transition-old/new(root)` 关闭 UA 交叉淡入淡出并把 `mix-blend-mode` 改回 `normal`（UA 默认 `plus-lighter` 在旧截图静止时会把两张图相加成白色）。
- **变量化注入**：动画声明一律 `animation: <name> var(--theme-switch-duration, 400ms) var(--theme-switch-easing, ease-in-out) both;`，两个变量定义在同一份样式表的 `:root`；用户 easing 原样进变量，零字符串拼接（有单测断言动画声明里不出现用户输入）。双 `animation:` 声明：第一遍硬编码 `ease-in-out` 兜底，第二遍引用变量。
- **样式生命周期**：固定 id `theme-switch-animation`，注入前先移除旧节点；转场 `finished` 后 `setTimeout(duration)` 清理，且只清理自己注入的那个节点（快速连点时旧定时器不会误删新样式，有单测覆盖）；回调抛错时立即清理并把错误通过 `finished` 抛出。
- **降级**：`supportsViewTransition(doc)` / `prefersReducedMotion(win)` / `shouldSkipTransition(doc)` 三个可独立测试的谓词；SSR（无 `document`）、无 `startViewTransition`、`prefers-reduced-motion: reduce` 任一命中 → 直接调用 `domUpdate`，状态照常更新。
- **SSR 安全**：core 模块顶层无副作用；在纯 Node 中 `import('dist/index.mjs')` 并调用 `runThemeTransition` 已实测：`animated = false`，`domUpdate` 被调用 1 次。

## 2. 验证结果

```
pnpm install --frozen-lockfile   ✓
pnpm lint                        ✓ (eslint 10)
pnpm typecheck                   ✓ (tsc 5.9.3 --noEmit, strict)
pnpm test                        ✓ 6 files / 66 tests
pnpm build                       ✓ dist/index.mjs 7.5 KB, dist/index.d.ts 9.2 KB, sourcemap
npm pack --dry-run               ✓ 6 files: LICENSE, README.md, package.json, dist/index.{mjs,mjs.map,d.ts}
git status                       ✓ clean
```

验收 §9-10「mask 几何（四角最大距离、终尺寸、四向起始位置/尺寸）全覆盖；TS strict 通过」已满足。

## 3. core 对外 API（供 Phase 2a 起的适配层使用）

```ts
import {
  ThemeAnimationType,            // const 对象 + as const：CIRCLE/LTR/RTL/TTB/BTT → 'circle'/'ltr'/...
  resolveAnimationOptions,       // 填默认值：animationType/darkClassName/duration/easing
  runThemeTransition,            // 编排一次切换
  shouldSkipTransition,          // 降级谓词（适配层可用于决定是否需要 flushSync 等）
  THEME_STORAGE_KEY,             // 'theme-switch-animation'（Phase 2a 非受控持久化用）
  THEME_ANIMATION_STYLE_ID,      // 'theme-switch-animation'
} from '@theme-switch-animation/core'

const { animated, finished } = runThemeTransition({
  domUpdate: () => { /* 适配层在此同步改 DOM：React flushSync / Vue await nextTick() */ },
  options: { animationType, duration, easing },
  trigger: buttonElement,        // CIRCLE 圆心；可为 null
  // doc 缺省取全局 document；SSR 下自动降级
})
```

设计要点：**core 不持有状态、不碰 localStorage、不自己改 class**，这些通过 `domUpdate` 由调用方注入。这样非受控（Phase 2a：适配层在 `domUpdate` 里切 class + 写 localStorage）与受控（Phase 2b：`domUpdate` 里调 `onChange` 并等 MutationObserver）都能复用同一条编排路径，也让 Phase 1 的降级逻辑在两种模式下行为一致。`ThemeAnimationOptions` 已按 §5.1 含 `isDark` / `onChange` 字段（仅类型），模式判定与受控协议留待 2a / 2b 实现。

## 4. 遗留问题（需要你决策或知晓）

### 4.1 需求文档与现实不一致 —— 建议修订文档

1. **`engines.node >= 18` vs 开发工具链最低 Node 22.13**
   §4 / §8 要求 `engines { node: ">=18", pnpm: ">=9" }`，并说明目的是"便于贡献者了解最低环境要求"。但当前主流工具链的硬性要求是：pnpm 11 `>=22.13`、vitest 5 `^22.12 || ^24`、jsdom 30 `^22.22.2 || ^24.15`、eslint 10 `^20.19 || ^22.13 || >=24`。
   **我的处理**：`engines` 严格按需求写（它描述的是发布产物的消费环境，es2020 ESM 在 Node 18 消费者/打包器上没问题）；CI 跑 Node 22 / 24；README 开发段注明"参与开发需 Node >= 22.13"。
   **待你决定**：是接受"消费 >= 18、开发 >= 22.13"的区分并更新文档措辞，还是把 `engines.node` 提到 `>=22`（会影响声明的消费者范围）。不建议为迎合 Node 18 把工具链降到 vitest 2 / eslint 9 / pnpm 9 的旧版本。

2. **§7 四向擦除的"竖条"表述**
   原文："TTB `0% 0%` 竖条、BTT `0% 100%` 竖条"。若 TTB 真用竖条（4px 宽、100% 高）钉在 `0% 0%` 再长到 `100% 100%`，效果是从左向右擦——那是 LTR。从上到下擦必须是**水平细条**（100% 宽、4px 高）钉在顶边。
   **我的处理**：按物理正确几何实现（LTR/RTL 竖条、TTB/BTT 横条），钉扎位置与文档完全一致，单测把四向起始尺寸/位置固化为断言。建议把文档里两处"竖条"改为"横条"。

### 4.2 工程决策（已处理，供知晓）

3. **pnpm 11 供应链信任检查拦截 `chokidar@4.0.3`**
   本机 pnpm 全局配置启用了 `trustPolicy: no-downgrade`，tsup 的依赖 `chokidar@4.0.3`（2024-12 发布，paulmillr 官方仓库）没有 provenance 而更早的 4.0.1 有，触发 `ERR_PNPM_TRUST_DOWNGRADE`。按 pnpm 官方文档（文档示例恰好就是 `chokidar@4.0.3`）在 `pnpm-workspace.yaml` 用 `trustPolicyExclude` **精确排除这一个版本**，信任检查对其他包继续生效；未关闭策略、未改 override。CI 环境 pnpm 默认 `trustPolicy: off`，不受影响。

4. **pnpm 11 默认不执行依赖 build 脚本**
   `esbuild` 的 postinstall 需放行，写在 `pnpm-workspace.yaml` 的 `allowBuilds`（v11 新写法，pnpm 自己写入了占位）。后续若引入其他带 postinstall 的包（如 Playwright 浏览器）需同样放行。

5. **TypeScript 默认装到 7.0.2（native 预览线）**
   `pnpm add typescript` 拿到的是 TS 7；tsup 的 dts 生成与 typescript-eslint 对其支持不稳，改钉到 `^5.9.3`。

6. **changesets v3 的 `init` 是交互式命令**
   非交互环境下无法执行，按 `@changesets/config@4` 的 JSON Schema 手写了 `.changeset/config.json` + `README.md`，`pnpm exec changeset status` 已验证配置可解析。

7. **双 `animation:` 声明的实际兜底范围**
   §2 写"缓动用 `linear()` 时需双 `animation:` 声明降级"。需要说明：通过 `var()` 引用的 timing-function 在解析期总是合法，不支持 `linear()` 的旧引擎会在计算值阶段判定无效并把属性重置为初始值，**不会回落到前一条声明**。因此双声明实际兜底的是"不支持 `var()`"的极旧浏览器；而所有支持 View Transitions 的浏览器（Chrome 111+ / Safari 18+ / Firefox 144+）中，仅 Chrome 111–112 不认 `linear()`，其表现是该次切换退化为 UA 默认交叉淡入淡出，状态仍正确。已按需求写双声明，此处只是把边界说清楚，Phase 5 文档可如实注明。

8. **mask 未加 `-webkit-` 前缀**
   Safari 15.4+ 支持无前缀 `mask-*`，View Transitions 要求 Safari 18+，故未加前缀。若 Phase 4 Playwright WebKit 实测发现问题再补。

### 4.3 范围说明

9. **`./react` / `./vue` / `./nuxt` 子路径当前无产物**
   exports 已按 §4 就位，但 tsup 只构建存在源码的入口，因此现阶段 `npm pack` 中这三个子路径不可解析——这是里程碑拆分的预期状态，各适配层落地后自动补齐；验收 §9-11 在 Phase 5 检查。
10. **非受控状态管理（localStorage / class 切换）与 `controlled-sync.ts`** 按 §8 分别归属 Phase 2a / 2b，core 中未实现、未创建文件。
11. **Playwright e2e** 不在 Phase 0 清单中（§8 Phase 0 只列 tsup / vitest / changesets / CI），未配置；建议随第一个 playground（Phase 2a）一起引入。
12. **未 push**。按指令只做了本地 commit（11 个，均在 `main`），`origin/main` 仍停在 `98183e7`，请确认后自行 push 或告知我推送。

## 5. Phase 2a 前置条件检查

Phase 2a = React 适配 + 非受控模式（基本动画、localStorage / class 管理、flushSync 渲染）。

| 前置条件 | 状态 | 说明 |
|---|---|---|
| core 提供可注入 DOM 更新的编排入口 | ✓ | `runThemeTransition({ domUpdate })`，React 侧在 `domUpdate` 内 `flushSync(() => setState(...))` 即可 |
| 5 种动画类型 + 样式注入可用 | ✓ | `ThemeAnimationType` 全部 5 值；样式注入/清理经 jsdom 验证 |
| 降级路径可用且状态永远正确 | ✓ | SSR / 无 API / reduced-motion 三条路径均有单测；构建产物在 Node 中实测 |
| 非受控持久化的 key 与默认类名 | ✓ | `THEME_STORAGE_KEY = 'theme-switch-animation'`，`darkClassName` 默认 `'dark'`（`resolveAnimationOptions`） |
| 构建管线支持新增入口 | ✓ | 新建 `packages/react/src/index.ts` 即自动进入 `dist/react.mjs` + `dist/react.d.ts`；react 已在 tsup `external` |
| workspace 支持 playground | ✓ | `playgrounds/*` 已在 `pnpm-workspace.yaml` |
| 单测环境支持 DOM | ✓ | jsdom 已就位；React 组件测试需另装 `@testing-library/react` |
| CI 覆盖新包 | ✓ | tsconfig `include: packages/*/src`、vitest `include: packages/*/src/**/*.test.ts`、eslint 全仓 |

**判定：满足，可以开始 Phase 2a。** 开始前建议先处理 §4.1 的两条文档修订（不阻塞开发）。

Phase 2a 需注意：`packages/react/package.json` 里 react 应为 `peerDependencies`（可选）+ `devDependencies`（用于类型与测试）；React 18 与 19 的 `flushSync` 签名一致，但 19 移除了部分弃用 API，playground 选型时确认一下。

## 附：当前文件结构

```
theme-switch-animation/
├── .changeset/            config.json, README.md
├── .github/workflows/     ci.yml
├── docs/                  requirements.md, phase-0-1-report.md（本文）
├── packages/core/
│   ├── package.json       @theme-switch-animation/core（private）
│   └── src/
│       ├── types.ts       ThemeAnimationType / options / defaults / 常量
│       ├── masks.ts       5 种蒙版几何（纯函数）
│       ├── styles.ts      CSS 变量化生成 + 注入/清理
│       ├── orchestrate.ts startViewTransition 编排 + 降级
│       ├── index.ts       公开导出
│       └── *.test.ts      66 个用例（types 5 / masks 25 / styles 12 / orchestrate 22 / index 2）
├── eslint.config.js · tsconfig.json · tsup.config.ts · vitest.config.ts
├── package.json           theme-switch-animation（发布包）
├── pnpm-workspace.yaml    packages/* + playgrounds/*；allowBuilds / trustPolicyExclude
├── LICENSE (MIT) · README.md
```
