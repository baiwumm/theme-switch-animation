/**
 * 离线分析实验台 dump 的帧序列，测量"圆形蒙版边缘"是否严格是解析圆。
 *
 * 方法（亚像素精度 ~0.05px）：
 *   1. 用亮度 2%/98% 分位的中点作为边缘阈值（暗主题/亮主题两级的中间值）；
 *   2. 每条扫描线上找阈值穿越点，线性插值到亚像素（抗锯齿边的覆盖率模型下无偏）；
 *   3. 排除触发按钮自身矩形；
 *   4. 对 d = 到触发点距离 做 0.5px 直方图，最大峰即圆弧 → 峰内中位数为该帧半径；
 *   5. 残差 res = d - 半径。真正的"线条/接缝"= 某个角度上一段持续偏 ≥1px 的残差簇。
 *
 * 用法：node scripts/jitter-lab/analyze.mjs <frames-dir> [--outlier=0.6] [--all]
 */
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { decodePng } from './png.mjs'

const args = {}
for (const raw of process.argv.slice(2)) {
  const m = /^--([^=]+)(?:=(.*))?$/.exec(raw)
  if (m) args[m[1]] = m[2] ?? true
  else if (!args.dir) args.dir = raw
}
if (!args.dir) {
  console.error('用法: node scripts/jitter-lab/analyze.mjs <frames-dir> [--outlier=0.6] [--all]')
  process.exit(1)
}
const outlierPx = Number(args.outlier ?? 0.6)

const meta = JSON.parse(await readFile(join(args.dir, 'meta.json'), 'utf8'))
const files = (await readdir(args.dir)).filter((f) => f.endsWith('.png')).sort()
const first = decodePng(await readFile(join(args.dir, files[0])))
const scale = first.width / meta.width
const cx = meta.cx * scale
const cy = meta.cy * scale
console.log(`目录 ${args.dir}：${files.length} 帧，设备像素 ${first.width}x${first.height}（scale=${scale}）`)
console.log(`触发点中心 (${cx.toFixed(1)}, ${cy.toFixed(1)})；残差离群阈值 ${outlierPx}px\n`)
console.log('  帧                            亮度级        弧点   半径     残差p95  残差max  最差角度  离群簇(弧长/点数/均残差)')

let worstOverall = null
let flaggedFrames = 0
for (const file of files) {
  const frame = decodePng(await readFile(join(args.dir, file)))
  const { width, height, lum } = frame

  // 阈值：全帧亮度分位
  const sample = []
  for (let i = 0; i < lum.length; i += 53) sample.push(lum[i])
  sample.sort((a, b) => a - b)
  const lo = sample[Math.floor(sample.length * 0.02)]
  const hi = sample[Math.floor(sample.length * 0.98)]
  const thr = (lo + hi) / 2

  // 阈值穿越点（排除圆心附近 120x44 的触发矩形）
  const raw = []
  for (let y = 3; y < height - 3; y++) {
    const dy = y + 0.5 - cy
    if (Math.abs(dy) <= 26 * scale) continue
    for (let x = 5; x < width - 5; x++) {
      const a = lum[y * width + x - 1]
      const b = lum[y * width + x]
      if ((a - thr) * (b - thr) >= 0) continue
      const t = (thr - a) / (b - a)
      const xe = x - 1 + 0.5 + t
      if (Math.abs(xe - cx) <= 64 * scale) continue
      raw.push({ x: xe, y, d: Math.hypot(xe - cx, dy), angle: (Math.atan2(dy, xe - cx) * 180) / Math.PI })
    }
  }

  // d 直方图找圆弧主峰
  let radius = 0
  let arc = []
  if (raw.length) {
    const bin = 0.5
    let maxD = 0
    for (const p of raw) if (p.d > maxD) maxD = p.d
    const hist = new Float64Array(Math.ceil(maxD / bin) + 2)
    for (const p of raw) hist[Math.round(p.d / bin)]++
    let bestBin = 0
    let bestScore = -1
    for (let i = 1; i < hist.length - 1; i++) {
      const score = hist[i - 1] + hist[i] + hist[i + 1]
      if (score > bestScore) {
        bestScore = score
        bestBin = i
      }
    }
    const near = raw.filter((p) => Math.abs(p.d - bestBin * bin) <= 1.5)
    if (near.length >= 40 && bestBin * bin > 70 * scale) {
      const sorted = near.map((p) => p.d).sort((a, b) => a - b)
      radius = sorted[Math.floor(sorted.length / 2)]
      arc = near
    }
  }

  if (arc.length < 40) {
    if (args.all) console.log(`  ${file.padEnd(30)} thr=${thr.toFixed(1).padStart(6)}  （圆弧点不足 ${arc.length}）`)
    continue
  }

  const residuals = arc.map((p) => ({ ...p, res: p.d - radius }))
  const absSorted = residuals.map((r) => Math.abs(r.res)).sort((a, b) => a - b)
  const p95 = absSorted[Math.floor(absSorted.length * 0.95)]
  const max = absSorted.at(-1)
  const worst = residuals.reduce((a, b) => (Math.abs(b.res) > Math.abs(a.res) ? b : a))

  // 离群残差按角度聚簇（容差 3°），换算弧长
  const outliers = residuals.filter((r) => Math.abs(r.res) > outlierPx).sort((a, b) => a.angle - b.angle)
  let cluster = null
  for (let i = 0; i < outliers.length; i++) {
    let j = i
    while (j + 1 < outliers.length && outliers[j + 1].angle - outliers[j].angle < 3) j++
    const n = j - i + 1
    if (n >= 3 && (!cluster || n > cluster.n)) {
      const slice = outliers.slice(i, j + 1)
      cluster = {
        n,
        res: slice.reduce((s, r) => s + r.res, 0) / n,
        arc: (((outliers[j].angle - outliers[i].angle) * Math.PI) / 180) * radius,
      }
    }
  }
  const suspicious = max > 1 && cluster && cluster.n >= 8
  if (suspicious) flaggedFrames++
  if (!worstOverall || max > worstOverall.max) worstOverall = { file, max, worst, radius }

  console.log(
    `  ${file.padEnd(30)} ${(lo.toFixed(0) + '/' + hi.toFixed(0)).padStart(8)}  ${String(arc.length).padStart(6)}  ${radius.toFixed(1).padStart(7)}  ${p95.toFixed(3).padStart(8)}  ${max.toFixed(3).padStart(8)}  ${worst.angle.toFixed(1).padStart(8)}  ${(cluster ? `${cluster.arc.toFixed(0)}px / n=${cluster.n} / res=${cluster.res.toFixed(2)}` : '—').padStart(30)}${suspicious ? '  ← 疑接缝' : ''}`,
  )
}

console.log(`\n${files.length} 帧中 ${flaggedFrames} 帧疑似接缝`)
if (worstOverall) {
  console.log(
    `最大残差：${worstOverall.max.toFixed(3)}px @ ${worstOverall.file}（角度 ${worstOverall.worst.angle.toFixed(1)}°，坐标 ${worstOverall.worst.x.toFixed(1)},${worstOverall.worst.y}，半径 ${worstOverall.radius.toFixed(1)}）`,
  )
  console.log('判读：残差 < 0.2px = 干净的解析圆；> 1px 且成角度聚簇 = 线条状接缝。')
}
