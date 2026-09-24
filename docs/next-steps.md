# 发布前待办（2026-09-14 记录 · 2026-09-22 更新进度）

背景：`551bdde` 提交了转场可靠性修复与状态同步增强（单测 178 → 196 全绿，typecheck / lint / build
全过）。手动浏览器实测覆盖了 React / Vue / Next 三个 playground；**Nuxt playground 本轮未手动
实测**——它验证的是 Nuxt 模块自动导入 + SSR 水合链路，实机覆盖完全依赖待办 1 的两个验收脚本
（cdp-nuxt93 / cdp-nuxt-animtypes），所以待办 1 对 Nuxt 尤其重要。本文档记录发布前剩余事项，
按优先级排序，做完一项勾一项。

> 2026-09-21 更新：0.1.0 已发布（待办 1–4 全部完成，见下），待办 2 的真机手动清单仍需你的设备。
> 本轮 v0.2（`direction` 选项 + BLINDS / SCAN / QR_GRID 三类型 + 移除四向类型，破坏性）的剩余事项
> 集中在 §5。
> 2026-09-22 追加：0.2.0 已发布（§5 全绿）；本轮**文档站 UI 层迁到 beUI**（只动 `apps/docs`，
> 发布产物不变、未记 changeset）的判断、踩坑与剩余事项集中在 §6。
> 2026-09-23 追加：新增 `RIPPLE`（§7）与角度族 `CLOCK_SWEEP` / `FAN`（§8），13 → 15 种，
> 六+七笔提交都在本地**未 push、未发版**。后续还想加类型请看 `docs/animation-roadmap.md`
> ——候选池、优先级与排序理由、明确不做清单、以及"做完一个验证一个、不行就整个撤回"的撤回面。
> 2026-09-24 追加：`CURTAIN` 落地（§9）后 **0.3.0 已发布**（tag 流水线第二次走通，npm `latest = 0.3.0`、
> provenance 实测挂上）。同期间 `SPIRAL` / `SEEDS` / `COMB` 三个候选都实现过又整体撤回，动画类型冻结在 16 种。
> 接着是 `reverse` 选项 PR1（§10）。**push 与打 tag 都会触发外部动作**（CI、文档站部署、npm 审批闸门），
> 由需求方本人执行。

- [x] 1. 跑正式验收 `pnpm test:acceptance`（2026-09-14 完成，7/7 PASS + §9-3 组二补跑 PASS）
- [x] 2. Safari / 真机验证（2026-09-14 本机可自动化部分已全绿，见 §2；**macOS Safari + iOS 真机**
      无设备，转交用户手动清单（§2 末尾），PC 端矩阵 WebKit/Chrome/Edge/Firefox 四引擎已全绿；
      **手动清单本身仍未执行**，且 v0.2 新增项见 §5）
- [x] 3. 文档更新（2026-09-14 完成：README 重写为完整文档 + docs 站 5 处 + playground 四个全部
      更新，验证全过；顺带修复 observeThemeClass 四入口导出缺失，详见 §3）
- [x] 4. 发布（2026-09-15 完成：`changeset version` → `changeset publish`，npm 上 `0.1.0`
      发布于 2026-09-15T01:55:56Z，tag `theme-switch-animation@0.1.0` 已在远端，`main` 与
      `origin/main` 同步；步骤清单与发布记录见 `docs/release-0.1.0-smoke-report.md` 附录 B——
      该报告第 7 步"给本项打勾"当时漏做，本次补上）

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

**2026-09-14 验收结果：7/7 全部 PASS**（Node 24.15，无头 Chrome CDP 19222，三个 playground
生产构建 + preview：Next 5222 / Vue 5224 / Nuxt 3000）：

| 脚本 | 结果 |
| --- | --- |
| cdp-consistency（§9-2 连点一致性 + 挂载断言） | PASS：3 秒 10 连点 + 同帧 5 连击后，存储 / html class / 按钮文案三者一致 |
| cdp-darkcycle（dark 存储加载 + 受控切回） | PASS |
| cdp-hydration（§9-5，dark / light 两种初始存储） | PASS：hydration 错误 0 个 |
| cdp-measure（§9-7 受控同步超时频率） | PASS：四档位（基线 / CPU 4x / CPU 6x / CPU 6x + Slow 3G）各 25 样本，>300ms 超时 0 次，p95 ≤ 45ms |
| cdp-vue-rapid（§9-1 硬性连点压测） | PASS：基线 300ms + CPU 4x 150ms 两轮，报错 0 条、状态一致 |
| cdp-nuxt93（§9-3 组一，默认类名 dark） | PASS：preference / html class / 按钮文案三源一致翻转 |
| cdp-nuxt-animtypes（§9 动画类型独立性） | PASS：13/13 按钮各自注入匹配的 @keyframes |

- §9-3 组二（可配置类名）`pnpm test:acceptance` 本身不覆盖，已手动补跑同样 PASS：
  `ACCEPTANCE_DARK_CLASS_SUFFIX='-mode' pnpm build` + 重启 3000 服务后，以
  `ACCEPTANCE_DARK_CLASS='dark-mode' node scripts/cdp-nuxt93.mjs` 运行，三源一致翻转
  （与 phase-4 报告的组二结论相同）。
- 首跑发现并修复一处**脚本过时**（非功能缺陷）：`cdp-vue-rapid.mjs` 的挂载断言仍硬编码
  5 个按钮，Phase 6 已把 playground 按钮矩阵扩到 13 个导致误报"页面未正常挂载"。已按
  cdp-nuxt-animtypes 的模式改为从 DOM 读取按钮数（非零即挂载成功），连击轮流覆盖全部实例，
  后续新增动画类型无需再改本脚本。
- 特别关注的 vue-rapid 场景（core 新加的 `ready` / `updateCallbackDone` 静默 catch）：
  两轮压测 window / console / unhandledrejection 报错 0 条，实机确认无泄漏。
- 实操提示（Windows）：vite preview 默认只绑 IPv6 `::1`，验收脚本访问 `127.0.0.1`，
  需 `npx vite preview --port 5224 --strictPort --host 127.0.0.1`。

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
- **iOS Safari**：12 种动画类型顺带过一遍（v0.2 起含 BLINDS / SCAN / QR_GRID，重点看 `QR_GRID` 的
  `mask-composite: intersect` 是否命中，见 §5-4）。

### 2026-09-14 本机自动化验证结果（Windows 11，双 1080p @100%，RTX 5060；无 Safari / iOS 设备）

**A. WebKit 内核（Playwright 1.63 `webkit-2359`，UA = Safari 26.6）——待办 2 的核心风险项，全绿**

脚本：`node scripts/verify-engine.mjs --engine=webkit`（verify-webkit.mjs 已泛化为 verify-engine.mjs，前置见脚本头注释；Playwright 装在 `%TEMP%/pw-webkit`，
未加入仓库依赖，避免给所有开发者增加 ~100MB 浏览器下载；若日后按需求 §278 建 e2e 矩阵再正式引入）。

