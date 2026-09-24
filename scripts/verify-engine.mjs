/* global document, getComputedStyle, navigator, CSS */
/**
 * PC 端浏览器引擎矩阵验证（next-steps 待办 2）。
 *
 * 背景：`CIRCLE + reverse` 收起方向依赖「view-transition 伪元素上动画 @property 注册半径
 * （--theme-switch-radius）+ mask-image: radial-gradient(var(...))」，该组合此前只在 Chrome 验证过。
 * 本脚本用 Playwright 驱动多引擎跑同一套判据：
 *   --engine=webkit    Playwright WebKit 构建（Safari 内核；本机无 Safari 时的最近似手段）
 *   --engine=firefox   Playwright Firefox 构建（Firefox 144+ 支持 View Transitions）
 *   --engine=chromium  配合 --channel=chrome / msedge 驱动本机**真实安装**的 Chrome / Edge
 *
 * 判据（页面用 scripts/jitter-lab/lab.html?variant=clean 纯色平面，几何拟合不受卡片/文字干扰）：
 *   1. 支持面：startViewTransition / getAnimations / CSS.registerProperty / mask radial-gradient(calc(var()))；
 *   2. CIRCLE + reverse 收起（dark→light，@property 洞路径）：
 *      - 亮度：截图平均亮度必须从暗(<40)连续推进到亮(>200)，≥6 个取值且单调 —— 引擎无关的
 *        "逐帧推进"证明（属性未注册会离散翻转 → 只有 2 个取值；var() 失效 → 恒为终态）；
 *      - 几何：优先从 ::view-transition-new(root) 计算样式解析洞半径（WebKit/Chrome 会把 var()
 *        解析成具体长度），否则对明暗边界做最小二乘圆拟合；半径必须单调收缩；
 *      支持 getAnimations 捕获伪元素动画的引擎走"暂停 + 按毫秒 seek"的确定性取样，
 *      否则退化为实时抓帧（duration 拉长到 2000ms 以获得足够帧数）；
 *   3. 全部动画类型（数量取自库的 ThemeAnimationType，light→dark）：起点/中点/终点三帧亮度呈 亮→中→暗，start↔mid 像素差异 >2%；
 *   4. finished 结算 ok；全程无 console.error / pageerror。
 *
 * 运行：node scripts/verify-engine.mjs [--engine=webkit|firefox|chromium] [--channel=chrome|msedge]
 *       [--headless=off] [--keep]
 * 前置：pnpm build（dist/ 最新）；Playwright 装在 %TEMP%/pw-webkit（npm i playwright &&
 *       npx playwright install webkit firefox），路径可用 PW_DIR 覆盖。chromium+channel 用本机浏览器，无需下载。
 */
import { createServer } from 'node:http'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { decodePng } from './jitter-lab/png.mjs'
import { fitFrame } from './jitter-lab/circle.mjs'

const HERE = fileURLToPath(new URL('.', import.meta.url))
const ROOT = resolve(HERE, '..')
const PW_DIR = process.env.PW_DIR ?? join(tmpdir(), 'pw-webkit')
const OUT_DIR = join(ROOT, 'scripts', '.verify-engine-out')
const PORT = Number(process.env.VERIFY_ENGINE_PORT ?? 3211)
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.map': 'application/json',
  '.svg': 'image/svg+xml',
}

