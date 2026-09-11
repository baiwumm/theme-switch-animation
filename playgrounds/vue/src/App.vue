<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

import { ThemeAnimationType, useThemeAnimation } from 'theme-switch-animation/vue'

import ThemeButton from './ThemeButton.vue'

const ANIMATION_TYPES = [
  { type: ThemeAnimationType.CIRCLE, label: 'CIRCLE', hint: '圆形扩散 · 圆心 = 点击位置', pos: 'pos-c' },
  { type: ThemeAnimationType.LTR, label: 'LTR', hint: '从左向右擦除', pos: 'pos-tl' },
  { type: ThemeAnimationType.RTL, label: 'RTL', hint: '从右向左擦除', pos: 'pos-tr' },
  { type: ThemeAnimationType.TTB, label: 'TTB', hint: '从上向下擦除', pos: 'pos-bl' },
  { type: ThemeAnimationType.BTT, label: 'BTT', hint: '从下向上擦除', pos: 'pos-br' },
] as const

/** 全局指示器：直接监听 html class，任何实例切换后所有指示器同步 */
const htmlIsDark = ref(false)
let observer: MutationObserver | undefined

onMounted(() => {
  const read = () => {
    htmlIsDark.value = document.documentElement.classList.contains('dark')
  }
  read()
  observer = new MutationObserver(read)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
})

onUnmounted(() => observer?.disconnect())
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
      五个按钮各自是一个独立的 <code>useThemeAnimation</code> 实例（状态以 <code>&lt;html&gt;</code>
      class 为准，互相不会失步）。CIRCLE 的圆心是按钮中心：分别点四角与中间，可以验证扩散起点跟随点击位置。
    </p>
    <div class="grid">
      <ThemeButton
        v-for="t in ANIMATION_TYPES"
        :key="t.type"
        :animation-type="t.type"
        :label="t.label"
        :hint="t.hint"
        :pos="t.pos"
      />
    </div>
    <p class="note">
      View Transitions API 支持范围：Chrome / Edge 111+、Safari 18+、Firefox 144+；不支持的浏览器或系统开启
      “减少动态效果”时自动降级为直接切换（状态仍然正确）。Playwright 的 Firefox 内核可能未启用 View
      Transitions，Firefox 请用真机手动验证。
    </p>
  </main>
</template>
