import { existsSync } from 'node:fs'
import { defineConfig } from 'tsup'

/**
 * 根包只发布一个 dist，四个入口分别对应 package.json `exports` 的
 * `.` / `./react` / `./vue` / `./nuxt`。
 *
 * 适配层（react / vue / nuxt）按里程碑逐阶段落地，源码尚不存在的入口会被自动跳过，
 * 这样 exports 从 Phase 0 起就是最终形态，而 `pnpm build` 在任一阶段都能通过。
 */
const candidateEntries = {
  index: 'packages/core/src/index.ts',
  react: 'packages/react/src/index.ts',
  vue: 'packages/vue/src/index.ts',
  nuxt: 'packages/nuxt/src/index.ts',
}

const entry = Object.fromEntries(
  Object.entries(candidateEntries).filter(([, file]) => existsSync(file)),
)

export default defineConfig({
  entry,
  format: ['esm'],
  outDir: 'dist',
  outExtension: () => ({ js: '.mjs' }),
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
  target: 'es2020',
  // 框架运行时保持 external（optional peerDependencies）；workspace 内部包（core）被打进各入口。
  external: ['react', 'react-dom', 'vue', '@nuxt/kit', '@nuxt/schema'],
  noExternal: [/^@theme-switch-animation\//],
})
