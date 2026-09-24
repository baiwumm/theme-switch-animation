/**
 * Firefox 视觉证据（next-steps 待办 2 补充）。
 *
 * Playwright 的 page.screenshot() 在 Firefox 上（无头/有头均）不合成 ::view-transition 伪元素层，
 * 拍到的是已切换主题的实时 DOM，verify-engine.mjs 的截图亮度判据在 Firefox 上失效（CSS 层判据仍有效）。
 * 本脚本改用 recordVideo（screencast，捕获合成器输出）取证，分两个阶段：
 *
 * A. 自由播放：录一次 CIRCLE + reverse 收起 + 一次 CIRCLE 扩散，逐帧统计亮度。
 *    判据（存在性）：中间态帧（亮度介于两端极值之间）≥6 个不同取值 —— 证明合成器在动画期间
 *    真的画了蒙版中间态；若 Firefox 不绘制 VT 伪元素，只会看到旧态→新态的一次性跳变。
 *    注意：实测 Playwright Firefox 录制的 webm 帧序存在局部乱序（录制管道伪影：帧内容正确、
 *    趋势完整、相邻帧错位），故本阶段不判单调 —— 单调性由 B 阶段确定性取证。
 * B. 暂停 + 逐步 seek（与 verify-engine 的 seek 模式同机制，但读合成器输出而非计算样式）：
 *    一次录制中按既定时间表逐档 seek（每次停留 450ms 让 screencast 落帧），帧序即 seek 序 →
 *    亮度必须单调推进、圆拟合半径必须单调收缩（收起）/扩张（扩散）——引擎无关的逐帧推进证明。
 *    扩散方向起始为亮色，先 reset('dark') 制造一个暗色帧作分割标记，把录制开头的页面加载
 *    加载突发帧与取样序列切开。
 *
 * 运行：node scripts/verify-firefox-video.mjs [--all-types]
 *       --all-types 追加 C 阶段：对每一种动画类型各录一次确定性 seek（约 +5 分钟）
 * 前置：pnpm build；Playwright + firefox 已装（`npx playwright install firefox`），
 *       包位置默认 %TEMP%/pw-webkit，用 PW_DIR 覆盖；抽帧工作目录默认 %TEMP%，用 FF_WORK_DIR 覆盖。
 *       注意：本机 %TEMP% 会在长时间任务跑动中被清扫（实测 ffmpeg 刚写出的帧文件下一句就 ENOENT），
 *       跑 `--all-types` 建议两者都指到仓库内的 gitignored 目录，例如：
 *         PW_DIR=C:/Users/<you>/tools/pw FF_WORK_DIR=F:/projects/theme-switch-animation/scripts/.verify-engine-out \
 *         node scripts/verify-firefox-video.mjs --all-types
 */
import { createServer } from 'node:http'
import { execFileSync } from 'node:child_process'
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { decodePng } from './jitter-lab/png.mjs'
import { fitFrame } from './jitter-lab/circle.mjs'

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const PW_DIR = process.env.PW_DIR ?? join(tmpdir(), 'pw-webkit')
const PORT = 3212
const ALL_TYPES = process.argv.includes('--all-types')
const MIME = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' }
// 时间表按 ease-in-out 曲线加密动作区间（收起的可见变化集中在后半段、扩散在前半段），
// 保证两个方向都能取到 ≥6 个互异亮度
const STEPS = [0, 400, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600, 2000]

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://127.0.0.1:${PORT}`)
    if (url.pathname === '/favicon.ico') return res.writeHead(204).end()
    const p = join(ROOT, normalize(decodeURIComponent(url.pathname)))
    if (!p.startsWith(ROOT)) return res.writeHead(403).end('forbidden')
    // 先读文件再写头：readFile 若在 writeHead 之后失败，catch 里二次 writeHead 会抛 ERR_HTTP_HEADERS_SENT
    const body = await readFile(p)
    res.writeHead(200, { 'content-type': MIME[extname(p)] ?? 'application/octet-stream' }).end(body)
  } catch {
    if (!res.headersSent) res.writeHead(404).end('not found')
    else res.end()
  }
})
await new Promise((ok) => server.listen(PORT, '127.0.0.1', ok))

