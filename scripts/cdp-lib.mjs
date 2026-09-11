/**
 * CDP 连接与轻量命令/事件封装（供验收脚本共用）。
 * 前置：无头 Chromium 以 `--remote-debugging-port=19222` 启动。
 * 注意：Windows 上部分端口落在 Hyper-V/WinNAT 保留区间会导致 bind 失败（如 9223），
 * 19222 已实测可用；可用 `netsh interface ipv4 show excludedportrange protocol=tcp` 查询。
 */
export const CDP_PORT = Number(process.env.ACCEPTANCE_CDP_PORT ?? 19222)
export const PAGE_URL = process.env.ACCEPTANCE_URL ?? 'http://127.0.0.1:5222/'

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

export async function connectPage(cdpPort = CDP_PORT) {
  const targets = await (await fetch(`http://127.0.0.1:${cdpPort}/json/list`)).json()
  const page = targets.find((t) => t.type === 'page')
  if (!page) throw new Error('no page target')
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((res, rej) => {
    ws.onopen = res
    ws.onerror = rej
  })
  let id = 0
  const pending = new Map()
  const listeners = []
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data)
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg)
      pending.delete(msg.id)
      return
    }
    if (msg.method) {
      for (const fn of listeners) fn(msg)
    }
  }
  const send = (method, params = {}) =>
    new Promise((res) => {
      const mid = ++id
      pending.set(mid, res)
      ws.send(JSON.stringify({ id: mid, method, params }))
    })
  return { send, onEvent: (fn) => listeners.push(fn), close: () => ws.close() }
}
