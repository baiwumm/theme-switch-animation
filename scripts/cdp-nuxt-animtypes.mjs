/**
 * Nuxt playground 动画类型独立性检查（Phase 4 真机反馈回归）：
 * 五个按钮各自声明不同动画类型，逐个点击后注入的 @keyframes 名必须与按钮类型匹配——
 * 防止"所有按钮都播同一个动画"（共享单实例的缺陷）。
 * 前置：playgrounds/nuxt `nuxt build` + `node .output/server/index.mjs`（3000）；无头 Chromium 19222。
 */
import { CDP_PORT, connectPage, sleep } from './cdp-lib.mjs'

const PAGE_URL = process.env.ACCEPTANCE_NUXT_URL ?? 'http://127.0.0.1:3000/'
const LABELS = ['CIRCLE', 'LTR', 'RTL', 'TTB', 'BTT']

const ws = await connectPage(CDP_PORT)
await ws.send('Page.enable')
await ws.send('Runtime.enable')
await ws.send('Page.navigate', { url: PAGE_URL })
await sleep(6000)

const fail = []
for (let i = 0; i < LABELS.length; i++) {
  await ws.send('Runtime.evaluate', {
    expression: `document.querySelectorAll('.switch-button')[${i}].click()`,
    returnByValue: true,
  })
  // 等转场开始、样式注入完成
  await sleep(200)
  const probe = await ws.send('Runtime.evaluate', {
    expression: `(() => {
      const style = document.getElementById('theme-switch-animation')
      const css = style ? style.textContent : ''
      const m = css.match(/@keyframes (theme-switch-[a-z]+)/)
      return JSON.stringify({ btnLabel: document.querySelectorAll('.switch-button strong')[${i}].textContent, keyframes: m ? m[1] : null })
    })()`,
    returnByValue: true,
  })
  const { btnLabel, keyframes } = JSON.parse(probe.result.result.value)
  const expected = `theme-switch-${LABELS[i].toLowerCase()}`
  const ok = keyframes === expected
  console.log(`${btnLabel}: keyframes=${keyframes}（期望 ${expected}）${ok ? ' ✓' : ' ✗'}`)
  if (!ok) fail.push(`${btnLabel} 期望 ${expected}，实际 ${keyframes}`)
  await sleep(900)
}

ws.close()
if (fail.length) {
  console.error('FAIL: 按钮动画类型不独立 — ' + fail.join('；'))
  process.exit(1)
}
console.log('PASS: 五个按钮各自播放声明的动画类型')
