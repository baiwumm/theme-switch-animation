# Phase 3 执行汇报

| 项目 | 内容 |
|---|---|
| 日期 | 2026-09-11 |
| 依据 | `docs/requirements.md` v1.4 §5.2 / §5.3 / §5.4、§8（Phase 3）、§9-1 |
| 范围 | Vue 适配层（`useThemeAnimation` composable，双模式）+ Vue playground + §9-1 连点实测。**未开始 Phase 4（Nuxt 模块）** |
| 基线 | `a9cd4d0 docs: phase-2b 报告补充 hydration 修复与验收自动化附录` → 本阶段共 5 个 commit（见 §1） |

**结论**：Phase 3 全部完成。**§9-1 实测通过：两轮连点压测（基线 300ms 间隔 10 击、CPU 4x + 150ms 间隔 10 击加严档）均无状态不同步、无 skipped-transition 报错、最终 class 与 isDark 一致**——`async () => { await nextTick() }` 路线成立，**无需启用 `flush: 'sync'` 备案**。lint / typecheck / 129 个单测 / build / 三 playground 全绿；`dist/vue.mjs` + `vue.d.ts` 正常产出并入发布清单。**Phase 4（Nuxt 模块）前置条件满足**。

---

## 1. 已完成项

| # | 子项 | commit | 说明 |
|---|---|---|---|
| 1 | core：跳过的转场不再视为错误 | `2da4b08` | §9-1 的前置。快速连点时浏览器跳过未完成转场，`finished` 以 AbortError 结算——原实现会把错误抛给调用方造成未捕获 rejection（即"skipped-transition 报错"）。现按结构识别（`name === 'AbortError'` 或消息含 skip/transition；不用 instanceof，jsdom 的 DOMException 不继承全局 Error）吞掉并清理样式，真实错误照抛。2 个新用例 |
| 2 | Vue 适配层 | `1dc15ea` | `packages/vue`：`useThemeAnimation` 返回 `{ triggerRef, toggleTheme, isDark }`（`triggerRef` 避免与 Vue `ref` 冲突，`isDark` 为 `Ref<boolean>`）。非受控：挂载恢复（localStorage key `theme-switch-animation`）+ 回调内改 class / 写 storage；受控：`isDark`+`onChange` 契约与 React 版完全一致（§5.2 判定 + dev 告警，`isDark` 镜像外部来源的 `computed`）。**转场回调 `async () => { …; await nextTick() }`**：浏览器等 Vue DOM 更新完成后截图 |
| 3 | Vue 组件测试 | `53e6b44` | `@vue/test-utils` 2.5 + jsdom，16 个用例：初始读取（无存储/dark/light）、降级点击翻转（class/storage/DOM 同步）、**async 回调时序契约**（回调 Promise 结算前 class 与 Vue DOM 均已更新）、5 种动画样式注入、快速连点交替、受控完整链路（onChange-only、外部写 class 协议、告警两例）、SSR 安全（`renderToString` node 环境，setup 不碰浏览器 API） |
| 4 | Vue playground | `789504c` | Vite 8 + Vue 3.5 + `vue-tsc`：五按钮布局复用（`ThemeButton.vue` SFC + 父级 MutationObserver 指示器 + 防闪烁初始化脚本）；`vue-tsc` typecheck + `vite build`（69 KB）+ dev 冒烟通过 |
| 5 | §9-1 压测脚本 | `a4a8093` | `scripts/cdp-vue-rapid.mjs`：两轮连点（基线 300ms×10、CPU 4x + 150ms×10 加严），检查 window error / console error / unhandled rejection（含 skip/abort 关键词）与四源一致性（localStorage 主题 / html class / 按钮文案 / 指示器），已接入 `pnpm test:acceptance` |

## 2. §9-1 实测结果（Vue Promise 回调路线，硬性验收）

环境：Vue playground production 构建（`vite build` + `vite preview`），无头 Chromium（CDP 驱动），每轮 3 秒内 10 连击（5 按钮轮询）：

| 档位 | window/console 报错 | 状态一致性（storage / class / 按钮 / 指示器） |
|---|---|---|
| 基线（无节流，300ms 间隔） | **0 条** | 一致 ✓ |
| CPU 4x 节流 + 150ms 间隔（加严） | **0 条** | 一致 ✓ |

两轮压测均无 skipped-transition 报错（含 uncaught rejection）、无状态不同步、最终 class 与 `isDark` 一致。结合 core 层新加的 AbortError 容忍（§1-1），**`async () => { await nextTick() }` 路线实测成立，`flush: 'sync'` 备案无需启用**（§8 Phase 3 要求的"若失败再切换"未触发）。

复跑方式：`playgrounds/vue` 下 `pnpm build && npx vite preview --port 5231 --strictPort --host 127.0.0.1`，无头浏览器 `--remote-debugging-port=19222`，然后 `pnpm test:acceptance`（或 `ACCEPTANCE_VUE_URL` 指定地址单跑 `node scripts/cdp-vue-rapid.mjs`）。

**待真机确认**（自动化无法判断视觉）：动画错位与否——请真机跑 `pnpm --filter @theme-switch-animation/playground-vue dev`，在 3 秒内快速连点，观察每次蒙版展开均为当前方向、无错位闪烁。

## 3. 遇到的问题与处理