const args = {}
for (const raw of process.argv.slice(2)) {
  const m = /^--([^=]+)(?:=(.*))?$/.exec(raw)
  if (m) args[m[1]] = m[2] ?? true
}
const ENGINE = String(args.engine ?? 'webkit')
const CHANNEL = args.channel ? String(args.channel) : null
const HEADLESS = args.headless !== 'off'
const LABEL = CHANNEL ? `${ENGINE}:${CHANNEL}` : ENGINE

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://127.0.0.1:${PORT}`)
    // Chromium 会自动请求 favicon，404 会以 console.error 形式污染"零报错"判据
    if (url.pathname === '/favicon.ico') return res.writeHead(204).end()
    const filePath = join(ROOT, normalize(decodeURIComponent(url.pathname)))
    if (!filePath.startsWith(ROOT)) return res.writeHead(403).end('forbidden')
    const body = await readFile(filePath)
    res.writeHead(200, { 'content-type': MIME[extname(filePath)] ?? 'application/octet-stream' })
    res.end(body)
  } catch {
    res.writeHead(404).end('not found')
  }
})
await new Promise((ok) => server.listen(PORT, '127.0.0.1', ok))

const pw = await import(pathToFileURL(join(PW_DIR, 'node_modules', 'playwright', 'index.mjs')).href)
const { ThemeAnimationType } = await import(pathToFileURL(join(ROOT, 'dist', 'index.mjs')).href)
const TYPE_ENTRIES = Object.entries(ThemeAnimationType)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const meanLum = (frame) => {
  let s = 0
  for (let i = 0; i < frame.lum.length; i += 7) s += frame.lum[i]
  return s / Math.ceil(frame.lum.length / 7)
}
const distinctCount = (arr, step) => new Set(arr.map((v) => Math.round(v / step))).size
const monotonic = (arr, dir, tol) => {
  let bad = 0
  for (let i = 1; i < arr.length; i++) {
    if (dir === 'up' && arr[i] < arr[i - 1] - tol) bad++
    if (dir === 'down' && arr[i] > arr[i - 1] + tol) bad++
  }
  return bad
}

const REPORT = { label: LABEL, ua: '', version: '', probes: {}, mode: '', revert: {}, types: [], consoleErrors: [], pageErrors: [] }
const failures = []
const consoleErrors = []
const pageErrors = []
let browser, context, page

/** 从 VT 伪元素蒙版渐变的计算样式里解析洞半径；引擎不支持伪元素查询或不解析 var() 时返回 null */
async function readHoleRadius() {
  return page.evaluate(() => {
    try {
      const cs = getComputedStyle(document.documentElement, '::view-transition-new(root)')
      const img = String(cs.maskImage ?? cs.webkitMaskImage ?? '')
      // 取色值后面的长度：WebKit "rgba(0, 0, 0, 0) 1040.7px, rgb(0, 0, 0) 1041.7px"（两停点 = R∓0.5）；
      // Chrome 可能保留 "calc(1041.2px - 0.5px)"（括号后直接是 R）
      const nums = [...img.matchAll(/\)\s+(?:calc\()?(-?[\d.]+(?:e[-+]?\d+)?)px/g)].map((m) => Number(m[1]))
      if (nums.length < 2) return { radius: null, raw: img.slice(0, 140) }
      const a = nums[nums.length - 2]
      const b = nums[nums.length - 1]
      return { radius: Math.abs(b - a) < 2 ? (a + b) / 2 : Math.max(a, b), raw: img.slice(0, 140) }
    } catch (e) {
      return { radius: null, raw: `threw: ${e?.message ?? e}` }
    }
  })
}

async function shot() {
  await page.evaluate('new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))')
  return decodePng(await page.screenshot({ type: 'png' }))
}

async function waitOutcome() {
  await page.waitForFunction(`window.__lastOutcome !== 'pending' && window.__lastOutcome !== 'none'`, null, { timeout: 12000 })
  return page.evaluate('window.__lastOutcome')
}

