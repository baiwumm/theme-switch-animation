export const SITE_URL = 'https://theme-switch-animation.baiwumm.com' as const
export const REPO_URL =
  'https://github.com/baiwumm/theme-switch-animation' as const
export const NPM_URL =
  'https://www.npmjs.com/package/theme-switch-animation' as const
export const AUTHOR_URL = 'https://baiwumm.com' as const

export const SITE_INFO = {
  title: 'theme-switch-animation — 让主题切换成为动画演出',
  description:
    '基于 View Transitions API 的跨框架主题切换动画库：15 种动画（圆形扩散/模糊、几何形状、百叶窗/扫描/方块格子、水滴涟漪、时钟扇形/扇叶旋开、双开门，其中 9 种支持 reverse 反向揭开），支持 React / Vue / Next.js / Nuxt，受控模式无缝接入 next-themes 与 @nuxtjs/color-mode，多实例与跨标签页状态自动同步，不支持的浏览器自动降级。',
  url: SITE_URL,
  siteName: 'theme-switch-animation',
} as const

/** 备案信息（与 better-admin 网站同主体同域名，值与其 lib/site.ts 默认值一致） */
export const BEIAN = {
  icp: '粤ICP备2023007649号-2',
  police: '粤公网安备44030402006402号',
} as const
