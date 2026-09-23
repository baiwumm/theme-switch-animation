'use client'

import { ArrowRight, Check, Copy } from 'lucide-react'
import { motion } from 'motion/react'
import Link from 'next/link'
import { useState } from 'react'

import { Button, ButtonLink } from '@/components/motion/button/base'
import { TextReveal } from '@/components/motion/text-reveal'
import { GithubIcon } from '@/components/ui/brand-icons'
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
    <Button
      variant="secondary"
      onClick={copy}
      className="group font-mono whitespace-nowrap"
    >
      <span className="text-muted-foreground select-none">$</span>
      <span>{INSTALL_CMD}</span>
      {copied ? (
        <Check size={15} className="text-emerald-500" />
      ) : (
        <Copy
          size={15}
          className="text-muted-foreground opacity-60 group-hover:opacity-100"
        />
      )}
    </Button>
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
            transition={{
              type: 'spring',
              stiffness: 320,
              damping: 26,
              delay: 0.1,
            }}
            whileTap={{ scale: 0.98 }}
          >
            <Link
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="group mx-auto flex w-fit items-center gap-3 rounded-full border bg-background/80 p-1 pl-4 shadow-md backdrop-blur transition-colors duration-300 hover:bg-muted dark:border-t-white/5 dark:hover:border-t-border"
            >
              <span className="text-sm font-medium">
                View Transitions API · MIT
              </span>
              <span className="hidden h-4 w-0.5 border-l bg-border md:block" />
              {/* 箭头循环滑入：两支箭头错开一个圆宽，悬停时整体右移，视觉上无限推进 */}
              <span className="relative flex size-6 items-center justify-center overflow-hidden rounded-full bg-muted transition-colors duration-300 group-hover:bg-background">
                <ArrowRight className="absolute inset-0 m-auto size-4 transition-transform duration-300 ease-out group-hover:translate-x-6 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
                <ArrowRight className="absolute inset-0 m-auto size-4 -translate-x-6 transition-transform duration-300 ease-out group-hover:translate-x-0 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
              </span>
            </Link>
          </motion.div>

          <div className="mx-auto max-w-2xl">
            <TextReveal
              as="h1"
              text="Theme switching, cinematic"
              stagger={0.1}
              yOffset={-40}
              blur={10}
              className="mb-5 text-4xl font-bold tracking-tight text-balance md:text-6xl"
            />
            <TextReveal
              as="p"
              text="13 种形状揭开新主题，React / Vue / Next.js / Nuxt 通用。"
              split="char"
              stagger={0.022}
              yOffset={0}
              blur={8}
              className="mx-auto max-w-xl leading-relaxed text-pretty text-muted-foreground md:text-lg"
            />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 14, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 28,
              delay: 0.55,
            }}
            className="flex w-full max-w-xl flex-col items-center gap-4"
          >
            <InstallCommand />
            <div className="flex flex-row items-center gap-3">
              <ButtonLink href="#gallery">在下方试玩 13 种动画</ButtonLink>
              <ButtonLink
                href={REPO_URL}
                target="_blank"
                rel="noreferrer"
                variant="secondary"
              >
                <GithubIcon className="size-4" />
                GitHub
              </ButtonLink>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
