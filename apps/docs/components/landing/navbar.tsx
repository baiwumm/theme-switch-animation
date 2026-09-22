'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { ButtonLink } from '@/components/motion/button/base'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { GithubIcon, NpmIcon } from '@/components/ui/brand-icons'
import { NPM_URL, REPO_URL } from '@/constants/site'

const NAV_LINKS = [
  { href: '#features', label: '特性' },
  { href: '#gallery', label: '动画演示' },
  { href: '#quick-start', label: '快速开始' },
  { href: '#faq', label: 'FAQ' },
] as const

export function Navbar() {
  const [active, setActive] = useState('')

  // 滚动到哪一节就高亮哪个锚点：视口 40%~55% 这条窄带即"当前节"的判定区
  useEffect(() => {
    const sections = NAV_LINKS.map((l) =>
      document.getElementById(l.href.slice(1)),
    ).filter((el): el is HTMLElement => el !== null)
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id)
      },
      { rootMargin: '-40% 0px -55% 0px' },
    )
    for (const section of sections) observer.observe(section)
    return () => observer.disconnect()
  }, [])

  return (
    <nav className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <div className="pointer-events-auto w-full max-w-3xl">
        <div
          className="mx-auto flex items-center justify-between rounded-full border border-white/10 bg-background/60 px-5 py-2 backdrop-blur-xl
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
            <img
              src="/logo-light.svg"
              alt=""
              className="size-8 rounded-lg dark:hidden"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-dark.svg"
              alt=""
              className="hidden size-8 rounded-lg dark:block"
            />
            <span className="text-sm font-semibold tracking-tight md:text-base">
              theme-switch-animation
            </span>
          </Link>

          {/* 中：锚点（滚动到哪一节，高亮跟随） */}
          <div className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <ButtonLink
                key={link.href}
                href={link.href}
                variant={active === link.href.slice(1) ? 'secondary' : 'ghost'}
                size="sm"
              >
                {link.label}
              </ButtonLink>
            ))}
          </div>

          {/* 右：GitHub / npm + 主题切换（本库驱动） */}
          <div className="flex items-center gap-1">
            <ButtonLink
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              variant="ghost"
              size="icon"
              aria-label="GitHub 仓库"
            >
              <GithubIcon className="size-[18px]" />
            </ButtonLink>
            <ButtonLink
              href={NPM_URL}
              target="_blank"
              rel="noreferrer"
              variant="ghost"
              size="icon"
              aria-label="npm 包页面"
              // 窄屏放不下第三个图标（会把 logo 文字挤成两行），md 以下只保留 GitHub
              className="hidden md:inline-flex"
            >
              <NpmIcon className="size-[18px]" />
            </ButtonLink>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  )
}
