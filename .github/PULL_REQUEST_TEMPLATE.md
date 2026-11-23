## 变更说明

<!-- 一句话说明「为什么改」，以及改前改后的行为差异 -->

Closes #

## 涉及范围

- [ ] core（`packages/core`）
- [ ] 框架门面（`packages/react` / `vue` / `nuxt`）
- [ ] 文档站（`apps/docs`）
- [ ] 试验场（`playgrounds/*`）
- [ ] 脚本与实验台（`scripts/`）
- [ ] 仅仓库级（`docs/` / `.github/` / 根配置）

## 一致性与真源检查

- [ ] 若动 core：两条硬技术约束不破——转场只走 mask（WebKit 忽略伪元素上的 clip-path / WAAPI）；末帧完全覆盖（观感判据用像素取证，不靠肉眼截图）
- [ ] 若新增动画类型或扩 `reverse` 接入面：先过预检（roadmap §3 门槛），已回写 `docs/requirements.md` §10 与 roadmap 状态
- [ ] 若行为变化：README 双语与文档站计数（hero / features / 画廊）已同步
- [ ] 若改发布产物面（`exports` / dist 结构）：`pnpm build` 后跑过 `pnpm verify:package`
- [ ] 若新增依赖：只进 dev 侧，发布包 `dependencies` 保持为空
- [ ] 若 AI 参与提交：trailer 按 AGENTS.md，`ai-commit-trailer` 的 `check` exit 0
- [ ] 决策记录（为什么做 / 为什么不做 / 为什么撤回）已进活文档（requirements §10 或对应文档）

## 验证结果

<!-- 填实际跑过的命令与结果；未跑的项写明原因 -->

- 门禁四件套（lint / typecheck / test / build）：
- 按改动面的追加项（apps/docs lint+typecheck / verify:package / test:acceptance / 引擎矩阵）：

## 截图 / 录屏

<!-- 动画观感变更建议附录制；无视觉变化可删除本节 -->
