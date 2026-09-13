/**
 * 针对单帧做深度探查：把圆弧上的边缘点按角度、按设备像素网格分块（tile）归类。
 * 目的：判断局部错位是"按 tile 边界切开的"（栅格分块接缝）还是按角度/其他几何特征分布。
 *
 * 用法：node scripts/jitter-lab/probe.mjs <frame.png> [--cx=..] [--cy=..] [--tile=256] [--outlier=0.6]
 */
import { readFile } from 'node:fs/promises'
import { decodePng } from './png.mjs'

const args = {}
let file = null
for (const raw of process.argv.slice(2)) {
  const m = /^--([^=]+)(?:=(.*))?$/.exec(raw)
  if (m) args[m[1]] = m[2] ?? true
  else if (!file) file = raw
}
if (!file) {
  console.error('用法: node scripts/jitter-lab/probe.mjs <frame.png> [--cx=..] [--cy=..] [--tile=256]')
  process.exit(1)
}
const tile = Number(args.tile ?? 256)
const outlierPx = Number(args.outlier ?? 0.6)
const frame = decodePng(await readFile(file))
const { width, height, lum } = frame
const cx = Number(args.cx ?? width * 0.62 + 60)
const cy = Number(args.cy ?? height * 0.34 + 22)

const sample = []
for (let i = 0; i < lum.length; i += 53) sample.push(lum[i])
sample.sort((a, b) => a - b)
const thr = (sample[Math.floor(sample.length * 0.02)] + sample[Math.floor(sample.length * 0.98)]) / 2

const pts = []
for (let y = 3; y < height - 3; y++) {
  const dy = y + 0.5 - cy
  if (Math.abs(dy) <= 26) continue // 排除触发按钮
  for (let x = 5; x < width - 5; x++) {
    if (Math.abs(x - cx) <= 64) continue
    const a = lum[y * width + x - 1]
    const b = lum[y * width + x]
    if ((a - thr) * (b - thr) >= 0) continue
    const t = (thr - a) / (b - a)
    const xe = x - 0.5 + t
    pts.push({ x: xe, y: y + 0.5, d: Math.hypot(xe - cx, dy), angle: (Math.atan2(dy, xe - cx) * 180) / Math.PI })
  }
}
const ds = pts.map((p) => p.d).sort((a, b) => a - b)
const radius = ds[Math.floor(ds.length / 2)]
const residuals = pts.map((p) => ({ ...p, res: p.d - radius }))

console.log(`${file}`)
console.log(`  ${width}x${height}，阈值 ${thr.toFixed(1)}，边缘点 ${pts.length}，半径中位 ${radius.toFixed(2)}（min ${ds[0].toFixed(2)} / max ${ds.at(-1).toFixed(2)}）`)
console.log(`  tile=${tile}\n`)

// 1. 按角度分箱看残差剖面（10°）
const bins = new Map()
for (const r of residuals) {
  const b = Math.floor(r.angle / 10) * 10
  const e = bins.get(b) ?? { n: 0, sum: 0 }
  e.n++
  e.sum += r.res
  bins.set(b, e)
}
console.log('  角度分箱残差（10°）：')
console.log([...bins.keys()].sort((a, b) => a - b).map((k) => `${String(k).padStart(4)}:${(bins.get(k).sum / bins.get(k).n).toFixed(2).padStart(6)}`).join('  '))

// 2. 离群点按 tile 归类
const outliers = residuals.filter((r) => Math.abs(r.res) > outlierPx)
const tileMap = new Map()
for (const o of outliers) {
  const key = `${Math.floor(o.x / tile)},${Math.floor(o.y / tile)}`
  const e = tileMap.get(key) ?? { n: 0, sum: 0, minX: 1e9, maxX: -1e9, minY: 1e9, maxY: -1e9 }
  e.n++
  e.sum += o.res
  e.minX = Math.min(e.minX, o.x)
  e.maxX = Math.max(e.maxX, o.x)
  e.minY = Math.min(e.minY, o.y)
  e.maxY = Math.max(e.maxY, o.y)
  tileMap.set(key, e)
}
console.log(`\n  离群点 ${outliers.length} / ${pts.length}（|res| > ${outlierPx}px），按 ${tile}px tile 归类：`)
for (const [key, e] of [...tileMap.entries()].sort((a, b) => b[1].n - a[1].n)) {
  console.log(
    `    tile(${key})  n=${String(e.n).padStart(4)}  res均=${(e.sum / e.n).toFixed(2).padStart(6)}  x∈[${e.minX.toFixed(0)}, ${e.maxX.toFixed(0)}]  y∈[${e.minY.toFixed(0)}, ${e.maxY.toFixed(0)}]`,
  )
}

// 3. 离群点 x 直方图（看是否卡在某个网格边界上）
console.log('\n  离群点 x 直方图（32px 箱）：')
const hist = new Map()
for (const o of outliers) {
  const b = Math.floor(o.x / 32) * 32
  hist.set(b, (hist.get(b) ?? 0) + 1)
}
for (const [b, n] of [...hist.entries()].sort((a, b) => a[0] - b[0])) {
  console.log(`    x=${String(b).padStart(4)}..${b + 31}  ${'#'.repeat(Math.min(60, n))} ${n}`)
}
