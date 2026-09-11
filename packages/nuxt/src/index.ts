import type { NuxtModule } from '@nuxt/schema'
import { addImports, addImportsDir, createResolver, defineNuxtModule } from '@nuxt/kit'

/**
 * 公开类型清单（§6.3 / §9-9）。
 * `addImportsDir` 只扫描**值**导出，纯类型不会被登记；类型必须用 addImports({ type: true })
 * 显式注册，用户才能无需 import 使用且有类型提示。新增公开类型时同步这张表。
 */
const PUBLIC_TYPES = [
  'ThemeAnimationOptions',
  'UseThemeAnimationOptions',
  'UseThemeAnimationResult',
  'DirectionalAnimationType',
  'ResolvedAnimationOptions',
] as const

/**
 * theme-switch-animation 的 Nuxt 模块（§6.3）。
 * - `addImportsDir` 注册 runtime composables 目录（发布包内 dist/nuxt-runtime/composables，§4），
 *   提供 `useThemeAnimation` / `ThemeAnimationType` / `THEME_STORAGE_KEY` 的自动导入；
 * - `addImports({ type: true })` 补齐类型导出（见上）。
 */
// 显式注解返回类型：defineNuxtModule 的推断类型引用 pnpm 虚拟路径下的 @nuxt/schema，
// 会导致 dts 不可移植（TS2742）；模块无选项，统一标注为 NuxtModule。
const module: NuxtModule = defineNuxtModule({
  meta: {
    name: 'theme-switch-animation',
    configKey: 'themeSwitchAnimation',
  },
  setup() {
    const { resolve } = createResolver(import.meta.url)
    // 发布产物 dist/nuxt.mjs 与 dist/nuxt-runtime/ 同级；addImportsDir 指向目录而非单文件（§4）
    const runtimeDir = resolve('./nuxt-runtime/composables')

    addImportsDir(runtimeDir)
    addImports(PUBLIC_TYPES.map((name) => ({ name, from: runtimeDir, type: true })))
  },
})

export default module
