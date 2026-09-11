import type { NuxtModule } from '@nuxt/schema'
import { addImportsDir, addTypeTemplate, createResolver, defineNuxtModule } from '@nuxt/kit'

/**
 * theme-switch-animation 的 Nuxt 模块（§6.3）。
 *
 * 值导出（`useThemeAnimation` / `ThemeAnimationType` / `THEME_STORAGE_KEY`）与类型导出
 * （`ThemeAnimationOptions` / `UseThemeAnimationOptions` / `UseThemeAnimationResult` /
 * `DirectionalAnimationType` / `ResolvedAnimationOptions`）由 `dist/nuxt-runtime/composables`
 * 目录扫描提供（其 `index.d.ts` 是构建期生成的自包含声明，见 scripts/copy-nuxt-runtime.mjs）。
 *
 * 两点实现约束（均为实测所得，勿轻易改动）：
 * 1. 不用 `addImports()` 补类型：它会把 import source 写进 Vite 配置，触发依赖重优化，
 *    引发 Nuxt 自身 `#app-manifest` 别名解析失败的 Pre-transform error。
 * 2. `ThemeAnimationType` 既是值（`ThemeAnimationType.LTR`）又是同名类型（`animationType: ThemeAnimationType`），
 *    而 unimport 对自动导入的值只生成 `const X: typeof import(...)['X']`（仅值含义），用 addImports({type:true})
 *    补类型又会变成仅类型含义（TS1362：值用法报错）。因此这里用 addTypeTemplate 补一个**全局类型别名**——
 *    TS 的值/类型命名空间相互独立，全局 `type` 与自动导入的全局 `const` 自然合并，两种用法同时可用。
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
    addImportsDir(resolve('./nuxt-runtime/composables'))

    // 同名类型的全局补充（见上文约束 2）；类型从包公开子路径取，保持与 dist 类型单一来源
    addTypeTemplate({
      filename: 'types/theme-switch-animation.d.ts',
      getContents: () =>
        [
          '// 自动生成（theme-switch-animation/nuxt 模块）——请勿手改',
          // ThemeAnimationType 既是常量对象又是同名类型：自动导入只给值含义，这里补类型含义
          'declare global {',
          "  type ThemeAnimationType = import('theme-switch-animation/vue').ThemeAnimationType",
          '}',
          'export {}',
          '',
        ].join('\n'),
    })
  },
})

export default module
