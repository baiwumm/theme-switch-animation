'use client'

import { Highlight, Prism, type PrismGrammar, type PrismTheme } from 'prism-react-renderer'

/**
 * 高亮色全部走 CSS 变量（globals.css 的 --tok-*）：
 * 同一份标记服务端与客户端渲染结果一致，暗色切换也由 CSS 完成，不会闪一下未着色代码。
 */
const TOKEN_THEME: PrismTheme = {
  plain: { color: 'var(--tok-plain)', backgroundColor: 'transparent' },
  styles: [
    {
      types: ['comment', 'prolog', 'cdata'],
      style: { color: 'var(--tok-comment)', fontStyle: 'italic' },
    },
    {
      types: [
        'string',
        'char',
        'builtin',
        'inserted',
        'regex',
        'attr-value',
        'selector',
      ],
      style: { color: 'var(--tok-string)' },
    },
    {
      types: [
        'number',
        'boolean',
        'constant',
        'atrule',
        'attr-name',
        'class-name',
      ],
      style: { color: 'var(--tok-const)' },
    },
    { types: ['keyword'], style: { color: 'var(--tok-keyword)' } },
    {
      types: ['tag', 'property', 'symbol', 'deleted', 'important'],
      style: { color: 'var(--tok-tag)' },
    },
    {
      types: ['function', 'variable', 'operator'],
      style: { color: 'var(--tok-func)' },
    },
    {
      types: ['punctuation', 'doctype', 'entity'],
      style: { color: 'var(--tok-punct)' },
    },
    { types: ['url'], style: { color: 'var(--tok-url)' } },
  ],
}

// prism-react-renderer 的内置包不含 vue 语法：以 markup 为底，把 <script> 内容交给 typescript
if (!Prism.languages.vue) {
  const vue = Prism.languages.extend('markup', {})
  ;(vue as PrismGrammar & Record<string, unknown>).script = {
    pattern: /<script[\s\S]*?<\/script>/i,
    inside: {
      punctuation: /^<script[^>]*>|<\/script>$/i,
      rest: Prism.languages.typescript,
    },
    greedy: true,
  }
  Prism.languages.vue = vue
}

export type CodeLanguage = 'tsx' | 'vue' | 'ts'

export function CodeBlock({
  code,
  language,
}: {
  code: string
  language: CodeLanguage
}) {
  return (
    <Highlight code={code.trim()} language={language} theme={TOKEN_THEME}>
      {({ className, style, tokens, getLineProps, getTokenProps }) => (
        <pre
          className={`${className ?? ''} m-0 max-h-96 overflow-auto p-5 font-mono text-xs leading-relaxed`}
          style={style}
        >
          {tokens.map((line, i) => {
            const { key: lineKey, ...lineProps } = getLineProps({ line })
            return (
              <div key={String(lineKey ?? i)} {...lineProps}>
                {line.map((token, k) => {
                  const { key: tokenKey, ...tokenProps } = getTokenProps({
                    token,
                  })
                  return <span key={String(tokenKey ?? k)} {...tokenProps} />
                })}
              </div>
            )
          })}
        </pre>
      )}
    </Highlight>
  )
}
