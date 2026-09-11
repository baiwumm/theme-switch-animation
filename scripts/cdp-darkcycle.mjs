/**
 * 受控模式正向断言（配合 cdp-hydration.mjs 使用）：
 * dark 存储加载 → 挂载后按钮显示 🌙、html class=dark；点击 → 受控切回 light。
 * 与 hydration 错误检查拆成两个脚本：共用一个 CDP 会话时偶发失联，独立连接各自最稳。
 *
 * 前置与启动方式同 scripts/cdp-measure.mjs，或运行 `pnpm test:acceptance`。
 */
import { connectPage, sleep } from './cdp-lib.mjs'

const ws = await connectPage()
await ws.send('Page.enable')
await ws.send('Runtime.enable')
await ws.send('Page.navigate', { url: process.env.ACCEPTANCE_URL ?? 'http://127.0.0.1:5222/' })
await sleep(6000)
await ws.send('Runtime.evaluate', { expression: "localStorage.setItem('theme','dark'); location.reload()", returnByValue: true })
await sleep(5000)

async function snapshot() {
  const { result } = await ws.send('Runtime.evaluate', {
    expression: `JSON.stringify({
      stored: localStorage.getItem('theme'),
      cls: document.documentElement.className,
      btn: document.querySelector('.switch-button .state')?.textContent,
    })`,
    returnByValue: true,
  })
  return JSON.parse(result.result.value)
}

const s = await snapshot()
console.log('dark 存储加载后:', JSON.stringify(s))
const darkOk = s.stored === 'dark' && s.cls.includes('dark') && s.btn?.includes('🌙')

await ws.send('Runtime.evaluate', { expression: `document.querySelectorAll('.switch-button')[0].click()`, returnByValue: true })
await sleep(2000)
const t = await snapshot()
console.log('点击切回 light 后:', JSON.stringify(t))
const lightOk = t.stored === 'light' && !t.cls.includes('dark') && t.btn?.includes('☀️')

ws.close()
if (!darkOk) {
  console.error('FAIL: dark 存储加载后挂载状态不正确')
  process.exit(1)
}
if (!lightOk) {
  console.error('FAIL: 点击后未正确受控切回 light')
  process.exit(1)
}
console.log('PASS: dark 挂载状态与受控切换正向断言')
