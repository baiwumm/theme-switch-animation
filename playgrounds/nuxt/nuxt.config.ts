// @ts-check
import { defineNuxtConfig } from 'nuxt/config'

// §9-3 分两组：
// 组一（默认）：暗色类名 dark（classPrefix/classSuffix 均为空串）。
// 组二（可配置性）：环境变量 ACCEPTANCE_DARK_CLASS_SUFFIX='-mode' 时，
//   color-mode 的暗色类名变为 'dark-mode'，app.vue 的 darkClassName 同步读取。
const suffix = process.env.ACCEPTANCE_DARK_CLASS_SUFFIX ?? ''

export default defineNuxtConfig({
  modules: ['@nuxtjs/color-mode', 'theme-switch-animation/nuxt'],

  colorMode: {
    classSuffix: suffix,
  },

  // §9-3 组二：把当前暗色类名注入客户端（app.vue 的 darkClassName 与 colorMode 配置保持同源）
  runtimeConfig: {
    public: {
      darkClassName: 'dark' + suffix,
    },
  },

  // §9-9：模拟真实用户的接入方式——仅声明模块，useThemeAnimation / ThemeAnimationType 自动导入。
  themeSwitchAnimation: {},

  compatibilityDate: '2026-09-11',
})
