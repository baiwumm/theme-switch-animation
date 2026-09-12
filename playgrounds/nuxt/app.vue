<script setup lang="ts">
// §9-9：useThemeAnimation / ThemeAnimationType 由本库 nuxt 模块自动导入，无需 import；
// ThemeButton 由 Nuxt 组件自动导入扫描 components/ 目录
const colorMode = useColorMode()

const ANIMATION_TYPES: Array<{
  type: ThemeAnimationType
  label: string
  hint: string
  duration?: number
}> = [
  { type: ThemeAnimationType.CIRCLE, label: 'CIRCLE', hint: '圆形扩散 · 圆心 = 点击位置' },
  { type: ThemeAnimationType.CIRCLE_REVERT, label: 'CIRCLE_REVERT', hint: '圆形收起 · 旧主题收缩进点击点' },
  { type: ThemeAnimationType.CIRCLE_BLUR, label: 'CIRCLE_BLUR', hint: '圆形模糊扩散 · 边缘高斯模糊', duration: 750 },
  { type: ThemeAnimationType.LTR, label: 'LTR', hint: '从左向右擦除' },
  { type: ThemeAnimationType.RTL, label: 'RTL', hint: '从右向左擦除' },
  { type: ThemeAnimationType.TTB, label: 'TTB', hint: '从上向下擦除' },
  { type: ThemeAnimationType.BTT, label: 'BTT', hint: '从下向上擦除' },
  { type: ThemeAnimationType.SQUARE, label: 'SQUARE', hint: '正方形扩散' },
  { type: ThemeAnimationType.DIAMOND, label: 'DIAMOND', hint: '菱形扩散' },
  { type: ThemeAnimationType.RECTANGLE, label: 'RECTANGLE', hint: '矩形扩散 · 贴合视口比例' },
  { type: ThemeAnimationType.HEXAGON, label: 'HEXAGON', hint: '六边形扩散 · 尖顶朝上' },
  { type: ThemeAnimationType.TRIANGLE, label: 'TRIANGLE', hint: '三角形扩散 · 顶点朝上' },
  { type: ThemeAnimationType.STAR, label: 'STAR', hint: '五角星扩散 · 顶点朝上' },
]

// 全局指示器：直接监听 html class，任何实例切换后同步（受控模式，状态源是 color-mode）
const htmlIsDark = ref(false)
let observer: MutationObserver | undefined

const darkClassName = useRuntimeConfig().public.darkClassName as string

onMounted(() => {
  const read = () => {
    htmlIsDark.value = document.documentElement.classList.contains(darkClassName)
  }
  read()
  observer = new MutationObserver(read)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
})
onUnmounted(() => observer?.disconnect())
</script>

<template>
  <main>
    <h1>theme-switch-animation · Nuxt playground</h1>
    <p class="status">
      受控模式 × @nuxtjs/color-mode（colorMode: <b>{{ colorMode.preference }}</b>，html class:
      <b>{{ htmlIsDark ? darkClassName : 'light' }}</b>）
    </p>
    <p>
      13 个按钮各持有一个受控 <code>useThemeAnimation</code> 实例（自动导入，无 import）；
      库在转场回调内调用 <code>colorMode.preference = …</code> 并等待 color-mode 写入 class 后截图。
      每个按钮使用自己声明的动画类型（中心扩散类动画的起收点是按钮中心，可验证点击位置跟随）。
    </p>
    <div class="grid">
      <ThemeButton
        v-for="t in ANIMATION_TYPES"
        :key="t.type"
        :animation-type="t.type"
        :label="t.label"
        :hint="t.hint"
        :duration="t.duration"
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
