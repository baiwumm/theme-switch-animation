/**
 * `pnpm install` 触发 prepare 生命周期时执行本脚本。守卫的原因：
 * 全新 clone 时根包尚未构建，`theme-switch-animation/nuxt`（exports → dist/nuxt.mjs）
 * 解析不到，`nuxt prepare` 必失败并拖垮整个 install——CI 的 Install 步骤
 * 自 Phase 4（本 playground 加入）起即因此红灯。
 *
 * dist 就绪才真正执行 `nuxt prepare`；否则跳过并提示。
 * dev / build / typecheck 脚本自身会先 `pnpm -w run build`，不受影响。
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// 必须用 ESM 解析（import 条件）：根包 exports 只声明了 types/import，
// CJS 的 require.resolve 会因缺少 require 条件而误报不可解析。
let entry = null
try {
  entry = fileURLToPath(import.meta.resolve('theme-switch-animation/nuxt'))
} catch {
  // 包未链接或 exports 指向的产物不存在
}

if (!entry || !existsSync(entry)) {
  console.log(
    '[prepare] 跳过 nuxt prepare：theme-switch-animation 尚未构建（dist/ 不存在）。' +
      '先在仓库根目录运行 pnpm build；或使用本 playground 的 dev / build / typecheck 脚本，均会自动先构建。',
  )
  process.exit(0)
}

const result = spawnSync('nuxt', ['prepare'], { stdio: 'inherit', shell: true })
process.exit(result.status ?? 1)
