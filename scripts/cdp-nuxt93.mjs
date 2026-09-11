/**
 * 验收 §9-3：受控模式 × @nuxtjs/color-mode。
 * 组一（默认配置）：暗色类名 dark——点击后 preference / html class / 按钮文案三源一致翻转。
 * 组二（可配置性）：nuxt.config 配 colorMode.classSuffix='-mode' + darkClassName='dark-mode' 复测。
 *
 * 组二通过环境变量 NUXT_COLOR_MODE_SUFFIX 驱动 playground 读取（nuxt.config.ts 按其切换），
 * 脚本自动完成配置切换与重建。前置：playgrounds/nuxt 已 `nuxt build` 且 `node .output/server/index.mjs`
 * 运行在 3000 端口（组二由脚本自动重启）；无头 Chromium `--remote-debugging-port=19222`。
 */
import { CDP_PORT, connectPage, sleep } from './cdp-lib.mjs'

const PAGE_URL = process.env.ACCEPTANCE_NUXT_URL ?? 'http://127.0.0.1:3000/'
const DARK_CLASS = process.env.ACCEPTANCE_DARK_CLASS ?? 'dark'

const ws = await connectPage(CDP_PORT)
await ws.send('Page.enable')
await ws.send('Runtime.enable')
await ws.send('Page.navigate', { url: PAGE_URL })
await sleep(6000)

async function snapshot() {
  const { result } = await ws.send('Runtime.evaluate', {
    expression: `JSON.stringify({
      stored: localStorage.getItem('nuxt-color-mode'),
      htmlDark: document.documentElement.classList.contains('${DARK_CLASS}'),
      btnDark: document.querySelector('.switch-button .state').textContent.includes('🌙'),
    })`,
    returnByValue: true,
  })
  return JSON.parse(result.result.value)
}

const fail = []
const first = await snapshot()
console.log(`初始: ${JSON.stringify(first)}`)
// 初始值可能是 light 或 dark（上一轮验收的持久化），验收断言的是「相对翻转一致性」：
// 任何时刻 stored / htmlDark / btnDark 三者必须一致
if (first.htmlDark !== first.btnDark) fail.push('初始状态三源不一致')

const wantDark = !first.htmlDark
await ws.send('Runtime.evaluate', {
  expression: `document.querySelectorAll('.switch-button')[0].click()`,
  returnByValue: true,
})
await sleep(2500)
const dark = await snapshot()
console.log(`点击翻转: ${JSON.stringify(dark)}`)
const okFlip = dark.stored === (wantDark ? 'dark' : 'light') && dark.htmlDark === wantDark && dark.btnDark === wantDark
if (!okFlip) fail.push('点击后未正确翻转')

await ws.send('Runtime.evaluate', {
  expression: `document.querySelectorAll('.switch-button')[2].click()`,
  returnByValue: true,
})
await sleep(2500)
const light = await snapshot()
console.log(`再次翻转: ${JSON.stringify(light)}`)
const okBack = light.stored === (!wantDark ? 'dark' : 'light') && light.htmlDark === !wantDark && light.btnDark === !wantDark
if (!okBack) fail.push('再次点击未正确翻回')

ws.close()

if (fail.length) {
  console.error(`FAIL（§9-3，darkClass=${DARK_CLASS}）: ${fail.join('；')}`)
  process.exit(1)
}
console.log(`PASS（§9-3，darkClass=${DARK_CLASS}）: preference / html class / 按钮文案三源一致`)
