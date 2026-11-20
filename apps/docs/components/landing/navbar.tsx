'use client'

import { Button, Tooltip, Typography } from '@heroui/react'
import Link from 'next/link'
import { type ReactNode, useEffect, useState } from 'react'

import { ThemeToggle } from '@/components/theme/theme-toggle'
import { GithubIcon, NpmIcon } from '@/components/ui/brand-icons'
import { NPM_URL, REPO_URL } from '@/constants/site'

const NAV_LINKS = [
  { href: '#features', label: '特性' },
  { href: '#gallery', label: '动画演示' },
  { href: '#quick-start', label: '快速开始' },
  { href: '#faq', label: 'FAQ' },
] as const

/** 顶栏图标按钮共用的箭头提示（与 better-admin / token-usage 同款交互） */
function NavTooltip({
  children,
  label,
}: {
  children: ReactNode
  label: string
}) {
  return (
    <Tooltip delay={0}>
      {children}
      <Tooltip.Content showArrow placement="bottom">
        <Tooltip.Arrow />
        <Typography type="body-xs">{label}</Typography>
      </Tooltip.Content>
    </Tooltip>
  )
}

export function Navbar() {
  const [active, setActive] = useState('')

  // 滚动到哪一节就高亮哪个锚点：视口 40%~55% 这条窄带即"当前节"的判定区
  useEffect(() => {
    const sections = NAV_LINKS.map((l) =>
      document.getElementById(l.href.slice(1)),
    ).filter((el): el is HTMLElement => el !== null)
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) setActive(entry.target.id)
      },
      { rootMargin: '-40% 0px -55% 0px' },
    )
    for (const section of sections) observer.observe(section)
    return () => observer.disconnect()
  }, [])

  return (
    // 贴顶 hairline 条：sticky（不是 fixed 浮舱），滚动条不遮内容，锚点 scroll-mt 对位
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-4 px-6">
        {/* 左：Logo + 站名 */}
        <Link
          className="flex min-w-0 items-center gap-2.5"
          href="/"
          onClick={(e) => {
            e.preventDefault()
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        >
          {/* biome-ignore lint/performance/noImgElement: 装饰性 logo（alt=""），明暗双图靠 CSS 切换，不值得上 next/image */}
          <img
            src="/logo-light.svg"
            alt=""
            className="size-7 shrink-0 rounded-lg dark:hidden"
          />
          {/* biome-ignore lint/performance/noImgElement: 同上，暗色档 logo */}
          <img
            src="/logo-dark.svg"
            alt=""
            className="hidden size-7 shrink-0 rounded-lg dark:block"
          />
          <Typography
            className="truncate leading-tight"
            type="h6"
            weight="semibold"
          >
            theme-switch-animation
          </Typography>
        </Link>

        {/* 中：锚点（滚动到哪一节，朱红高亮跟随；hover 只换色不位移） */}
        <nav
          aria-label="页内导航"
          className="ml-auto hidden items-center gap-5 lg:flex"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`text-sm transition-colors ${
                active === link.href.slice(1)
                  ? 'text-accent'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* 右：GitHub / npm 图标入口 + 主题切换（本库驱动） */}
        <div className="flex items-center gap-2 lg:ml-2">
          <NavTooltip label="GitHub 仓库">
            <Button
              isIconOnly
              aria-label="GitHub 仓库"
              size="sm"
              variant="outline"
              onPress={() =>
                window.open(REPO_URL, '_blank', 'noopener,noreferrer')
              }
            >
              <GithubIcon className="size-4" />
            </Button>
          </NavTooltip>
          {/* 窄屏放不下第三个图标（会把站名挤成两行），md 以下只保留 GitHub */}
          <div className="hidden md:block">
            <NavTooltip label="npm 包页面">
              <Button
                isIconOnly
                aria-label="npm 包页面"
                size="sm"
                variant="outline"
                onPress={() =>
                  window.open(NPM_URL, '_blank', 'noopener,noreferrer')
                }
              >
                <NpmIcon className="size-4" />
              </Button>
            </NavTooltip>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
