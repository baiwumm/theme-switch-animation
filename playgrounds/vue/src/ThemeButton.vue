<script setup lang="ts">
import type { ComponentPublicInstance } from "vue"
import { reactive, ref, watchEffect } from "vue"
import { ThemeAnimationDirection, ThemeAnimationType, useThemeAnimation } from "theme-switch-animation/vue"

const props = defineProps<{
  animationType: ThemeAnimationType
  label: string
  hint: string
  duration: number
  easing: string
  /** 消费 direction 的类型才传入；卡片下方的方向按钮初始选中项 */
  initialDirection?: ThemeAnimationDirection
  /** 仅 BLINDS：卡片下方的叶宽按钮初始值（px） */
  initialSlatWidth?: number
  /** 仅 RIPPLE：卡片下方的波长按钮初始值（px） */
  initialWaveWidth?: number
}>()

const DIRECTION_OPTIONS = [
  ThemeAnimationDirection.LTR,
  ThemeAnimationDirection.RTL,
  ThemeAnimationDirection.TTB,
  ThemeAnimationDirection.BTT,
] as const

const SLAT_OPTIONS = [32, 72, 128] as const

const WAVE_OPTIONS = [10, 18, 34] as const

/** 方向：每张卡片独立持有，互不影响 */
const direction = ref<ThemeAnimationDirection>(props.initialDirection ?? ThemeAnimationDirection.LTR)
const slatWidth = ref(props.initialSlatWidth ?? 72)
const waveWidth = ref(props.initialWaveWidth ?? 18)

// options 用 reactive 承接全局 duration / easing 预设的变化：适配层在点击时读取
// optionsRef.value 的当前属性，watchEffect 同步 props 后下一次切换立即生效。
// （Phase 4 报告 §3.1 的同款约定：options 传普通对象字面量会按 setup 时的快照工作——
// 模式判定本身是动态 computed，但字面量里的字段不会随后续更新走。）
// 返回值 finished（shallowRef）亦可解构使用：watch / await 它拿最新一轮动画的结束时机。
const options = reactive({
  animationType: props.animationType,
  duration: props.duration,
  easing: props.easing,
  direction: direction.value,
  slatWidth: slatWidth.value,
  waveWidth: waveWidth.value,
})
watchEffect(() => {
  options.duration = props.duration
  options.easing = props.easing
  options.direction = direction.value
  options.slatWidth = slatWidth.value
  options.waveWidth = waveWidth.value
})

// 非受控模式；转场回调内 async () => { …; await nextTick() }，浏览器等 Vue DOM 更新后截图
const { triggerRef, toggleTheme, isDark } = useThemeAnimation<HTMLButtonElement>(options)
// 模板 ref 走函数形式，写入 composable 的 triggerRef
const setTrigger = (el: Element | ComponentPublicInstance | null) => {
  triggerRef.value = (el as HTMLButtonElement | null) ?? null
}
</script>

<template>
  <div class="switch-card">
    <button :ref="setTrigger" class="switch-button" :data-animation-type="animationType" @click="toggleTheme">
      <strong>{{ label }}</strong>
      <span class="hint">{{ hint }}</span>
      <span class="state">{{ isDark ? '🌙 切到亮色' : '☀️ 切到暗色' }}</span>
    </button>
    <div v-if="initialDirection" class="directions" :aria-label="`${label} direction`" role="group">
      <span>direction</span>
      <button
        v-for="d in DIRECTION_OPTIONS"
        :key="d"
        type="button"
        :class="['chip', 'chip-sm', { active: direction === d }]"
        @click="direction = d"
      >
        {{ d.toUpperCase() }}
      </button>
    </div>
    <div v-if="initialSlatWidth" class="slats" :aria-label="`${label} slatWidth`" role="group">
      <span>slatWidth</span>
      <button
        v-for="s in SLAT_OPTIONS"
        :key="s"
        type="button"
        :class="['chip', 'chip-sm', { active: slatWidth === s }]"
        @click="slatWidth = s"
      >
        {{ s }}px
      </button>
    </div>
    <div v-if="initialWaveWidth" class="slats" :aria-label="`${label} waveWidth`" role="group">
      <span>waveWidth</span>
      <button
        v-for="w in WAVE_OPTIONS"
        :key="w"
        type="button"
        :class="['chip', 'chip-sm', { active: waveWidth === w }]"
        @click="waveWidth = w"
      >
        {{ w }}px
      </button>
    </div>
  </div>
</template>
