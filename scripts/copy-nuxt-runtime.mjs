/**
 * 构建后处理（方案 B，§4）：生成 Nuxt 自动导入所需的 runtime 产物。
 * 纯 node:fs 实现，跨平台（Windows / *nix），不依赖 cp / rsync。
 *
 * 产物布局（发布包内没有 @theme-switch-animation/*，必须是自包含的）：
 *   dist/nuxt-runtime/
 *   ├── internal/
 *   │   ├── vue.mjs          ← dist/vue.mjs（已内联 core；自动导入的正是 Vue composable）
 *   │   ├── vue.d.ts         ← dist/vue.d.ts
 *   │   └── types-<hash>.d.ts← 共享类型块（vue.d.ts 引用）
 *   └── composables/         ← addImportsDir 扫描的目录，只放入口文件，避免扫描到内部别名
 *       ├── index.mjs        ← 转出 internal/vue.mjs
 *       └── index.d.ts       ← 转出 internal/vue.d.ts
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const runtimeDir = join(dist, 'nuxt-runtime')
const internalDir = join(runtimeDir, 'internal')
const composablesDir = join(runtimeDir, 'composables')

for (const file of ['vue.mjs', 'vue.d.ts', 'nuxt.mjs']) {
  if (!existsSync(join(dist, file))) {
    console.error(`[copy-nuxt-runtime] 缺少构建产物 dist/${file}，请先运行 pnpm build`)
    process.exit(1)
  }
}

// vue.d.ts 通过共享 chunk（types-<hash>.d.ts）引用 core 类型，需一并携带
const sharedTypeChunks = readdirSync(dist).filter((f) => /^types-.*\.d\.ts$/.test(f))

mkdirSync(internalDir, { recursive: true })
mkdirSync(composablesDir, { recursive: true })

// 复制实现时去掉 sourceMappingURL：map 不随 runtime 目录发布，留着会让 Vite 反复报
// "Failed to load source map"
const vueMjs = readFileSync(join(dist, 'vue.mjs'), 'utf8').replace(/^\/\/# sourceMappingURL=.*$/gm, '')
writeFileSync(join(internalDir, 'vue.mjs'), vueMjs)
copyFileSync(join(dist, 'vue.d.ts'), join(internalDir, 'vue.d.ts'))
for (const chunk of sharedTypeChunks) {
  copyFileSync(join(dist, chunk), join(internalDir, chunk))
}

// 扫描目录只保留入口文件：addImportsDir 会把目录下所有文件的导出（含内部类型别名）登记为自动导入。
// 注意 specifier 必须无扩展名——unimport 按真实文件解析，写成 '../internal/vue.js' 会因找不到
// vue.js 而 skip scanning（.d.ts 由 TS 的 bundler 解析规则映射，无需字面 .js 文件）。
writeFileSync(join(composablesDir, 'index.mjs'), "export * from '../internal/vue'\n")
writeFileSync(join(composablesDir, 'index.d.ts'), "export * from '../internal/vue'\n")

console.log(
  `[copy-nuxt-runtime] dist/nuxt-runtime/composables/{index.mjs,index.d.ts} 已就绪（实现与类型在 internal/，${sharedTypeChunks.length} 个共享类型块）`,
)
