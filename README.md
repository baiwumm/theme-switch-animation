# theme-switch-animation

基于浏览器 View Transitions API 的主题切换动画库：切换 light / dark 主题时，新主题以指定形状（圆形扩散 / 四向擦除）"揭开"覆盖旧主题，而不是生硬跳变。

- 跨框架：React 18+、Vue 3+、Next.js（App Router）、Nuxt 3+
- 首期 5 种动画类型：`CIRCLE` / `LTR` / `RTL` / `TTB` / `BTT`
- 受控模式：不独占主题状态管理，`next-themes`、`@nuxtjs/color-mode` 用户可直接接入
- 不支持 View Transitions 或 `prefers-reduced-motion: reduce` 时自动降级为直接切换

> 项目开发中，当前进度见 [docs/requirements.md](./docs/requirements.md) 里程碑。

## 开发

要求 Node >= 18、pnpm >= 9。

```bash
pnpm install
pnpm build     # tsup 构建
pnpm test      # vitest 单测
pnpm lint      # eslint
pnpm typecheck # tsc --noEmit
```

## License

[MIT](./LICENSE)
