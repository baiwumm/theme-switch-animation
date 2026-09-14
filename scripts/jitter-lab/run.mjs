/* global Buffer */
/**
 * CIRCLE_REVERT 收起（暗 → 亮）线条抖动实验台。
 *
 * 思路：用真实库（dist/index.mjs）在受控页面里跑一次真转场，把 view-transition 伪元素上的
 * 蒙版动画暂停后按毫秒 seek，逐帧截图并检测"孤立 1px 线条"；再对照基线帧（无动画）排除误报。
 *
 * 用法（需先 `pnpm build` 生成 dist/）：
 *   node scripts/jitter-lab/run.mjs --dsf=1.5 --samples=48
 *   node scripts/jitter-lab/run.mjs --direction=expand --dsf=1
 *   node scripts/jitter-lab/run.mjs --patch="will-change: mask-size, mask-position;=>"
 */
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { connectPage, sleep } from '../cdp-lib.mjs'
import { decodePng } from './png.mjs'
import { detectLines, hairlineRate, summarize } from './detect.mjs'

const HERE = fileURLToPath(new URL('.', import.meta.url))
const ROOT = resolve(HERE, '..', '..')
const HTML = '/scripts/jitter-lab/lab.html'

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.map': 'application/json; charset=utf-8',
}

function parseArgs(argv) {
  const args = { patch: [], chromeArg: [] }
  for (const raw of argv) {
    const m = /^--([^=]+)(?:=(.*))?$/.exec(raw)
    if (!m) continue
    const [, key, value] = m
    if (key === 'patch') args.patch.push(value)
    else if (key === 'chrome-arg') args.chromeArg.push(value)
    else args[key] = value === undefined ? true : value
  }
  return args
}

function startServer(port, root = ROOT) {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://127.0.0.1:${port}`)
      const filePath = join(root, normalize(decodeURIComponent(url.pathname)))
      if (!filePath.startsWith(root)) {
        res.writeHead(403).end('forbidden')
        return
      }
      const body = await readFile(filePath)
      res.writeHead(200, { 'content-type': MIME[extname(filePath)] ?? 'application/octet-stream' })
      res.end(body)
    } catch {
      res.writeHead(404).end('not found')
    }
  })
  return new Promise((ok) => server.listen(port, '127.0.0.1', () => ok(server)))
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  ].filter(Boolean)
  const found = candidates.find((p) => existsSync(p))
  if (!found) throw new Error('未找到 Chrome/Edge，可用 CHROME_PATH 指定')
  return found
}