const { firefox } = await import(pathToFileURL(join(PW_DIR, 'node_modules', 'playwright', 'index.mjs')).href)
const ffmpegDir = (await readdir(join(process.env.LOCALAPPDATA, 'ms-playwright'))).find((d) => d.startsWith('ffmpeg'))
const ffmpeg = join(process.env.LOCALAPPDATA, 'ms-playwright', ffmpegDir, 'ffmpeg-win64.exe')
const work = await mkdtemp(join(process.env.FF_WORK_DIR ?? tmpdir(), 'ff-video-'))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const meanLum = (f) => {
  let s = 0
  for (let i = 0; i < f.lum.length; i += 7) s += f.lum[i]
  return s / Math.ceil(f.lum.length / 7)
}

const failures = []
const browser = await firefox.launch({ headless: true })
console.log(`[firefox] 版本 ${browser.version()}（recordVideo 取证）`)

/** 新建一个带录像的上下文并等 lab 就绪 */
async function newRecording() {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: work, size: { width: 1280, height: 800 } },
  })
  const page = await context.newPage()
  await page.goto(`http://127.0.0.1:${PORT}/scripts/jitter-lab/lab.html?variant=clean`)
  await page.waitForFunction('window.__ready === true')
  return page
}

/** 结束录制（close 落盘后取路径）→ 逐帧导出 → 解码。Playwright 自带的 ffmpeg 是精简构建
 *  （只有 crop/scale/trim 等，没有 fps 滤镜），不做降采样，全帧即录制帧率 */
async function extractFrames(label, page) {
  const video = page.video()
  await page.context().close()
  const videoPath = await video.path()
  execFileSync(ffmpeg, ['-loglevel', 'error', '-y', '-i', videoPath, join(work, label) + '_%03d.png'], { stdio: 'inherit', cwd: work })
  const files = (await readdir(work)).filter((f) => f.startsWith(label + '_') && f.endsWith('.png')).sort()
  const frames = []
  for (const f of files) frames.push(decodePng(await readFile(join(work, f))))
  return frames
}

/** A 阶段：自由播放一次转场，返回逐帧平均亮度 */
async function liveRun(label, startTheme, runOpts) {
  const page = await newRecording()
  await page.evaluate(`window.__lab.reset(${JSON.stringify(startTheme)})`)
  await sleep(600)
  const res = await page.evaluate(`window.__lab.start(${JSON.stringify({ duration: 2000, animationType: 'circle', ...runOpts })})`)
  if (!res?.animated) throw new Error(`${label}: 转场未启动`)
  await sleep(2800)
  const frames = await extractFrames(label, page)
  return frames.map((f) => Math.round(meanLum(f)))
}

/** B 阶段：暂停动画后按时间表逐档 seek，每档停留让 screencast 落帧；帧序即 seek 序 */
async function steppedRun(label, startTheme, runOpts, { markerBlip = false } = {}) {
  const page = await newRecording()
  if (markerBlip) {
    // 扩散方向起始为亮色：先切到暗色制造一个分割帧，再回到起始主题，把加载突发帧与取样序列分开
    await page.evaluate(`window.__lab.reset('dark')`)
    await sleep(400)
  }
  await page.evaluate(`window.__lab.reset(${JSON.stringify(startTheme)})`)
  await sleep(600)
  const res = await page.evaluate(`window.__lab.start(${JSON.stringify({ duration: 2000, animationType: 'circle', ...runOpts })})`)
  if (!res?.animated) throw new Error(`${label}: 转场未启动`)
  const n = await page.evaluate('window.__lab.waitForAnimation()')
  if (!n) throw new Error(`${label}: 未捕获蒙版动画，无法 seek 取样`)
  const meta = await page.evaluate('window.__lab.center()')
  console.log(`${label}: 捕获蒙版动画 ${n} 个 → 暂停 + 按时间表 seek；触发点 (${meta.cx.toFixed(1)}, ${meta.cy.toFixed(1)})`)
  await page.evaluate('window.__lab.pause()')
  for (const t of STEPS) {
    await page.evaluate(`window.__lab.seek(${t})`)
    await sleep(450)
  }
  const frames = await extractFrames(label, page)
  return frames.map((f, i) => {
    const lum = Math.round(meanLum(f))
    const fit = lum > 40 && lum < 230 ? fitFrame(f, { idealCx: meta.cx, idealCy: meta.cy, scale: 1 }) : null
    return { i, lum, r: fit ? Math.round(fit.r * 10) / 10 : null }
  })
}

