import type { NuxtModule } from '@nuxt/schema'
import { addImportsDir, createResolver, defineNuxtModule } from '@nuxt/kit'

/**
 * theme-switch-animation 的 Nuxt 模块（§6.3）。
 * 注册 runtime composables 目录（发布包内为 dist/nuxt-runtime/composables，§4），
 * `useThemeAnimation` / `ThemeAnimationType` 无需 import 即可使用（自动导入 + 类型提示）。
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
    // 发布产物 dist/nuxt.mjs 与 dist/nuxt-runtime/composables 同级；
    // addImportsDir 指向目录而非单文件，扫描目录下文件的命名导出（§4）。
    addImportsDir(resolve('./nuxt-runtime/composables'))
  },
})

export default module
