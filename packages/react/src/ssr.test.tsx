import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { useThemeAnimation } from './index'

// 模拟一个用户组件（'use client' 边界内的部分）
function ThemeToggle() {
  const { ref, toggleTheme, isDark } = useThemeAnimation({ animationType: 'circle' })
  return (
    <button ref={ref} onClick={toggleTheme}>
      {isDark ? '🌙' : '☀️'}
    </button>
  )
}

describe('SSR 安全（node 环境，无 document / localStorage）', () => {
  it('renderToString 不触碰浏览器 API，正常输出按钮标记', () => {
    let markup: string
    expect(() => {
      markup = renderToString(<ThemeToggle />)
    }).not.toThrow()

    expect(markup!).toContain('<button')
    expect(markup!).toContain('☀️')
    expect(typeof document).toBe('undefined')
  })
})