| 判据 | 结果 |
| --- | --- |
| 支持面 | `startViewTransition` / `getAnimations({subtree})` / `CSS.registerProperty` / `mask-image: radial-gradient(calc(var()))` 全部可用 |
| **CIRCLE_REVERT 收起 = @property 半径逐帧推进** | 暂停后按毫秒 seek，从 `::view-transition-new(root)` 计算样式直接读出洞半径：**1041.9 → 1021.4 → 956.8 → 846.7 → 696.1 → 521.0 → 345.8 → 195.3 → 85.1 → 20.6 → 0.0 px**（11 点单调收缩，t=375ms 的 521px 与 ease-in-out 理论值 ~520px 吻合）；截图亮度 19 → 251 全程推进。WebKit 把 `var(--theme-switch-radius)` 解析成了具体长度，**注册属性在 VT 伪元素上被逐帧插值**——若未注册会在 50% 处一次性翻转、var() 失效则蒙版恒为初始值，两种失败模式都被排除 |
| 13 种动画类型（light→dark） | 全部启动、捕获到 `theme-switch-*` 蒙版动画、seek 0/中点/终点三帧亮度呈 251→中间→19 推进、start↔mid 像素差异 44–93%、`finished` 结算 `ok` |
| 报错 | console.error / pageerror 0 条 |

注意：Playwright WebKit ≠ 真机 Safari（需求 §278 已声明差异）。它回答的是**引擎级**问题（VT 伪元素上的 `@property` 插值、
mask 动画、13 类几何），Apple 硅 GPU 合成、iOS 触控坐标与滚动等仍需真机（见下方清单）。

**B. 分数 dpr 回归（Chrome 无头，`Emulation.setDeviceMetricsOverride`）——全绿**

| 场景 | 结果 |
| --- | --- |
| jitter-lab live 收起 dsf=1.25 / 1.5、扩散 dsf=1.5 | 各 49–50 帧，**0 帧线条候选** |
| jitter-lab seek（clean 纯色平面）dsf=1.25 / 1.5 | 33 帧 0 候选，孤立像素 ≈1 ppm |
| **圆心拟合 dsf=1.5**（附录六核心指标） | Δcx σ **0.001px** / Δcy σ **0.000px**（附录六修复后 dsf=1 为 0.011 / 0.001，修复前 0.329 / 0.180）——分数 dpr 没有把圆心推动 |
| 真实 Vue playground（13 按钮产物）连点 CIRCLE_REVERT | dsf=1.25 20 次（10 次收起）+ dsf=1.5 12 次（6 次收起）**0 异常帧** |

**C. 有头真机渲染（真窗口 + RTX 5060 D3D11 + vsync 呈现路径）——附录六表中"headful 待补"项已补，全绿**

用 `--force-device-scale-factor` 复刻 Windows 125% / 150% 缩放下浏览器的真实光栅与呈现路径（页面
`devicePixelRatio` 确认为 1.25 / 1.5），系统缩放本身未改动（会影响整个桌面会话，且附录五已证明该类抖动与
OS 缩放无关、只与浏览器 dsf 有关）。

| 场景 | 结果 |
| --- | --- |
| lab live 收起 @1.25 | 49 帧 / 42.5 fps，0 候选 |
| **React playground（附录六反馈的原场景）连点 CIRCLE_REVERT @1.25** | 30 次（15 次收起）：单帧亮度跳变 max ≤15、无随机横带、无闪屏；被标"异常"的仅是横带检测器压线（13px/26 vs 阈值 25）—— **每次都在同一帧序号、同一强度，无头模式跑出一模一样的值（13px/28）**，是圆弧扫过 duration/easing chips 行的固定行剖面特征，不是撕裂（人工看帧：边缘锐利，无带） |
| React playground @1.5 | 12 次（6 次收起）0 异常（同一特征为 12px/23，低于阈值——随 dpr 变化，再次说明是内容栅格而非伪影） |

**结论**：附录六"20% 概率撕裂/横带"的原场景，有头真机共 **42 次切换 / 21 次收起，0 次**（按 20% 期望约 4 次）。
"新层反向蒙版 + 静止盒子"方案在真实呈现路径上也成立。

**本轮顺手修的工具问题**：① `scripts/jitter-lab/run.mjs` 站点模式（`--click`）此前用 `readyState==='complete'`
判就绪，在 about:blank 上就为真，导致真实 playground 还没挂载就报"匹配按钮 0 个"，改为轮询触发按钮出现；
② 新增 `--chrome-arg=<flag>`（可重复）透传，用于有头模式 `--force-device-scale-factor`；③ Git Bash 下
`--page=/index.html` 会被 MSYS 转成 `C:/Program Files/Git/index.html`，跑站点模式要加 `MSYS_NO_PATHCONV=1`
（此时 `--out` 也要写 Windows 绝对路径）；④ 横带检测阈值（bandDev>25）是按 lab 页调的，真实 playground 的
chips 行在 dsf=1.25 下会压线误报——判读时看"是否每次同帧同值"，随机帧才是撕裂。

**D. PC 端浏览器引擎矩阵（verify-engine.mjs，2026-09-14 追加）——四引擎全绿**

把 verify-webkit.mjs 泛化为 `scripts/verify-engine.mjs`（`--engine=webkit|firefox|chromium`，chromium 配合
`--channel=chrome / msedge` 驱动本机真实安装的浏览器；判据与上表 A 相同）。同一套判据跑四个引擎：

| 引擎（版本） | 收起 @property 半径 | 13 种动画类型 | 报错 |
| --- | --- | --- | --- |
| Playwright WebKit（Safari 26.6 内核） | 计算样式半径 1041.9→0.0px 逐帧单调插值，截图亮度 19→251 连续推进 | 13/13 推进 + 结算 ok | 0 |
| 真实 Chrome 152（channel=chrome） | 同上全绿 | 13/13 | 0 |
| 真实 Edge 153（channel=msedge） | 同上全绿 | 13/13 | 0 |
| Playwright Firefox 155 | CSS 层全绿（见下）+ 视频取证全绿（见 E） | 13/13 | 0 |

**Firefox 155 有个工具陷阱，单独说明**：Playwright 的 `page.screenshot()` 在 Firefox 上（无头/有头均）
不合成 `::view-transition` 伪元素层——截图拍到的是已切换主题的实时 DOM，亮度恒为终态，verify-engine
的截图亮度判据会**误报**。但 CSS 层判据不受影响：`getAnimations` 能捕获伪元素上的蒙版动画（seek 模式），
从 `::view-transition-new(root)` 计算样式读出的洞半径 **1041.9→0.0px 逐帧单调插值（14 点，数值与
Chrome/WebKit 完全一致）**——属性注册、var() 解析、伪元素动画三件事都成立。

**E. Firefox 合成器输出取证（verify-firefox-video.mjs，2026-09-14）——全绿**

