'use client'

import { Button, Typography } from '@heroui/react'
import { Check, Copy } from 'lucide-react'
import { useState } from 'react'

import { PromoVideo } from '@/components/landing/promo-video'
import { GithubIcon } from '@/components/ui/brand-icons'
import { FlowNumber } from '@/components/ui/flow-number'
import { REPO_URL } from '@/constants/site'

const INSTALL_CMD = 'npm install theme-switch-animation'

const STATS = [
  { label: '动画类型', value: 15 },
  { label: 'reverse 反向', value: 9 },
  { label: '框架适配', value: 4 },
  { label: '框架无关代码', value: 95, suffix: '%' },
] as const

function InstallCommand() {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(INSTALL_CMD)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // 剪贴板不可用（如非安全上下文）时静默
    }
  }

  return (
    <div className="frame reveal w-fit" style={{ animationDelay: '240ms' }}>
      <div className="flex items-center gap-3 px-4 py-2.5 font-mono text-[13px]">
        <span aria-hidden className="select-none text-accent">
          $
        </span>
        <span className="whitespace-nowrap">{INSTALL_CMD}</span>
        <Button
          isIconOnly
          aria-label="复制安装命令"
          size="sm"
          variant="ghost"
          onPress={copy}
        >
          {copied ? (
            <Check className="size-3.5 text-success" />
          ) : (
            <Copy className="size-3.5" />
          )}
        </Button>
      </div>
    </div>
  )
}

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* 朱红氛围光：低占比 radial，只铺首屏右上方（与参考站同一手法） */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(760px circle at 80% 22%, color-mix(in oklab, var(--accent) 14%, transparent), transparent 70%)',
        }}
      />

      <div className="relative mx-auto w-full max-w-6xl px-6 pt-16 pb-14 sm:pt-24">
        {/* 主体行：左文案 + 右视频，垂直居中（与 better-admin 排版一致） */}
        <div className="flex flex-col gap-12 lg:flex-row lg:items-center lg:gap-16">
          <div className="flex min-w-0 flex-1 flex-col items-start gap-6">
            <Typography
              className="eyebrow reveal"
              type="body-xs"
              weight="semibold"
            >
              View Transitions API · MIT
            </Typography>

            <Typography
              className="reveal max-w-xl text-balance text-4xl leading-[1.12] tracking-tight sm:text-5xl"
              style={{ animationDelay: '80ms' }}
              type="h1"
              weight="semibold"
            >
              Theme switching, cinematic
            </Typography>

            <Typography
              className="reveal max-w-xl text-pretty leading-relaxed"
              color="muted"
              style={{ animationDelay: '160ms' }}
              type="body-sm"
            >
              15 种形状揭开新主题，React / Vue / Next.js / Nuxt 通用。
            </Typography>

            <InstallCommand />

            <div className="reveal flex flex-wrap items-center gap-3 pt-1">
              <Button
                size="lg"
                variant="primary"
                onPress={() =>
                  document
                    .getElementById('gallery')
                    ?.scrollIntoView({ behavior: 'smooth' })
                }
              >
                在下方试玩 15 种动画
              </Button>
              <Button
                size="lg"
                variant="outline"
                onPress={() =>
                  window.open(REPO_URL, '_blank', 'noopener,noreferrer')
                }
              >
                <GithubIcon className="size-4" />
                GitHub
              </Button>
            </div>
          </div>

          {/* 右：产品宣传片（渐入延迟与参考站 spec-sheet 同款节奏） */}
          <div
            className="reveal min-w-0 flex-1"
            style={{ animationDelay: '400ms' }}
          >
            <PromoVideo />
          </div>
        </div>

        {/* 数据行：主体行之下单独一行，通栏 hairline + 全宽 4 列（better-admin 同款） */}
        <dl
          className="reveal mt-14 grid w-full grid-cols-2 gap-8 border-t border-border pt-8 sm:grid-cols-4"
          style={{ animationDelay: '480ms' }}
        >
          {STATS.map((stat) => (
            <div key={stat.label} className="flex min-w-0 flex-col gap-1">
              <dt>
                <Typography color="muted" type="body-xs">
                  {stat.label}
                </Typography>
              </dt>
              <dd className="font-mono text-3xl tabular-nums sm:text-4xl">
                <FlowNumber
                  suffix={'suffix' in stat ? stat.suffix : undefined}
                  value={stat.value}
                />
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
