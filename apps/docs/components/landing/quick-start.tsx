'use client'

import { Copy } from 'lucide-react'
import { useState } from 'react'

import { CodeBlock } from '@/components/code-block'
import { AnimatedBadge } from '@/components/motion/animated-badge'
import { StatefulButton } from '@/components/motion/button/stateful'
import { Tabs, TabsList, TabsTrigger } from '@/components/motion/tabs'
import {
  NextIcon,
  NuxtIcon,
  ReactIcon,
  VueIcon,
} from '@/components/ui/framework-icons'

const INSTALL_CMD = 'npm install theme-switch-animation'

const FRAMEWORKS = [
  {
    id: 'react',
    lang: 'tsx' as const,
    label: 'React',
    Icon: ReactIcon,
    iconClass: 'text-sky-500',
    install: INSTALL_CMD,
    code: `'use client'
import { ThemeAnimationType, useThemeAnimation } from 'theme-switch-animation/react'

export function ThemeToggle() {
  // 非受控：库管理 localStorage + <html> class
  // 多实例 / 跨标签页的 isDark 自动同步（以 html class 为事实源）
  const { ref, toggleTheme, isDark, finished } = useThemeAnimation({
    animationType: ThemeAnimationType.CIRCLE,
    duration: 750,
  })

  return (
    <button ref={ref} onClick={toggleTheme}>
      {isDark ? '🌙' : '☀️'}
      {/* finished：本次动画结束 Promise，可 await 做动画期间禁用 */}
    </button>
  )
}`,
  },
  {
    id: 'next',
    lang: 'tsx' as const,
    label: 'Next.js',
    Icon: NextIcon,
    iconClass: 'text-foreground',
    install: INSTALL_CMD,
    code: `'use client'
import { useTheme } from 'next-themes'
import { ThemeAnimationType, useThemeAnimation } from 'theme-switch-animation/react'

export function ThemeToggle() {
  // 受控模式 × next-themes：App Router 组件需 'use client'
  // 库等待 next-themes 写入 <html> 后再截图；300ms 未同步则跳过动画直切
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
    lang: 'vue' as const,
    label: 'Vue',
    Icon: VueIcon,
    iconClass: '',
    install: INSTALL_CMD,
    code: `<script setup lang="ts">
import { ThemeAnimationType, useThemeAnimation } from 'theme-switch-animation/vue'

// 非受控模式；转场回调内 await nextTick()，浏览器等 Vue DOM 更新后截图
// finished 是 shallowRef：每次切换更新 .value，watch / await 它拿最新一轮
const { triggerRef, toggleTheme, isDark, finished } = useThemeAnimation<HTMLButtonElement>({
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
    lang: 'ts' as const,
    label: 'Nuxt',
    Icon: NuxtIcon,
    iconClass: '',
    install: INSTALL_CMD,
    code: `// nuxt.config.ts —— 仅注册模块
// useThemeAnimation / ThemeAnimationType / SKIP_TRANSITION /
// observeThemeClass / THEME_STORAGE_KEY 全部自动导入
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
    <StatefulButton
      size="sm"
      variant="ghost"
      state={copied ? 'success' : 'idle'}
      successText="已复制"
      icon={<Copy size={14} />}
      onClick={copy}
    >
      复制
    </StatefulButton>
  )
}

export function QuickStartSection() {
  const [active, setActive] =
    useState<(typeof FRAMEWORKS)[number]['id']>('react')
  // active 的类型就是 FRAMEWORKS 的 id 联合，find 必然命中；?? 只为喂类型（无 noUncheckedIndexedAccess，[0] 即元素）
  const current = FRAMEWORKS.find((f) => f.id === active) ?? FRAMEWORKS[0]

  return (
    <section
      id="quick-start"
      className="relative z-10 scroll-mt-24 border-b border-dashed border-black/10 py-20 dark:border-white/10"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <AnimatedBadge size="sm" className="mb-3">
            Quick Start
          </AnimatedBadge>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            三行代码接入
          </h2>
          <p className="mt-3 text-muted-foreground">四个入口，同一套 API。</p>
        </div>

        <div className="mx-auto max-w-3xl">
          {/* 分段式 Tab（带框架品牌图标，滑块走共享布局动画） */}
          <Tabs
            value={active}
            onValueChange={(v) =>
              setActive(v as (typeof FRAMEWORKS)[number]['id'])
            }
          >
            <TabsList wrapperClassName="mx-auto mb-5 w-fit">
              {FRAMEWORKS.map((f) => (
                <TabsTrigger key={f.id} value={f.id} className="gap-2">
                  <f.Icon
                    className={`size-4 shrink-0 ${active === f.id ? '' : f.iconClass}`}
                  />
                  {f.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* 编辑器窗口：红绿灯 chrome + 安装命令条 + 代码区 */}
          <div className="overflow-hidden rounded-2xl border bg-card/80 shadow-xl shadow-black/5 backdrop-blur dark:shadow-black/30">
            <div className="flex items-center justify-between border-b bg-background/50 px-4 py-2.5">
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded-full bg-red-400" />
                <span className="size-3 rounded-full bg-amber-400" />
                <span className="size-3 rounded-full bg-emerald-400" />
              </div>
              <code className="font-mono text-xs text-muted-foreground">
                {current.install}
              </code>
              <CopyButton text={`${current.install}\n\n${current.code}`} />
            </div>
            <CodeBlock code={current.code} language={current.lang} />
          </div>
        </div>
      </div>
    </section>
  )
}
