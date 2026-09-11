# Phase 2a 执行汇报

| 项目 | 内容 |
|---|---|
| 日期 | 2026-09-11 |
| 依据 | `docs/requirements.md` v1.3 §5.3（非受控契约）、§6.1、§7、§8（Phase 2a） |
| 范围 | React 适配层 + 非受控模式（5 种动画、localStorage / class 管理、flushSync）。**不含受控协议（Phase 2b）** |
| 基线 | `3526095 docs: 添加 Phase 0/1 执行汇报` → 本阶段共 6 个 commit（见 §1） |

**结论**：Phase 2a 全部完成。lint / typecheck / test（92 个用例，新增 26 个 React 用例）/ build 全绿；`dist/react.mjs` 正常产出且 `'use client'` 指令保留；React playground（Vite）构建与 dev server 冒烟通过。过程中发现并修复了一个连点取反时机的真实缺陷（§3.1）。**Phase 2b 前置条件已满足**（§5）。另有 4 个过程问题与处理方式见 §3，其中 1 个（tsconfig 意外回退）原因未查明，值得留意。

---

## 1. 已完成项

| # | 子项 | commit | 说明 |
|---|---|---|---|
| 0 | 需求文档 v1.3（上轮决策落地） | `9cc4033` | §4 engines 区分消费环境（`node >= 18`）/ 开发环境（Node >= 22.13，README 注明）；§7 删除"横条/竖条"，改为"蒙版条沿对应方向从起始边缘生长"，钉扎位置与 core 实现逐项核对一致；§4 core 文件树补 `uncontrolled.ts` |
| 1 | core：非受控状态助手 | `b594518` | `packages/core/src/uncontrolled.ts`：`readStoredTheme` / `writeStoredTheme`（key `theme-switch-animation`，值为 `'dark' \| 'light'`，存储不可用时静默）、`applyThemeClass` / `hasThemeClass` / `syncThemeOnMount`（挂载时把 class 对齐到存储值）。放在 core 而非 react 包，Phase 3 Vue 适配层直接复用；12 个用例 |
| 2 | React 适配层 | `b458fd6` | `packages/react`（`@theme-switch-animation/react`，private）：`useThemeAnimation` 返回 `{ ref, toggleTheme, isDark }`，`ref` 泛型默认 `HTMLButtonElement`；模块顶部 `'use client'`；重导出 `ThemeAnimationType`、`THEME_STORAGE_KEY` 与类型 |
| 3 | 构建产物修复 | `ef6562d` | 见 §3.2 / §3.3：保留 `'use client'`、dts 内联 core 类型、根包补 `react-dom` 可选 peer |
| 4 | React 组件测试 | `50d9878` | `@testing-library/react` 16 + jsdom，26 个用例：初始读取（无存储 / dark / light）、点击翻转与 class / localStorage 断言（真实降级路径）、flushSync 时序契约、5 种动画类型样式注入、快速连点、自定义 `darkClassName`、同页多实例；另有 node 环境 SSR 测试（`renderToString` 不触碰浏览器 API） |
| 5 | React playground | `441b6b1` | Vite 8 + React 19：五个按钮 = 五个独立 hook 实例，摆在四角 + 中心（CIRCLE 圆心即按钮中心，可验证点击位置跟随）；全局主题指示器用 MutationObserver 监听 `<html>` class；`index.html` 内置首帧前同步 class 的防闪烁脚本；`pnpm --filter @theme-switch-animation/playground-react dev` 一键构建库并启动 |

## 2. hook 行为与需求对照（§5.3 / §7）

- **非受控**：挂载时读 localStorage 恢复 `isDark` 并对齐 class（渲染阶段不碰 `window` / `document` / `localStorage`，SSR 安全）；`toggleTheme` 写 localStorage + 在转场回调内同步 toggle `darkClassName` ✓
- **flushSync**：转场回调内先改 class、再 `flushSync(() => setIsDark(next))`，浏览器截图前 React 已同步提交。测试以"回调执行前 DOM 仍是旧主题、回调同步执行后 class 与按钮文案同时变化"固化该契约 ✓
- **降级**：jsdom（无 `startViewTransition`）下的点击即真实降级形态，状态照常更新 ✓；reduced-motion / SSR 路径由 core 单测覆盖
- **快速连点 / 多实例**：`next` 在**转场回调内**从 `<html>` class 取反（读取时刻 = 变更时刻），连点交替正确、同页多个触发器不失步（详见 §3.1）

