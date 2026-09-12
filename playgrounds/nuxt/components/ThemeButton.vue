<script setup lang="ts">
// 按钮组件：每个实例持有自己的 useThemeAnimation（动画类型互不影响）。
// useThemeAnimation / ThemeAnimationType 由本库 nuxt 模块自动导入，无需 import。
const props = defineProps<{
  animationType: ThemeAnimationType
  label: string
  hint: string
  duration: number
  easing: string
}>()

const colorMode = useColorMode()

// options 必须是响应式来源（reactive）：受控模式下 isDark 才能随外部状态更新；
// 传普通对象字面量会让 isDark 冻结在初始值（Phase 4 报告 §3.1）。
// duration / easing 同样经 reactive 承接全局预设，点击时读取当前值。
const options = reactive({
  animationType: props.animationType,
  darkClassName: 'dark',
  duration: props.duration,
  easing: props.easing,
  isDark: false,
  onChange: (next: boolean) => {
    colorMode.preference = next ? 'dark' : 'light'
  },
})
// 暗色类名与 color-mode 配置同源（§9-3 组二 classSuffix '-mode' 时为 'dark-mode'）
options.darkClassName = useRuntimeConfig().public.darkClassName as string
watchEffect(() => {
  options.isDark = colorMode.value === 'dark'
  options.duration = props.duration
  options.easing = props.easing
})

const { triggerRef, toggleTheme, isDark } = useThemeAnimation<HTMLButtonElement>(options)

// 模板 ref 走函数形式，写入 composable 的 triggerRef（SFC 的 :ref 需要 VNodeRef）
const setTrigger = (el: unknown) => {
  triggerRef.value = (el as HTMLButtonElement | null) ?? null
}
</script>

<template>
  <button :ref="setTrigger" class="switch-button" :data-animation-type="animationType" @click="toggleTheme">
    <strong>{{ props.label }}</strong>
    <span class="hint">{{ props.hint }}</span>
    <span class="state">{{ isDark ? '🌙 切到亮色' : '☀️ 切到暗色' }}</span>
  </button>
</template>
