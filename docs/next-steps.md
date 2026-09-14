# 发布前待办（2026-09-14 记录）

背景：`551bdde` 提交了转场可靠性修复与状态同步增强（单测 178 → 196 全绿，typecheck / lint / build
全过）。手动浏览器实测覆盖了 React / Vue / Next 三个 playground；**Nuxt playground 本轮未手动
实测**——它验证的是 Nuxt 模块自动导入 + SSR 水合链路，实机覆盖完全依赖待办 1 的两个验收脚本
（cdp-nuxt93 / cdp-nuxt-animtypes），所以待办 1 对 Nuxt 尤其重要。本文档记录发布前剩余事项，
按优先级排序，做完一项勾一项。

- [x] 1. 跑正式验收 `pnpm test:acceptance`（2026-09-14 完成，7/7 PASS + §9-3 组二补跑 PASS）
- [x] 2. Safari / 真机验证（2026-09-14 本机可自动化部分已全绿，见 §2；**macOS Safari + iOS 真机**
      无设备，转交用户手动清单（§2 末尾），PC 端矩阵 WebKit/Chrome/Edge/Firefox 四引擎已全绿）
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
- **iOS Safari**：13 种动画类型顺带过一遍。

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
2. 13 个按钮各点一次：每个都有自己的形状/方向动画，没有"全部播同一个圆"。
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
