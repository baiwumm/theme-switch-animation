import { Typography } from '@heroui/react'
import {
  Layers,
  Link2,
  PlugZap,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react'

import { SectionHeader } from '@/components/landing/section-header'

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
      '圆形 / 形状 / 百叶窗 / 扫描 / 格子 / 涟漪 / 扇形 / 双开门，方向与参数可调；11 个类型支持 reverse 反向揭开。',
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
  {
    icon: SlidersHorizontal,
    title: '缓动可调',
    description:
      'easing 原样透传给浏览器动画：任意 cubic-bezier 与 linear() 缓动都能用，旧引擎自动以双 animation 声明降级。',
    tags: ['easing', 'cubic-bezier', 'linear()'],
  },
] as const

export function FeaturesSection() {
  return (
    <section id="features" className="scroll-mt-14 border-t border-border">
      <div className="mx-auto w-full max-w-6xl px-6 py-20 sm:py-24">
        <SectionHeader
          eyebrow="01 / 特性"
          sub="约 95% 代码与框架无关，两个薄适配层覆盖 React 与 Vue 生态。"
          title="小而完整的动画层"
        />

        {/* hairline 分格网格：gap-px 露出底色当分隔线，不用卡片阴影 */}
        <div className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="flex flex-col gap-2.5 bg-background px-6 py-7"
            >
              <feature.icon
                aria-hidden
                className="size-5 text-accent"
                size={20}
                strokeWidth={1.6}
              />
              <Typography type="body-sm" weight="medium">
                {feature.title}
              </Typography>
              <Typography color="muted" type="body-xs">
                {feature.description}
              </Typography>
              <Typography
                className="mt-auto pt-2 font-mono text-[11px] text-muted"
                type="body-xs"
              >
                {feature.tags.join(' · ')}
              </Typography>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
