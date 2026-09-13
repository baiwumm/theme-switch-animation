'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

const FAQS = [
  {
    q: '浏览器不支持 View Transitions 怎么办？',
    a: '自动降级为直接切换：Chrome / Edge 111+、Safari 18+、Firefox 144+ 支持完整动画；不支持的环境或系统开启"减少动态效果"时跳过动画，主题状态永远正确，无需任何额外代码。',
  },
  {
    q: '受控模式怎么接入 next-themes？',
    a: '同时传 isDark 与 onChange 即进入受控模式：库不碰 localStorage、不自行改 class，在转场回调内调用 onChange 并等待外部主题系统真实写入 <html> 后再截图。next-themes 与 @nuxtjs/color-mode 的完整接线示例见 GitHub README。',
  },
  {
    q: 'Vue 里受控模式的 isDark 不更新？',
    a: 'options 必须是响应式来源：用 reactive() 包装并以 watchEffect 同步外部状态。传普通对象字面量会让 isDark 冻结在初始值——这是最常见的接入错误。',
  },
  {
    q: '为什么 STAR 的最终覆盖范围比 magicui 大？',
    a: '本库的 mask 在转场结束后才移除（fill both），星形的内凹谷方向必须也能盖住视口最远角，否则末帧角落会透出旧主题；magicui 的 clip-path 随转场组销毁，没有这个约束。形状与朝向保持一致，仅终尺寸更大。',
  },
  {
    q: 'Firefox 下没有动画？',
    a: 'Firefox 144+ 才支持 View Transitions，且自动化测试矩阵（Playwright）只覆盖 Chromium 与 WebKit——Playwright 自带的 Firefox 内核可能未默认启用。请在真机 Firefox 上手动验证。',
  },
] as const

export function FaqSection() {
  return (
    <section id="faq" className="relative z-10 scroll-mt-24 border-b border-dashed border-black/10 py-20 dark:border-white/10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">FAQ</h2>
        </div>
        <Accordion type="single" collapsible className="mx-auto max-w-3xl">
          {FAQS.map((item, index) => (
            <AccordionItem key={item.q} value={`item-${index}`}>
              <AccordionTrigger className="text-left">{item.q}</AccordionTrigger>
              <AccordionContent className="leading-relaxed text-muted-foreground">{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
