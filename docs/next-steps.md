# 发布前待办（2026-09-14 记录）

背景：`551bdde` 提交了转场可靠性修复与状态同步增强（单测 178 → 196 全绿，typecheck / lint / build
全过）。手动浏览器实测覆盖了 React / Vue / Next 三个 playground；**Nuxt playground 本轮未手动
实测**——它验证的是 Nuxt 模块自动导入 + SSR 水合链路，实机覆盖完全依赖待办 1 的两个验收脚本
（cdp-nuxt93 / cdp-nuxt-animtypes），所以待办 1 对 Nuxt 尤其重要。本文档记录发布前剩余事项，
按优先级排序，做完一项勾一项。

- [ ] 1. 跑正式验收 `pnpm test:acceptance`
- [ ] 2. Safari / 真机验证
- [ ] 3. 文档更新（README + docs 站 + playground 文案）
- [ ] 4. 发布（changeset 已就位）

---

## 1. 跑正式验收 `pnpm test:acceptance`

上一轮验证是手动浏览器实测（点按钮、读状态、看控制台），仓库自带的 7 个 CDP 实机验收脚本
还没正式跑过。它是仓库定义的发布前标准流程：

```bash
pnpm test:acceptance
# 依次执行：cdp-consistency → cdp-darkcycle → cdp-hydration → cdp-measure
#           → cdp-vue-rapid → cdp-nuxt93 → cdp-nuxt-animtypes
```

- 各脚本有自己的前置（build 对应 playground + 起 preview server），写在 `scripts/cdp-*.mjs`
  的头部注释里（例如 cdp-vue-rapid 要求 `playgrounds/vue` 先 `pnpm build` 再
  `npx vite preview --port 5224`），跑之前先看一眼。
- 通过标准：全部 PASS、无 window error / console error / unhandled rejection。
- **Nuxt 是本轮唯一的实机覆盖盲区**：cdp-nuxt93（SSR 水合 + 存储 dark 加载）与
  cdp-nuxt-animtypes（Nuxt 模块自动导入的 13 种动画类型）就是它的全部实机验证，
  务必跑通；如失败，排查 `packages/nuxt` 模块与 `dist/nuxt-runtime` 产物
  （本轮 build 链路改过 copy-nuxt-runtime.mjs 的共享块识别）。
- 特别关注 vue-rapid：连点场景本轮在 core 加了 `ready` / `updateCallbackDone` 的静默 catch，
  实机验收可以再次确认无 unhandledrejection。

## 2. Safari / 真机验证

docs 里多处标注"需真机验证"的事项，无头环境（dpr=1、桌面内核）覆盖不了：

- **Safari（重点）**：CIRCLE_REVERT 收起方向走"新层反向蒙版（洞）+ 静止蒙版盒子"，
  依赖 `@property` 注册半径动画（`--theme-switch-radius`，见 `packages/core/src/styles.ts`
  的 `buildHoleAnimationCSS`）。Safari 16.4+ 支持 `@property`，但
  「view-transition 伪元素上动画注册自定义属性 + `mask-image: radial-gradient(var(...))`」
  这个组合需要真机确认能否逐帧推进。需求 §2 只约束了 clip-path / WAAPI 不可用，
  未覆盖此路线。
- **Windows 分数缩放（125% / 150%）真机**：历史 hairline 抖动问题
  （docs/phase-6-report.md 附录二/附录六），无头 dpr=1 复现不了。收起方向已改为
  "蒙版盒子静止、只有注册半径在动"来规避合成器像素对齐，确认实际观感。
- **iOS Safari**：13 种动画类型顺带过一遍。

## 3. 文档更新（README + docs 站 + playground 文案）

`551bdde` 的用户可见变更还没进任何面向用户的文档：

- **新 API**：
  - `useThemeAnimation` 返回值新增 `finished`（React：`result.finished`，最近一次切换
    动画的结束 Promise，可用于动画期间禁用按钮；Vue：`finished` 是 shallowRef）。
  - 新公开导出 `SKIP_TRANSITION`（`domUpdate` 返回它 → 立即跳过转场）与
    `observeThemeClass`（以 `<html>` 暗色类名为事实源的观察器，含 storage 跨标签同步）。
  - `runThemeTransition` 新增 `nextIsDark` 参数（受控模式下 CIRCLE_REVERT 方向感知用）。
- **行为变更**：
  - 非受控模式多实例同步：同页多个实例的 `isDark` 以 html class 为事实源镜像，
    其它标签页经 storage 事件同步（此前各自为政）。
  - 受控模式超时：外部系统 300ms 未同步时跳过动画直切（不再播"旧→旧"空转）。
  - iframe / 多文档场景样式清理按 document 记账。
- **位置**：`README.md`（目前很简短）、`apps/docs` 文档站、playgrounds 页面说明段落
  （React / Vue playground 的说明文字写着"互相不会失步"——现在实例间是真实同步
  `isDark` 了，文案可以顺手更新成更准确的描述；`playgrounds/nuxt` 的
  `app.vue` / `components/ThemeButton.vue` 同样有页面说明文案要过一遍）。
- 文档站工具链独立（`apps/docs` 用 Biome，不进根 eslint），改完在那边单独 lint。

## 4. 发布

- changeset 已就位：`.changeset/reliability-and-sync.md`（minor），内容即 `551bdde` 的
  变更摘要，发布前如有补充直接改它。
- 流程（见 `.changeset/README.md`）：`pnpm changeset version` → `pnpm build` →
  `changeset publish`。只有根包 `theme-switch-animation` 会发布。
- 前置：1–3 完成后再走。
