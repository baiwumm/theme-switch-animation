// @ts-check
import { defineNuxtConfig } from 'nuxt/config'

// §9-3 第一组：默认配置，暗色类名为 dark。
// classSuffix 可配置组见 §9-3 验收说明（同 playground 切换配置重跑，验收脚本自动切换）。
export default defineNuxtConfig({
  modules: ['@nuxtjs/color-mode', 'theme-switch-animation/nuxt'],

  colorMode: {
    classSuffix: '',
  },

  // §9-9：模拟真实用户的接入方式——仅声明模块，useThemeAnimation / ThemeAnimationType 自动导入。
  themeSwitchAnimation: {},

  compatibilityDate: '2026-09-11',
})
