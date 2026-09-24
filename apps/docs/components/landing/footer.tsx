import Link from 'next/link'

import { GithubIcon } from '@/components/ui/brand-icons'
import { AUTHOR_URL, NPM_URL, REPO_URL } from '@/constants/site'

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
    <footer className="relative z-10 py-14">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-5xl gap-10 sm:grid-cols-3">
          <div>
            <div className="mb-3 flex items-center gap-2.5">
              {/* biome-ignore lint/performance/noImgElement: 装饰性 logo（alt=""），明暗双图靠 CSS 切换，不值得上 next/image */}
              <img
                src="/logo-light.svg"
                alt=""
                className="size-7 rounded-lg dark:hidden"
              />
              {/* biome-ignore lint/performance/noImgElement: 装饰性 logo（alt=""），明暗双图靠 CSS 切换，不值得上 next/image */}
              <img
                src="/logo-dark.svg"
                alt=""
                className="hidden size-7 rounded-lg dark:block"
              />
              <span className="text-sm font-semibold">
                theme-switch-animation
              </span>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              基于 View Transitions API 的跨框架主题切换动画库。
            </p>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold">资源</h3>
            <ul className="space-y-2">
              {RESOURCE_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold">相关项目</h3>
            <ul className="space-y-2">
              {RELATED_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mx-auto mt-12 flex max-w-5xl flex-col items-center justify-between gap-3 border-t border-dashed border-black/10 pt-6 text-xs text-muted-foreground sm:flex-row dark:border-white/10">
          <span>© {new Date().getFullYear()} baiwumm · MIT License</span>
          <span className="flex items-center gap-4">
            <Link
              href={AUTHOR_URL}
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-foreground"
            >
              baiwumm.com
            </Link>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
            >
              <GithubIcon className="size-3.5" />
              Source
            </a>
          </span>
        </div>
      </div>
    </footer>
  )
}
