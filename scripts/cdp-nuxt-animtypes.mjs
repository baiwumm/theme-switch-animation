/**
 * Nuxt playground 动画类型独立性检查（Phase 4 真机反馈回归，Phase 6 扩到全部 13 种）：
 * 13 个按钮各自声明不同动画类型（data-animation-type），逐个点击后注入的 @keyframes 名
 * 必须与按钮类型匹配——防止"所有按钮都播同一个动画"（共享单实例的缺陷）。
 * 按钮清单从 DOM 读取（data-animation-type），新增动画类型时无需改本脚本。
 * 前置：playgrounds/nuxt `nuxt build` + `node .output/server/index.mjs`（3000）；无头 Chromium 19222。
 */
import { CDP_PORT, connectPage, sleep } from './cdp-lib.mjs'

const PAGE_URL = process.env.ACCEPTANCE_NUXT_URL ?? 'http://127.0.0.1:3000/'

const ws = await connectPage(CDP_PORT)
await ws.send('Page.enable')
await ws.send('Runtime.enable')
await ws.send('Page.navigate', { url: PAGE_URL })
await sleep(6000)

const count = await ws.send('Runtime.evaluate', {
  expression: `document.querySelectorAll('.switch-button[data-animation-type]').length`,
  returnByValue: true,
})
const total = count.result.result.value
if (!total) {
  console.error('FAIL: 页面上没有带 data-animation-type 的 .switch-button')
  process.exit(1)
}

const fail = []
for (let i = 0; i < total; i++) {
  await ws.send('Runtime.evaluate', {
    expression: `document.querySelectorAll('.switch-button[data-animation-type]')[${i}].click()`,
    returnByValue: true,
  })
  // 等转场开始、样式注入完成
  await sleep(200)
  const probe = await ws.send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.querySelectorAll('.switch-button[data-animation-type]')[${i}]
      const style = document.getElementById('theme-switch-animation')
      const css = style ? style.textContent : ''
      const m = css.match(/@keyframes (theme-switch-[a-z-]+)/)
      return JSON.stringify({
        btnType: btn.dataset.animationType,
        keyframes: m ? m[1] : null,
      })
    })()`,
    returnByValue: true,
  })
  const { btnType, keyframes } = JSON.parse(probe.result.result.value)
  const expected = `theme-switch-${btnType}`
  const ok = keyframes === expected
  console.log(`${btnType}: keyframes=${keyframes}（期望 ${expected}）${ok ? ' ✓' : ' ✗'}`)
  if (!ok) fail.push(`${btnType} 期望 ${expected}，实际 ${keyframes}`)
  await sleep(900)
}

ws.close()
if (fail.length) {
  console.error('FAIL: 按钮动画类型不独立 — ' + fail.join('；'))
  process.exit(1)
}
console.log(`PASS: ${total} 个按钮各自播放声明的动画类型`)
