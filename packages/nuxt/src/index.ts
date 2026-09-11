import { addImportsDir, createResolver, defineNuxtModule } from '@nuxt/kit'

/**
 * theme-switch-animation 的 Nuxt 模块（§6.3）。
 * 注册 `runtime/composables` 目录（指向发布包内的 dist/nuxt-runtime/composables），
 * `useThemeAnimation` / `ThemeAnimationType` 无需 import 即可使用（自动导入 + 类型提示）。
 */
export default defineNuxtModule({
  meta: {
    name: 'theme-switch-animation',
    configKey: 'themeSwitchAnimation',
  },
  setup() {
    const { resolve } = createResolver(import.meta.url)
    // addImportsDir 指向目录而非单文件；扫描目录下文件的命名导出（§4）
    addImportsDir(resolve('./runtime/composables'))
  },
})
