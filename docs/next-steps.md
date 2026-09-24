# 待办

> 本文件只装**还开着的待办**，做完一项删一项。2026-09-14 ~ 09-24 的十轮已完结记录（原 §1–§10
> 台账）已随 docs 精简移出工作树，随时可查 git 历史：`git log --all -- docs/next-steps.md`。

- [ ] **小重构**：`masks.ts` 私有函数 `qrCenterGradient(90, f)` 返回的渐变串与 `getCurtainRevealSpec`
      逐字符相同，合并成一个中性命名的对称渐变构造器（需重命名私有函数，波及 `QR_GRID` 一处调用）。

- [ ] **Playwright e2e 矩阵未正式建立**：需求 §9-8 只跑 Chromium + WebKit，引擎覆盖靠
      `scripts/verify-engine.mjs` 手动跑。**跑引擎矩阵前先确认两处仓库外路径还在**：
      Playwright 包本体已改装到仓库外稳定路径（`PW_DIR` 指过去）、`verify-firefox-video.mjs`
      的抽帧工作目录走 `FF_WORK_DIR`——`%TEMP%` 下的安装会在任务跑动中被系统清扫
      （实测磁盘有 54G 也照扫，刚写出的文件下一句就 ENOENT）。

- [ ] **apps/docs 的 35 条 biome 既存诊断**（a11y/noSvgWithoutTitle 10、performance/noImgElement 4、
      assist/organizeImports 2、style/noNonNullAssertion 1 等）：根 `eslint.config.js` 一直 ignore
      `apps/docs/**`，不在 CI 上，攒着没清。

- [ ] **（等使用者反馈再排查，≠ 已验）系统缩放 125% / 150% 真机肉眼观感**：已覆盖的是 forced
      `deviceScaleFactor`（浏览器光栅路径，seek 模式出真设备像素）；未覆盖的是 OS 整屏分面缩放。
      反馈进来先跑：
      `MSYS2_ARG_CONV_EXCL='*' node scripts/jitter-lab/run.mjs --type=<类型> --reverse=false --direction=expand --variant=clean --dsf=1.25 --samples=24`
      读汇总里的「含真极值线」帧数（三档 CURTAIN 基线 = 1，且那一帧是 t=0 起始帧设计上透光，不是伪影）。

- [ ] **（等使用者反馈再排查，≠ 已验）Safari / iOS 真机**：已覆盖 Playwright WebKit（webkit-2359，
      逐类型 15/15 + `CIRCLE` 收起洞半径逐帧插值）；未覆盖设备端合成器与触控路径。
      反馈进来按这份 ~15 分钟手动清单跑：

      1. 准备：Mac 上 `pnpm i && pnpm build && cd playgrounds/vue && pnpm build && npx vite preview --host --port 5224`，
         iPhone 与 Mac 同一局域网访问 `http://<mac-ip>:5224/`。
      2. **macOS Safari 18+**：CIRCLE 卡点两次（Reverse 停在 auto）——切暗应是暗色圆从按钮**扩散**、
         切亮应是暗色圆**收起进按钮**，约 750ms 平滑；失败形态：瞬间切换（`@property` 失效）或前半段不动、
         50% 处一跳。15 个按钮各点一次，各有各的形状/方向动画。3 秒内连点 10 次，结束后 `<html>` class、
         按钮文案、`localStorage['theme-switch-animation']` 三者一致，控制台无红错。duration 1000ms +
         easing linear 点一次 CIRCLE 收起，确认匀速（`var()` 缓动生效）。开「减弱动态效果」应直切且状态正确。
      3. **iOS Safari 18+**：重复上一步的核对点；圆心跟随点击位置（页面滚到中部再点）；
         横竖屏各收起一次，看边缘有无锯齿/线条（Apple GPU 合成路径与桌面不同）。
