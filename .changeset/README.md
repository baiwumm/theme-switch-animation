# Changesets

本目录由 [`@changesets/cli`](https://changesets.dev) 管理版本与 CHANGELOG。

- 只有根包 `theme-switch-animation` 会被发布；`packages/*` 下的私有包（如 `@theme-switch-animation/core`）
  不参与版本号与 tag（`privatePackages.version = false`）。
- 提交带有用户可见变更的 PR 时，运行 `pnpm changeset` 生成一条 changeset 描述。
- 发布流程（v0.2.0 起：tag 触发 CI 发包，见 `.github/workflows/release.yml`）：
  1. `pnpm changeset version` 消费 changeset，写 `package.json` 的 version 与 CHANGELOG，提交并推 `main`；
  2. `git tag v0.x.x && git push origin v0.x.x` 触发 Release workflow——校验版本/清单、构建、
     `npm publish --provenance`（OIDC 免密，不需要 secret）、创建 GitHub Release；
  3. **不要再手动跑 `changeset publish`**：装的 `@changesets/cli@3.0.2` 不支持 provenance（走不了
     Trusted Publishing），而且它会自己另打一个 `theme-switch-animation@x.y.z` tag，与流水线的 `v*`
     约定冲突。本仓库里 changesets 的职责到 `version` 为止，发布归 CI。

常见问题见 [FAQ](https://changesets.dev/faq)。
