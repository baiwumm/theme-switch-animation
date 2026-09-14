'use client'

import { ArrowRight, Check, Copy, Github } from 'lucide-react'
import { motion } from 'motion/react'
import Link from 'next/link'
import { useState } from 'react'

import BlurText from '@/components/ui/react-bits/blur-text'
import { TextGenerateEffect } from '@/components/ui/text-generate-effect'
import { REPO_URL } from '@/constants/site'

const INSTALL_CMD = 'npm install theme-switch-animation'

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
    <button
      type="button"
      onClick={copy}
      className="group mx-auto flex w-fit items-center gap-3 rounded-xl border bg-card/80 px-5 py-3 font-mono text-sm shadow-sm backdrop-blur transition-colors hover:border-primary/40"
    >
      <span className="text-muted-foreground select-none">$</span>
      <span>{INSTALL_CMD}</span>
      {copied ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} className="text-muted-foreground opacity-60 group-hover:opacity-100" />}
    </button>
  )
}

export function HeroSection() {
  return (
    <section className="relative z-10 border-b border-dashed border-black/10 dark:border-white/10">
      <div className="container mx-auto p-2 pt-32 pb-16 sm:px-6 md:pt-40 md:pb-24 lg:px-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-7 text-center">
          <motion.div
            initial={{ opacity: 0, y: -14, scale: 0.98, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            transition={{ type: 'spring', stiffness: 320, damping: 26, delay: 0.1 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="group mx-auto flex w-fit items-center gap-3 rounded-full border bg-background/80 p-1 pl-4 shadow-md backdrop-blur transition-colors duration-300 hover:bg-muted dark:border-t-white/5 dark:hover:border-t-border"
            >
              <span className="text-sm font-medium">基于 View Transitions API · 开源 MIT</span>
              <span className="hidden h-4 w-0.5 border-l bg-back dark:border-background dark:bg-zinc-700 md:block" />
              <span className="flex size-6 items-center justify-center overflow-hidden rounded-full bg-muted transition-colors duration-300 group-hover:bg-background">
                <ArrowRight className="size-4" />
              </span>
            </Link>
          </motion.div>

          <div className="mx-auto max-w-3xl">
            <BlurText
              text="Make theme switching cinematic"
              delay={120}
              animateBy="words"
              direction="top"
              className="mb-4 justify-center text-4xl font-bold tracking-tight text-balance md:text-6xl lg:text-7xl"
            />
            <TextGenerateEffect
              words="主题切换动画库：新主题以 13 种形状揭开旧主题，而不是生硬跳变。支持 React / Vue / Next.js / Nuxt；受控模式无缝接入 next-themes / @nuxtjs/color-mode，多实例与跨标签页状态自动同步。"
              className="mx-auto max-w-2xl leading-relaxed text-pretty text-muted-foreground md:text-lg"
              duration={0.5}
            />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 14, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.55 }}
            className="flex w-full max-w-xl flex-col items-center gap-4"
          >
            <InstallCommand />
            <div className="flex flex-row items-center gap-3">
              <a
                href="#gallery"
                className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-6 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
              >
                在下方试玩 13 种动画
              </a>
              <a
                href={REPO_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border bg-background/80 px-6 text-sm font-medium shadow-sm backdrop-blur transition-colors hover:bg-accent"
              >
                <Github size={16} />
                GitHub
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
