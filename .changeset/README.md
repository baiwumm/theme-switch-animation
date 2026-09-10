# Changesets

本目录由 [`@changesets/cli`](https://changesets.dev) 管理版本与 CHANGELOG。

- 只有根包 `theme-switch-animation` 会被发布；`packages/*` 下的私有包（如 `@theme-switch-animation/core`）
  不参与版本号与 tag（`privatePackages.version = false`）。
- 提交带有用户可见变更的 PR 时，运行 `pnpm changeset` 生成一条 changeset 描述。
- 发布流程：`pnpm changeset version` 消费 changeset 并更新版本号与 CHANGELOG，随后构建并 `changeset publish`。

常见问题见 [FAQ](https://changesets.dev/faq)。
