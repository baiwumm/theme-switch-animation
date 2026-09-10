import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['packages/*/src/**/*.test.ts'],
    // 默认跑在 node 环境（纯几何/字符串逻辑）；需要 DOM 的用例在文件头部声明
    // `// @vitest-environment jsdom`。
    environment: 'node',
  },
})
