'use client'

import { Layers, PlugZap, ShieldCheck, Sparkles } from 'lucide-react'
import { motion } from 'motion/react'

const FEATURES = [
  {
    icon: Layers,
    title: '跨框架',
    description: '一套核心，四种用法：React / Vue composable、Next.js 受控示例、Nuxt 模块自动导入。',
    tags: ['React 18+', 'Vue 3+', 'Next.js', 'Nuxt 3+'],
  },
  {
    icon: Sparkles,
    title: '13 种动画',
    description: '圆形扩散 / 收起 / 模糊、四向擦除、几何形状扩散，起收点跟随点击位置。',
    tags: ['CIRCLE', 'REVERT', 'BLUR', 'STAR', '…'],
  },
  {
    icon: PlugZap,
    title: '受控模式',
    description: '不独占主题状态：next-themes 与 @nuxtjs/color-mode 用户直接接入，库只负责动画。',
    tags: ['next-themes', '@nuxtjs/color-mode'],
  },
  {
    icon: ShieldCheck,
    title: '优雅降级',
    description: '不支持 View Transitions、SSR、prefers-reduced-motion：跳过动画，状态永远正确。',
    tags: ['SSR 安全', 'reduced-motion'],
  },
] as const

export function FeaturesSection() {
  return (
    <section id="features" className="relative z-10 scroll-mt-24 border-b border-dashed border-black/10 py-20 dark:border-white/10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">特性</h2>
          <p className="mt-3 text-muted-foreground">约 95% 代码与框架无关，两个薄适配层覆盖 React 与 Vue 生态。</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.45, delay: index * 0.08 }}
              className="rounded-2xl border bg-card/70 p-6 shadow-sm backdrop-blur transition-colors hover:border-primary/40"
            >
              <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <feature.icon size={20} />
              </div>
              <h3 className="mb-2 font-semibold">{feature.title}</h3>
              <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {feature.tags.map((tag) => (
                  <span key={tag} className="rounded-full border px-2 py-0.5 font-mono text-xs text-muted-foreground">
                    {tag}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
