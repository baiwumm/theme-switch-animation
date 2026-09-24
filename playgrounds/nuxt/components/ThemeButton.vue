<script setup lang="ts">
// 按钮组件：每个实例持有自己的 useThemeAnimation（动画类型互不影响）。
// useThemeAnimation / ThemeAnimationType 等由本库 nuxt 模块自动导入，无需 import。
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
  /** 仅 FAN：卡片下方的扇叶数按钮初始值 */
  initialBladeCount?: number
  /**
   * 仅 CIRCLE（reverse 已接通的类型）：卡片下方反向三档按钮的初始值。
   * 注意合法值含 `false`，模板里判存在必须用 `!== undefined`，不能写 v-if="initialReverse"。
   */
  initialReverse?: boolean | 'auto'
}>()

const DIRECTION_OPTIONS = [
  ThemeAnimationDirection.LTR,
  ThemeAnimationDirection.RTL,
  ThemeAnimationDirection.TTB,
  ThemeAnimationDirection.BTT,
] as const

const SLAT_OPTIONS = [32, 72, 128] as const

const WAVE_OPTIONS = [10, 18, 34] as const

const BLADE_OPTIONS = [6, 8, 12] as const

/** reverse 三档：off 恒正向 / on 恒反向 / auto 切暗正向、切亮收起（旧 CIRCLE_REVERT 的行为） */
const REVERSE_OPTIONS = [
  { value: false, label: 'off' },
  { value: true, label: 'on' },
  { value: 'auto', label: 'auto' },
] as const

/** 方向：每张卡片独立持有，互不影响 */
const direction = ref<ThemeAnimationDirection>(props.initialDirection ?? ThemeAnimationDirection.LTR)
const slatWidth = ref(props.initialSlatWidth ?? 72)
const waveWidth = ref(props.initialWaveWidth ?? 18)
const bladeCount = ref(props.initialBladeCount ?? 8)
const reverse = ref<boolean | 'auto'>(props.initialReverse ?? false)

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
  direction: direction.value,
  slatWidth: slatWidth.value,
  waveWidth: waveWidth.value,
  bladeCount: bladeCount.value,
  reverse: reverse.value,
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
  options.direction = direction.value
  options.slatWidth = slatWidth.value
  options.waveWidth = waveWidth.value
  options.bladeCount = bladeCount.value
  options.reverse = reverse.value
})

const { triggerRef, toggleTheme, isDark } = useThemeAnimation<HTMLButtonElement>(options)

// 模板 ref 走函数形式，写入 composable 的 triggerRef（SFC 的 :ref 需要 VNodeRef）
const setTrigger = (el: unknown) => {
  triggerRef.value = (el as HTMLButtonElement | null) ?? null
}
</script>

<template>
  <div class="switch-card">
    <button :ref="setTrigger" class="switch-button" :data-animation-type="animationType" @click="toggleTheme">
      <strong>{{ props.label }}</strong>
      <span class="hint">{{ props.hint }}</span>
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
    <div v-if="initialBladeCount" class="slats" :aria-label="`${label} bladeCount`" role="group">
      <span>bladeCount</span>
      <button
        v-for="b in BLADE_OPTIONS"
        :key="b"
        type="button"
        :class="['chip', 'chip-sm', { active: bladeCount === b }]"
        @click="bladeCount = b"
      >
        {{ b }}
      </button>
    </div>
    <div v-if="initialReverse !== undefined" class="slats" :aria-label="`${label} reverse`" role="group">
      <span>reverse</span>
      <button
        v-for="r in REVERSE_OPTIONS"
        :key="String(r.value)"
        type="button"
        :class="['chip', 'chip-sm', { active: reverse === r.value }]"
        @click="reverse = r.value"
      >
        {{ r.label }}
      </button>
    </div>
  </div>
</template>
