'use client'

import { Github } from 'lucide-react'
import Link from 'next/link'

import { ThemeToggle } from '@/components/theme/theme-toggle'
import { REPO_URL } from '@/constants/site'

const NAV_LINKS = [
  { href: '#features', label: '特性' },
  { href: '#gallery', label: '动画演示' },
  { href: '#quick-start', label: '快速开始' },
  { href: '#faq', label: 'FAQ' },
] as const

export function Navbar() {
  return (
    <nav className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <div className="pointer-events-auto w-full max-w-3xl">
        <div
          className="mx-auto flex items-center justify-between rounded-2xl border border-white/10 bg-background/60 px-5 py-2 backdrop-blur-xl
          shadow-2xl shadow-black/10 dark:shadow-black/50"
        >
          {/* 左：Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5"
            onClick={(e) => {
              e.preventDefault()
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-light.svg" alt="" className="size-8 rounded-lg dark:hidden" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-dark.svg" alt="" className="hidden size-8 rounded-lg dark:block" />
            <span className="text-sm font-semibold tracking-tight md:text-base">theme-switch-animation</span>
          </Link>

          {/* 中：锚点 */}
          <div className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* 右：GitHub + 主题切换（本库驱动） */}
          <div className="flex items-center gap-1">
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub 仓库"
              className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Github size={18} />
            </a>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  )
}