function judgeLive(name, lums) {
  const inter = lums.filter((v) => v > 25 && v < 245)
  const distinct = new Set(inter).size
  const lo = Math.min(...lums)
  const hi = Math.max(...lums)
  const ok = distinct >= 6 && inter.length >= 8 && lo <= 20 && hi >= 250
  console.log(`${name}: 中间态 ${inter.length} 帧 / ${distinct} 个取值，全程 ${lo}~${hi} —— 合成器在动画期间绘制了蒙版中间态 ${ok ? '✓' : '✗'}`)
  if (!ok) failures.push(`${name}：自由播放中间态不足（${inter.length} 帧 / ${distinct} 取值）`)
}

function judgeStepped(name, rows, dir, { skipFit = false, noiseLen = 0, minDistinct = 6, minInter = 0, monoTol = 3, spanFromFull = false } = {}) {
  // RLE 分段：暂停动画 + 静止页面下，screencast 对每档 seek 输出一段恒定亮度的帧块；
  // 单帧段（len=1）是档间过渡/编码噪声，过滤掉。低帧率录制（每档 2 帧）也仍能保留档位段。
  const segs = []
  for (const x of rows) {
    const s = segs.at(-1)
    if (s && s.lum === x.lum) {
      s.len++
      if (x.r != null) { s.r ??= x.r; s.rN++ }
    } else {
      segs.push({ lum: x.lum, len: 1, r: x.r ?? null, rN: x.r == null ? 0 : 1 })
    }
  }
  // 每档 dwell 足够长时（中位段长 ≥5 帧），1–2 帧的短段就是 webm 帧乱序/丢帧产生的假档
  // （实测 15×2 夹在 87 与 70 之间、终态附近 15→21→16 的回摆），按长度剔除；
  // 低帧率录制（每档 2 帧）不启用，避免误伤真档位。
  let major = segs.filter((s) => s.len >= 2)
  if (noiseLen > 0) {
    const lens = segs.map((s) => s.len).sort((a, b) => a - b)
    const median = lens[Math.floor(lens.length / 2)] ?? 0
    if (median >= 5) major = segs.filter((s) => s.len > noiseLen)
  }
  // 起点 = 最后一个「起始平台」主段（收起：暗；扩散：亮）之后 —— 平台吸收页面加载与起始静止帧
  const isPlatform = dir === 'up' ? (s) => s.lum < 45 : (s) => s.lum > 235
  let cut = 0
  for (let i = major.length - 1; i >= 0; i--) {
    if (isPlatform(major[i])) { cut = i + 1; break }
  }
  const seq = major.slice(cut)
  const lums = seq.map((s) => s.lum)
  let nonMono = 0
  for (let i = 1; i < lums.length; i++) {
    if (dir === 'up' && lums[i] < lums[i - 1] - monoTol) nonMono++
    if (dir === 'down' && lums[i] > lums[i - 1] + monoTol) nonMono++
  }
  const distinct = new Set(lums).size
  const allLums = rows.map((r) => r.lum)
  // 判别力真正所在：整段录制的两端极值之间，seek 序列取到了几个「严格中间档」。
  // 离散翻转（Firefox 不画 VT 伪元素时的表现）只有旧态与新态两档 → 中间档 0 个。
  const lo = Math.min(...allLums)
  const hi = Math.max(...allLums)
  const interCount = lums.filter((v) => v > lo + 8 && v < hi - 8).length
  // 跨度：默认沿用 B 阶段"切割后首末段之差"；C 阶段改用整段录制的极差——
  // 因为切割点之后的首档本身是类型相关的（软边类型首档已被压暗），拿它当起点会误判
  const spanOk = spanFromFull
    ? hi - lo >= 200
    : Math.abs(lums.at(-1) - lums[0]) > 150
  const fits = skipFit ? [] : seq.map((s) => s.r).filter((v) => v !== null)
  const fitDir = dir === 'up' ? 'down' : 'up' // 收起：暗圆收缩；扩散：暗圆扩张
  let fitBad = 0
  for (let i = 1; i < fits.length; i++) {
    if (fitDir === 'down' && fits[i] > fits[i - 1] + 1) fitBad++
    if (fitDir === 'up' && fits[i] < fits[i - 1] - 1) fitBad++
  }
  console.log(`${name}: 档位段序列 ${seq.map((s) => `${s.lum}${s.r ? '/' + s.r : ''}×${s.len}`).join(' ')}`)
  const fitNote = fits.length >= 3
    ? `拟合半径 ${fits[0]}→${fits.at(-1)}px，${fits.length} 点${fitBad === 0 ? '单调' : `异常 ${fitBad} 次`}`
    : `可拟合 ${fits.length} 点（<3，跳过几何判据）`
  const ok =
    distinct >= minDistinct && interCount >= minInter && nonMono === 0 && spanOk && (fits.length < 3 || fitBad === 0)
  const why = !ok
    ? `非单调 ${nonMono} / 取值 ${distinct}（需 ≥${minDistinct}）/ 中间档 ${interCount}（需 ≥${minInter}）/ 跨度 ${
        spanFromFull ? hi - lo : Math.abs(lums.at(-1) - lums[0])
      }（需 ${spanFromFull ? '≥200（整段极差）' : '>150（首末段）'}）/ 半径异常 ${fitBad}`
    : ''
  console.log(
    `${name}: 平台后 ${seq.length} 段 / ${distinct} 个取值${minInter ? ` / 中间档 ${interCount}` : ''}，${
      nonMono === 0 ? '单调推进' : `非单调 ${nonMono} 次`
    }，${lums[0]}→${lums.at(-1)}，${hi - lo >= 200 ? `覆盖 ${lo}~${hi}` : `覆盖 ${lo}~${hi}（不足 200）`}，${fitNote} ${ok ? '✓' : '✗'}`,
  )
  if (!ok) failures.push(`${name}：seek 取样未推进（${why}）`)
}

