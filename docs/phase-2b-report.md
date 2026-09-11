# Phase 2b 执行汇报

| 项目 | 内容 |
|---|---|
| 日期 | 2026-09-11 |
| 依据 | `docs/requirements.md` v1.4 §5.2 / §5.4、§6.1、§9-2、§9-7 |
| 范围 | 受控模式（`isDark` + `onChange`）、§5.4 MutationObserver 同步协议（300ms 兜底）、next-themes 联调（提前搭 Next playground）。**未开始 Vue 适配（Phase 3）** |
| 基线 | `9e6eedb docs: 添加 Phase 2a 执行汇报` → 本阶段共 5 个 commit（见 §1） |

**结论**：Phase 2b 全部完成。**§9-7 实测通过：CPU 1x / 4x / 6x / 6x+Slow 3G 四档各 25 次点击，超时（>300ms）0 次，class 翻转 p95 ≈ 24ms、max 64ms**——远低于 300ms 兜底线，按 §5.4 的判定标准，无需切换备选混合模式。§9-2 的连点一致性已自动化验证通过（视觉部分待真机确认）。lint / typecheck / 111 个单测 / build / 双 playground 构建全绿。**Phase 3（Vue 适配）前置条件满足**。

---

## 1. 已完成项

| # | 子项 | commit | 说明 |
|---|---|---|---|
| 0 | 需求文档 v1.4 | `4102787` | §4 peerDependencies 补 `react-dom: ">=18"`（optional），§10 加修订记录，与代码一致 |
| 1 | core：受控同步协议 | `4e9c552` | `packages/core/src/controlled-sync.ts`：`waitForThemeSync({ doc, darkClassName, nextIsDark, timeoutMs })`——MutationObserver 监听 `documentElement` 全部属性、回调内只认 `class` 翻转与 `data-*` 变化（next-themes / color-mode 两种写入形式都覆盖）；class 已是目标态时立即 resolve(true)；300ms（可配）超时 resolve(false) 兜底；无 MutationObserver 环境立即放行不悬挂；超时时 dev 环境输出 `console.warn`（§9-7 的可观测信号）。12 个用例（fake timer 驱动超时路径） |
| 2 | React：受控模式 | `c7bdbba` | `useThemeAnimation`：`isDark` + `onChange` 同时提供 → 受控（点击只调 `onChange(next)`，`domUpdate` 返回 `waitForThemeSync`，**不碰 localStorage、不自行改 class**）；只提供其一 → dev 环境 `console.warn` 并按非受控处理（§5.2，告警在 effect 中做，不刷屏）；`isDark=false` 正确视为"已提供"。新增 7 个受控用例 |
| 3 | Next playground | `136366c` | Next.js 16 App Router + next-themes 0.4.6：`layout.tsx` 挂 `ThemeProvider attribute="class"`（`suppressHydrationWarning`），`theme-switcher.tsx` 按 §6.1 接线（`isDark: resolvedTheme === 'dark'`，`onChange: setTheme`），复用 React playground 的四角 + 中心五按钮布局与样式 |
| 4 | 验收自动化 | `77c17d0` | `scripts/cdp-measure.mjs`（§9-7 超时频率实测）+ `scripts/cdp-consistency.mjs`（§9-2 连点一致性），`pnpm test:acceptance` 一键复跑；驱动无头 Chromium 的 CDP，节流档位与 DevTools 同机制（`Emulation.setCPUThrottlingRate` + `Network.emulateNetworkConditions`） |

受控与非受控在 core 层共用同一条 `runThemeTransition` 路径：两种模式只是向它注入不同的 `domUpdate`（非受控 = 改 class + 写 localStorage + flushSync；受控 = 调 `onChange` + `waitForThemeSync`），降级语义一致。

## 2. 验收实测结果

### §9-7 协议超时频率（自动化实测，Chromium + CDP 节流）

每次点击后测量 `<html>` class 翻转耗时，>300ms 即协议超时兜底会触发（与 dev 环境的 `console.warn` 对应）。每档 25 次点击（5 按钮 × 5 轮，间隔 400ms），Next production build（`next start`）：

| 档位 | 样本 | 超时（>300ms） | p95 | max |
|---|---|---|---|---|
| baseline（无节流） | 25 | **0** | 18ms | 64ms |
| CPU 4x | 25 | **0** | 24ms | 24ms |
| CPU 6x | 25 | **0** | 24ms | 52ms |
| CPU 6x + Slow 3G | 25 | **0** | 23ms | 24ms |

**结论：300ms 兜底在四档下均未触发，余量超过 10 倍，§5.4 备选混合模式无需启用。** Slow 3G 只作用于请求传输，SPA 切换不产生网络请求，故与纯 CPU 节流结果一致（符合预期）。复跑方式：`pnpm test:acceptance`（脚本头注释含启动步骤与 Windows 端口保留区间注意事项）。

### §9-2 连点一致性（自动化验证通过）

- 3 秒内 10 连点、同帧 5 连击两种压测后：localStorage `theme` / `<html>` class / 按钮 isDark 文案**三者一致** ✓
- **视觉部分待真机确认**（无头环境无法判断"蒙版下是目标主题截图"）：请真机跑 `pnpm --filter @theme-switch-animation/playground-next dev`，逐个按钮切换，确认蒙版展开处为新主题、无白闪/旧主题透出。

