/**
 * 站点根地址：换域名时用 NEXT_PUBLIC_SITE_URL 覆盖，末尾斜杠会被去掉。
 * 静态导出（output: 'export'）为构建期注入，改值后需重新构建。
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  'https://theme-switch-animation.baiwumm.com'
).replace(/\/+$/, '')
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

/**
 * 备案信息：未设置环境变量时用作者默认值；显式设为空字符串（如
 * NEXT_PUBLIC_ICP=""）则隐藏对应条目。静态导出为构建期注入，
 * 改值后需重新构建（与 better-admin 网站同一机制、同主体默认值）。
 */
export const BEIAN = {
  icp: process.env.NEXT_PUBLIC_ICP ?? '粤ICP备2023007649号-2',
  police: process.env.NEXT_PUBLIC_POLICE ?? '粤公网安备44030402006402号',
}