try {
  console.log('\n=== A. 自由播放：合成器是否绘制蒙版中间态 ===')
  const collapseLive = await liveRun('collapse-live', 'dark', { reverse: true })
  console.log(`收起 dark→light 自由播放逐帧亮度（${collapseLive.length} 帧）: ${collapseLive.join(' ')}`)
  judgeLive('收起（@property 洞）', collapseLive)
  const expandLive = await liveRun('expand-live', 'light', { reverse: false })
  console.log(`扩散 light→dark 自由播放逐帧亮度（${expandLive.length} 帧）: ${expandLive.join(' ')}`)
  judgeLive('扩散（mask-size/position）', expandLive)

  console.log('\n=== B. 暂停 + 逐步 seek：确定性帧序下的单调性 ===')
  const collapseSteps = await steppedRun('collapse-steps', 'dark', { reverse: true })
  judgeStepped('收起（@property 洞）', collapseSteps, 'up')
  const expandSteps = await steppedRun('expand-steps', 'light', { reverse: false }, { markerBlip: true })
  judgeStepped('扩散（mask-size/position）', expandSteps, 'down')

  // C（`--all-types`）：把 B 的确定性 seek 取证摊到每一个动画类型上。
  // 动机：verify-engine 的截图判据在 Firefox 上整体失效（不合成 VT 伪元素层），
  // 于是"15 种类型里除 CIRCLE 外的 14 种真的被画出来了吗"在 Firefox 上没有任何证据。
  // 非径向类型跳过圆拟合，只判"平台后 ≥6 个互异档位 + 单调 + 跨度 >150"。
  if (ALL_TYPES) {
    const entries = Object.entries(await import(pathToFileURL(join(ROOT, 'dist', 'index.mjs')).href).then((m) => m.ThemeAnimationType))
    console.log(`\n=== C. 逐类型确定性 seek（${entries.length} 种，跳过圆拟合） ===`)
    for (const [key, value] of entries) {
      const rows = await steppedRun(`t-${key}`, 'light', { animationType: value, reverse: false }, { markerBlip: true })
      judgeStepped(`  ${key}`, rows, 'down', {
        skipFit: true, // 圆拟合只对径向洞有意义，形状族的拟合值无解释力
        noiseLen: 2, // 每档 ~11 帧，故 1–2 帧短段 = webm 乱序/丢帧假档（实测 87 → 17×2 → 70）
        minDistinct: 4, // RIPPLE 类"前段就盖满"的类型稳态档位天然少（实测 5）
        minInter: 3, // 真正的判别力在这里：必须取到 ≥3 个"严格中间档"，离散翻转只有 0 个
        spanFromFull: true, // 跨度按整段录制量，不按被切割后的残段
      })
    }
  }
} catch (e) {
  failures.push(String(e?.message ?? e))
} finally {
  await browser.close()
  server.close()
  await rm(work, { recursive: true, force: true }).catch(() => {})
}
if (failures.length) {
  console.error('FAIL: ' + failures.join('；'))
  process.exit(1)
}
console.log('\nFirefox 视频取证：合成器逐帧绘制两个方向的蒙版（A 中间态存在 + B 有序单调推进）✓')
