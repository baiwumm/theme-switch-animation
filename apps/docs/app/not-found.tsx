import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-6xl font-bold tracking-tight">404</h1>
      <p className="text-muted">页面不存在或已被移动。</p>
      <Link
        href="/"
        className="rounded-md bg-accent px-6 py-2.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
      >
        返回首页
      </Link>
    </div>
  )
}
