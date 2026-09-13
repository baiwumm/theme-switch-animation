/**
 * 逐帧最小二乘拟合蒙版圆弧的圆心与半径，看圆心相对"触发点布局中心"的偏移轨迹。
 * 偏移量本身可以是常数（渲染把位置对齐到整设备像素），关键是它在帧间是否**跳变**。
 *
 * 用法：node scripts/jitter-lab/fit.mjs <frames-dir> [--cx=..] [--cy=..]
 */
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { decodeFrame, fitFrame } from './circle.mjs'

const args = {}
for (const raw of process.argv.slice(2)) {
  const m = /^--([^=]+)(?:=(.*))?$/.exec(raw)
  if (m) args[m[1]] = m[2] ?? true
  else if (!args.dir) args.dir = raw
}
if (!args.dir) {
  console.error('用法: node scripts/jitter-lab/fit.mjs <frames-dir> [--cx=..] [--cy=..]')
  process.exit(1)
}
const meta = JSON.parse(await readFile(join(args.dir, 'meta.json'), 'utf8'))
const files = (await readdir(args.dir)).filter((f) => f.endsWith('.png')).sort()
const first = decodeFrame(await readFile(join(args.dir, files[0])))
const scale = first.width / meta.width
const idealCx = Number(args.cx ?? meta.cx * scale)
const idealCy = Number(args.cy ?? meta.cy * scale)

console.log(`目录 ${args.dir}：${files.length} 帧，设备像素 ${first.width}x${first.height}（scale=${scale}）`)
console.log(`理想圆心 (${idealCx.toFixed(2)}, ${idealCy.toFixed(2)})`)
console.log('  帧                            弧点   r_fit      cx_fit     cy_fit    Δcx      Δcy     径向RMS')
const rows = []
for (const file of files) {
  const frame = decodeFrame(await readFile(join(args.dir, file)))
  const fit = fitFrame(frame, { idealCx, idealCy, scale })
  if (!fit) continue
  const rec = {
    file,
    n: fit.n,
    r: fit.r,
    cx: fit.cx,
    cy: fit.cy,
    dx: fit.cx - idealCx,
    dy: fit.cy - idealCy,
    rms: fit.rms,
  }
  rows.push(rec)
  console.log(
    `  ${file.padEnd(30)} ${String(rec.n).padStart(5)}  ${rec.r.toFixed(2).padStart(8)}  ${rec.cx.toFixed(2).padStart(9)}  ${rec.cy.toFixed(2).padStart(8)}  ${rec.dx.toFixed(2).padStart(7)}  ${rec.dy.toFixed(2).padStart(7)}  ${rec.rms.toFixed(3).padStart(8)}`,
  )
}
if (rows.length) {
  const stat = (a) => {
    const mean = a.reduce((s, v) => s + v, 0) / a.length
    const sd = Math.sqrt(a.reduce((s, v) => s + (v - mean) ** 2, 0) / a.length)
    return { min: Math.min(...a), max: Math.max(...a), mean, sd }
  }
  const sx = stat(rows.map((r) => r.dx))
  const sy = stat(rows.map((r) => r.dy))
  console.log(`\nΔcx: min ${sx.min.toFixed(2)} max ${sx.max.toFixed(2)} 均值 ${sx.mean.toFixed(3)} σ ${sx.sd.toFixed(3)}`)
  console.log(`Δcy: min ${sy.min.toFixed(2)} max ${sy.max.toFixed(2)} 均值 ${sy.mean.toFixed(3)} σ ${sy.sd.toFixed(3)}`)
  console.log('判读：σ ≈ 0 说明圆心纹丝不动；σ 越大越说明整圆在被"像素对齐"来回推。')
}
