'use client'

import { Check, Copy } from 'lucide-react'
import { useState } from 'react'

import { REPO_URL } from '@/constants/site'

const INSTALL_CMD = 'npm install theme-switch-animation'

const FRAMEWORKS = [
  {
    id: 'react',
    label: 'React',
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
    id: 'vue',
    label: 'Vue',
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

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // 剪贴板不可用时静默
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={copy}
        aria-label="复制代码"
        className="absolute right-3 top-3 rounded-lg border bg-background/80 p-2 text-muted-foreground backdrop-blur transition-colors hover:text-foreground"
      >
        {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
      </button>
      <pre className="max-h-96 overflow-auto rounded-xl border bg-card/80 p-5 pr-12 font-mono text-xs leading-relaxed backdrop-blur">
        <code>{code}</code>
      </pre>
    </div>
  )
}

export function QuickStartSection() {
  const [active, setActive] = useState<(typeof FRAMEWORKS)[number]['id']>('react')
  const current = FRAMEWORKS.find((f) => f.id === active)!

  return (
    <section id="quick-start" className="relative z-10 scroll-mt-24 border-b border-dashed border-black/10 py-20 dark:border-white/10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">快速开始</h2>
          <p className="mt-3 text-muted-foreground">
            三个入口，同一套 API。受控模式接入 next-themes / @nuxtjs/color-mode 的完整示例见{' '}
            <a href={REPO_URL} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-4">
              GitHub README
            </a>
            。
          </p>
        </div>

        <div className="mx-auto max-w-3xl">
          <div className="mb-4 flex justify-center gap-2">
            {FRAMEWORKS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActive(f.id)}
                className={`rounded-full border px-5 py-1.5 text-sm transition-colors ${
                  active === f.id ? 'border-primary bg-primary/10 font-semibold' : 'hover:border-primary/40'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="mb-3 flex justify-center">
            <code className="rounded-lg border bg-card/80 px-4 py-2 font-mono text-xs backdrop-blur">{current.install}</code>
          </div>
          <CodeBlock code={current.code} />
        </div>
      </div>
    </section>
  )
}
