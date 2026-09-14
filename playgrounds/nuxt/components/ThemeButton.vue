<script setup lang="ts">
// 按钮组件：每个实例持有自己的 useThemeAnimation（动画类型互不影响）。
// useThemeAnimation / ThemeAnimationType 等由本库 nuxt 模块自动导入，无需 import。
const props = defineProps<{
  animationType: ThemeAnimationType
  label: string
  hint: string
  duration: number
  easing: string
}>()

const colorMode = useColorMode()

// options 必须是响应式来源（reactive）：受控模式下 isDark 才能随外部状态更新；
// 普通对象字面量会按 setup 时的快照工作（模式判定本身是动态 computed，但字面量
// 里的 isDark/onChange 不会随后续更新走）——这是最常见的接入错误。
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
