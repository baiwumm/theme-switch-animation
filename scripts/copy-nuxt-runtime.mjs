/**
 * 构建后处理（方案 B，§4）：生成 Nuxt 自动导入所需的 runtime 产物。
 * 纯 node:fs 实现，跨平台（Windows / *nix），不依赖 cp / rsync。
 *
 * 产物布局（发布包内没有 @theme-switch-animation/*，必须是自包含的）：
 *   dist/nuxt-runtime/composables/   ← addImportsDir 扫描的目录，只有两个入口文件
 *   ├── index.mjs                    ← dist/vue.mjs（已内联 core；值导出）
 *   └── index.d.ts                   ← 自包含声明（见下；类型导出）
 *
 * 为什么 d.ts 要自包含而不是 `export * from '...'`：
 * addImportsDir 的类型扫描只识别文件内**显式的 export 声明**（`export interface/type/declare const`），
 * 对 `export {...} from` 这类转发语句中的 `type` 名字会漏掉（曾导致 UseThemeAnimationOptions
 * 等类型无法自动导入）。因此把 tsup 产物里的声明内联、逐条加 export 关键字。
 *
 * `ThemeAnimationType` 的同名类型含义由模块的 addTypeTemplate 补（见 packages/nuxt/src/index.ts），
 * 因为 unimport 对自动导入的值只生成值含义的全局声明。
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const runtimeDir = join(dist, 'nuxt-runtime')
const composablesDir = join(runtimeDir, 'composables')

for (const file of ['vue.mjs', 'vue.d.ts', 'nuxt.mjs']) {
  if (!existsSync(join(dist, file))) {
    console.error(`[copy-nuxt-runtime] 缺少构建产物 dist/${file}，请先运行 pnpm build`)
    process.exit(1)
  }
}

// vue.d.ts 通过共享 chunk 引用 core 类型；其声明需要内联进自包含产物。
// 共享块名不固定（rollup 按归属模块命名，曾为 types-<hash>，现为 orchestrate-<hash>），
// 按"除四个入口 facade 外的 .d.ts"识别，保持"恰好 1 个"的不变量校验。
const entryChunks = new Set(['index.d.ts', 'react.d.ts', 'vue.d.ts', 'nuxt.d.ts'])
const sharedTypeChunks = readdirSync(dist).filter((f) => f.endsWith('.d.ts') && !entryChunks.has(f))
if (sharedTypeChunks.length !== 1) {
  console.error(`[copy-nuxt-runtime] 期望恰好 1 个共享类型块，实际 ${sharedTypeChunks.length} 个：${sharedTypeChunks.join(', ')}`)
  process.exit(1)
}

rmSync(runtimeDir, { recursive: true, force: true })
mkdirSync(composablesDir, { recursive: true })

/** 把 tsup 产物转成自包含声明：去掉 import / 合并 export 语句，给顶层声明加 export */
function toSelfContainedDeclarations(text) {
  return text
    .split('\n')
    .filter((line) => !/^import .* from ['"].*['"];?$/.test(line))
    .filter((line) => !/^export \{.*\};$/.test(line))
    .map((line) =>
      /^(declare const|declare function|type |interface )/.test(line) ? `export ${line}` : line,
    )
    .join('\n')
    .trim()
}

const declarations = [
  '// 自动生成（scripts/copy-nuxt-runtime.mjs）——请勿手改',
  "import type { Ref } from 'vue'",
  '',
  toSelfContainedDeclarations(readFileSync(join(dist, sharedTypeChunks[0]), 'utf8')),
  '',
  toSelfContainedDeclarations(readFileSync(join(dist, 'vue.d.ts'), 'utf8')),
  '',
].join('\n')

writeFileSync(join(composablesDir, 'index.d.ts'), declarations)

// 实现同样直接落盘（不做转发，值与类型的解析落在同一模块）；去掉 sourceMappingURL：
// map 不随 runtime 目录发布，留着会让 Vite 反复报 "Failed to load source map"
const vueMjs = readFileSync(join(dist, 'vue.mjs'), 'utf8').replace(/^\/\/# sourceMappingURL=.*$/gm, '')
writeFileSync(join(composablesDir, 'index.mjs'), vueMjs)

console.log('[copy-nuxt-runtime] dist/nuxt-runtime/composables/{index.mjs,index.d.ts} 已就绪（自包含声明）')
