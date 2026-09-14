<script setup lang="ts">
import type { ComponentPublicInstance } from "vue"
import { reactive, watchEffect } from "vue"
import { ThemeAnimationType, useThemeAnimation } from "theme-switch-animation/vue"

const props = defineProps<{
  animationType: ThemeAnimationType
  label: string
  hint: string
  duration: number
  easing: string
}>()

// options 用 reactive 承接全局 duration / easing 预设的变化：适配层在点击时读取
// optionsRef.value 的当前属性，watchEffect 同步 props 后下一次切换立即生效。
// （Phase 4 报告 §3.1 的同款约定：options 传普通对象字面量会按 setup 时的快照工作——
// 模式判定本身是动态 computed，但字面量里的字段不会随后续更新走。）
// 返回值 finished（shallowRef）亦可解构使用：watch / await 它拿最新一轮动画的结束时机。
const options = reactive({
  animationType: props.animationType,
  duration: props.duration,
  easing: props.easing,
})
watchEffect(() => {
  options.duration = props.duration
  options.easing = props.easing
})

// 非受控模式；转场回调内 async () => { …; await nextTick() }，浏览器等 Vue DOM 更新后截图
const { triggerRef, toggleTheme, isDark } = useThemeAnimation<HTMLButtonElement>(options)
// 模板 ref 走函数形式，写入 composable 的 triggerRef
const setTrigger = (el: Element | ComponentPublicInstance | null) => {
  triggerRef.value = (el as HTMLButtonElement | null) ?? null
}
</script>

<template>
  <button :ref="setTrigger" class="switch-button" :data-animation-type="animationType" @click="toggleTheme">
    <strong>{{ label }}</strong>
    <span class="hint">{{ hint }}</span>
    <span class="state">{{ isDark ? '🌙 切到亮色' : '☀️ 切到暗色' }}</span>
  </button>
</template>
