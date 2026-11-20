'use client'

import { Button, Tabs, Typography } from '@heroui/react'
import { Check, Copy } from 'lucide-react'
import { useState } from 'react'

import { CodeBlock } from '@/components/code-block'
import { SectionHeader } from '@/components/landing/section-header'
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
    <Button size="sm" variant="ghost" onPress={copy}>
      {copied ? (
        <>
          <Check className="size-3.5 text-success" />
          已复制
        </>
      ) : (
        <>
          <Copy className="size-3.5" />
          复制
        </>
      )}
    </Button>
  )
}

export function QuickStartSection() {
  const [active, setActive] =
    useState<(typeof FRAMEWORKS)[number]['id']>('react')
  // active 的类型就是 FRAMEWORKS 的 id 联合，find 必然命中；?? 只为喂类型（无 noUncheckedIndexedAccess，[0] 即元素）
  const current = FRAMEWORKS.find((f) => f.id === active) ?? FRAMEWORKS[0]

  return (
    <section id="quick-start" className="scroll-mt-14 border-t border-border">
      <div className="mx-auto w-full max-w-6xl px-6 py-20 sm:py-24">
        <SectionHeader
          eyebrow="03 / 快速开始"
          sub="四个入口，同一套 API。"
          title="三行代码接入"
        />

        <div className="mx-auto mt-10 max-w-3xl">
          {/* 框架切换（react-aria Tabs，选中态由 HeroUI 样式接管） */}
          <Tabs
            selectedKey={active}
            onSelectionChange={(key) =>
              setActive(key as (typeof FRAMEWORKS)[number]['id'])
            }
          >
            {/* 药丸宽度收敛为内容宽并居中：默认块级会被撑满整行，视觉上不像 Tabs */}
            <Tabs.ListContainer className="mx-auto mb-5 w-fit">
              <Tabs.List aria-label="选择框架">
                {FRAMEWORKS.map((f) => (
                  <Tabs.Tab key={f.id} id={f.id} className="gap-2">
                    <f.Icon
                      className={`size-4 shrink-0 ${active === f.id ? 'text-accent' : f.iconClass}`}
                    />
                    {f.label}
                  </Tabs.Tab>
                ))}
              </Tabs.List>
            </Tabs.ListContainer>
          </Tabs>

          {/* 编辑器窗口：hairline 外框 + 红绿灯 chrome + 安装命令条 + 代码区 */}
          <div className="frame">
            <div className="flex items-center justify-between gap-3 border-b border-border bg-surface-secondary px-4 py-2.5">
              <div className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="size-2.5 rounded-full bg-danger/70"
                />
                <span
                  aria-hidden
                  className="size-2.5 rounded-full bg-warning/60"
                />
                <span
                  aria-hidden
                  className="size-2.5 rounded-full bg-success/60"
                />
                <Typography
                  className="ms-3 hidden font-mono sm:block"
                  color="muted"
                  type="body-xs"
                >
                  {current.install}
                </Typography>
              </div>
              <CopyButton text={`${current.install}\n\n${current.code}`} />
            </div>
            <CodeBlock code={current.code} language={current.lang} />
          </div>
        </div>
      </div>
    </section>
  )
}