## 3. 遇到的问题与处理

### 3.1 连点取反时机缺陷（已修复，`50d9878`）

初版实现在**点击时**读 `<html>` class 计算目标状态，但 class 的翻转发生在**转场回调里**：快速连点时第二次点击读到的还是未翻转的 class，两次都算出"变暗"。组件测试抓住该缺陷后，把取反挪进回调内（先读后改，原子性由同步代码保证）。副作用是多实例场景也天然一致；代价是各实例的 `isDark` 文案只在自己的点击/挂载时刷新（playground 用 MutationObserver 指示器补齐全局视图）。

### 3.2 tsup 剥掉 `'use client'` 指令（已修复，`ef6562d`）

tsup 默认开启的 rollup 二次摇树阶段会剥掉模块级指令并告警 `Module level directives cause errors when bundled`。改为 `treeshake: false`（esbuild 自身摇树仍生效，且包声明 `sideEffects: false`，最终摇树由消费方打包器完成），指令保留在 `dist/react.mjs` 首行，已验证。

### 3.3 dts 指向私有 workspace 包（已修复，`ef6562d`）

`react.d.ts` 起初生成 `export … from '@theme-switch-animation/core'`——消费者装不到这个私有包。根因有二：tsup 的 `dts.resolve` 数组是 `resolveOnly` 过滤器，被内联包**内部的相对导入**（`core/index.ts → './types'`）不匹配正则就被留成外部引用（tsup `dist/rollup.js` 的 `tsResolvePlugin`）；修为 `resolve: [/^@theme-switch-animation\//, /^\.\.?\//]`。内联后 rollup 会把两个入口共享的类型拆成公共 chunk `dist/types-<hash>.d.ts`（rollup-plugin-dts 标准产物，`./x.js` 说明符在 TS 各解析模式下都映射到 `.d.ts`），保留单配置 + 共享 chunk 方案（数组多配置并行执行会与 `clean: true` 竞争）。已用模拟消费者（相对 dist 导入 + strict tsc）验证：`dist/react` 的类型、泛型 ref、`ThemeAnimationType` 常量全部可解析，且 `isDark` 字段按预期不可传入。

### 3.4 其他

- **根包 peer 补充**：`flushSync` 来自 `react-dom`，需求 §4 的 peer 清单只有 `react`。已在根包 peerDependencies 补 `react-dom: ">=18"`（optional），tsup external 原本已包含。这是对 §4 清单的必要增补，建议下轮文档修订时同步。
- **playground 构建解析不到 react-dom**：`dist/react.mjs` 的 `import 'react-dom'` 从包真实位置（仓库根）向上解析，根 node_modules 没有 react-dom 时 Vite 构建失败。已在根 devDependencies 显式安装 `react@^19.3.0` / `react-dom@^19.3.0`（monorepo 常规做法，顺带对齐了此前 auto-install-peer 装入的 19.2.8）。
- **测试里 fake VT 的时序噪音**：`autoRun` 用微任务执行转场回调会落在 act 作用域外，触发 8 条 act 告警且断言时序不稳定；改为在 `startViewTransition` 内同步执行回调（对回调时序契约的模拟等价），告警清零。
- **tsconfig 意外回退（原因未查明）**：Phase 2a 中途曾用脚本给 `tsconfig.json` 写入 `jsx` / `paths`，随后发现两次写入都从磁盘消失（同会话有一次工具调用被中断，可能与恢复机制有关，无法确证）。已重写补上。不影响已提交产物的正确性——构建修复真正依赖的是 `tsup.config.ts`（paths 经验证与 dts 内联无关）。

## 4. 验证结果