CSS 计算样式只能证明"动画在跑、值在变"，不能证明"屏幕上真的画了出来"（Firefox 截图管道已失效，需要独立
的视觉证据）。用 Playwright `recordVideo`（screencast，捕获合成器输出）录像，再用 Playwright 自带的精简
ffmpeg（无 fps 滤镜，全帧导出）抽帧统计：

- **A 自由播放**：收起方向中间态帧 12 个互异取值、扩散 14 个——合成器在动画期间真的绘制了蒙版中间态
  （若 Firefox 不画 VT 伪元素，只会看到旧态→新态一次性跳变，即仅 2 个取值）。
- **B 暂停 + 逐档 seek**（帧序确定，规避 screencast 录制帧局部乱序的管道伪影）：收起亮度档位段
  54→255 单调、**圆拟合半径 696.1→610.2→521→431.7→345.8→266.2→195.3px 单调收缩**——其中 521px
  与 WebKit/Chrome 从计算样式读出的 t=375ms 理论值逐点吻合，两个引擎、两种独立取证手段交叉验证一致；
  扩散 203→15 单调、半径 266→696px 单调扩张。
- 工具备注（复跑时少踩坑）：① 录制 webm 的帧序存在局部乱序（帧内容正确、趋势完整、相邻帧错位），
  自由播放只判"中间态存在性"，单调性必须走 B 的确定性帧序；② Playwright ffmpeg 是精简构建
  （仅 crop/scale/trim 等，无 fps 滤镜），直接全帧导出即可；③ Firefox 截图判据失效是 Playwright
  管道限制（Chromium 与 WebKit 无此问题），非 Firefox 不画转场——B 的视频证据反证了这一点。

### 剩余手动清单（需你的设备，预计 15 分钟）

准备：在 Mac 上 `pnpm i && pnpm build && cd playgrounds/vue && pnpm build && npx vite preview --host --port 5224`，
iPhone 与 Mac 同一局域网访问 `http://<mac-ip>:5224/`（或直接把 `playgrounds/vue/dist` 丢到任意静态托管）。

**macOS Safari 18+（重点）**
1. 点 CIRCLE_REVERT 两次：切到暗色应是暗色圆从按钮**扩散**；切回亮色应是暗色圆**收起进按钮**，
   全程平滑约 750ms。失败形态：瞬间切换（`@property` 失效）或前半段不动、50% 处一跳（属性未注册、离散插值）。
2. 12 个按钮各点一次：每个都有自己的形状/方向动画，没有"全部播同一个圆"（v0.2 起按钮矩阵由 13
   改为 12，新增 BLINDS / SCAN / QR_GRID 三卡，见 §5 补测项）。
3. 3 秒内在不同按钮上连点 10 次：结束后 `<html>` class、按钮文案（🌙/☀️）、`localStorage['theme-switch-animation']`
   三者一致；Web Inspector 控制台无红色报错、无 unhandled rejection。
4. 切 duration 1000ms + easing linear 再点一次 CIRCLE_REVERT 收起：确认 `var()` 缓动生效（匀速，非先慢后快）。
5. 系统设置 → 辅助功能 → 减弱动态效果 开启：点击应直接切换、状态仍正确。
6. 若手边有 Safari < 18（如 macOS 13/14 未升级）：应降级为直接切换，无报错。

**iOS Safari 18+**
7. 重复第 1–3 步；额外确认圆心跟随点击位置（页面滚动到中部再点，圆心仍在按钮上）。
8. 横竖屏各来一次收起，观察边缘是否有锯齿/线条（Apple GPU 合成路径与桌面不同）。

**Windows 真机 125% / 150%（可选，本机已用 forced dsf 覆盖，此项只为最后一公里的肉眼观感）**
9. 系统缩放调到 125%，Chrome / Edge 打开 React playground，连点 CIRCLE_REVERT 收起 ~20 次，
   看有没有"电视故障式闪一下 + 横带"（附录六原症状，期望 0 次）；150% 再来一遍。

## 3. 文档更新（README + docs 站 + playground 文案）——2026-09-14 完成

`551bdde` 的用户可见变更全部落进面向用户的文档：

- **README.md**：从 27 行简介重写为完整文档——安装、各框架快速开始（React 非受控含 `finished`
  用法示例 / Next 受控接线 / Vue 含 shallowRef 说明 / Nuxt 模块注册）、options 与返回值 API 表、
  底层导出（`runThemeTransition` 的 `SKIP_TRANSITION` / `nextIsDark`、`observeThemeClass`）、
  行为契约（降级 / 受控 300ms 超时 / iframe / Vue 转场路线）。
- **apps/docs 文档站**（5 处）：hero 副标题 + site.ts SEO description 补"多实例与跨标签页状态
  自动同步"；features 新增"多实例同步"卡（5 卡改 `lg:grid-cols-5`），受控卡补 300ms 直切；
  quick-start 四个框架代码块更新（React 加 `finished`、Next/Nuxt 注释补新语义、Vue 点出
  shallowRef、Nuxt 列全自动导入清单）；FAQ 受控答案补超时语义、新增"多按钮会同步吗"条目、
  Firefox 条目更新为已实测（155 全绿，替换掉"Playwright Firefox 未启用"的过时说法）。
- **playgrounds**（四个全部）：React/Vue 说明段落由"互相不会失步"改为"库内 observeThemeClass
  自动镜像 + storage 跨标签同步"，两处全局指示器改用库导出的 `observeThemeClass`（原手写
  MutationObserver）；Next/Nuxt 受控说明与验收提示补 300ms 直切语义；Vue/Nuxt ThemeButton 的
  "字面量冻结"注释校准为动态 computed 后的准确表述。
- **验证**：根 eslint / tsc / 196 单测 / pnpm build 全过；docs 站 next build 过；react / vue /
  next / nuxt 四个 playground build（含 vue-tsc）全过。
- **存量问题（不属本次范围，另行处理）**：`apps/docs` 的 `pnpm lint`（Biome）自始跑不通——
  `biome.json` 配了 `vcs.useIgnoreFile: true` 但该目录下没有 ignore 文件（报 internalError），
  且全站代码风格与 biome 格式化规则（lineWidth 80 等）不符（39 项存量 format/lint）。本次
  改动经 before/after 诊断 diff 确认零新增。修复需决策（补 .gitignore + 全站 format 或关
  formatter），留待单独处理。
- **顺带的实质修复**（`6588d12`）：`observeThemeClass` 此前只在 core 导出，react/vue 包 import
  了却未转发，Nuxt 用户也拿不到（vue.mjs 复制进 nuxt-runtime 时被 tree-shake 掉）——四入口
  对齐 + nuxt composables 重导出 + `copy-nuxt-runtime.mjs` 支持多个共享类型块（rollup 新拆出
  `uncontrolled-<hash>` 块打破了"恰好 1 个"不变量）并滤掉 `.js';` 结尾的 chunk 转发行。
  `nuxi prepare` 实测自动导入列表已含 `SKIP_TRANSITION` / `observeThemeClass`。

## 4. 发布

