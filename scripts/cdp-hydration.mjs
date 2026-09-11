/**
 * 验收 §9-5 辅助：SSR hydration 一致性检查。
 * 分别以 dark / light 两种存储状态加载 Next playground，捕获 window 'error'
 * （React 的 "Uncaught Error: Hydration failed …"）与 console.error，任一出现即失败。
 * dark 存储下的挂载状态与受控切换正向断言见 cdp-darkcycle.mjs。
 *
 * 建议对 production 构建运行（`next build` + `next start --port 5222`）：
 * headless 浏览器 + `next dev` 组合下水合可能无法完成（HMR socket 受限），错误捕获会变成空转。
 * 无头 Chromium 以 `--remote-debugging-port=19222` 启动；或运行 `pnpm test:acceptance`。
 */
import { CDP_PORT, PAGE_URL, connectPage, sleep } from './cdp-lib.mjs'

const ws = await connectPage(CDP_PORT)
const consoleErrors = []
ws.onEvent((msg) => {
  if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
    consoleErrors.push(msg.params.args.map((a) => a.value ?? a.description ?? '').join(' '))
  }
})

// 在页面脚本运行前挂上 error 收集，覆盖 React 水合失败抛出的 uncaught error
await ws.send('Page.addScriptToEvaluateOnNewDocument', {
  source:
    'window.__errs = []; window.addEventListener("error", (e) => window.__errs.push(String((e.error && e.error.message) || e.message)))',
})
await ws.send('Page.enable')
await ws.send('Runtime.enable')

const results = []
for (const stored of ['dark', 'light']) {
  consoleErrors.length = 0
  // 首次导航兼作按需编译（dev 模式），多等一会
  await ws.send('Page.navigate', { url: PAGE_URL })
  await sleep(6000)
  await ws.send('Runtime.evaluate', {
    expression: `localStorage.setItem('theme', '${stored}')`,
    returnByValue: true,
  })
  await ws.send('Page.reload')
  await sleep(4000)

  const { result } = await ws.send('Runtime.evaluate', {
    expression: 'JSON.stringify(window.__errs || [])',
    returnByValue: true,
  })
  const errs = JSON.parse(result.result.value).concat(consoleErrors)
  const hydration = errs.filter((m) => /hydrat/i.test(m))
  results.push({ stored, count: hydration.length, sample: hydration[0] ?? '' })
  console.log(`stored=${stored}: hydration 错误 ${hydration.length} 个${hydration.length ? `\n  ${hydration[0].slice(0, 160)}` : ''}`)
}
ws.close()

const bad = results.filter((r) => r.count > 0)
if (bad.length) {
  console.error(`FAIL: ${bad.length} 种存储状态出现 hydration 错误（${bad.map((r) => `stored=${r.stored}`).join(', ')}）`)
  process.exit(1)
}
console.log('PASS: dark / light 两种初始存储下均无 hydration 错误')
console.log('（dark 存储的挂载状态与受控切换正向断言见 cdp-darkcycle.mjs）')