async function launchChrome({ cdpPort, userDataDir, gpu, headless = 'new', extraArgs = [] }) {
  const args = [
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-background-networking',
    '--disable-sync',
    '--disable-features=Translate,BackForwardCache',
    '--force-color-profile=srgb',
    '--window-size=1280,800',
    '--hide-crash-restore-bubble',
    // 透传参数（--chrome-arg=...，可重复）：例如有头模式下用
    // --force-device-scale-factor=1.25 复刻 Windows 125% 缩放的真实呈现路径
    ...extraArgs,
    'about:blank',
  ]
  if (headless !== 'off') args.unshift(`--headless=${headless}`)
  else {
    // 有头模式：必须关掉 Windows 的原生遮挡检测，否则窗口一旦不被认为"可见"就停止渲染（转场会被跳过）
    args.unshift('--window-position=60,60')
    args[args.indexOf('--disable-features=Translate,BackForwardCache')] =
      '--disable-features=Translate,BackForwardCache,CalculateNativeWinOcclusion'
  }
  if (gpu) args.unshift('--use-angle=d3d11')
  const child = spawn(findChrome(), args, { stdio: 'ignore' })
  for (let i = 0; i < 60; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${cdpPort}/json/list`)).json()
      if (list.some((t) => t.type === 'page')) return child
    } catch {
      /* 端口未就绪 */
    }
    await sleep(250)
  }
  child.kill()
  throw new Error('CDP 未就绪')
}

async function evaluate(send, expression, awaitPromise = false) {
  const { result, exceptionDetails } = (
    await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise })
  ).result
  if (exceptionDetails) throw new Error(`evaluate failed: ${exceptionDetails.text} ${exceptionDetails.exception?.description ?? ''}`)
  return result.value
}

async function screenshotFrame(send) {
  const { data } = (await send('Page.captureScreenshot', { format: 'png', fromSurface: true })).result
  return Buffer.from(data, 'base64')
}

/**
 * 逐帧统计（闪屏排查）：
 *   - mean：全帧平均亮度，帧间应平滑；
 *   - worstJump：mean 轨迹上的"孤立跳变"（闪一帧的特征）；
 *   - bigFlip：与上一帧相比 |ΔL|>100 的像素数（整块画面翻转 = 电视故障式闪屏）；
 *   - ppm：孤立像素密度（1px 级线条/雪花）；
 *   - modalFrac：落在众数亮度 ±8 内的像素占比（接近 1 = 整屏纯色帧）。
 * 只保留相邻两帧的亮度，避免几十帧 PNG 同时驻留内存。
 */
function frameStats(shotBufs) {
  const stats = []
  let prevLum = null
  let prevRows = null
  for (const buf of shotBufs) {
    const frame = decodePng(buf)
    const lum = frame.lum
    let mean = 0
    for (let p = 0; p < lum.length; p += 97) mean += lum[p]
    mean /= Math.ceil(lum.length / 97)
    let bigFlip = 0
    if (prevLum) {
      for (let p = 0; p < lum.length; p += 7) {
        if (Math.abs(lum[p] - prevLum[p]) > 100) bigFlip++
      }
      bigFlip *= 7
    }
    // 行亮度剖面 + 相邻帧行差的"横带"检测（用户描述：一条横带/撕裂）
    const rows = new Float64Array(frame.height)
    for (let y = 0; y < frame.height; y++) {
      let s = 0
      const base = y * frame.width
      for (let x = 0; x < frame.width; x += 2) s += lum[base + x]
      rows[y] = s / Math.ceil(frame.width / 2)
    }
    let bandLen = 0
    let bandDev = 0
    if (prevRows) {
      const d = new Float64Array(frame.height)
      for (let y = 0; y < frame.height; y++) d[y] = rows[y] - prevRows[y]
      const W = 20
      let run = 0
      for (let y = W; y < frame.height - W; y++) {
        let sum = 0
        for (let k = -W; k <= W; k++) {
          if (k >= -2 && k <= 2) continue // 排除自身附近，避免把真实边缘算进基线
          sum += d[y + k]
        }
        const base = sum / (2 * W + 1 - 5)
        const dev = Math.abs(d[y] - base)
        if (dev > 12) {
          run++
          if (dev > bandDev) bandDev = dev
          if (run > bandLen) bandLen = run
        } else {
          run = 0
        }
      }
    }
    const detection = detectLines(frame)
    // 众数亮度 ±8 的占比（亮度取整后 8 桶聚合）
    const hist = new Uint32Array(32)
    for (let p = 0; p < lum.length; p += 11) hist[Math.min(31, Math.floor(lum[p] / 8))]++
    let modal = 0
    for (const v of hist) if (v > modal) modal = v
    const modalFrac = modal / Math.ceil(lum.length / 11)
    stats.push({
      mean,
      ppm: hairlineRate(detection, frame),
      lines: detection.rows.length + detection.cols.length,
      bigFlip,
      modalFrac,
      bandLen,
      bandDev,
      buf,
    })
    prevLum = lum
    prevRows = rows
  }
  let worstJump = 0
  let worstIdx = -1
  for (let i = 1; i < stats.length - 1; i++) {
    const jump = Math.abs(stats[i].mean - (stats[i - 1].mean + stats[i + 1].mean) / 2)
    if (jump > worstJump) {
      worstJump = jump
      worstIdx = i
    }
  }
  const ppms = stats.map((s) => s.ppm)
  const maxPpm = ppms.length ? Math.max(...ppms) : 0
  const medPpm = ppms.length ? [...ppms].sort((a, b) => a - b)[Math.floor(ppms.length / 2)] : 0
  const flips = stats.slice(1).map((s) => s.bigFlip).sort((a, b) => a - b)
  const medFlip = flips.length ? flips[Math.floor(flips.length / 2)] : 0
  const maxFlip = flips.length ? flips[flips.length - 1] : 0
  let flipIdx = -1
  for (let i = 1; i < stats.length; i++) {
    if (stats[i].bigFlip === maxFlip) {
      flipIdx = i
      break
    }
  }
  const maxModal = stats.length ? Math.max(...stats.map((s) => s.modalFrac)) : 0
  let maxBand = 0
  let maxBandLen = 0
  let bandIdx = -1
  for (let i = 0; i < stats.length; i++) {
    if (stats[i].bandLen > maxBandLen || (stats[i].bandLen === maxBandLen && stats[i].bandDev > maxBand)) {
      maxBandLen = stats[i].bandLen
      maxBand = stats[i].bandDev
      bandIdx = stats[i].bandLen > 4 ? i : bandIdx
    }
  }
  return { stats, worstJump, worstIdx, maxPpm, medPpm, medFlip, maxFlip, flipIdx, maxModal, maxBand, maxBandLen, bandIdx }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const dsf = Number(args.dsf ?? 1)
  const samples = Number(args.samples ?? 48)
  const duration = Number(args.duration ?? 750)
  const direction = String(args.direction ?? 'collapse')
  const gpu = args.gpu === true
  const outDir = args.out ? resolve(String(args.out)) : null
  const appPort = Number(args.port ?? 3199)
  const cdpPort = Number(args.cdpPort ?? 19224)
  const width = Number(args.width ?? 1280)
  const height = Number(args.height ?? 800)

  const server = await startServer(appPort, args.root ? resolve(String(args.root)) : ROOT)
  const userDataDir = await mkdtemp(join(tmpdir(), 'jitter-lab-'))
  const chrome = await launchChrome({ cdpPort, userDataDir, gpu, headless: String(args.headless ?? 'new'), extraArgs: args.chromeArg })
  const { send, onEvent, close } = await connectPage(cdpPort)

  try {
    await send('Page.enable')
    await send('Runtime.enable')
    const headless = String(args.headless ?? 'new')
    if (headless !== 'off') {
      await send('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: dsf,
        mobile: false,
      })
    }
    await send('Page.navigate', { url: `http://127.0.0.1:${appPort}${args.page ?? HTML}${args.variant ? `?variant=${args.variant}` : ''}` })
    for (let i = 0; i < 60; i++) {
      if (await evaluate(send, `window.__ready === true || document.readyState === 'complete'`).catch(() => false)) break
      await sleep(250)
    }
    // 站点模式：readyState 在 about:blank 上就已是 complete，不足以判断真实 app 就绪，
    // 轮询到触发按钮真正挂载为止（Vue / React playground 产物是运行时挂载的）
    if (args.click) {
      for (let i = 0; i < 40; i++) {
        if (await evaluate(send, `document.querySelectorAll(${JSON.stringify(args.click)}).length > 0`).catch(() => false)) break
        await sleep(250)
      }
    }

    const glInfo = await evaluate(
      send,
      `(() => { const c = document.createElement('canvas'); const gl = c.getContext('webgl'); if (!gl) return 'no-webgl'; const d = gl.getExtension('WEBGL_debug_renderer_info'); return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'unknown' })()`,
    )
    console.log(`deviceScaleFactor=${dsf} 方向=${direction} 时长=${duration}ms 样本=${samples} GPU=${gpu ? 'on' : 'off'}`)
    console.log(`WebGL renderer: ${glInfo}`)
    if (args.patch.length) console.log(`CSS 补丁: ${args.patch.join(' ; ')}`)

    // 起始主题：收起 = 暗 → 亮；扩散 = 亮 → 暗
    const startTheme = direction === 'collapse' ? 'dark' : 'light'
    const siteMode = !!args.page
    if (siteMode) {
      await evaluate(send, `(document.documentElement.classList.remove('dark'), 'light')`)
    } else {
      await evaluate(send, `window.__lab.reset(${JSON.stringify(startTheme)})`)
    }
    await sleep(200)
    const meta = siteMode
      ? { cx: width / 2, cy: height / 2, width, height, dpr: dsf }
      : await evaluate(send, 'window.__lab.center()')
    console.log(`视口 ${meta.width}x${meta.height} @dpr=${meta.dpr}；触发点中心 (${meta.cx}, ${meta.cy})`)
    if (outDir) {
      await mkdir(outDir, { recursive: true })
      await writeFile(
        join(outDir, 'meta.json'),
        JSON.stringify({ ...meta, dsf, direction, duration, mode: args.mode ?? 'seek', width, height, patch: args.patch }, null, 2),
      )
    }

    // 对照组：无动画静态帧
    const baseFrame = decodePng(await screenshotFrame(send))
    const baseline = detectLines(baseFrame)
    console.log(
      `\n[基线] 静态帧（无转场）${baseFrame.width}x${baseFrame.height}：孤立像素 ${baseline.hairlinePixels}（${hairlineRate(baseline, baseFrame).toFixed(2)} ppm），线条候选 ${baseline.rows.length + baseline.cols.length} 条 ${summarize(baseline)}`,
    )

    const patchJson = JSON.stringify(args.patch.map((p) => p.split('=>')))
    const mode = String(args.mode ?? 'seek')
    let flagged = 0
    let frames = 0
    let worst = null
    const flaggedRuns = []

    if (mode === 'compare') {
      // 同一批 seek 时刻，分别用两种实现各抓一帧，逐像素比差异（验证"视觉等价"）
      const variants = String(args.variants ?? 'default,invert').split(',')
      const times = String(args.times ?? '0,75,150,225,300,375,450,525,600,675,750')
        .split(',')
        .map(Number)
      const shots = new Map()
      for (const variant of variants) {
        const frames = []
        for (const t of times) {
          await evaluate(send, `window.__lab.reset(${JSON.stringify(startTheme)})`)
          await sleep(120)
          const started = await evaluate(
            send,
            `window.__lab.start({ duration: ${duration}, cssVariant: ${variant === 'default' ? 'null' : JSON.stringify(variant)} })`,
          )
          if (!started.animated) throw new Error('转场未启动')
          const count = await evaluate(send, 'window.__lab.waitForAnimation()', true)
          if (!count) throw new Error(`未捕获到蒙版动画（variant=${variant}）`)
          await evaluate(send, 'window.__lab.pause()')
          await evaluate(send, `window.__lab.seek(${t})`)
          frames.push(decodePng(await screenshotFrame(send)))
          await evaluate(send, 'window.__lab.finish()')
          await sleep(120)
        }
        shots.set(variant, frames)
        console.log(`  变体 ${variant}：${frames.length} 帧已抓取`)
      }
      const [a, b] = variants
      const fa = shots.get(a)
      const fb = shots.get(b)
      console.log(`\n  对比 ${a} vs ${b}（逐像素亮度差，0-255）：`)
      console.log('   t(ms)   平均|Δ|   最大|Δ|   >2 的像素占比')
      for (let i = 0; i < fa.length; i++) {
        const A = fa[i]
        const B = fb[i]
        let sum = 0
        let max = 0
        let over = 0
        let n = 0
        for (let p = 0; p < A.lum.length; p += 7) {
          const d = Math.abs(A.lum[p] - B.lum[p])
          sum += d
          if (d > max) max = d
          if (d > 2) over++
          n++
        }
        console.log(
          `  ${String(times[i]).padStart(5)}  ${(sum / n).toFixed(3).padStart(8)}  ${max.toFixed(1).padStart(8)}  ${((over / n) * 100).toFixed(2).padStart(8)}%`,
        )
      }
    } else if (mode === 'probe') {
      // 同一次会话里连续跑 N 次真转场，逐帧采样伪元素计算样式/动画状态，统计异常帧概率
      const runs = Number(args.runs ?? 30)
      const all = []
      for (let i = 0; i < runs; i++) {
        const { log, animated } = await evaluate(
          send,
          `window.__lab.probeRun({ duration: ${duration}, theme: ${JSON.stringify(startTheme)} })`,
          true,
        )
        const flags = []
        for (const f of log) {
          const active = f.t > 20 && f.t < duration - 20
          if (!animated) continue
          if (active && !/^theme-switch-|^ts-radius-/.test(f.oldAnim ?? '')) flags.push(`t=${f.t} 蒙版动画未生效(oldAnim=${f.oldAnim})`)
          if (active && !/px/.test(f.oldMaskSize ?? '')) flags.push(`t=${f.t} mask-size 回落(auto?) =${f.oldMaskSize}`)
          if (active && f.oldBlend !== 'normal') flags.push(`t=${f.t} mix-blend=${f.oldBlend}`)
          if (active && direction === 'collapse' && f.oldZ !== '1') flags.push(`t=${f.t} z-index=${f.oldZ}`)
          if (active && f.newBlend !== 'normal') flags.push(`t=${f.t} new mix-blend=${f.newBlend}`)
          const ua = (f.anims ?? []).filter(
            (a) => /-ua-|ua-view-transition/.test(a.name ?? '') && /-old\(|-new\(/.test(a.pseudo ?? ''),
          )
          if (active && ua.length) flags.push(`t=${f.t} UA 淡入淡出动画出现(${ua.map((a) => a.name).join(',')} on ${ua[0].pseudo})`)
          if (active && !(f.anims ?? []).some((a) => /^theme-switch-|^ts-radius-/.test(a.name ?? ''))) {
            flags.push(`t=${f.t} 无蒙版动画在跑`)
          }
          if (active && !f.styleNode) flags.push(`t=${f.t} 样式节点已被移除`)
        }
        all.push({ run: i, frames: log.length, flags })
        const state = log.length ? `${log.length} 帧` : '无帧'
        console.log(`  第 ${String(i + 1).padStart(2)} 次：${state}${flags.length ? `  ⚠ ${flags.length} 处异常：${flags.slice(0, 3).join(' | ')}` : '  ✓'}`)
      }
      const bad = all.filter((r) => r.flags.length)
      console.log(`\n${runs} 次转场中 ${bad.length} 次出现异常帧（${((bad.length / runs) * 100).toFixed(0)}%）`)
      const kinds = new Map()
      for (const r of bad) {
        for (const f of r.flags) {
          const key = f.replace(/t=\d+ /, '').replace(/\(.*\)/, '')
          kinds.set(key, (kinds.get(key) ?? 0) + 1)
        }
      }
      for (const [k, v] of [...kinds.entries()].sort((a, b) => b[1] - a[1])) console.log(`  异常类型 ${k}：${v} 帧`)
      if (outDir) {
        await mkdir(outDir, { recursive: true })
        await writeFile(join(outDir, 'probe.json'), JSON.stringify(all, null, 2))
      }
    } else if (mode === 'cycles') {
      // 复刻真机操作：亮→暗→亮→暗 连续点，按固定间隔，逐帧抓像素找闪屏
      // --click=<selector> 时直接点真实页面上的按钮（例如 playground 的 CIRCLE_REVERT）
      // --jitter=<ms>：间隔随机抖动，避免点击相位与 60Hz 帧周期锁死
      // --cpu=<n>：CPU 节流，放大时序竞态
      const runs = Number(args.runs ?? 20)
      const interval = Number(args.interval ?? 1400)
      const jitter = Number(args.jitter ?? 0)
      const cpu = Number(args.cpu ?? 1)
      if (cpu !== 1) await send('Emulation.setCPUThrottlingRate', { rate: cpu })
      const useSite = !!args.click
      const themeExpr = useSite
        ? `(document.documentElement.classList.contains('dark') ? 'dark' : 'light')`
        : `window.__lab.theme()`
      const resetExpr = useSite
        ? `(document.documentElement.classList.remove('dark'), document.getElementById('theme-switch-animation')?.remove(), 'light')`
        : `window.__lab.reset('light')`
      const startExpr = useSite
        ? `(() => { const el = document.querySelector(${JSON.stringify(args.click)}); if (!el) throw new Error('未找到触发按钮 ' + ${JSON.stringify(args.click)}); el.click(); return { animated: true } })()`
        : `window.__lab.start({ duration: ${duration} })`
      let sink = null
      const allShots = []
      onEvent((msg) => {
        if (msg.method === 'Page.screencastFrame' && sink) {
          sink.push(Buffer.from(msg.params.data, 'base64'))
          send('Page.screencastFrameAck', { sessionId: msg.params.sessionId })
        }
      })
      if (outDir) await mkdir(outDir, { recursive: true })
      sink = allShots
      await send('Page.startScreencast', { format: 'png', everyNthFrame: 1 })
      await sleep(300)
      await evaluate(send, resetExpr)
      await sleep(250)
      if (useSite) {
        const info = await evaluate(
          send,
          `({ scrollHeight: document.documentElement.scrollHeight, innerHeight: window.innerHeight, viewport: window.innerWidth + 'x' + window.innerHeight, buttons: document.querySelectorAll(${JSON.stringify(args.click)}).length })`,
        )
        console.log(`目标页面：${info.viewport}，文档高 ${info.scrollHeight}，匹配按钮 ${info.buttons} 个${info.scrollHeight > info.innerHeight ? '（页面可滚动）' : ''}`)
      }
      console.log(
        `\n连续切换 ${runs} 次，间隔 ${interval}${jitter ? `±${jitter}` : ''}ms，CPU 节流 ${cpu}x，起始亮色（第 2/4/6… 次为"收起"）`,
      )
      const cycles = []
      for (let r = 0; r < runs; r++) {
        const before = await evaluate(send, themeExpr)
        allShots.length = 0
        const started = await evaluate(send, startExpr)
        if (!started.animated) throw new Error('转场未启动（animated=false）')
        await sleep(Math.max(120, interval + (jitter ? (Math.random() * 2 - 1) * jitter : 0)))
        const after = await evaluate(send, themeExpr)
        const outcome = useSite ? 'n/a' : await evaluate(send, 'window.__lab.finishedOutcome()')
        const shots = allShots.slice()
        const dir = before === 'dark' && after === 'light' ? '收起' : before === 'light' && after === 'dark' ? '扩散' : '?'
        if (!shots.length) {
          console.log(`  第 ${String(r + 1).padStart(2)} 次（${dir}）：未抓到帧`)
          continue
        }
        const { stats, worstJump, worstIdx, maxPpm, medPpm, medFlip, maxFlip, flipIdx, maxModal, maxBand, maxBandLen, bandIdx } =
          frameStats(shots)
        if (args.verbose) {
          console.log(`    #   平均亮度   整块翻转     ppm   纯色占比`)
          for (let i = 0; i < stats.length; i++) {
            const s = stats[i]
            console.log(
              `    ${String(i).padStart(3)}  ${s.mean.toFixed(1).padStart(8)}  ${String(s.bigFlip).padStart(9)}  ${s.ppm.toFixed(1).padStart(6)}  ${s.modalFrac.toFixed(3).padStart(7)}`,
            )
          }
        }
        const flagPpm = maxPpm > Math.max(200, medPpm * 20)
        const flagFlip = maxFlip > Math.max(medFlip * 6, medFlip + 800000)
        const flagModal = maxModal > 0.99
        const flagBand = maxBandLen >= 8 && maxBand > 25
        const flagged = /^skipped/.test(outcome) || worstJump > 25 || flagPpm || flagFlip || flagModal || flagBand
        const rec = { r, dir, frames: stats.length, worstJump, worstIdx, maxPpm, medPpm, medFlip, maxFlip, flipIdx, maxModal, maxBand, maxBandLen, bandIdx, outcome, flagged }
        cycles.push(rec)
        if (flagged && outDir && worstIdx >= 0) {
          await writeFile(join(outDir, `FLASH-${String(r).padStart(2, '0')}-${dir}-${String(worstIdx).padStart(3, '0')}.png`), stats[worstIdx].buf)
          if (worstIdx > 0) await writeFile(join(outDir, `FLASH-${String(r).padStart(2, '0')}-${dir}-${String(worstIdx - 1).padStart(3, '0')}-prev.png`), stats[worstIdx - 1].buf)
          if (worstIdx + 1 < stats.length) await writeFile(join(outDir, `FLASH-${String(r).padStart(2, '0')}-${dir}-${String(worstIdx + 1).padStart(3, '0')}-next.png`), stats[worstIdx + 1].buf)
        }
        console.log(
          `  第 ${String(r + 1).padStart(2)} 次（${dir}）：${String(stats.length).padStart(2)} 帧，亮度 ${stats[0].mean.toFixed(1)}→${stats.at(-1).mean.toFixed(1)}，单帧跳变 max ${worstJump.toFixed(1)}${worstIdx >= 0 ? ` @#${worstIdx}` : ''}，整块翻转 中位 ${(medFlip / 1000).toFixed(0)}k/峰 ${(maxFlip / 1000).toFixed(0)}k${flipIdx >= 0 ? ` @#${flipIdx}` : ''}，横带 ${maxBandLen}px/${maxBand.toFixed(0)}${bandIdx >= 0 ? ` @#${bandIdx}` : ''}，纯色占比 ${maxModal.toFixed(2)}${flagged ? '  ⚠ 异常' : ''}`,
        )
      }
      await send('Page.stopScreencast')
      sink = null
      const bad = cycles.filter((c) => c.flagged)
      const collapse = cycles.filter((c) => c.dir === '收起')
      console.log(`\n${cycles.length} 次切换中 ${bad.length} 次检出异常帧；其中"收起" ${collapse.length} 次，异常 ${collapse.filter((c) => c.flagged).length} 次`)
      if (outDir) await writeFile(join(outDir, 'cycles.json'), JSON.stringify(cycles, null, 2))
    } else if (mode === 'multi') {
      // 连续跑 N 次真转场，逐帧抓像素（screencast），找"某一帧整屏不对"的闪屏
      const runs = Number(args.runs ?? 30)
      let sink = null
      onEvent((msg) => {
        if (msg.method === 'Page.screencastFrame' && sink) {
          sink.push(Buffer.from(msg.params.data, 'base64'))
          send('Page.screencastFrameAck', { sessionId: msg.params.sessionId })
        }
      })
      if (outDir) await mkdir(outDir, { recursive: true })
      // 全程保持 screencast 打开：每次 run 之间 stop/start 会让后续转场被浏览器跳过
      const allShots = []
      sink = allShots
      await send('Page.startScreencast', { format: 'png', everyNthFrame: 1 })
      await sleep(300)
      const runStats = []
      for (let r = 0; r < runs; r++) {
        await evaluate(send, `window.__lab.reset(${JSON.stringify(startTheme)})`)
        await sleep(160)
        const visibility = await evaluate(send, 'document.visibilityState')
        const from = allShots.length
        const started = await evaluate(send, `window.__lab.start({ duration: ${duration} })`)
        if (!started.animated) throw new Error('转场未启动（animated=false）')
        await sleep(duration + 300)
        const outcome = await evaluate(send, 'window.__lab.finishedOutcome()', true)
        const shots = allShots.slice(from)
        if (!shots.length) {
          console.log(`  第 ${String(r + 1).padStart(2)} 次：未抓到帧（visibility=${visibility}，outcome=${outcome}）`)
          continue
        }

        const { stats, worstJump, worstIdx, maxPpm, medPpm } = frameStats(shots)
        const flagged = worstJump > 25 || maxPpm > Math.max(200, medPpm * 20) || outcome !== 'ok'
        if (flagged) {
          flaggedRuns.push({ run: r, worstJump, worstIdx, maxPpm, medPpm, frames: stats.length, outcome, visibility })
          if (outDir && worstIdx >= 0) {
            await writeFile(join(outDir, `FLASH-run${String(r).padStart(2, '0')}-${String(worstIdx).padStart(3, '0')}.png`), stats[worstIdx].buf)
            if (worstIdx > 0) await writeFile(join(outDir, `FLASH-run${String(r).padStart(2, '0')}-${String(worstIdx - 1).padStart(3, '0')}-prev.png`), stats[worstIdx - 1].buf)
            if (worstIdx + 1 < stats.length) await writeFile(join(outDir, `FLASH-run${String(r).padStart(2, '0')}-${String(worstIdx + 1).padStart(3, '0')}-next.png`), stats[worstIdx + 1].buf)
          }
        }
        runStats.push({ r, frames: stats.length, worstJump, worstIdx, maxPpm, medPpm, outcome, visibility, flagged })
        console.log(
          `  第 ${String(r + 1).padStart(2)} 次：${String(stats.length).padStart(2)} 帧，亮度 ${stats[0]?.mean.toFixed(1) ?? '-'}→${stats.at(-1)?.mean.toFixed(1) ?? '-'}，单帧跳变 max ${worstJump.toFixed(1)}${worstIdx >= 0 ? ` @#${worstIdx}` : ''}，ppm 中位 ${medPpm.toFixed(2)} / 峰值 ${maxPpm.toFixed(2)}，outcome=${outcome}${flagged ? '  ⚠ 异常' : ''}`,
        )
        allShots.length = 0
      }
      await send('Page.stopScreencast')
      sink = null
      const bad = runStats.filter((s) => s.flagged)
      console.log(`\n${runs} 次转场中 ${bad.length} 次检出异常帧（${((bad.length / runs) * 100).toFixed(0)}%）`)
      if (outDir) await writeFile(join(outDir, 'multi.json'), JSON.stringify(runStats, null, 2))
    } else if (mode === 'live') {
      // 实时抓每一合成帧（screencast）：不暂停动画，最接近真机观感
      const shots = []
      onEvent((msg) => {
        if (msg.method === 'Page.screencastFrame') {
          shots.push({ data: msg.params.data, ts: msg.params.metadata?.timestamp ?? 0 })
          send('Page.screencastFrameAck', { sessionId: msg.params.sessionId })
        }
      })
      await send('Page.startScreencast', { format: 'png', everyNthFrame: 1 })
      await sleep(300)
      const t0 = Date.now()
      const started = await evaluate(
        send,
        `window.__lab.start({ duration: ${duration}, patch: ${patchJson}, cssVariant: ${JSON.stringify(args.css ?? null)} })`,
      )
      if (!started.animated) throw new Error('转场未启动（animated=false）')
      await sleep(duration + 400)
      await send('Page.stopScreencast')
      const elapsed = Date.now() - t0
      if (outDir) await mkdir(outDir, { recursive: true })

      console.log(`\n实时抓帧（screencast）：${shots.length} 帧 / ${elapsed}ms，约 ${(shots.length / (elapsed / 1000)).toFixed(1)} fps`)
      console.log('  #   Δt(ms)  平均亮度   线条候选                                                     孤立像素(ppm)')
      let prevTs = null
      for (let i = 0; i < shots.length; i++) {
        const buf = Buffer.from(shots[i].data, 'base64')
        if (outDir) await writeFile(join(outDir, `live-${direction}-dsf${dsf}-${String(i).padStart(3, '0')}.png`), buf)
        const frame = decodePng(buf)
        const detection = detectLines(frame)
        frames++
        const lines = detection.rows.length + detection.cols.length
        if (lines) {
          flagged++
          if (!worst || lines > worst.lines) worst = { i, lines, detection }
        }
        let meanLum = 0
        for (let p = 0; p < frame.lum.length; p += 97) meanLum += frame.lum[p]
        meanLum /= Math.ceil(frame.lum.length / 97)
        const dt = prevTs === null ? 0 : shots[i].ts - prevTs
        prevTs = shots[i].ts
        console.log(
          `  ${String(i).padStart(3)}  ${dt.toFixed(1).padStart(6)}  ${meanLum.toFixed(2).padStart(7)}   ${summarize(detection).padEnd(62)} ${hairlineRate(detection, frame).toFixed(2)}${lines ? '  ← 命中' : ''}`,
        )
      }
    } else {
      // 确定性取样：暂停蒙版动画后按毫秒 seek，排除实时抖动噪声
      const started = await evaluate(
        send,
        `window.__lab.start({ duration: ${duration}, patch: ${patchJson}, cssVariant: ${JSON.stringify(args.css ?? null)} })`,
      )
      if (!started.animated) throw new Error('转场未启动（animated=false）')
      const animCount = await evaluate(send, 'window.__lab.waitForAnimation()', true)
      if (!animCount) throw new Error('未捕获到 theme-switch-* 动画（无法暂停取样）')
      console.log(`捕获到 ${animCount} 个蒙版动画；注入 CSS 关键行：`)
      const injected = await evaluate(send, 'window.__lab.injectedCss()')
      for (const line of injected.split('\n').filter((l) => /mask-|will-change|z-index|animation:/.test(l))) {
        console.log(`  ${line.trim()}`)
      }

      await evaluate(send, 'window.__lab.pause()')
      if (outDir) await mkdir(outDir, { recursive: true })

      console.log('\n  t(ms)  线条候选                                                     孤立像素(ppm)')
      const step = duration / samples
      const repeat = Number(args.repeat ?? 1)
      for (let i = 0; i <= samples; i++) {
        const t = Math.round(i * step)
        await evaluate(send, `window.__lab.seek(${t})`)
        for (let k = 0; k < repeat; k++) {
          const shot = await screenshotFrame(send)
          if (outDir) {
            await writeFile(join(outDir, `${direction}-dsf${dsf}-t${String(t).padStart(4, '0')}-r${k}.png`), shot)
          }
          const frame = decodePng(shot)
          const detection = detectLines(frame)
          frames++
          const lines = detection.rows.length + detection.cols.length
          if (lines) {
            flagged++
            if (!worst || lines > worst.lines) worst = { i: t, lines, detection }
          }
          if (k === 0) {
            console.log(
              `  ${String(t).padStart(5)}  ${summarize(detection).padEnd(62)} ${hairlineRate(detection, frame).toFixed(2)}${lines ? '  ← 命中' : ''}`,
            )
          }
        }
      }
      await evaluate(send, 'window.__lab.finish()')
    }

    const base = baseline.rows.length + baseline.cols.length
    console.log(
      `\n汇总[${mode}/${direction}/dsf=${dsf}/${width}x${height}]：${frames} 帧中 ${flagged} 帧检出线条候选；基线 ${base} 条（${hairlineRate(baseline, baseFrame).toFixed(2)} ppm）`,
    )
    if (worst) console.log(`最差帧 #${worst.i}：${summarize(worst.detection)}`)
  } finally {
    close()
    chrome.kill()
    server.close()
    await rm(userDataDir, { recursive: true, force: true }).catch(() => {})
  }
}

main().catch((e) => {
  console.error('FAILED:', e)
  process.exit(1)
})