- changeset 已就位：`.changeset/reliability-and-sync.md`（minor），内容即 `551bdde` 的
  变更摘要，发布前如有补充直接改它。
- 流程（见 `.changeset/README.md`）：`pnpm changeset version` → `pnpm build` →
  `changeset publish`。只有根包 `theme-switch-animation` 会发布。
- 前置：1–3 完成后再走。
- **2026-09-15 已按此流程发布 0.1.0**（步骤与结果见 `docs/release-0.1.0-smoke-report.md` 附录 B）。

## 5. v0.2 待办（2026-09-21 记录）

变更范围：新增 `direction` / `slatWidth` 选项与 `BLINDS` / `SCAN` / `QR_GRID` 三种属性驱动类型；
**破坏性**移除 `ThemeAnimationType.LTR / RTL / TTB / BTT` 与 `DirectionalAnimationType`、
`BAR_MASK_IMAGE` / `BAR_START_PX` / `getDirectionalMaskGeometry` / `isDirectionalAnimationType`。
需求文档 v1.6（`docs/requirements.md` §10）与 README「从 0.1.x 升级（0.2.0 破坏性变更）」已记录迁移写法。

- [x] 1. 开发与文档同步（2026-09-21）：core（types / masks / styles / orchestrate）+ react / vue /
      nuxt 四入口导出 `ThemeAnimationDirection`；文档站画廊删四向卡、三卡各带独立 direction 选择、
      BLINDS 卡带叶宽档位（32 / 72 / 128px）；四个 playground 同步类型清单与 direction / slatWidth
      选择（触发按钮外裹 `.switch-card`，控件与触发按钮同级）；
      README 新增「动画类型」表与升级节；需求文档 v1.6；changeset `.changeset/three-scan-types.md`。
      验证：根 eslint / tsc / 208 单测 / `pnpm build` / docs `next build` 与四个 playground typecheck 全过。
- [x] 2. 无头 Chrome CDP 实测 12 组（3 类型 × 4 方向）：注入 CSS 的渐变角、平铺尺寸、
      `@supports (mask-composite: intersect)` 逐组核对 + 截图确认观感（QR_GRID 方块格子生长、
      BLINDS 竖叶揭开、SCAN 硬边带前缘光束）；方向按钮不嵌套、点方向不触发切换、三卡状态互不影响。
- [x] 3. **重跑 `pnpm test:acceptance`（2026-09-21 完成，7/7 PASS）**：无头 Chrome 19222，三个
      playground 生产构建 + preview（Next `next start` 5222 / Vue `vite preview --host 127.0.0.1` 5224 /
      Nuxt `.output/server/index.mjs`）。

      | 脚本 | 结果 |
      | --- | --- |
      | cdp-consistency（§9-2） | PASS：10 连点 + 同帧 5 连击后存储 / html class / 按钮文案三者一致 |
      | cdp-darkcycle | PASS：dark 存储挂载与受控切回正向断言 |
      | cdp-hydration（§9-5） | PASS：dark / light 两种初始存储下 hydration 错误 0 |
      | cdp-measure（§9-7） | PASS：四档位各 25 样本，>300ms 超时 0 次，p95 16 / 20 / 24 / 24ms（max 25ms） |
      | cdp-vue-rapid（§9-1） | PASS：挂载断言读到 **12 个** `.switch-button`（矩阵已从 13 变 12），基线 + CPU 4x 两轮报错 0、状态一致 |
      | cdp-nuxt93（§9-3 组一） | PASS：preference / html class / 按钮文案三源一致翻转 |
      | cdp-nuxt-animtypes（§9 类型独立性） | PASS：**12 个按钮**各自播放声明的类型，含 `theme-switch-blinds` / `-scan` / `-qr-grid` 三个新 keyframes 名 |

      实操注意：本机 3000 端口被另一项目的 Nest 服务占用（`better-admin/apps/nest`），Nuxt 产物改用
      `PORT=3100 node .output/server/index.mjs` 起、以 `ACCEPTANCE_NUXT_URL=http://127.0.0.1:3100/`
      跑这两个脚本（脚本本身支持该环境变量，无需改代码）；`pnpm test:acceptance` 的串联命令走默认
      3000，端口被占时会误测到别的进程，需注意。
      另：本轮 BLINDS 卡的 `slatWidth` 档位已实测生效——32 / 72 / 128px 分别产出
      `mask-size: 32px 100%` / `72px 100%` / `128px 100%`，软边 `-9 / -20 / -20px`
      （`min(20, round(w × 0.28))` 公式一致），文档站画廊两行控件无横向溢出。
- [ ] 4. **真机补测（与 §2 手动清单一起做）**：
      - **`QR_GRID` 的 `@supports (mask-composite: intersect)` 在 macOS Safari / iOS Safari / Firefox
        上是否命中**——命中才是方块格子，未命中落推进轴单层条带（观感同百叶窗，状态仍正确）。这是本轮
        唯一"引擎差异会改变观感"的点；jsdom 单测只断言了 CSS 生成分支，覆盖不到真实引擎的命中情况。
      - `BLINDS` / `SCAN` / `QR_GRID` 各切一次四个 direction，确认注册属性
        `--theme-switch-reveal` 在 VT 伪元素上逐帧插值（机制同 CIRCLE_REVERT 收起，WebKit 路线见 §2 A）。
      - 软边观感判读：方块/叶片软边 = 尺寸 × `BLINDS_FEATHER_RATIO`(0.28) 封顶 20px，QR_GRID 格距
        `QR_GRID_CELL_PX` = 64 → 约 18px。真机若觉得方块偏糊，调低该比例（一处常量，三类型共用）。
- [x] 5. 文档站上线（2026-09-22 完成）：push `main` 触发自动部署，线上首页已核实显示「12 种动画」
      （`curl https://theme-switch-animation.baiwumm.com`）。README 首页截图 `assets/screen.jpg`
      已在部署前重出（`8fa1beb`，1910×911 亮色，hero 文案「12 种形状 / 试玩 12 种动画」）。
