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
  // 私有 workspace 包不会随根包发布，类型必须内联进各入口的 d.ts。
  // tsup 把 resolve 数组当作 resolveOnly 过滤器：被内联包内部的相对导入（core/index.ts → './types'）
  // 也要能通过过滤，否则会被留成指向不存在文件的 `from './types'`。
  dts: { resolve: [/^@theme-switch-animation\//, /^\.\.?\//] },
  clean: true,
  sourcemap: true,
  splitting: false,
  // 关闭 rollup 的二次摇树：它会剥掉入口顶部的 'use client' 指令（React / Next 客户端边界必需）。
  // esbuild 自身的 ESM 摇树仍然生效，且包已声明 sideEffects: false，由消费方打包器做最终摇树。
  treeshake: false,
  target: 'es2020',
  // 框架运行时保持 external（optional peerDependencies）；workspace 内部包（core）被打进各入口。
  external: ['react', 'react-dom', 'vue', '@nuxt/kit', '@nuxt/schema'],
  noExternal: [/^@theme-switch-animation\//],
})
