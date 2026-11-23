# Contributing to theme-switch-animation

Thanks for taking the time to contribute. This repository is maintained by a single maintainer, so short, focused changes are much easier to review and land.

## Before you start

- Read [AGENTS.md](./AGENTS.md). It is the source of truth for repository layout, the two hard technical constraints of the View Transitions mask approach, `docs/` conventions, the animation type freeze and the commit trailer format.
- For anything larger than a small fix, open an issue first describing the approach so it can be agreed on before code lands.
- Bug reports go to issues with a minimal reproduction: affected version, framework (React / Vue / Next.js / Nuxt), browser and a snippet or repository that reproduces it. Animation look-and-feel reports are welcome too — they feed `docs/animation-roadmap.md`, they are just not security issues.

## Development

Requirements: Node ≥ 22.13 and pnpm (version pinned by the `packageManager` field).

```bash
pnpm install
pnpm lint        # eslint（packages / scripts / playgrounds）
pnpm typecheck   # tsc --noEmit（packages/*/src）
pnpm test        # vitest（测试与源码同目录）
pnpm build       # tsup + nuxt runtime 拷贝
```

The four gates above (门禁四件套) are exactly what CI runs on Node 22 / 24 and must pass locally before every push. Additional checks by change surface:

- `apps/docs`（文档站）: run `pnpm -C apps/docs typecheck` and `pnpm -C apps/docs lint` too — the root gates do not cover it. Biome diagnostics are kept at zero; fix new ones immediately.
- 动画行为（`packages/core`）: see the 引擎矩阵 section in [AGENTS.md](./AGENTS.md) — WebKit / Firefox forensics, pixel-based acceptance, not eyeballing screenshots.
- 发布产物面（`exports` / dist 结构）: run `pnpm verify:package` after `pnpm build`.

## Pull requests

- Keep the diff focused: one logical change per PR.
- Use conventional commit messages with a scope and a Chinese subject (`fix(core): …` / `docs(next-steps): …`).
- If an AI assistant helped, add the required trailer block described in [AGENTS.md](./AGENTS.md) (validated by the `ai-commit-trailer` skill). Commits without it will not credit the tool.
- Decision records (why / why not / why reverted) belong in the living docs (`docs/requirements.md` §10 or the corresponding document), not only in the commit message.

## Dependencies

The published package keeps **zero runtime dependencies** — `dependencies` stays empty, framework integration ships as `peerDependencies` (+ the Nuxt module shell). New dependencies can only go to the dev side, with the reason stated in the PR.

## Community

By participating in this project you agree to the [Code of Conduct](./CODE_OF_CONDUCT.md). Report unacceptable behavior to me@baiwumm.com.

## Security

Do not open public issues or pull requests for vulnerabilities. Use [private reporting](https://github.com/baiwumm/theme-switch-animation/security/advisories/new) and see [SECURITY.md](./SECURITY.md).