- [x] 6. 发布 0.2.0（2026-09-22 完成，**首次走 tag 触发流水线，全链路绿**）：
      - 前置（一次性、人工，已完成）：① npmjs.com → 包页 → Settings → Trusted Publisher 登记
        `baiwumm/theme-switch-animation` + `release.yml`；② GitHub Settings → Environments → `npm`
        → Required reviewers 加上自己；③ `release.yml` 先合进 main 再打 tag。
      - 执行序列：`pnpm changeset version`（0.1.0 → 0.2.0，CHANGELOG 落 0.2.0 段）→ 本地门禁
        （lint / typecheck / 208 单测 / build / `verify:package` 18 文件）→ `3266164` 提交并推 main
        → `git tag v0.2.0 && git push origin v0.2.0` → Release run `35675176224`（4m18s，13 步全 ✓）。
      - 实测结论：**环境审批闸门真的会拦**——run 进入 `waiting` 等待 `npm` 环境复核，
        `can_admins_bypass: true` 并没有把管理员自动放行（此前评估里的担心不成立）；
        审批后 `npm publish --provenance` 免密成功，`npm audit signatures` 报
        "1 package has a verified attestation"，证明 Trusted Publisher 生效。
      - 发布后核验：npm `latest = 0.2.0`；GitHub Release `v0.2.0` 已建（0 assets，正文走 generate-notes）；
        干净安装冒烟通过——core 导出 12 个类型值与 `ThemeAnimationDirection` 四值、
        `direction`/`slatWidth` 透传与非法值回落（`nope`/`9999` → `ltr`/`72`）正确，
        `/react` `/vue` 产物含 `ThemeAnimationDirection` 与 `qr-grid`，`/nuxt` runtime 自动导入含该常量。
      - 变更点（保留备查）：不再手动 `changeset publish`——装的 `@changesets/cli@3.0.2` 全树无 provenance
        支持，走不了 Trusted Publishing，且它会另打一个 `theme-switch-animation@x.y.z` tag 与 `v*`
        约定冲突；职责边界已写进 `.changeset/README.md`。
      - 破坏性变更在 0.x 阶段按 changesets 语义落 minor，CHANGELOG 保留"移除四向类型 + 迁移写法"叙述。

## 6. 文档站 UI 层迁到 beUI（2026-09-22 记录）

本轮只动 `apps/docs`（外加根 `.gitignore` 一行），**npm 发布产物逐字节不变**（根包 `files: ['dist']`，
`@theme-switch-animation/docs` 是 `private: true`）。changeset 走的是 patch（`.changeset/beui-docs-homepage.md`），
代价已知情：下次 `pnpm changeset version` 会切出一个 tarball 内容与 0.2.0 相同的 0.2.1，只为在 CHANGELOG 里
留下门面改版的记录。`@changesets/cli@3.0.2` 全树没有 `skip release` 这种"留记录不涨版本"的取值（已核实），
所以做不到两全。

提交清单（全部本地，未 push）：`9fe09a8` biome vcs.root + 清 @aceternity registry →
`8093782` beUI 迁移 + 代码高亮 → `77537b3` 滚动条 → `3c6c101` 清磁盘垃圾 + ignore `.wrangler/`。

落地的判断与踩过的坑（下次再动首页 UI 先看这里）：

- 组件源来自 beUI 的 shadcn registry（`curl https://beui.dev/r/{slug}` 拿 files+deps），手工落文件而非
  跑 `npx shadcn add`——零新依赖，且避免 CLI 改 `components.json` / 覆盖 `lib/utils.ts`。
  已装：`bouncy-accordion`（FAQ）、`tabs`（框架切换）、`button` 的 `base`+`stateful`（CTA / 复制 / 顶栏）、
  `text-reveal`（hero 标题与副标题）、`animated-badge`（眉标与卡片标签）。
- **beUI 组件一律保持上游默认样式**，不为贴合旧的毛玻璃观感做 className 覆写（中途覆写过一轮，已撤）。
- 亮色 `--card` 由 `oklch(1 0 0)` 改为 `oklch(0.97 0 0)`：beUI 的实色 `bg-card` 表面需要 card 与
  background 有分离度（beui.dev 自己取 99%/97%）。这条 token 连带影响首页所有 `bg-card/70`、`bg-card/80`
  元素（眉标、gallery 预设 pill、代码窗），由纯白转浅灰。
- **motion 组件的 ref 只在自身挂载那一刻转发一次**：`ref={mounted ? ref : undefined}` 这种延迟传法在
  beUI `Button` 上会让库永远拿不到触发元素，动画回落到视口中心（原生 `<button>` 无此问题）。
  验证起收点最快的探针：点一下后读库注入的 `<style id="theme-switch-animation">` 里的 `mask-position`。
- 控件位置不要塞 `AnimatedBadge`（它渲染 `motion.span`，丢点击/键盘语义）；beUI `radio` 的选项是
  `h-5 w-5` 圆圈 + `text-sm`，放不进 gallery 卡内 10px 等宽字参数行。参数行的"发虚"在实色
  `bg-card` + `border-border` 这一层解决。
- 滚动条：Chrome 121+ 一旦设了非 `auto` 的 `scrollbar-color`，会整套忽略 `::-webkit-scrollbar` 自绘，
  所以标准属性包在 `@supports not selector(::-webkit-scrollbar)` 里只给 Firefox。保住自绘才保住
  「滚动条被 View Transitions 快照捕获、跟蒙版一起动」这个既有设计（见 `app/layout.tsx` 注释）。
- **liquid-glass-react 已评估并否决**（做过一次性 spike 后整体撤回）：`LiquidGlass` 返回一个 Fragment 的
  5 个兄弟节点，靠 `inset: 50%` + `translate(-50%,-50%)` 定位，百分比参照包含块 → 放进 CSS Grid 直接散架
  （内容浮到相邻卡、露出整块黑色面板），加堆叠容器也没救回来。另有三条独立风险：README 自陈位移仅
  Chromium 可见、不处理 `prefers-reduced-motion`、1.1.1 自 2025-06-11 未发版且 registry 无仓库链接。
  首页继续用手写 `.glass-card`，这个包不必重复评估。
- 仓库整洁性盘点结论：纳管文件里没有可删的（0 孤立源文件 / 0 未使用依赖 / 0 未引用资源 / 文档无死链）；
  清掉的是两个磁盘垃圾 `playgrounds/nuxt/3001/`（nuxi 把端口当工程根跑出来的嵌套产物）与
  `apps/docs/.wrangler/`。`assets/logo/*`（品牌母版，仅 phase-5 报告提及）与 `apps/docs/components.json`
  （留着给以后 `npx shadcn add @beui/xxx` 用）判定保留。

剩余事项：

- [ ] 真机视觉验收（首页改版幅度大：顶栏胶囊 + 滚动高亮 + npm 入口、hero 文案精简、FAQ 换弹簧手风琴、
      代码块语法高亮、细滚动条）。预览：`cd apps/docs && pnpm exec next dev -p 5230`。
- [x] README 门面截图已重出（`bf6277c`，1910×911 亮色，与 `8fa1beb` 同取景；本轮改从静态产物拍，
      不再带 Next dev 角标）。若 hero 文案还要改，这张得再重出一次。
- [x] push `main`（2026-09-22 完成，`78cc21d..eaa2e3d` 共 7 笔）：CI run `35706947299` **success**（44s）；
      文档站自动部署已生效——线上首页命中四个新版标记（`可在卡内切换方向`、`叶宽与方向可调`、
      `四个入口，同一套 API。`、`View Transitions API · MIT`），三个旧版特征（`切换右上角主题也可以`、
      `完整示例见`、旧 hero 文案）均为 0。**发包未发生**：没推 `v*` tag，npm `latest` 仍是 `0.2.0`
      （dist-tags 接口核实）。注意 `Theme switching, cinematic` 在线上 HTML 里搜不到属正常——
      TextReveal 按词切成 span；`已复制` 与 Vue 样本代码不在 HTML 里也分别因为是 success 态、非激活 Tab。
