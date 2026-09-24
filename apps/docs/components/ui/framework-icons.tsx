/** 四个框架的品牌图标（内联 SVG，避免为此引入 react-icons 依赖） */

export function ReactIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="-11.5 -10.23 23 20.46"
      className={className}
      aria-hidden="true"
    >
      <circle r="2.05" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="1" fill="none">
        <ellipse rx="11" ry="4.2" />
        <ellipse rx="11" ry="4.2" transform="rotate(60)" />
        <ellipse rx="11" ry="4.2" transform="rotate(120)" />
      </g>
    </svg>
  )
}

export function VueIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 256 221" className={className} aria-hidden="true">
      <path
        fill="#42B883"
        d="M204.8 0H256L128 220.8 0 0h97.92L128 51.2 157.44 0h47.36Z"
      />
      <path
        fill="#35495E"
        d="M0 0l128 220.8L256 0h-51.2L128 132.48 50.56 0H0Z"
      />
    </svg>
  )
}

/** Next.js 官方标志（simple-icons 当前版本路径，currentColor 适配明暗主题） */
export function NextIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M18.665 21.978C16.758 23.255 14.465 24 12 24 5.377 24 0 18.623 0 12S5.377 0 12 0s12 5.377 12 12c0 3.583-1.574 6.801-4.067 9.001L9.219 7.2H7.2v9.596h1.615V9.251l9.85 12.727Zm-3.332-8.533 1.6 2.061V7.2h-1.6v6.245Z" />
    </svg>
  )
}

export function NuxtIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M13.9 5.2 21.9 19a1.15 1.15 0 0 1-1 1.73h-5.05L9.7 9.5Z"
        fill="#00DC82"
      />
      <path
        d="M9.83 8.13 2.16 21.27h7.66L6.6 15.5Z"
        fill="#00DC82"
        opacity="0.55"
      />
    </svg>
  )
}
