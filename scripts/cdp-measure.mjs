/**
 * 验收 §9-7 自动化实测：受控模式同步协议超时频率。
 * 用 CDP 驱动无头 Chromium（Chrome / Edge 均可），按 DevTools 档位对 Next playground
 * 做受控模式点击压测，统计每次点击后 html class 翻转耗时；>300ms 即视为 §5.4 协议超时兜底触发。
 *
 * 前置：`pnpm build` + `next build`（playgrounds/next），并分别启动：
 *   - 产物服务：`npx next start --port 5222`（playgrounds/next 下）
 *   - 无头浏览器：`--headless=new --remote-debugging-port=19222`
 * 注意：Windows 上部分端口落在 Hyper-V/WinNAT 保留区间会导致 bind 失败（如 9223），
 * 19222 已实测可用；可用 `netsh interface ipv4 show excludedportrange protocol=tcp` 查询。
 * 或直接运行 `pnpm test:acceptance`（需先自行启动上述两个进程）。
 */
const CDP_PORT = 19222
const PAGE_URL = 'http://127.0.0.1:5222/'
const CLICKS_PER_PROFILE = 25
const CLICK_INTERVAL_MS = 400
const TIMEOUT_MS = 300

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function connect() {
  for (let i = 0; i < 30; i++) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
      const page = targets.find((t) => t.type === 'page')
      if (page) {
        const ws = new WebSocket(page.webSocketDebuggerUrl)
        await new Promise((res, rej) => {
          ws.onopen = res
          ws.onerror = rej
        })
        let id = 0
        const pending = new Map()
        ws.onmessage = (e) => {
          const msg = JSON.parse(e.data)
          if (msg.id && pending.has(msg.id)) {
            pending.get(msg.id)(msg)
            pending.delete(msg.id)
          }
        }
        const send = (method, params = {}) =>
          new Promise((res) => {
            const mid = ++id
            pending.set(mid, res)
            ws.send(JSON.stringify({ id: mid, method, params }))
          })
        return { send, close: () => ws.close() }
      }
    } catch {
      // CDP 端口未就绪，稍后重试
    }
    await sleep(500)
  }
  throw new Error('CDP connect failed')
}

const profiles = [
  { name: 'baseline（无节流）', cpu: 1, net: null },
  { name: 'CPU 4x', cpu: 4, net: null },
  { name: 'CPU 6x', cpu: 6, net: null },
  { name: 'CPU 6x + Slow 3G', cpu: 6, net: { latency: 2000, downloadThroughput: (400 * 1024) / 8, uploadThroughput: (400 * 1024) / 8 } },
]

async function main() {
  const { send, close } = await connect()
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Network.enable')
  await send('Page.navigate', { url: PAGE_URL })
  await sleep(3000)

  // 安装观测：记录 html class 翻转时刻
  await send('Runtime.evaluate', {
    expression: `(() => {
      window.__log = []
      window.__mo = new MutationObserver((muts) => {
        if (muts.some((m) => m.attributeName === 'class')) window.__log.push({ t: performance.now(), ev: 'flip' })
      })
      window.__mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
      return document.querySelectorAll('.switch-button').length
    })()`,
    returnByValue: true,
  })

  const results = []
  for (const profile of profiles) {
    await send('Emulation.setCPUThrottlingRate', { rate: profile.cpu })
    if (profile.net) await send('Network.emulateNetworkConditions', { offline: false, ...profile.net })
    else await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
    await sleep(500)

    // 清空日志，逐次点击（5 个按钮轮询 CLICKS_PER_PROFILE 次）
    await send('Runtime.evaluate', { expression: 'window.__log = []', returnByValue: true })
    for (let i = 0; i < CLICKS_PER_PROFILE; i++) {
      await send('Runtime.evaluate', {
        expression: `(() => {
          const b = document.querySelectorAll('.switch-button')[${i % 5}]
          window.__log.push({ t: performance.now(), ev: 'click' })
          b.click()
        })()`,
        returnByValue: true,
      })
      await sleep(CLICK_INTERVAL_MS)
    }
    await sleep(1500)

    const { result } = await send('Runtime.evaluate', { expression: 'window.__log', returnByValue: true })
    const log = result.result.value
    let timeouts = 0
    const deltas = []
    let pendingClick = null
    for (const entry of log) {
      if (entry.ev === 'click') pendingClick = entry.t
      else if (entry.ev === 'flip' && pendingClick !== null) {
        const delta = entry.t - pendingClick
        deltas.push(delta)
        if (delta > TIMEOUT_MS) timeouts++
        pendingClick = null
      }
    }
    deltas.sort((a, b) => a - b)
    const max = deltas.at(-1) ?? 0
    const p95 = deltas[Math.floor(deltas.length * 0.95)] ?? 0
    results.push({ name: profile.name, samples: deltas.length, timeouts, max: Math.round(max), p95: Math.round(p95) })
    console.log(`${profile.name}: 样本 ${deltas.length}，超时(>300ms) ${timeouts} 次，p95 ${Math.round(p95)}ms，max ${Math.round(max)}ms`)
  }

  console.log(JSON.stringify(results))
  close()
}

main().catch((e) => {
  console.error('FAILED:', e.message)
  process.exit(1)
})
