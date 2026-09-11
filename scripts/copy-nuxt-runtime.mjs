/**
 * 构建后处理（方案 B，§4）：把 Nuxt 自动导入的 runtime 产物复制到 dist/nuxt-runtime/composables/。
 * 纯 node:fs 实现，跨平台（Windows / *nix），不依赖 cp / rsync。
 *
 * 产物策略：发布包里没有 @theme-switch-animation/*（私有 workspace 包），因此 runtime 的
 * composables/index.mjs 不能保留裸导入——直接以已内联 core 的 dist/vue.mjs 作为内容
 * （自动导入的正是 Vue composable，行为与 theme-switch-animation/vue 完全一致），
 * d.ts 同理取 dist/vue.d.ts；@nuxt/kit 的模块本体（dist/nuxt.mjs）经 addImportsDir
 * 指向的目录即本目录，无需额外处理。
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const outDir = join(dist, 'nuxt-runtime', 'composables')

// vue.d.ts 通过共享 chunk（types-<hash>.d.ts）引用 core 类型，runtime 目录要一并带上
const sharedTypeChunks = readdirSync(dist).filter((f) => /^types-.*\.d\.ts$/.test(f))

for (const file of [join(dist, 'vue.mjs'), join(dist, 'vue.d.ts')]) {
  if (!existsSync(file)) {
    console.error(`[copy-nuxt-runtime] 缺少构建产物：${file}，请先运行 pnpm build`)
    process.exit(1)
  }
}
if (!existsSync(join(dist, 'nuxt.mjs'))) {
  console.error(`[copy-nuxt-runtime] 缺少构建产物：dist/nuxt.mjs，请先运行 pnpm build`)
  process.exit(1)
}

mkdirSync(outDir, { recursive: true })
copyFileSync(join(dist, 'vue.mjs'), join(outDir, 'index.mjs'))
copyFileSync(join(dist, 'vue.d.ts'), join(outDir, 'index.d.ts'))
for (const chunk of sharedTypeChunks) {
  copyFileSync(join(dist, chunk), join(outDir, chunk))
}
console.log(`[copy-nuxt-runtime] dist/nuxt-runtime/composables/ 已就绪（index.mjs + index.d.ts${sharedTypeChunks.length ? ` + ${sharedTypeChunks.length} 个共享类型块` : ''}）`)