- [x] 补了一条 patch changeset（`.changeset/beui-docs-homepage.md`）：文档站首页改版的叙事进 CHANGELOG，代价见本节开头——`files: ["dist"]` 下产物逐字节不变，只是版本号与变更记录多一条。

---

## 7. 新增 RIPPLE 水滴涟漪（2026-09-23 记录）

需求方提"想加一个类似水滴波纹涟漪的效果"，先要方案不动代码；定调"先做看下效果，不行再撤回"，效果通过后补齐其余文档面。

### 本轮判断

- **技术红线先说清**：View Transition 期间真实页面是冻结的，唯一能动的东西是 `::view-transition-*` 伪元素上的 CSS 动画。所以"涟漪"只能是**环形蒙版揭示**，不是真的水面波动位移——`feDisplacementMap` 折射位移做不了，JS 驱动的 overlay 粒子也做不了（转场前插进页面的装饰元素还会被拍进旧截图）。接受这条，剩下全是现成能力。
- **零新机制成立**：涟漪的数学表达就是一个 `radial-gradient`，stop 位置引用注册属性——`styles.ts` 的洞式蒙版（`buildHoleAnimationCSS`）早就在用"圆心写进渐变串 + 蒙版盒子静止 + 只有注册属性在动"这套骨架。结果 `styles.ts` 一行未改，涟漪的 spec 直接复用 `RevealMaskSpec` 与 `buildRevealAnimationCSS`。
- **兼容面零扩张**：与 BLINDS / SCAN 同样依赖 `@property`；未注册的引擎取 `to` 值即直切，状态仍正确。
- **选项面按最小方案**：只开 `waveWidth` 一个选项，余波圈数与衰减系数固化为导出常量（沿 `SCAN_BAND_*` / `QR_GRID_CELL_PX` 先例，不做选项膨胀）。
- **两步走的取舍**："不行再撤回"决定了先只落 core + 画廊、门面数字原样，效果通过后再补 README / 需求文档 / 文档站文案 / 四个 playground / changeset——撤回时白改成本最高的就是这批文档面。

### 实测结果

| 探针 | 结果 |
| --- | --- |
| 波源圆心 vs 按钮中心（读注入 `<style>` 的 `circle at X Y`） | 逐位一致（`32, 14015.81`） |
| 环带在真实 Chromium 是否渲染成立（冻结半径截图，非转场态） | 成立：实心水面 + 三圈明暗相间环带清晰可辨 |
| 起始帧（负 stop 单调化行为） | 整屏旧主题，中心只剩直径约 90px 的极淡水纹，无提前漏出的新主题 |
| 末帧覆盖 | 由几何断言锁死 `to − waveWidth > maxRadius`，不需要像素验证 |
| 根 test / lint / tsc / build | 220 例通过（新增 10）/ 0 error / 0 error / dist 含 ripple |
| 文档站 `tsc --noEmit` + react / vue / next playground `typecheck` | 全通过 |

**测量环境的一条新坑**：`::view-transition-*` 伪元素只在转场存活那几百毫秒存在，把库生成的 CSS 注进 `<style>` 再截图等于什么都没拍到。有效做法是从 `dist` import `getRippleRevealSpec`，把 `var(--theme-switch-reveal)` 冻结成具体 px 挂到一个 `position:fixed` 纯色 div 上——一次验到表达式合法性、stop 单调化行为与覆盖半径。另外 browser-use 面板 0×0 时，`evaluate_script` 里 `await requestAnimationFrame` 会让整个工具调用 15s 超时（不是返回假值），去掉等帧改 `setTimeout` 就通。

### 候选盘点（下次别重复推）

- **`CLOCK_SWEEP` + `IRIS`（建议下一轮）**：一次 `<angle>` 注册属性 + `conic-gradient` / `repeating-conic-gradient` 机制买两个类型，补的是"现有 13 种全轴对齐、没有旋转维度"这个结构性空缺。**→ 已于 §8 落地，其中 IRIS 定名改为 `FAN`。**
- **`DISSOLVE` 沙化溶解**：`feTurbulence` 噪声 α × 渐变进度，靠 QR_GRID 已验证的 `mask-composite: intersect`；差异化最强，但开工前得先解决噪声图随视口拉伸导致颗粒变粗。
- **不做**：3D 翻页 / 折叠——要放弃 mask 改动画 `::view-transition-group` 的 transform，直接破需求文档 §1"技术路线仅用 mask 以保 Safari 兼容"，且 `masks.ts` 已记录 Safari 忽略伪元素上的 WAAPI 与 clip-path；文字描边书写揭示——越界，且蒙版尺寸随视口变化会失真。
- **不作为新类型**：边角擦入 / 对角展开，观感接近 SCAN 的参数变体，要做应作为 `origin` 选项。

### 待办

- [x] core 实现（`types` / `masks` / `orchestrate` / `index` 导出）+ 10 例单测
- [x] 文档站画廊第 13 张卡 + 卡内波长档位 10 / 18 / 34px
- [x] README 数量与两张表、需求文档 §10 v1.7、文档站 hero / features / `site.ts`、四个 playground 的类型清单与 `waveWidth` 控件
- [x] changeset `minor`（本轮 dist 产物真实变化，不属"纯文档站轮次不记"的情形）
- [x] 门面截图 `assets/screen.jpg` 按既有规格重出（hero "12 种"→"13 种" 触发）
- [ ] 真机视觉验收：RIPPLE 卡在 Chrome / Safari / Firefox 的实际观感；波长三档 + duration 1000ms 慢放下余波是否糊成一条边；末帧四角是否干净
- [ ] Safari / Firefox 真机确认 `radial-gradient` 双位置 stop 语法与负偏移单调化行为——与 BLINDS / SCAN 同面，预期无新增风险，但尚未在真机跑过

---

## 8. 新增 CLOCK_SWEEP + FAN 角度族（2026-09-23 记录）

§7 候选盘点里"建议下一轮"的那笔，本轮就做掉了。节奏同涟漪：先 core + 画廊看效果 → 效果通过 → 改名 → 补门面。

### 本轮判断

- **探针先行**：写实现之前先用一次性 headless Chrome 验三个前提（conic / repeating-conic 作为 mask 是否被接受、`@property <angle>` 是否真插值、末帧是否整平面实心）。结论全部成立，于是"conic 只覆盖角度不覆盖面积"这个便利成了选它补旋转维度的主要工程理由——不需要 CIRCLE 家族那套终半径系数。
- **注册属性必须分名**：`@property` 的 syntax 一经注册不可改，`<angle>` 不能复用 `<length>` 的 `REVEAL_VAR`，故新增 `SWEEP_VAR`。连带 `buildRevealAnimationCSS` 第一次泛化（px / `<length>` 不再写死，改由 spec 的 `varName` / `unit` 决定）；px 族输出逐字节不变，由既有单测锁住。
- **FAN 的叶片是硬边，且这是被迫的**：软尾会在每个 repeating 周期末留下渐变淡出，末帧必留一条永不闭合的缝，违反覆盖约束。`bladeCount` 限整数同理。
- **命名 IRIS → FAN**：实现出来是"楔形扇叶从各自起始边旋开"（风车感），不是相机光圈的"中央孔径收缩"——后者要半径维度，conic 表达不了。需求方拍板改名，`bladeCount` 保留。
- **旋转方向有意不做**：options 里"仅某类型生效"的局部参数已占 5 / 9，再加第 6 个（`sweepDirection`）性价比低且没有真实场景差异。真要加的优先级：① 让方向跟随 `toDark`（复用 `CIRCLE_REVERT` 已有编排、零新参数）；② 复用 `direction` 的 `ltr`/`rtl`；③ 新选项（最差）。需求方结论：**先保持现状，后面需要再加上**。

