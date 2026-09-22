'use client'

import { Layers, Link2, PlugZap, ShieldCheck, Sparkles } from 'lucide-react'
import { motion } from 'motion/react'

import { AnimatedBadge } from '@/components/motion/animated-badge'

const FEATURES = [
  {
    icon: Layers,
    title: '跨框架',
    description: '一套核心，四种用法：React / Vue composable、Next.js 受控示例、Nuxt 模块自动导入。',
    tags: ['React 18+', 'Vue 3+', 'Next.js', 'Nuxt 3+'],
    tile: 'from-sky-500 to-indigo-500',
  },
  {
    icon: Sparkles,
    title: '12 种动画',
    description: '圆形扩散 / 收起 / 模糊与几何形状扩散（起收点跟随点击位置），百叶窗 / 扫描 / 方块格子（direction 控方向）。',
    tags: ['CIRCLE', 'STAR', 'BLINDS', 'QR_GRID', '…'],
    tile: 'from-fuchsia-500 to-rose-500',
  },
  {
    icon: PlugZap,
    title: '受控模式',
    description: '不独占主题状态：next-themes 与 @nuxtjs/color-mode 用户直接接入，300ms 未同步自动直切。',
    tags: ['next-themes', '@nuxtjs/color-mode'],
    tile: 'from-emerald-500 to-teal-500',
  },
  {
    icon: Link2,
    title: '多实例同步',
    description: '同页多个实例的 isDark 以 html class 为事实源镜像，其它标签页经 storage 事件同步。',
    tags: ['observeThemeClass', 'finished'],
    tile: 'from-violet-500 to-purple-500',
  },
  {
    icon: ShieldCheck,
    title: '优雅降级',
    description: '不支持 View Transitions、SSR、prefers-reduced-motion：跳过动画，状态永远正确。',
    tags: ['SSR 安全', 'reduced-motion'],
    tile: 'from-amber-500 to-orange-500',
  },
] as const

export function FeaturesSection() {
  return (
    <section id="features" className="relative z-10 scroll-mt-24 border-b border-dashed border-black/10 py-20 dark:border-white/10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <AnimatedBadge size="sm" className="mb-3">
            Features
          </AnimatedBadge>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">小而完整的动画层</h2>
          <p className="mt-3 text-muted-foreground">约 95% 代码与框架无关，两个薄适配层覆盖 React 与 Vue 生态。</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.45, delay: index * 0.08 }}
              className="glass-card group relative flex flex-col overflow-hidden rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_48px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_16px_48px_rgba(0,0,0,0.5)]"
            >
              {/* 顶部流光：悬浮时显现 */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div
                className={`mb-5 flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg transition-transform duration-300 group-hover:scale-110 ${feature.tile}`}
              >
                <feature.icon size={22} />
              </div>
              <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
              <p className="mb-5 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
              <div className="mt-auto flex flex-wrap gap-1.5">
                {feature.tags.map((tag) => (
                  <AnimatedBadge key={tag} size="sm" showIcon={false}>
                    {tag}
                  </AnimatedBadge>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