try {
  await rm(OUT_DIR, { recursive: true, force: true }).catch(() => {})
  const launcher = pw[ENGINE]
  if (!launcher) throw new Error(`未知引擎 ${ENGINE}（webkit / firefox / chromium）`)
  browser = await launcher.launch({ headless: HEADLESS, ...(CHANNEL ? { channel: CHANNEL } : {}) })
  REPORT.version = browser.version()
  context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 })
  page = await context.newPage()
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
  page.on('pageerror', (e) => pageErrors.push(String(e)))

  await page.goto(`http://127.0.0.1:${PORT}/scripts/jitter-lab/lab.html?variant=clean`)
  await page.waitForFunction('window.__ready === true', null, { timeout: 20000 })
  REPORT.ua = await page.evaluate(() => navigator.userAgent)
  console.log(`[${LABEL}] 版本 ${REPORT.version}`)
  console.log(`UA: ${REPORT.ua}`)

  // ---------- 1. 支持面 ----------
  REPORT.probes = await page.evaluate(() => ({
    startViewTransition: typeof document.startViewTransition === 'function',
    getAnimations: typeof document.getAnimations === 'function',
    cssRegisterProperty: typeof CSS.registerProperty === 'function',
    maskRadialGradient: CSS.supports('mask-image', 'radial-gradient(circle at 1px 1px, transparent 0px, #000 10px)'),
    varInGradientMask: CSS.supports('mask-image', 'radial-gradient(circle at 1px 1px, transparent calc(var(--x) - 0.5px), #000 calc(var(--x) + 0.5px))'),
  }))
  console.log('支持面:', JSON.stringify(REPORT.probes))
  if (!REPORT.probes.startViewTransition) throw new Error('不支持 startViewTransition —— 该引擎走降级直切路径，无动画可验')

  // ---------- 2. CIRCLE + reverse 收起 ----------
  console.log('\n=== CIRCLE + reverse 收起（dark→light，@property 洞半径） ===')
  await page.evaluate(`window.__lab.reset('dark')`)
  await sleep(150)
  let started = await page.evaluate(`window.__lab.start({ duration: 750, animationType: 'circle', reverse: true })`)
  if (!started?.animated) throw new Error('转场未启动（animated=false）')
  let animCount = await page.evaluate('window.__lab.waitForAnimation()')
  const meta = await page.evaluate('window.__lab.center()')
  const track = []

  if (animCount) {
    REPORT.mode = 'seek'
    console.log(`捕获蒙版动画 ${animCount} 个 → 暂停 + 按毫秒 seek 取样；触发点 (${meta.cx.toFixed(1)}, ${meta.cy.toFixed(1)})`)
    await page.evaluate('window.__lab.pause()')
    for (const t of [0, 75, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 675, 750]) {
      await page.evaluate(`window.__lab.seek(${t})`)
      const { radius, raw } = await readHoleRadius()
      const frame = await shot()
      const lum = meanLum(frame)
      const fit = lum > 40 && lum < 230 ? fitFrame(frame, { idealCx: meta.cx, idealCy: meta.cy, scale: 1 }) : null
      track.push({ t, lum: Math.round(lum), radiusCS: radius, radiusFit: fit ? Math.round(fit.r * 10) / 10 : null, raw: t === 0 ? raw : undefined })
    }
    await page.evaluate('window.__lab.finish()')
  } else {
    REPORT.mode = 'live'
    console.log('getAnimations 未捕获到伪元素蒙版动画 → 退化为实时抓帧（duration=2000ms）')
    await waitOutcome()
    await page.evaluate(`window.__lab.reset('dark')`)
    await sleep(200)
    const t0 = Date.now()
    started = await page.evaluate(`window.__lab.start({ duration: 2000, animationType: 'circle', reverse: true })`)
    if (!started?.animated) throw new Error('转场未启动（animated=false）')
    for (;;) {
      const elapsed = Date.now() - t0
      const frame = decodePng(await page.screenshot({ type: 'png' }))
      const lum = meanLum(frame)
      const fit = lum > 40 && lum < 230 ? fitFrame(frame, { idealCx: meta.cx, idealCy: meta.cy, scale: 1 }) : null
      track.push({ t: elapsed, lum: Math.round(lum), radiusCS: null, radiusFit: fit ? Math.round(fit.r * 10) / 10 : null })
      if (elapsed > 2600 || (lum > 240 && elapsed > 1500)) break
    }
  }
  const revertOutcome = await waitOutcome()
  REPORT.revert = { animCount, meta, track, outcome: revertOutcome }

  for (const x of track) {
    console.log(
      `  t=${String(x.t).padStart(4)}ms  亮度=${String(x.lum).padStart(3)}  半径(计算样式)=${x.radiusCS === null ? '   -   ' : x.radiusCS.toFixed(1).padStart(7) + 'px'}  半径(像素拟合)=${x.radiusFit === null ? '  -  ' : x.radiusFit.toFixed(1).padStart(6) + 'px'}`,
    )
  }
  if (track[0]?.raw) console.log(`  （t=0 计算样式原文: ${track[0].raw}）`)

  const lums = track.map((x) => x.lum)
  const lumOk = lums[0] < 40 && lums.at(-1) > 200 && distinctCount(lums, 1) >= 6 && monotonic(lums, 'up', 2) === 0
  console.log(`亮度 ${lums[0]}→${lums.at(-1)}，${distinctCount(lums, 1)} 个取值，${monotonic(lums, 'up', 2) === 0 ? '单调推进' : '非单调'} ${lumOk ? '✓' : '✗'}`)
  if (!lumOk) failures.push(`收起方向亮度未连续推进（${lums.join(',')}）`)

  const cs = track.map((x) => x.radiusCS).filter((v) => v !== null)
  const fits = track.map((x) => x.radiusFit).filter((v) => v !== null)
  let geomNote
  if (cs.length >= 6) {
    const ok = monotonic(cs, 'down', 0.6) === 0 && cs[0] > 500 && cs.at(-1) < 5 && distinctCount(cs, 0.1) >= 6
    geomNote = `计算样式半径 ${cs[0].toFixed(1)}→${cs.at(-1).toFixed(1)}px，${cs.length} 点${ok ? '单调收缩 ✓' : '异常 ✗'}`
    if (!ok) failures.push(`收起方向计算样式半径异常（${cs.map((v) => v.toFixed(0)).join(',')}）`)
  } else if (fits.length >= 4) {
    const ok = monotonic(fits, 'down', 3) === 0 && fits[0] - fits.at(-1) > 200 && distinctCount(fits, 1) >= 4
    geomNote = `像素拟合半径 ${fits[0].toFixed(1)}→${fits.at(-1).toFixed(1)}px，${fits.length} 点${ok ? '单调收缩 ✓' : '异常 ✗'}（该引擎不解析伪元素样式，用像素几何代替）`
    if (!ok) failures.push(`收起方向拟合半径异常（${fits.map((v) => v.toFixed(0)).join(',')}）`)
  } else {
    geomNote = `几何证据不足（计算样式 ${cs.length} 点 / 拟合 ${fits.length} 点），以亮度推进为准`
  }
  console.log(geomNote)
  if (revertOutcome !== 'ok') failures.push(`收起方向 outcome=${revertOutcome}`)
  if (lumOk && !failures.length) console.log('=> @property 注册半径在该引擎的 VT 伪元素上逐帧插值，蒙版随之推进 ✓')

  // ---------- 3. 全部动画类型（数量随库的 ThemeAnimationType 自动变化） ----------
  console.log(`\n=== ${TYPE_ENTRIES.length} 种动画类型逐一验证（light→dark，${REPORT.mode} 模式） ===`)
  for (const [key, value] of TYPE_ENTRIES) {
    await page.evaluate(`window.__lab.reset('light')`)
    await sleep(120)
    const frames = {}
    let n = 0
    if (REPORT.mode === 'seek') {
      const res = await page.evaluate(`window.__lab.start({ duration: 600, animationType: ${JSON.stringify(value)}, reverse: false })`)
      if (!res?.animated) throw new Error(`${key}: 转场未启动`)
      n = await page.evaluate('window.__lab.waitForAnimation()')
      await page.evaluate('window.__lab.pause()')
      for (const [label, t] of [['start', 0], ['mid', 300], ['end', 600]]) {
        await page.evaluate(`window.__lab.seek(${t})`)
        frames[label] = await shot()
      }
      await page.evaluate('window.__lab.finish()')
    } else {
      const res = await page.evaluate(`window.__lab.start({ duration: 1600, animationType: ${JSON.stringify(value)}, reverse: false })`)
      if (!res?.animated) throw new Error(`${key}: 转场未启动`)
      frames.start = decodePng(await page.screenshot({ type: 'png' }))
      await sleep(Math.max(0, 800 - 250))
      frames.mid = decodePng(await page.screenshot({ type: 'png' }))
    }
    const outcome = await waitOutcome()
    if (!frames.end) frames.end = await shot()
    const L = { start: meanLum(frames.start), mid: meanLum(frames.mid), end: meanLum(frames.end) }
    let diff = 0
    let n2 = 0
    for (let i = 0; i < frames.start.lum.length; i += 5) {
      if (Math.abs(frames.start.lum[i] - frames.mid.lum[i]) > 30) diff++
      n2++
    }
    const diffFrac = diff / n2
    const progressing = L.start > 200 && L.end < 60 && L.mid > L.end + 12 && L.mid < L.start - 12 && diffFrac > 0.02
    REPORT.types.push({ key, value, maskAnimations: n, lum: L, diffFrac: Math.round(diffFrac * 1000) / 1000, outcome, progressing })
    console.log(
      `  ${key.padEnd(14)} ${REPORT.mode === 'seek' ? `蒙版动画=${n}  ` : ''}亮度 ${L.start.toFixed(0)}→${L.mid.toFixed(0)}→${L.end.toFixed(0)}  Δ(start,mid)=${(diffFrac * 100).toFixed(1)}%  outcome=${outcome}  ${progressing ? '✓' : '✗'}`,
    )
    if (!progressing) failures.push(`${key}：蒙版未推进（亮度 ${L.start.toFixed(0)}/${L.mid.toFixed(0)}/${L.end.toFixed(0)}，差异 ${(diffFrac * 100).toFixed(1)}%）`)
    if (outcome !== 'ok') failures.push(`${key}：outcome=${outcome}`)
    await sleep(150)
  }

  // ---------- 4. 汇总 ----------
  REPORT.consoleErrors = consoleErrors
  REPORT.pageErrors = pageErrors
  if (consoleErrors.length || pageErrors.length) {
    failures.push(`报错：console.error ${consoleErrors.length} 条 / pageerror ${pageErrors.length} 条`)
    for (const m of [...consoleErrors, ...pageErrors].slice(0, 5)) console.error(`  [err] ${m}`)
  }
  console.log(`\n=== [${LABEL}] 汇总 ===`)
  if (failures.length) {
    console.error(`FAIL（${failures.length} 项）:`)
    for (const f of failures) console.error(`  - ${f}`)
    process.exitCode = 1
  } else {
    console.log(`${TYPE_ENTRIES.length} 种类型全部推进并结算 ok，报错 0 条 —— [${LABEL}] 全部通过 ✓`)
  }
} catch (e) {
  console.error(`FAILED [${LABEL}]:`, e?.message ?? e)
  process.exitCode = 1
} finally {
  try { await page?.close() } catch { /* 浏览器可能已关闭 */ }
  try { await context?.close() } catch { /* 同上 */ }
  try { await browser?.close() } catch { /* 同上 */ }
  server.close()
  if (args.keep || process.exitCode) {
    await mkdir(OUT_DIR, { recursive: true }).catch(() => {})
    const file = join(OUT_DIR, `${LABEL.replace(':', '-')}.json`)
    await writeFile(file, JSON.stringify(REPORT, null, 2)).catch(() => {})
    console.log(`报告: ${file}`)
  }
  process.exit(process.exitCode ?? 0)
}