### 实测结果

| 探针 | 结果 |
| --- | --- |
| conic / repeating-conic 作为 `mask-image` | 被接受；扇形与叶片边界是笔直射线，无灰边 |
| `@property <angle>` 是否真逐帧插值 | 是。paused + 负 delay seek 25% / 75% → computed `93deg` / `279deg`（= 372 × 0.25 / 0.75） |
| 末帧覆盖（`to = 372deg`） | 整平面实心、四角无残留 |
| **库真实 CSS** 的 `calc(var(--sweep) - 12deg)` | 逐帧求值成立：93° 时 computed 出 `81deg`，末帧实心段止于 `360deg` |
| 根 test / lint / tsc / build / verify-package | 236 例通过（新增 16）/ 0 / 0 / 产物含 FAN 与两个新函数 / §9-11 通过 |
| 文档站 `tsc` + `next build`；四个 playground typecheck | 全通过 |

第四行是补做的：第一批手写探针用的是硬编码角度，覆盖不到"注册属性参与 stop 计算"这一层，所以实现完再喂一遍 `dist` 真实生成的 CSS 复验。

### 待办

- [x] core 实现（types / masks / styles 泛化 / orchestrate / index 导出）+ 16 例单测
- [x] 文档站画廊第 14–15 张卡（FAN 卡带扇叶数 6 / 8 / 12 档位）
- [x] IRIS → FAN 改名（45 处标识符 + 中文措辞逐处校，源码里唯一残留的 `IRIS` 是命名理由注释）
- [x] README / 需求文档 v1.8 / 文档站 hero·features·SEO / 四个 playground / changeset / 门面截图
- [ ] 真机视觉验收：`CLOCK_SWEEP` 的 12° 前缘软尾在 750ms 下看不看得见、`FAN` 三档扇叶末帧是否无缝
- [ ] Safari / Firefox 真机确认 `conic-gradient` + `@property <angle>`：版本面理论上与 `<length>` 一致（Safari 16.4+ / Firefox 128+），但 conic 这层没在真机跑过，不支持时退化为直切、状态仍正确
- [x] ~~旋转方向（顺 / 逆）按三个方案留着，需要时再开~~ —— **由 `reverse` 选项吸收（2026-09-24）**：`CLOCK_SWEEP` 的 `reverse: true` 在数学上就是逆时针扫开（补集扇形 `[θ,360]` 的边界随 θ 从 360→0 逆时针回退），所以不再单开顺/逆参数。设计见 `docs/reverse-option-design.md` §3 末与 §4。

---

## 9. 新增 CURTAIN 双开门 + README 计数方式改革（2026-09-23 记录）

`docs/animation-roadmap.md` 的 P0-1 落地，节奏同前两批（先 core + 画廊拿结论 → 验证通过 → 补门面）。

### 本轮判断

- **候选池开始兑现，排序判据有效**：roadmap 把 CURTAIN 排 P0-1 的理由是"最不可能失败，先用它把节奏跑顺"。结果它落进现成的 px 族分发器，`orchestrate.ts` 与 `styles.ts` **零改动**，只加了守卫里一个 `||`、分发里一个 `if`——比文档里预估的还便宜。
- **README 不再写死类型数量（需求方批准）**：特性清单与 options 表改成"分族 + 指向下方类型表"，首段枚举加"等"字。动机是三轮下来"每加一个类型要改五处数字"的固定成本。文档站 hero 仍保留数字（那是门面卖点），所以 hero 一改门面截图照旧要重出。
- **一处重复只登记不动**：`masks.ts` 的私有函数 `qrCenterGradient(90, f)` 返回的渐变串与 `getCurtainRevealSpec` 逐字符相同。合并要重命名私有函数，属本轮范围外，已写进 §10 修订记录第 5 条等排期。

### 实测结果

| 探针（headless Chrome 冻结进度截图） | 结果 |
| --- | --- |
| 中缝有没有可见接缝 | **无**。r=640 时实心段精确落在 320→960，带内均匀无暗线 |
| 两侧对称 / 末帧覆盖 | 两条 24px 软边等宽对称；末帧整平面实心 |
| 起始帧 | 中缝透出一道约 ±24px 的光——判为幕布观感的加分项，不是缺陷 |
| 根 test / lint / tsc / build | 246 例通过（新增 10）/ 0 / 0 / 产物含 CURTAIN |

### 待办

- [x] core 实现 + 10 例单测 + 画廊第 16 张卡
- [x] README 类型表与家族枚举 / 需求文档 v1.9 / 文档站文案 / 四个 playground / changeset / 门面截图
- [ ] **分数缩放 dpr 一档仍未验**：125% / 150% 下中缝与软边会不会出现 1px 级亮暗线——这是 roadmap P0-1 唯一遗留的待验点
- [x] ~~下一批按 roadmap 顺序是 P0-2 `SPIRAL`~~ —— **动画类型扩展到此冻结（2026-09-24 需求方决定）**。`SPIRAL` / `SEEDS` / `COMB` 三个都实现过又整体撤回，不再加新类型，停在 16 种；候选池剩下的 P2-2 `LOGO_MASK` 也不做。后续判据见 `docs/animation-roadmap.md` §1 四条约束（第 4 条是这三轮换来的）。
- [ ] **`reverse` 选项 PR1–PR3 已落地**（v1.10 / v1.11 / v1.12，待发版）：三态 `boolean | 'auto'`，接入 `CIRCLE` / `FAN` / `RIPPLE` / `CLOCK_SWEEP` / `CURTAIN` 五个；`BLINDS`/`SCAN`/`QR_GRID` 有意不开（`direction` 已占那根轴），形状族 6 个经实测做不到无副作用。`CIRCLE_REVERT` 已标 deprecated，PR4 才删。设计定稿在 `docs/reverse-option-design.md`
- [ ] 待排期的小重构：`qrCenterGradient` 与 `getCurtainRevealSpec` 合并成一个中性命名的对称渐变构造器

---

## 10. 0.3.0 发布 + reverse PR1（2026-09-24 记录）

两件：0.3.0 走完发布链路，然后 `reverse` 选项 PR1 落地。

### 0.3.0 发布

