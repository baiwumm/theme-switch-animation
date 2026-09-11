/**
 * 验收 §9-2 快速连点一致性检查：3 秒内连点 10 次 + 同帧 5 连击，
 * 校验 localStorage 主题 / html class / 按钮 isDark 文案三者一致。
 * 启动方式同 scripts/cdp-measure.mjs，或运行 `pnpm test:acceptance`。
 */
const CDP_PORT = 19222
const PAGE_URL = 'http://127.0.0.1:5222/'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const targets = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
const page = targets.find((t) => t.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
let id = 0
const pending = new Map()
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) } }
const send = (method, params = {}) => new Promise((res) => { const mid = ++id; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params })) })

await send('Page.enable'); await send('Runtime.enable')
await send('Page.navigate', { url: PAGE_URL })
await sleep(3000)

// 3 秒内连点 10 次
for (let i = 0; i < 10; i++) {
  await send('Runtime.evaluate', { expression: `document.querySelectorAll('.switch-button')[${i % 5}].click()` })
  await sleep(300)
}
await sleep(2000)

const { result } = await send('Runtime.evaluate', {
  expression: `(() => {
    const stored = localStorage.getItem('theme')
    const htmlDark = document.documentElement.classList.contains('dark')
    const buttonDark = document.querySelector('.switch-button .state').textContent.includes('🌙')
    const buttonLight = document.querySelector('.switch-button .state').textContent.includes('☀️')
    return { stored, htmlDark, buttonDark, buttonLight }
  })()`,
  returnByValue: true,
})
const s = result.result.value
const storedDark = s.stored === 'dark'
const ok = storedDark === s.htmlDark && storedDark === s.buttonDark
console.log(`theme=${s.stored} htmlDark=${s.htmlDark} button(🌙)=${s.buttonDark} button(☀️)=${s.buttonLight}`)
console.log(ok ? 'CONSISTENT ✓ (三者一致)' : 'INCONSISTENT ✗')

// 再做一轮无间隔极速连点（同一帧内 5 连击）
for (let i = 0; i < 5; i++) {
  await send('Runtime.evaluate', { expression: `document.querySelectorAll('.switch-button')[${i % 5}].click()` })
}
await sleep(2000)
const r2 = await send('Runtime.evaluate', {
  expression: `(() => {
    const stored = localStorage.getItem('theme')
    const htmlDark = document.documentElement.classList.contains('dark')
    const buttonDark = document.querySelector('.switch-button .state').textContent.includes('🌙')
    return { stored, htmlDark, buttonDark }
  })()`,
  returnByValue: true,
})
const t = r2.result.result.value
const ok2 = (t.stored === 'dark') === t.htmlDark && (t.stored === 'dark') === t.buttonDark
console.log(`极速连点后: theme=${t.stored} htmlDark=${t.htmlDark} button(🌙)=${t.buttonDark}`)
console.log(ok2 ? 'CONSISTENT ✓ (极速连点后三者一致)' : 'INCONSISTENT ✗')
ws.close()
process.exit(ok && ok2 ? 0 : 1)
