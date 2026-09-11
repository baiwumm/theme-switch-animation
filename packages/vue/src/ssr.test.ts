import { renderToString } from '@vue/server-renderer'
import { defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'

import { useThemeAnimation } from './index'

// 模拟一个用户组件（setup 在 SSR 中安全执行）
const ThemeToggle = defineComponent({
  setup() {
    const { triggerRef, toggleTheme, isDark } = useThemeAnimation({ animationType: 'circle' })
    return () =>
      h('button', { ref: triggerRef, onClick: toggleTheme }, isDark.value ? '🌙' : '☀️')
  },
})

describe('SSR 安全（node 环境，无 document / localStorage）', () => {
  it('renderToString 不触碰浏览器 API，正常输出按钮标记', async () => {
    const markup = await renderToString(h(ThemeToggle))

    expect(markup).toContain('<button')
    expect(markup).toContain('☀️')
    expect(typeof document).toBe('undefined')
  })
})
