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
// 如配置了 classSuffix: '-mode'，把 darkClassName 改成 'dark-mode' 即可（§6.2）。
const { triggerRef, toggleTheme, isDark } = useThemeAnimation<HTMLButtonElement>({
  animationType: ThemeAnimationType.CIRCLE,
  darkClassName: 'dark',
  duration: 500,
  isDark: computed(() => colorMode.value === 'dark'),
  onChange: (next) => {
    colorMode.preference = next ? 'dark' : 'light'
  },
})

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
