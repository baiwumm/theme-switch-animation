'use client'

import { Layers, Link2, PlugZap, ShieldCheck, Sparkles } from 'lucide-react'
import { motion } from 'motion/react'

import { AnimatedBadge } from '@/components/motion/animated-badge'
import { TiltCard } from '@/components/motion/tilt-card'

const FEATURES = [
  {
    icon: Layers,
    title: '跨框架',
    description:
      '一套核心，四种用法：React / Vue composable、Next.js 受控示例、Nuxt 模块自动导入。',
    tags: ['React 18+', 'Vue 3+', 'Next.js', 'Nuxt 3+'],
  },
  {
    icon: Sparkles,
    title: '15 种动画',
    description:
      '圆形 / 形状 / 百叶窗 / 扫描 / 格子 / 涟漪 / 扇形 / 双开门，方向与参数可调；9 个类型支持 reverse 反向揭开。',
    tags: ['CIRCLE', 'RIPPLE', 'CLOCK_SWEEP', 'BLINDS', '…'],
  },
  {
    icon: PlugZap,
    title: '受控模式',
    description:
      '不独占主题状态：next-themes 与 @nuxtjs/color-mode 用户直接接入，300ms 未同步自动直切。',
    tags: ['next-themes', '@nuxtjs/color-mode'],
  },
  {
    icon: Link2,
    title: '多实例同步',
    description:
      '同页多个实例的 isDark 以 html class 为事实源镜像，其它标签页经 storage 事件同步。',
    tags: ['observeThemeClass', 'finished'],
  },
  {
    icon: ShieldCheck,
    title: '优雅降级',
    description:
      '不支持 View Transitions、SSR、prefers-reduced-motion：跳过动画，状态永远正确。',
    tags: ['SSR 安全', 'reduced-motion'],
  },
] as const

export function FeaturesSection() {
  return (
    <section
      id="features"
      className="relative z-10 scroll-mt-24 border-b border-dashed border-black/10 py-20 dark:border-white/10"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <AnimatedBadge size="sm" className="mb-3">
            Features
          </AnimatedBadge>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            小而完整的动画层
          </h2>
          <p className="mt-3 text-muted-foreground">
            约 95% 代码与框架无关，两个薄适配层覆盖 React 与 Vue 生态。
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.45, delay: index * 0.08 }}
            >
              {/* TiltCard 做外层倾斜 wrapper：glare 光斑的圆角裁剪与卡片圆角对齐都在这层 */}
              <TiltCard max={6} className="h-full rounded-[1.5rem]">
                <div className="card-premium flex h-full flex-col p-6">
                  <span className="icon-tile">
                    <feature.icon
                      size={20}
                      className="text-foreground"
                      strokeWidth={1.75}
                    />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                  <div className="mt-auto flex flex-wrap gap-1.5 pt-5">
                    {feature.tags.map((tag) => (
                      <AnimatedBadge key={tag} size="sm" showIcon={false}>
                        {tag}
                      </AnimatedBadge>
                    ))}
                  </div>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