tag 流水线第二次走通：`changeset version` → commit → push → `v0.3.0` tag → `environment: npm` 人工审批 → OIDC 免密发布。**npm 侧已核实**：`latest = 0.3.0`、`npm audit signatures` 报 registry signature + attestation 双 verified、四个 exports 子路径从干净安装解析到正确 dist 文件、`dist/nuxt-runtime/composables/*` 随包落地。GitHub Release 正文取到 CHANGELOG 的 0.3.0 段（没走 generate-notes 兜底）。线上文档站同步到 16 种。

- **闸门复现要用 `pnpm build` 而不是 `npx tsup`**：后者绕过 `postbuild`，`verify:package` 会报缺 `dist/nuxt-runtime/**`。是操作顺序问题，不是仓库缺陷，但报出来很像。
- **验 ESM-only 包的子路径要用 `import.meta.resolve`**：本包 `exports` 只声明 `import` 条件，`require.resolve` 必然假报 `No "exports" main defined`。我在同一轮里踩了三次。scratch 目录里 `Cannot find package 'react'` 也是预期（peer 且 optional），不是缺陷。

### reverse PR1 的判断

- **设计文档里"逐字节等价"那句是错的，实现时被自己的测试纠正了**：keyframes 名由 `getAnimationName(type)` 按类型生成，`theme-switch-circle` 与 `theme-switch-circle-revert` 必然不同。等价性锁改成"归一化名字后比较"——锁还在，但不会把命名差异误判成回归。
- **`reverse` 必须三态**（`boolean | 'auto'`）：`CIRCLE_REVERT` 的语义是"跟随切换方向"，不是"总是反向"。这条是整个设计的支点，写进需求 §7 与 changeset，免得日后有人"简化"成布尔。
- **校验用逐字面量比对，不用 `typeof`**：`typeof value === 'boolean' || value === 'auto'` 会把 `'AUTO'` 当成真值。反向是用户看得见的行为，宁可回落不猜。
- **Vue 模板的存在性判断有坑**：既有控件写 `v-if="initialXxx"`，而 `reverse` 合法值含 `false`，照抄会让控件永远不显示。四处都改成 `!== undefined`。

### 实测结果

| 检查 | 结果 |
| --- | --- |
| `CIRCLE + reverse:true` vs `CIRCLE_REVERT` 收起态 | 归一化 keyframes 名后 **CSS 完全相同**（且两份原文确实只差那个标识符） |
| `reverse:'auto'` 两态 | 切亮 = 洞式收起（含 `@property --theme-switch-radius`）；切暗 = 与完全不传 reverse 的 `CIRCLE` **逐字节相同** |
| 未接入类型传 `reverse:true` | `QR_GRID` / `BLINDS` / `SCAN` 三者输出与不传**完全一致** |
| 废弃提示 | 开发环境两次切换只提示 1 次；`NODE_ENV=production` 零输出；走 `CIRCLE + reverse` 不提示 |
| 根 test / lint / tsc / build | 253 例（新增 7）/ 0 / 0 / 产物含 `reverse` 与 `isValidReverse` |
| 四个 playground | react / next / nuxt 裸 `tsc` 通过；vue 必须 `vue-tsc`（裸 `tsc` 不认 SFC） |

### 待办

- [x] core：`reverse` 三态 + 校验 + `CIRCLE` 接通 + `CIRCLE_REVERT` 标废弃 + 7 例单测
- [x] 文档站 CIRCLE 卡与四个 playground 的 `Reverse` 控件；README / 需求文档 v1.10 / 设计文档状态 / changeset
- [ ] **真机验证 PR1**：文档站 CIRCLE 卡切 `off` / `on` / `auto` 三档，`on` 与 `auto`（切回亮色）应看到"新主题从四周显出、向按钮中心收拢"；`auto` 的另一半（切到暗色）应与 `off` 完全一致。四个 playground 各验一遍
- [x] ~~**PR2**：形状族 6 个 + `FAN` + `CURTAIN` 接入 `reverse`~~ —— **落地时缩到只剩 `FAN`**：形状族与 `CURTAIN` 经反证/实测**做不到无副作用**，撤出并进 roadmap §4。形状族反向必须动 `mask-size`，那是 phase-6 附录四/五查过的像素对齐抖动病根；`CURTAIN` 的 24px 羽化带塌零时两斜坡交叉出凹陷，末帧实测约 38px 居中半透明带（"终值过冲"与"两侧板向中心重叠生长"两种补救都只减小不消除）。`FAN` 能做的唯一理由是硬边无羽化：末帧扫描 0 残留，并用 start/mid 两点对照排除了"mask 解析失败也报 0"的假阳性。
  **但 `CURTAIN` 那半句判错了，PR3 后翻案**：当时只试了单渐变的三种写法（取补、过冲、单渐变两侧板）就下"结构性、非调参可解"的结论。换**两层 + `add`（取最大 alpha）**——左右板各自从边缘向中线长、软边朝内、重叠时取 max 而非抵消——末帧就干净了（首帧 6400/6400 全隐、末帧 0 残留）。**教训：证伪前先穷举构造空间**，已写进 roadmap §1 附近与需求 v1.12
- [x] **PR3 已完成**：`RIPPLE` + `CLOCK_SWEEP` 接入，先探针后落码，两者末帧 6400 采样点零残留。`RIPPLE` 撞出两个"照抄正向"的坑——主峰 α=0.5 的补仍是 0.5 所以终点必须过冲整个前缘；正向 `to` 里那个 `2.1 × maxRadius` 是为正向覆盖留的余量，反向照抄会让**前 60% 时间屏幕毫无变化**，起点改成 `maxRadius + 前缘` 才铺满时间轴（与 SPIRAL 那轮照抄 2.1 是同一类错误的镜像）。`CLOCK_SWEEP` 反向的观感就是当初搁置的**逆时针扫开**，顺/逆方向不必再单开选项
- [ ] **PR4**：删 `CIRCLE_REVERT`（破坏性，按 0.2.0 先例走 minor + 条目标 breaking）。洞式机制保留并泛化，别连带删掉
- [ ] 攒够后一起走 0.4.0 发布；`.changeset/` 当前一条待切

---

**长期遗留（不属本轮）**：Playwright e2e 矩阵（需求 §9-8 只跑 Chromium + WebKit）至今未正式建立，
引擎覆盖靠 `scripts/verify-engine.mjs` 手动跑，Playwright 仍是 `%TEMP%/pw-webkit` 的临时安装。
~~`apps/docs` 的 Biome 自始跑不通~~——2026-09-22 已修（`biome.json` 的 `vcs.root` 指向仓库根复用根
`.gitignore`），但修好后 `biome check .` 会露出 35 条既存诊断（`a11y/noSvgWithoutTitle` 10、
`performance/noImgElement` 4、`assist/organizeImports` 2、`style/noNonNullAssertion` 1 等），
尚未清理；根 `eslint.config.js` 一直 ignore `apps/docs/**`，所以这些都不在 CI 上。


