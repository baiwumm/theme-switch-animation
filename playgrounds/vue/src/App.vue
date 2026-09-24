<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

import { ThemeAnimationDirection, ThemeAnimationType, observeThemeClass, useThemeAnimation } from 'theme-switch-animation/vue'

import ThemeButton from './ThemeButton.vue'

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
}> = [
  { type: ThemeAnimationType.CIRCLE, label: 'CIRCLE', hint: '圆形扩散 · 圆心 = 点击位置' },
  { type: ThemeAnimationType.CIRCLE_REVERT, label: 'CIRCLE_REVERT', hint: '圆形收起/扩散 · 切回亮色收起、切到暗色扩散' },
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
  { type: ThemeAnimationType.FAN, label: 'FAN', hint: '扇叶旋开 · bladeCount 控扇叶数', initialBladeCount: 8 },
  { type: ThemeAnimationType.CURTAIN, label: 'CURTAIN', hint: '双开门 · 中线向两侧推开' },
  { type: ThemeAnimationType.COMB, label: 'COMB', hint: '梳齿交错 · 奇偶叶片错半拍展开，direction / slatWidth 可调', initialDirection: ThemeAnimationDirection.LTR, initialSlatWidth: 72 },
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

/** 全局指示器：复用库导出的 observeThemeClass——html class 事实源观察器（非受控多实例同步同款机制） */
const htmlIsDark = ref(false)
let stopObserving: (() => void) | undefined

onMounted(() => {
  stopObserving = observeThemeClass(document, 'dark', (dark) => {
    htmlIsDark.value = dark
  })
})

onUnmounted(() => stopObserving?.())
</script>

<template>
  <main>
    <h1>theme-switch-animation · Vue playground</h1>
    <p class="status">
      当前主题（MutationObserver 读取 <code>&lt;html&gt;</code> class）：<b>{{
        htmlIsDark ? '🌙 暗色' : '☀️ 亮色'
      }}</b>
    </p>
    <p>
      17 个按钮各自是一个独立的 <code>useThemeAnimation</code> 实例——非受控模式下所有实例的
      <code>isDark</code> 以 <code>&lt;html&gt;</code> class 为事实源自动镜像（库内
      <code>observeThemeClass</code>），其它标签页的切换经 storage 事件同步。中心扩散与角度扫开类动画（含 RIPPLE / CLOCK_SWEEP / FAN）的起收点都是按钮中心：在不同位置点击可验证跟随效果；BLINDS / SCAN / QR_GRID / CURTAIN / COMB 不读触发元素几何。前一组卡片下方各有独立的 direction 选择，RIPPLE 另有 waveWidth 档位、FAN 另有 bladeCount 档位，都只影响本卡片。
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
        :duration="duration"
        :easing="easing"
      />
    </div>
    <p class="note">
      View Transitions API 支持范围：Chrome / Edge 111+、Safari 18+、Firefox 144+；不支持的浏览器或系统开启
      “减少动态效果”时自动降级为直接切换（状态仍然正确）。
    </p>
  </main>
</template>
