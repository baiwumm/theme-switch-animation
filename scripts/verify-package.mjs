/**
 * 发布清单校验（需求 §9-11）：npm pack 的内容必须只有 dist（含 nuxt-runtime）+ 三个根文件。
 *
 * 判据是「必备项齐全 + 越界项为零」，不是硬断言文件数——新增产物或 tsup 拆出共享
 * d.ts 块都会让数字漂移（历史上就因 rollup 新拆 uncontrolled-<hash> 块打破过"恰好 N 个"
 * 的不变量），而这两条判据表达的是真正的意图：源码与工程配置不许进包。
 *
 * 必备项从 package.json 的 exports 表推导（四子路径的 types + import），不写死路径，
 * 避免 exports 调整后本脚本静默失效。
 */
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))

const REQUIRED = ['package.json', 'README.md', 'LICENSE']
for (const entry of Object.values(pkg.exports)) {
  REQUIRED.push(entry.types.replace(/^\.\//, ''), entry.import.replace(/^\.\//, ''))
}
// Nuxt 模块的 addImportsDir 指向目录：这两个文件不在 exports 表里，但缺了自动导入就废了
REQUIRED.push(
  'dist/nuxt-runtime/composables/index.mjs',
  'dist/nuxt-runtime/composables/index.d.ts',
)

const ALLOWED_PREFIXES = ['dist/']
const ALLOWED_NAMES = new Set(['package.json', 'README.md', 'LICENSE'])

// Windows 上 Node 20+ 直接 spawn npm.cmd 会 EINVAL，改过 shell 执行（命令为固定字面量，无变量插值）
const packed = JSON.parse(
  execSync('npm pack --dry-run --json', { cwd: ROOT, encoding: 'utf8' }),
)
const files = packed.flatMap((entry) => entry.files.map((f) => f.path))

const missing = REQUIRED.filter((path) => !files.includes(path))
const extra = files.filter((path) => !ALLOWED_NAMES.has(path) && !ALLOWED_PREFIXES.some((p) => path.startsWith(p)))

console.log(`npm pack 清单：${files.length} 个文件`)
for (const path of [...files].sort()) console.log(`  ${extra.includes(path) ? '✗' : ' '} ${path}`)

if (missing.length || extra.length) {
  if (missing.length) console.error(`\nFAIL 缺少必备文件：\n  ${missing.join('\n  ')}`)
  if (extra.length) console.error(`\nFAIL 包内出现不该发布的文件：\n  ${extra.join('\n  ')}`)
  process.exit(1)
}
console.log('\nOK 发布清单符合 §9-11（exports 四子路径 + nuxt-runtime + 根文件，无越界项）')
