'use client'

import { BouncyAccordion } from '@/components/motion/bouncy-accordion'

const FAQS = [
  {
    q: '浏览器不支持 View Transitions 怎么办？',
    a: '自动降级为直接切换：Chrome / Edge 111+、Safari 18+、Firefox 144+ 支持完整动画；不支持的环境或系统开启"减少动态效果"时跳过动画，主题状态永远正确，无需任何额外代码。',
  },
  {
    q: '受控模式怎么接入 next-themes？',
    a: '同时传 isDark 与 onChange 即进入受控模式：库不碰 localStorage、不自行改 class，在转场回调内调用 onChange 并等待外部主题系统真实写入 <html> 后再截图；外部系统 300ms 内未同步到位时自动跳过动画直切（不播放旧→旧空转），状态永远正确。next-themes 与 @nuxtjs/color-mode 的完整接线示例见 GitHub README。',
  },
  {
    q: '同一个页面挂多个切换按钮，状态会同步吗？',
    a: '会。非受控模式下所有实例的 isDark 以 <html> 暗色类名为事实源镜像（observeThemeClass）：任一按钮切换后其它按钮立即同步，其它标签页的切换也经 storage 事件同步。页面级"全局主题指示器"等场景可直接复用这个导出。',
  },
  {
    q: 'Vue 里受控模式的 isDark 不更新？',
    a: 'options 必须是响应式来源：用 reactive() 包装并以 watchEffect 同步外部状态。传普通对象字面量会按 setup 时的快照工作（模式判定已改为动态 computed，但仍需响应式来源才能随后续更新走）——这是最常见的接入错误。',
  },
  {
    q: '为什么 STAR 的最终覆盖范围比 magicui 大？',
    a: '本库的 mask 在转场结束后才移除（fill both），星形的内凹谷方向必须也能盖住视口最远角，否则末帧角落会透出旧主题；magicui 的 clip-path 随转场组销毁，没有这个约束。形状与朝向保持一致，仅终尺寸更大。',
  },
  {
    q: '0.1.x 的 LTR / RTL / TTB / BTT 类型去哪了？',
    a: '0.2.0 起"四向"不再是动画类型，而是普通的 direction 选项：原 LTR/RTL/TTB/BTT 对应 SCAN + direction（取值不变），观感差异只有揭开前缘多了一条 12px 半透明光束带。同一版本新增 BLINDS（百叶窗，slatWidth 控叶宽）与 QR_GRID（方块格子逐格生长）；direction 只对这三种类型生效，其余类型静默忽略，它们的行为与 0.1.x 一致。',
  },
  {
    q: 'Firefox 下没有动画？',
    a: 'Firefox 144+ 支持完整动画（本库已在 Firefox 155 实测：各动画类型全部推进，收起/扩散方向的蒙版半径逐帧插值）。更低版本自动降级为直接切换，状态照常正确。',
  },
] as const

const ITEMS = FAQS.map((item, index) => ({
  id: `faq-${index}`,
  title: item.q,
  description: item.a,
}))

export function FaqSection() {
  return (
    <section id="faq" className="relative z-10 scroll-mt-24 border-b border-dashed border-black/10 py-20 dark:border-white/10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">FAQ</h2>
        </div>
        <BouncyAccordion items={ITEMS} className="mx-auto max-w-3xl" />
      </div>
    </section>
  )
}
