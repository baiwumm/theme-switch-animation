/**
 * 验收 §9-1（硬性）：Vue playground 中 3 秒内连续快击 10 次。
 * 通过条件：无动画错位（不检查视觉，由真机验证）、无状态不同步（localStorage 主题 /
 * html class / 按钮文案三者一致）、无 skipped-transition 未捕获报错（window error +
 * console error）、最终 class 与 isDark 一致。附加 CPU 4x 档位复测一轮（§9-1 的恶劣条件）。
 *
 * 前置：`playgrounds/vue` 下 `pnpm build` 后 `npx vite preview --port 5224`；
 * 无头 Chromium 以 `--remote-debugging-port=19222` 启动。或运行 `pnpm test:acceptance`。
 * 按钮数量从 DOM 读取（Phase 6 起为 13 种动画类型矩阵，新增类型无需改本脚本）。
 */
import { CDP_PORT, connectPage, sleep } from './cdp-lib.mjs'

const PAGE_URL = process.env.ACCEPTANCE_VUE_URL ?? 'http://127.0.0.1:5224/'

const ws = await connectPage(CDP_PORT)
const consoleErrors = []
ws.onEvent((msg) => {
  if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
    consoleErrors.push(msg.params.args.map((a) => a.value ?? a.description ?? '').join(' '))
  }
  if (msg.method === 'Runtime.exceptionThrown') {
    consoleErrors.push(String(msg.params.exceptionDetails?.exception?.description ?? msg.params.exceptionDetails?.text))
  }
})

await ws.send('Page.addScriptToEvaluateOnNewDocument', {
  source:
    'window.__errs = []; window.addEventListener("error", (e) => window.__errs.push(String((e.error && e.error.message) || e.message))); window.addEventListener("unhandledrejection", (e) => window.__errs.push("REJ: " + String(e.reason)))',
})
await ws.send('Page.enable')
await ws.send('Runtime.enable')
await ws.send('Page.navigate', { url: PAGE_URL })
await sleep(5000)

const countProbe = await ws.send('Runtime.evaluate', {
  expression: `document.querySelectorAll('.switch-button').length`,
  returnByValue: true,
})
const buttonCount = countProbe.result.result.value
if (!buttonCount) {
  console.error(`FAIL: .switch-button 数量为 ${buttonCount}，页面未正常挂载`)
  ws.close()
  process.exit(1)
}
console.log(`页面挂载 ✓（.switch-button × ${buttonCount}）`)

async function burstClicks(rate) {
  // 3 秒内 10 连击：间隔 = rate（300ms 基准，压到 150ms 加严），轮流点击全部实例
  for (let i = 0; i < 10; i++) {
    await ws.send('Runtime.evaluate', {
      expression: `document.querySelectorAll('.switch-button')[${i % buttonCount}].click()`,
      returnByValue: true,
    })
    await sleep(rate)
  }
  await sleep(1200)
}

async function checkConsistency(label) {
  const { result } = await ws.send('Runtime.evaluate', {
    expression: `JSON.stringify({
      stored: localStorage.getItem('theme-switch-animation'),
      htmlDark: document.documentElement.classList.contains('dark'),
      btnDark: document.querySelector('.switch-button .state').textContent.includes('🌙'),
      statusDark: document.querySelector('.status b').textContent.includes('暗色'),
    })`,
    returnByValue: true,
  })
  const s = JSON.parse(result.result.value)
  const storedDark = s.stored === 'dark'
  const consistent = storedDark === s.htmlDark && storedDark === s.btnDark && storedDark === s.statusDark
  console.log(
    `${label}: theme=${s.stored} htmlDark=${s.htmlDark} btn(🌙)=${s.btnDark} status(暗)=${s.statusDark} → ${consistent ? '一致 ✓' : '不一致 ✗'}`,
  )
  return consistent
}

async function runRound(label, rate) {
  consoleErrors.length = 0
  await burstClicks(rate)
  const errs = [...(await readErrors()), ...consoleErrors]
  const skipped = errs.filter((m) => /skip|abort|hydrat|unhandled|error/i.test(m))
  console.log(`${label}: window/console 报错 ${errs.length} 条${skipped.length ? `\n  ${skipped.slice(0, 3).join('\n  ')}` : ''}`)
  return { consistent: await checkConsistency(label), errCount: errs.length, skipped: skipped.length }
}

async function readErrors() {
  const { result } = await ws.send('Runtime.evaluate', {
    expression: 'JSON.stringify(window.__errs || [])',
    returnByValue: true,
  })
  return JSON.parse(result.result.value)
}

const baseline = await runRound('基线（无节流，300ms 间隔）', 300)

// CPU 4x 节流 + 更快连点（加严条件）
await ws.send('Emulation.setCPUThrottlingRate', { rate: 4 })
const throttled = await runRound('CPU 4x + 150ms 间隔', 150)
await ws.send('Emulation.setCPUThrottlingRate', { rate: 1 })

ws.close()

const failures = []
if (!baseline.consistent) failures.push('基线连点后状态不一致')
if (baseline.skipped > 0) failures.push(`基线出现 ${baseline.skipped} 条 skipped/报错`)
if (!throttled.consistent) failures.push('CPU 4x 连点后状态不一致')
if (throttled.skipped > 0) failures.push(`CPU 4x 出现 ${throttled.skipped} 条 skipped/报错`)

if (failures.length) {
  console.error('FAIL（§9-1）: ' + failures.join('；'))
  process.exit(1)
}
console.log('PASS（§9-1）: 两轮连点压测无状态不同步、无 skipped-transition 报错、最终状态一致')