```
pnpm install --frozen-lockfile   ✓
pnpm lint                        ✓
pnpm typecheck                   ✓（含 packages/react/*.tsx，jsx: react-jsx）
pnpm test                        ✓ 9 files / 92 tests（core 66 + react 24 + ssr 2）
pnpm build                       ✓ dist/index.* + dist/react.{mjs,d.ts} + 共享 types chunk
playgrounds/react typecheck      ✓
playgrounds/react build          ✓（vite build，226 KB）
vite dev 冒烟                    ✓ index 200；theme-switch-animation/react 解析到 dist/react.mjs
npm pack --dry-run               ✓ 10 files（LICENSE + README + package.json + dist 7 个文件）
git status                       ✓ clean
```

`engines.node >= 18` 消费环境 / Node >= 22.13 开发环境的措辞已按决策写入需求文档 v1.3 与 README。

**需要真机手动验证**（无头环境无法产生真实动画，请在本机执行）：

```bash
pnpm install && pnpm build
pnpm --filter @theme-switch-animation/playground-react dev
```

1. 五个按钮逐一点击：观察 5 种动画方向与形状（Chrome/Edge 111+ 或 Safari 18+）；
2. CIRCLE：分别点四角与中心按钮，确认扩散圆心跟随点击位置；
3. 刷新页面：主题保持（localStorage），且首帧不闪烁（防闪烁脚本生效）；
4. DevTools → Rendering → Emulate `prefers-reduced-motion: reduce`：点击应无动画但状态正确翻转；
5. 快速连点任意按钮：动画无错位、最终状态与指示器一致。

## 5. Phase 2b 前置条件检查

Phase 2b = 受控模式：MutationObserver 同步协议（§5.4）+ next-themes 联调。

| 前置条件 | 状态 | 说明 |
|---|---|---|
| core 编排支持受控路径 | ✓ | `runThemeTransition({ domUpdate })` 的回调允许返回 Promise（View Transitions 会等它完成），受控模式下 `domUpdate = () => { onChange(next); return waitForClassFlip() }` 即可接入 §5.4 协议 |
| 降级路径对受控模式成立 | ✓ | 降级时 `domUpdate` 照常执行（`onChange` 被调用、无动画），单测已覆盖"异步 domUpdate 被等待" |
| 模式判定（§5.2）接入点 | ✓ | 类型层已预留：`UseThemeAnimationOptions = Omit<ThemeAnimationOptions, 'isDark' \| 'onChange'>`，2b 恢复字段 + 实现判定（两者齐备→受控；只给其一→非受控 + dev `console.warn`） |
| `controlled-sync.ts` 位置 | ✓ | 按 §4 文件树落在 core（MutationObserver 观察类名 / data-* 翻转 + 300ms 兜底），React / Vue 共用 |
| 测试基建 | ✓ | RTL + jsdom + fake VT 时序模拟已在 2a 落地；2b 需补 fake `MutationObserver`（jsdom 原生支持）与 next-themes 联调用例 |
| next-themes 联调载体 | — | 按 §8 归属 Phase 2b/4（Next.js playground）。2b 若要先跑联调，需要搭 Next playground；也可以先在 RTL 层用双状态源模拟 next-themes 的异步写 class 行为，把真机联调留到 Phase 4 |

**判定：满足，可以开始 Phase 2b。** 唯一需要先定的事项：next-themes 联调放在 2b 内（提前搭 Next playground）还是按 §8 留到 Phase 4——不影响协议本身的实现与单测。

## 附：本阶段 commit

```
441b6b1 feat(playground): 添加 React playground（Vite，5 种动画按钮、CIRCLE 点击位置演示、无闪烁初始化脚本）
50d9878 test(react): 添加 useThemeAnimation 组件测试；修复连点取反时机（next 改为转场回调内计算）
ef6562d build: 修复 react 入口产物——保留 'use client' 指令、dts 内联 core 类型、补 react-dom 可选 peer
b458fd6 feat(react): 添加 React 适配层 useThemeAnimation（非受控模式、flushSync 同步渲染、'use client'）
b594518 feat(core): 添加非受控状态助手（localStorage 读写、darkClassName 同步、挂载恢复）及单测
9cc4033 docs: 需求文档 v1.3——澄清 engines 消费/开发环境区分，修正 §7 四向蒙版条措辞，补充 uncontrolled.ts
```

仍按约定未 push（`origin/main` 在 `98183e7`，累计待推送 18 个 commit）。