## 3. 遇到的问题与处理

1. **Windows 端口保留区间吞掉 CDP 端口**：`--remote-debugging-port=9223` 起不来（`bind() 0x271D 拒绝访问`）——该端口落在 Hyper-V/WinNAT 排除区间 9194-9293。换 19222 解决；排查命令与可用端口已写进脚本注释。
2. **`@types/node` latest（22.20.2）依赖无 provenance 的 `undici-types@6.21.0`**：`next build` 自动补装时再次触发 pnpm 信任拦截。未关闭检查——显式安装 `@types/node@^24`（其依赖 `undici-types@7.x` 信任检查通过）绕开，`next build` 不再自动安装。
3. **脚本化文件写入丢失（第 3 次，环境问题，建议关注）**：本阶段 `node -e` 对 `playgrounds/next/package.json` 与根 `package.json` 的两次写入静默丢失（Phase 2a 的 tsconfig.json 已发生过一次，共 3 次；共同特征是 Bash 内联 `node -e` 写盘，而 Write/Edit 工具的写入全部正常）。已全部用 Edit 工具重做并逐一验证。**建议：本仓库后续避免用内联脚本改文件；如再现可排查终端集成/文件同步机制。**
4. **`DomUpdate` 类型放宽**：受控路径的 `domUpdate` 返回 `waitForThemeSync` 的 `Promise<boolean>`，原类型 `Promise<void>` 不收。放宽为 `() => void | Promise<unknown>`（转场回调的返回值本就被浏览器忽略），并在两处把 `Promise.resolve(...)` 规整为 `Promise<void>`。
5. **vitest 的 `vi.stubGlobal` 不被 `restoreAllMocks` 还原**：一个用例 stub 掉 `MutationObserver` 后泄漏到后续用例（症状是它们全走"无 MO → false"分支且只在全文件运行时失败）。afterEach 补 `vi.unstubAllGlobals()`。另：fake timers 下排空 MutationObserver 微任务要用 `vi.advanceTimersByTimeAsync(0)`，真 `setTimeout` 会被 fake 住造成用例挂起。
6. **`next build` 前置**：Playwright e2e（§9-8）仍未配置，按 Phase 2a 的决策随第一个 e2e 需求（Phase 4）引入；本阶段的 CDP 脚本不依赖 Playwright。

## 4. 验证结果

```
pnpm install --frozen-lockfile   ✓
pnpm lint                        ✓（含 scripts/*.mjs 的 Node 全局声明）
pnpm typecheck                   ✓
pnpm test                        ✓ 10 files / 111 tests（新增 19：协议 12 + React 受控 7）
pnpm build                       ✓ dist/index.* + dist/react.*
playgrounds/react                ✓ typecheck + vite build
playgrounds/next                 ✓ typecheck + next build（SSR 静态预渲染通过）+ dev/start 冒烟 200
pnpm test:acceptance             ✓ §9-2 一致性 + §9-7 四档实测（结果见 §2）
git status                       ✓ clean
```

## 5. Phase 3（Vue 适配）前置条件检查

Phase 3 = Vue composable（`async () => { …; await nextTick() }` 路线，`flush: 'sync'` 备案）+ Vue playground。

| 前置条件 | 状态 | 说明 |
|---|---|---|
| core 协议框架无关 | ✓ | `waitForThemeSync` / `runThemeTransition({ domUpdate })` 无任何 React 依赖；`DomUpdate` 允许返回 Promise，`async () => { onChange(next); await nextTick() }` 可直接作为 domUpdate 注入（浏览器等 Promise 结算后截图） |
| 受控/非受控双模式先例 | ✓ | React 版已给出完整的模式判定（§5.2）、告警、挂载守卫实现，Vue 版按同一语义翻译即可 |
| 构建管线 | ✓ | 新建 `packages/vue/src/index.ts` 即自动进入构建；`vue` 已在 tsup external；无需 Vue 插件（适配层是纯 .ts composable） |
| workspace/playground | ✓ | `playgrounds/*` 已就位；Vue playground 需自装 `@vitejs/plugin-vue` |
| 测试基建 | ⚠ 需补 | Vue 组件测试需装 `@vue/test-utils`（或 `@testing-library/vue`）；core 协议层测试已就绪可直接复用 |

**判定：满足，可以开始 Phase 3。** 注意事项：Vue 版返回值按 §5.3 用 `triggerRef`（避免与 Vue `ref` 概念混淆）；§9-1 的"Vue Promise 回调 3 秒 10 连击"实测按 §8 留在 Phase 4 与 Nuxt 联调一起做。

## 附：本阶段 commit

```
77c17d0 test: 添加 CDP 验收脚本（§9-7 超时频率实测 + §9-2 连点一致性）
136366c feat(playground): 添加 Next playground（App Router + next-themes 受控联调，复用 5 动画按钮布局）
c7bdbba feat(react): 支持受控模式（isDark+onChange、§5.2 契约告警、经 §5.4 协议等待外部 DOM 写入）
4e9c552 feat(core): 添加受控模式同步协议 waitForThemeSync（MutationObserver 监听 class/data-* + 300ms 超时兜底）及单测
4102787 docs: 需求文档 v1.4——peerDependencies 补充 react-dom 可选 peer
```

仍按约定未 push（`origin/main` 在 `98183e7`，累计待推送 24 个 commit）。
