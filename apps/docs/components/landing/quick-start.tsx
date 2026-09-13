'use client'

import { Check, Copy } from 'lucide-react'
import { useState } from 'react'

import { NextIcon, NuxtIcon, ReactIcon, VueIcon } from '@/components/ui/framework-icons'
import { REPO_URL } from '@/constants/site'

const INSTALL_CMD = 'npm install theme-switch-animation'

const FRAMEWORKS = [
  {
    id: 'react',
    label: 'React',
    Icon: ReactIcon,
    iconClass: 'text-sky-500',
    install: INSTALL_CMD,
    code: `'use client'
import { ThemeAnimationType, useThemeAnimation } from 'theme-switch-animation/react'

export function ThemeToggle() {
  // 非受控：库内部管理 localStorage + <html> class
  const { ref, toggleTheme, isDark } = useThemeAnimation({
    animationType: ThemeAnimationType.CIRCLE,
    duration: 750,
  })

  return (
    <button ref={ref} onClick={toggleTheme}>
      {isDark ? '🌙' : '☀️'}
    </button>
  )
}`,
  },
  {
    id: 'next',
    label: 'Next.js',
    Icon: NextIcon,
    iconClass: 'text-foreground',
    install: INSTALL_CMD,
    code: `'use client'
import { useTheme } from 'next-themes'
import { ThemeAnimationType, useThemeAnimation } from 'theme-switch-animation/react'

export function ThemeToggle() {
  // 受控模式 × next-themes（§6.1）：App Router 组件需 'use client'
  const { resolvedTheme, setTheme } = useTheme()
  const { ref, toggleTheme, isDark } = useThemeAnimation({
    animationType: ThemeAnimationType.CIRCLE,
    duration: 750,
    isDark: resolvedTheme === 'dark',
    onChange: (next) => setTheme(next ? 'dark' : 'light'),
  })

  return (
    <button ref={ref} onClick={toggleTheme}>
      {isDark ? '🌙' : '☀️'}
    </button>
  )
}`,
  },
  {
    id: 'vue',
    label: 'Vue',
    Icon: VueIcon,
    iconClass: '',
    install: INSTALL_CMD,
    code: `<script setup lang="ts">
import { ThemeAnimationType, useThemeAnimation } from 'theme-switch-animation/vue'

// 非受控模式；转场回调内 await nextTick()，浏览器等 Vue DOM 更新后截图
const { triggerRef, toggleTheme, isDark } = useThemeAnimation<HTMLButtonElement>({
  animationType: ThemeAnimationType.CIRCLE,
  duration: 750,
})
</script>

<template>
  <!-- 模板 ref 需函数形式桥接（SFC :ref 要求 VNodeRef） -->
  <button :ref="(el) => (triggerRef = el)" @click="toggleTheme">
    {{ isDark ? '🌙' : '☀️' }}
  </button>
</template>`,
  },
  {
    id: 'nuxt',
    label: 'Nuxt',
    Icon: NuxtIcon,
    iconClass: '',
    install: INSTALL_CMD,
    code: `// nuxt.config.ts —— 仅注册模块，useThemeAnimation / ThemeAnimationType 自动导入
export default defineNuxtConfig({
  modules: ['theme-switch-animation/nuxt'],
})

<!-- 组件内无需 import，且自带完整类型提示 -->
<template>
  <button :ref="(el) => (triggerRef = el)" @click="toggleTheme">
    {{ isDark ? '🌙' : '☀️' }}
  </button>
</template>`,
  },
] as const

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // 剪贴板不可用时静默
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label="复制"
      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
    </button>
  )
}

export function QuickStartSection() {
  const [active, setActive] = useState<(typeof FRAMEWORKS)[number]['id']>('react')
  const current = FRAMEWORKS.find((f) => f.id === active)!

  return (
    <section id="quick-start" className="relative z-10 scroll-mt-24 border-b border-dashed border-black/10 py-20 dark:border-white/10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <span className="mb-3 inline-block rounded-full border bg-card/70 px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-muted-foreground backdrop-blur">
            Quick Start
          </span>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">三行代码接入</h2>
          <p className="mt-3 text-muted-foreground">
            四个入口，同一套 API。受控模式接入 next-themes / @nuxtjs/color-mode 的完整示例见{' '}
            <a href={REPO_URL} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-4">
              GitHub README
            </a>
            。
          </p>
        </div>

        <div className="mx-auto max-w-3xl">
          {/* 分段式 Tab（带框架品牌图标） */}
          <div className="mx-auto mb-5 flex w-fit gap-1 rounded-full border bg-card/70 p-1 backdrop-blur">
            {FRAMEWORKS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActive(f.id)}
                className={`flex items-center gap-2 rounded-full px-5 py-1.5 text-sm transition-all ${
                  active === f.id ? 'bg-primary font-semibold text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <f.Icon className={`size-4 shrink-0 ${active === f.id ? '' : f.iconClass}`} />
                {f.label}
              </button>
            ))}
          </div>

          {/* 编辑器窗口：红绿灯 chrome + 安装命令条 + 代码区 */}
          <div className="overflow-hidden rounded-2xl border bg-card/80 shadow-xl shadow-black/5 backdrop-blur dark:shadow-black/30">
            <div className="flex items-center justify-between border-b bg-background/50 px-4 py-2.5">
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded-full bg-red-400" />
                <span className="size-3 rounded-full bg-amber-400" />
                <span className="size-3 rounded-full bg-emerald-400" />
              </div>
              <code className="font-mono text-xs text-muted-foreground">{current.install}</code>
              <CopyButton text={`${current.install}\n\n${current.code}`} />
            </div>
            <pre className="max-h-96 overflow-auto p-5 font-mono text-xs leading-relaxed">
              <code>{current.code}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  )
}