1. **§9-1 的真正风险在 core 而非 Vue 适配**：连点时浏览器跳过旧转场并让 `finished` 以 AbortError 结算，若库把它当错误上抛，控制台即出现"skipped-transition 报错"（§9-1 明令禁止）。已在 core 编排层吞掉该竞态错误（状态已由回调落地，跳过只影响旧动画视觉），真实错误仍抛出。这不是越界改动——它是 §9-1 的硬性前提，React 版同样受益。
2. **jsdom 的 `DOMException` 不继承全局 `Error`**：`instanceof` 判别在测试环境失效，改为按结构判别（name / message）。两次失败后以原型链探针确认（`instanceof Error === false`）才动手，避免盲改。
3. **模板 ref 类型不匹配**：SFC 的 `:ref` 需要 `VNodeRef`，composable 返回的 `Ref<T | null>` 不能直接绑定。playground 中用函数 ref（`setTrigger` 写回 `triggerRef`）解决；**这说明 composable 的 `triggerRef` 在 `<script setup>` 模板里需要一小段桥接样板**，Phase 5 文档要写清这个用法（不算缺陷，Vue 的 ref 体系本身如此）。
4. **vite preview 默认绑 IPv6 `[::1]`**：CDP / curl 走 IPv4 `127.0.0.1` 时连接失败（症状：服务"在"但 curl 000）。`--host 127.0.0.1` 强制 IPv4 解决；脚本注释与汇报复跑命令已带此参数。
5. SSR 测试写法两处返工：`renderToString` 接 vnode 而非组件定义（`h(ThemeToggle)`）；`expect(asyncFn).not.toThrow()` 不会执行异步体——直接 `await` 后断言。

## 4. 验证结果

```
pnpm install --frozen-lockfile   ✓
pnpm lint                        ✓
pnpm typecheck                   ✓（根 tsconfig 含 packages/vue/src，vue-tsc 用于 playground）
pnpm test                        ✓ 12 files / 129 tests（Vue 新增 16：组件 15 + SSR 1）
pnpm build                       ✓ dist/{index,react,vue}.{mjs,d.ts} + 共享 types chunk
npm pack --dry-run               ✓ 13 files（dist/vue.mjs 12.1 KB、vue.d.ts 1.7 KB 已入清单）
playgrounds/react                ✓ typecheck + vite build
playgrounds/vue                  ✓ vue-tsc typecheck + vite build + dev 冒烟
playgrounds/next                ✓ typecheck
§9-1 压测（§2）                  ✓ 两轮通过
git status                       ✓ clean
```

## 5. Phase 4（Nuxt 模块）前置条件检查

Phase 4 = Nuxt 模块（`/nuxt` 子路径、`addImportsDir` 自动导入含 core 重导出、`@nuxt/kit` optional peer）+ Nuxt playground 接 `@nuxtjs/color-mode` + Vue Promise 回调实测（§9-1 已于本阶段完成）。

| 前置条件 | 状态 | 说明 |
|---|---|---|
| Vue composable 可被 Nuxt 自动导入 | ✓ | `packages/vue` 的 `useThemeAnimation` / `ThemeAnimationType` 均为命名导出；Nuxt 模块按 §6.3 在 `runtime/composables/index.ts` 从 core 重导出类型即可被 `addImportsDir` 扫描 |
| 转场回调路线已验证 | ✓ | §9-1 两轮压测通过（本阶段），Phase 4 只需在 Nuxt/color-mode 受控场景下复测同型压测 |
| 构建管线 | ✓ | 新建 `packages/nuxt/src/index.ts` 即自动进入构建；`@nuxt/kit` 已在 external 与 optional peer。注意 §4 要求 `dist/nuxt-runtime/composables/` 目录产物——tsup 现有 entry 机制需为它加一条入口（或构建后复制），Phase 4 首个任务时处理 |
| 受控协议 × 外部异步系统 | ✓ | §5.4 协议已过 next-themes 实测（Phase 2b）；color-mode 的写 class 行为（`classPrefix`/`classSuffix` 可配）已由受控测试的 `darkClassName` 可配性覆盖 |
| workspace / CI | ✓ | `playgrounds/*` 模式已就位；Nuxt playground 需装 `nuxt` + `@nuxtjs/color-mode`（依赖体量大，首次 install 较慢） |
| 验收脚本基建 | ✓ | CDP 连接库与压测模式可直接复制给 Nuxt playground（`ACCEPTANCE_*` 环境变量已参数化） |

**判定：满足，可以开始 Phase 4。** 需要注意的只有 tsup 的 `nuxt-runtime` 目录产物方案（见上表第 3 行），这是 §4 明确的发布形态要求，落地时先定方案再动工。

## 附：本阶段 commit

```
a4a8093 test: 添加 §9-1 Vue 连点压测脚本（两轮：基线与 CPU 4x 加严档）并接入验收链
789504c feat(playground): 添加 Vue playground（Vite + Vue 3，五按钮布局、防闪烁初始化脚本）
53e6b44 test(vue): 添加 useThemeAnimation 组件测试（初始/翻转/动画路径/受控/告警）与 SSR 安全测试
1dc15ea feat(vue): 添加 useThemeAnimation composable（非受控/受控双模式，async nextTick 转场回调）
2da4b08 fix(core): 被跳过的转场（AbortError/连点竞态）不再作为错误抛出，保障连点场景无未捕获 rejection
```

仍按约定未 push（本阶段 5 个 commit 待你 review 后推送）。
