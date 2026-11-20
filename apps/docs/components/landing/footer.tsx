import { Typography } from '@heroui/react'
import Link from 'next/link'

import { GithubIcon } from '@/components/ui/brand-icons'
import { AUTHOR_URL, BEIAN, NPM_URL, REPO_URL } from '@/constants/site'

/** 公安备案号里提取纯数字，拼查询链接（better-admin 同款做法） */
const POLICE_CODE = BEIAN.police.match(/\d+/)?.[0] ?? ''

const RESOURCE_LINKS = [
  { label: 'GitHub 仓库', href: REPO_URL },
  { label: 'npm 包', href: NPM_URL },
  { label: 'Issues / 反馈', href: `${REPO_URL}/issues` },
] as const

const RELATED_LINKS = [
  { label: 'next-themes', href: 'https://github.com/pacocoursey/next-themes' },
  {
    label: '@nuxtjs/color-mode',
    href: 'https://github.com/nuxt-modules/color-mode',
  },
  {
    label: 'View Transitions API 规范',
    href: 'https://drafts.csswg.org/css-view-transitions-1/',
  },
  {
    label: 'magicui（形状观感参考）',
    href: 'https://magicui.design/docs/components/animated-theme-toggler',
  },
] as const

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="grid gap-10 sm:grid-cols-3">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              {/* biome-ignore lint/performance/noImgElement: 装饰性 logo（alt=""），明暗双图靠 CSS 切换，不值得上 next/image */}
              <img
                src="/logo-light.svg"
                alt=""
                className="size-7 rounded-lg dark:hidden"
              />
              {/* biome-ignore lint/performance/noImgElement: 同上，暗色档 logo */}
              <img
                src="/logo-dark.svg"
                alt=""
                className="hidden size-7 rounded-lg dark:block"
              />
              <Typography type="body-sm" weight="semibold">
                theme-switch-animation
              </Typography>
            </div>
            <Typography
              className="max-w-xs leading-relaxed"
              color="muted"
              type="body-xs"
            >
              基于 View Transitions API 的跨框架主题切换动画库。
            </Typography>
          </div>

          <nav aria-label="资源链接" className="flex flex-col gap-3">
            <Typography type="body-sm" weight="semibold">
              资源
            </Typography>
            <ul className="flex flex-col gap-2">
              {RESOURCE_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-muted transition-colors hover:text-accent"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="相关项目" className="flex flex-col gap-3">
            <Typography type="body-sm" weight="semibold">
              相关项目
            </Typography>
            <ul className="flex flex-col gap-2">
              {RELATED_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-muted transition-colors hover:text-accent"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-14 flex flex-col gap-2 border-t border-border pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} baiwumm · MIT License</span>
          <div className="flex flex-col gap-2 sm:items-end">
            <span className="flex items-center gap-4">
              <Link
                href={AUTHOR_URL}
                target="_blank"
                rel="noreferrer"
                className="transition-colors hover:text-accent"
              >
                baiwumm.com
              </Link>
              <a
                href={REPO_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 transition-colors hover:text-accent"
              >
                <GithubIcon className="size-3.5" />
                Source
              </a>
            </span>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted">
              <a
                href="https://beian.miit.gov.cn/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 transition-colors hover:text-accent"
              >
                {/* biome-ignore lint/performance/noImgElement: 备案官方小图标，不值得上 next/image */}
                <img
                  src="/beian/icp.png"
                  alt=""
                  aria-hidden="true"
                  className="size-3.5 shrink-0"
                  width={14}
                  height={14}
                  loading="lazy"
                />
                {BEIAN.icp}
              </a>
              {POLICE_CODE ? (
                <a
                  href={`https://beian.mps.gov.cn/#/query/webSearch?code=${POLICE_CODE}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 transition-colors hover:text-accent"
                >
                  {/* biome-ignore lint/performance/noImgElement: 同上，公安备案图标 */}
                  <img
                    src="/beian/gongan.png"
                    alt=""
                    aria-hidden="true"
                    className="size-3.5 shrink-0"
                    width={14}
                    height={14}
                    loading="lazy"
                  />
                  {BEIAN.police}
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
