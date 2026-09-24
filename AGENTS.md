# AGENTS.md

面向在本仓库工作的 AI 编码代理（与人工协作者通用）。内容与仓库现状同步维护，发现过期请顺手更新。

## 项目是什么

`theme-switch-animation`：基于浏览器 View Transitions API 的主题切换动画库——15 种 mask 揭示动画
+ `reverse`（`boolean | 'auto'`，接入 CIRCLE / FAN / RIPPLE / CLOCK_SWEEP / CURTAIN 五类）。

- **发布包就是仓库根**的 `package.json`（exports `.` / `./react` / `./vue` / `./nuxt` 四个子路径，ESM-only）。
- `packages/{core,react,vue,nuxt}` 是**私有内部包**（`@theme-switch-animation/*`）：core 框架无关实现
  （types / masks / styles / orchestrate），react / vue 薄适配，nuxt 模块壳。
- `apps/docs` 文档站（Next.js，push main 自动部署到 theme-switch-animation.baiwumm.com）。
- `playgrounds/{react,vue,next,nuxt}` 四个框架的实机试验场。
- 环境：pnpm（`packageManager` 字段为准）+ Node ≥18，CI 跑 22 / 24 双矩阵。

## 两条硬技术约束（改 core 前先知道）

1. 转场 = 对 `::view-transition-new(root)` 做 **mask 动画**。WebKit 忽略转场伪元素上的 clip-path
   与 WAAPI，所以只能走 mask；`linear()` 缓动要双 `animation:` 声明降级。
2. **末帧必须完全覆盖**（整平面实心、四角无残留）。观感判据用像素取证
   （`scripts/jitter-lab/`、`scripts/verify-engine.mjs` 的极值线/折点分离口径），不靠肉眼截图下结论。

动画类型**已冻结**（需求方 2026-09-24 决定）：不要提议新增类型；重启门槛与"为什么不再加"见
`docs/animation-roadmap.md` §1 / §4。

## 常用命令

| 用途 | 命令 |
|---|---|
| 门禁四件套 | `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm build` |
| 产物校验 | `pnpm verify:package`（build 之后跑；**要用 `pnpm build`，别用 `npx tsup` 绕过 postbuild**） |
| 实机验收 | `pnpm test:acceptance`（7 个 CDP 脚本，需本机 Chrome） |
| 引擎矩阵 | `node scripts/verify-engine.mjs --engine=webkit\|firefox`（**跑前先确认 `PW_DIR` / `FF_WORK_DIR` 指向的仓库外路径还在**，见 `docs/next-steps.md`；Git Bash 下传参要 `MSYS2_ARG_CONV_EXCL='*'`） |
| 发版 | `pnpm changeset` → `pnpm changeset version` → commit → 推 `v*` tag |

## 发布链路

- changesets 只管版本号与 CHANGELOG；**发包由 tag 触发的 `.github/workflows/release.yml` 全自动完成**：
  npm Trusted Publishing（OIDC 免密，仓库无任何 secret），**无 GitHub Environment、无人工审批**。
- workflow 取 **tag 指向 commit** 里的那份文件——`release.yml` 的改动必须**先进 main 再打 tag**，
  否则 tag 跑的还是旧版。
- workflow 会校验：tag 在 origin/main 上、`package.json` version 与 tag 一致、`.changeset/` 无未消费条目。
- 发版后 npm 侧有约 2.5 分钟 packument 延迟，干净安装验版本要加 `--prefer-online`。

## docs/ 约定（2026-09-24 定）

- **docs/ 根目录只放活文档**：文件名固定、不带日期或版本号，长期更新。现有四个：
  `requirements.md`（需求 spec + §10 修订记录 = 全仓唯一的决策日志）、`next-steps.md`
  （**只装还开着的待办**，做完一项删一项）、`animation-roadmap.md`（类型冻结后的存档与重启门槛）、
  `reverse-option-design.md`（reverse 语义规范与实现偏差记录）。
- **一次性报告**（阶段汇报、发布冒烟报告等）不进工作树：证据在 git 历史
  （`git log --all -- 'docs/**'`）永远可查；确需就地归档时移入 `docs/archive/` 且**保留原文件名**（改名断链）。
- 文件名一律 kebab-case；发布类一次性报告命名 `release-x.y.z-<主题>-report.md`。
- 决策记录（为什么做 / 为什么不做 / 为什么撤回）写进活文档（requirements §10 或对应文档），
  不只留在 commit message 里；历史报告是事实记录，**绝不改写**。

## 代码与提交风格

- 注释密度高是刻意的：写"为什么"和约束（尤其动画观感上反直觉的结论），不写"这行做了什么"。
- commit message 走 conventional commits + scope，中文主题：`fix(core): …`、`docs(next-steps): …`。
- 根 `eslint` 管 `packages/` 与 `scripts/`；`apps/docs` 用自己的 biome 且被根 eslint ignore
  （35 条既存诊断未清，见 `docs/next-steps.md`）。
