<script setup lang="ts">
import type { ComponentPublicInstance } from "vue"
import { ThemeAnimationType, useThemeAnimation } from "theme-switch-animation/vue"

const props = defineProps<{
  animationType: ThemeAnimationType
  label: string
  hint: string
  pos: string
}>()

// 非受控模式；转场回调内 async () => { …; await nextTick() }，浏览器等 Vue DOM 更新后截图
const { triggerRef, toggleTheme, isDark } = useThemeAnimation<HTMLButtonElement>({
  animationType: props.animationType,
  duration: 500,
})
// 模板 ref 走函数形式，写入 composable 的 triggerRef
const setTrigger = (el: Element | ComponentPublicInstance | null) => {
  triggerRef.value = (el as HTMLButtonElement | null) ?? null
}
</script>

<template>
  <button :ref="setTrigger" :class="['switch-button', pos]" @click="toggleTheme">
    <strong>{{ label }}</strong>
    <span class="hint">{{ hint }}</span>
    <span class="state">{{ isDark ? '🌙 切到亮色' : '☀️ 切到暗色' }}</span>
  </button>
</template>
