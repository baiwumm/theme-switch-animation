<script setup lang="ts">
// §9-9：useThemeAnimation / ThemeAnimationType / observeThemeClass 等由本库 nuxt 模块自动导入，无需 import；
// ThemeButton 由 Nuxt 组件自动导入扫描 components/ 目录
const colorMode = useColorMode()

const ANIMATION_TYPES: Array<{
  type: ThemeAnimationType
  label: string
  hint: string
  /** 消费 direction 的类型：卡片下方渲染独立的方向选择按钮 */
  initialDirection?: ThemeAnimationDirection
  /** 仅 BLINDS：卡片下方渲染叶宽选择按钮 */
  initialSlatWidth?: number
  /** 仅 RIPPLE：卡片下方渲染波长选择按钮 */
  initialWaveWidth?: number
  /** 仅 FAN：卡片下方渲染扇叶数选择按钮 */
  initialBladeCount?: number
  /** 仅 CIRCLE（reverse 已接通的类型）：卡片下方渲染反向三档按钮 */
  initialReverse?: boolean | 'auto'
}> = [
  { type: ThemeAnimationType.CIRCLE, label: 'CIRCLE', hint: '圆形扩散 · 圆心 = 点击位置', initialReverse: false },
  { type: ThemeAnimationType.CIRCLE_REVERT, label: 'CIRCLE_REVERT', hint: '已废弃 · 等价于 CIRCLE + reverse:auto' },
  { type: ThemeAnimationType.CIRCLE_BLUR, label: 'CIRCLE_BLUR', hint: '圆形模糊扩散 · 边缘高斯模糊' },
  { type: ThemeAnimationType.SQUARE, label: 'SQUARE', hint: '正方形扩散' },
  { type: ThemeAnimationType.DIAMOND, label: 'DIAMOND', hint: '菱形扩散' },
  { type: ThemeAnimationType.RECTANGLE, label: 'RECTANGLE', hint: '矩形扩散 · 贴合视口比例' },
  { type: ThemeAnimationType.HEXAGON, label: 'HEXAGON', hint: '六边形扩散 · 尖顶朝上' },
  { type: ThemeAnimationType.TRIANGLE, label: 'TRIANGLE', hint: '三角形扩散 · 顶点朝上' },
  { type: ThemeAnimationType.STAR, label: 'STAR', hint: '五角星扩散 · 顶点朝上' },
  { type: ThemeAnimationType.BLINDS, label: 'BLINDS', hint: '百叶窗 · 叶片逐条揭开，direction 控方向', initialDirection: ThemeAnimationDirection.LTR, initialSlatWidth: 72 },
  { type: ThemeAnimationType.SCAN, label: 'SCAN', hint: '扫描 · 硬边扫开 + 前缘光束，direction 控方向', initialDirection: ThemeAnimationDirection.TTB },
  { type: ThemeAnimationType.QR_GRID, label: 'QR_GRID', hint: '方块格子 · 方块逐格生长，direction 控方位', initialDirection: ThemeAnimationDirection.LTR },
  { type: ThemeAnimationType.RIPPLE, label: 'RIPPLE', hint: '水滴涟漪 · 环带前缘向外推，waveWidth 控波长', initialWaveWidth: 18 },
  { type: ThemeAnimationType.CLOCK_SWEEP, label: 'CLOCK_SWEEP', hint: '时钟扇形 · 自 12 点顺时针扫开' },
  { type: ThemeAnimationType.FAN, label: 'FAN', hint: '扇叶旋开 · bladeCount 控扇叶数，reverse 改为合拢', initialBladeCount: 8, initialReverse: false },
  { type: ThemeAnimationType.CURTAIN, label: 'CURTAIN', hint: '双开门 · 中线向两侧推开' },
]

/** duration / easing 全局预设：选中后所有按钮的下一次切换立即生效 */
const DURATION_PRESETS = [
  { value: 500, label: '500ms · 快' },
  { value: 750, label: '750ms · 标准' },
  { value: 1000, label: '1000ms · 慢' },
]
const EASING_PRESETS = [
  { value: 'ease-in-out', label: 'ease-in-out' },
  { value: 'cubic-bezier(0.4, 0, 0.2, 1)', label: 'cubic-bezier' },
  { value: 'linear', label: 'linear · 匀速' },
]
const duration = ref(750)
const easing = ref('ease-in-out')

// 全局指示器：复用库自动导入的 observeThemeClass（受控模式，状态源是 color-mode 写入的 html class）
const htmlIsDark = ref(false)
let stopObserving: (() => void) | undefined

const darkClassName = useRuntimeConfig().public.darkClassName as string

onMounted(() => {
  stopObserving = observeThemeClass(document, darkClassName, (dark) => {
    htmlIsDark.value = dark
  })
})
onUnmounted(() => stopObserving?.())
</script>

<template>
  <main>
    <h1>theme-switch-animation · Nuxt playground</h1>
    <p class="status">
      受控模式 × @nuxtjs/color-mode（colorMode: <b>{{ colorMode.preference }}</b>，html class:
      <b>{{ htmlIsDark ? darkClassName : 'light' }}</b>）
    </p>
    <p>
      16 个按钮各持有一个受控 <code>useThemeAnimation</code> 实例（自动导入，无 import）；
      库在转场回调内调用 <code>colorMode.preference = …</code> 并等待 color-mode 写入 class 后截图，
      300ms 未同步到位时自动跳过动画直切（不播放“旧→旧”空转）。
      每个按钮使用自己声明的动画类型（中心扩散与角度扫开类动画含 RIPPLE / CLOCK_SWEEP / FAN 的起收点是按钮中心，可验证点击位置跟随；BLINDS / SCAN / QR_GRID / CURTAIN 不读触发元素几何）。前一组卡片下方各有独立的 direction 选择，RIPPLE 另有 waveWidth 档位、FAN 另有 bladeCount 档位，都只影响本卡片。
    </p>
    <div class="presets" role="group" aria-label="duration 预设">
      <span>duration</span>
      <button
        v-for="p in DURATION_PRESETS"
        :key="p.value"
        :class="['chip', { active: duration === p.value }]"
        @click="duration = p.value"
      >
        {{ p.label }}
      </button>
    </div>
    <div class="presets" role="group" aria-label="easing 预设">
      <span>easing</span>
      <button
        v-for="p in EASING_PRESETS"
        :key="p.value"
        :class="['chip', { active: easing === p.value }]"
        @click="easing = p.value"
      >
        {{ p.label }}
      </button>
    </div>
    <div class="grid">
      <ThemeButton
        v-for="t in ANIMATION_TYPES"
        :key="t.type"
        :animation-type="t.type"
        :label="t.label"
        :hint="t.hint"
        :initial-direction="t.initialDirection"
        :initial-slat-width="t.initialSlatWidth"
        :initial-wave-width="t.initialWaveWidth"
        :initial-blade-count="t.initialBladeCount"
        :initial-reverse="t.initialReverse"
        :duration="duration"
        :easing="easing"
      />
    </div>
    <p class="note">
      验收提示（§9-3）：默认类名 <code>dark</code> 通过后，再切 <code>classSuffix: '-mode'</code> +
      <code>darkClassName: 'dark-mode'</code> 验证可配置性。不复用非受控模式，也不共享单实例——
      每个按钮的动画类型独立生效。
    </p>
  </main>
</template>

<style src="./assets/playground.css"></style>
