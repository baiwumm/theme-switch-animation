<script setup lang="ts">
// §9-9：useThemeAnimation / ThemeAnimationType 由本库 nuxt 模块自动导入，无需 import
const colorMode = useColorMode()

const ANIMATION_TYPES = [
  { type: ThemeAnimationType.CIRCLE, label: 'CIRCLE', hint: '圆形扩散 · 圆心 = 点击位置', pos: 'pos-c' },
  { type: ThemeAnimationType.LTR, label: 'LTR', hint: '从左向右擦除', pos: 'pos-tl' },
  { type: ThemeAnimationType.RTL, label: 'RTL', hint: '从右向左擦除', pos: 'pos-tr' },
  { type: ThemeAnimationType.TTB, label: 'TTB', hint: '从上向下擦除', pos: 'pos-bl' },
  { type: ThemeAnimationType.BTT, label: 'BTT', hint: '从下向上擦除', pos: 'pos-br' },
] as const

// @nuxtjs/color-mode 默认 classPrefix/classSuffix 均为空串，暗色类名是 dark。
// 配置了 classSuffix: '-mode' 时暗色类名是 'dark-mode'（§6.2），darkClassName 需同步。
// options 必须是响应式来源（reactive）：isDark/onChange 才能随外部状态更新——
// 传普通对象字面量会让受控模式的 isDark 冻结在初始值（Phase 5 文档需写明此约定）。
const options = reactive({
  animationType: ThemeAnimationType.CIRCLE,
  darkClassName: 'dark',
  duration: 500,
  isDark: false,
  onChange: (next: boolean) => {
    colorMode.preference = next ? 'dark' : 'light'
  },
})
// §9-3 组二：classSuffix '-mode' 时 color-mode 写入的类名是 'dark-mode'，
// 经 runtimeConfig 从 nuxt.config 传入（服务端与客户端一致）
options.darkClassName = useRuntimeConfig().public.darkClassName as string
watchEffect(() => {
  options.isDark = colorMode.value === 'dark'
})

const { triggerRef, toggleTheme, isDark } = useThemeAnimation<HTMLButtonElement>(options)

// 模板 ref 走函数形式，写入 composable 的 triggerRef（SFC 的 :ref 需要 VNodeRef）
const setTrigger = (el: unknown) => {
  triggerRef.value = (el as HTMLButtonElement | null) ?? null
}
</script>

<template>
  <main>
    <h1>theme-switch-animation · Nuxt playground</h1>
    <p class="status">
      受控模式 × @nuxtjs/color-mode（colorMode: <b>{{ colorMode.preference }}</b>，html class:
      <b>{{ isDark ? 'dark' : 'light' }}</b>）
    </p>
    <div class="grid">
      <button
        v-for="t in ANIMATION_TYPES"
        :key="t.type"
        :ref="t.type === ThemeAnimationType.CIRCLE ? setTrigger : undefined"
        :class="['switch-button', t.pos]"
        @click="toggleTheme"
      >
        <strong>{{ t.label }}</strong>
        <span class="hint">{{ t.hint }}</span>
        <span class="state">{{ isDark ? '🌙 切到亮色' : '☀️ 切到暗色' }}</span>
      </button>
    </div>
    <p class="note">
      注：五按钮共享同一个 toggleTheme（演示受控模式下多触发器同状态源）；CIRCLE 的 ref 绑定在中央按钮。
      验收提示（§9-3）：默认类名 dark 通过后，再切 classSuffix: '-mode' + darkClassName: 'dark-mode' 验证可配置性。
    </p>
  </main>
</template>

<style src="./assets/playground.css"></style>
