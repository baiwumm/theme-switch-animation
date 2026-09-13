/**
 * 单调性检验：收起（暗→亮）时圆形边缘应当"单调"内缩。
 * 逐帧拟合圆心/半径后看：
 *   - r 是否单调递减（半径不应回弹）；
 *   - 左边缘 x = cx - r 是否单调递增（左边界不应倒退）；
 *   - 右边缘 x = cx + r 是否单调递减。
 * 另外统计"相邻帧圆心跳变"——圆心本应一动不动，跳变就是用户看到的线条抖动。
 *
 * 用法：node scripts/jitter-lab/steps.mjs <frames-dir>
 */
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { decodeFrame, fitFrame } from './circle.mjs'

const dir = process.argv[2]
if (!dir) {
  console.error('用法: node scripts/jitter-lab/steps.mjs <frames-dir>')
  process.exit(1)
}
const meta = JSON.parse(await readFile(join(dir, 'meta.json'), 'utf8'))
const files = (await readdir(dir)).filter((f) => f.endsWith('.png')).sort()
const first = decodeFrame(await readFile(join(dir, files[0])))
const scale = first.width / meta.width
const idealCx = meta.cx * scale
const idealCy = meta.cy * scale

console.log(`目录 ${dir}（${files.length} 帧）`)
console.log('  帧                             r_fit    左边缘x   右边缘x   Δr      Δ左     Δ右    Δcx     Δcy')
const rows = []
for (const file of files) {
  const frame = decodeFrame(await readFile(join(dir, file)))
  const fit = fitFrame(frame, { idealCx, idealCy, scale })
  if (!fit) continue
  rows.push({ file, ...fit, left: fit.cx - fit.r, right: fit.cx + fit.r })
}

let backR = 0
let backL = 0
let backR2 = 0
let maxJumpX = 0
let maxJumpY = 0
const jumpsX = []
const jumpsY = []
for (let i = 0; i < rows.length; i++) {
  const a = rows[i]
  const b = rows[i - 1]
  const dr = b ? a.r - b.r : 0
  const dl = b ? a.left - b.left : 0
  const drr = b ? a.right - b.right : 0
  const dcx = b ? a.cx - b.cx : 0
  const dcy = b ? a.cy - b.cy : 0
  if (b && dr > 0.05) backR++
  if (b && dl < -0.05) backL++
  if (b && drr > 0.05) backR2++
  if (b) {
    jumpsX.push(Math.abs(dcx))
    jumpsY.push(Math.abs(dcy))
    maxJumpX = Math.max(maxJumpX, Math.abs(dcx))
    maxJumpY = Math.max(maxJumpY, Math.abs(dcy))
  }
  console.log(
    `  ${a.file.padEnd(30)} ${a.r.toFixed(2).padStart(8)}  ${a.left.toFixed(2).padStart(8)}  ${a.right.toFixed(2).padStart(8)}  ${dr.toFixed(2).padStart(6)}  ${dl.toFixed(2).padStart(6)}  ${drr.toFixed(2).padStart(6)}  ${dcx.toFixed(2).padStart(6)}  ${dcy.toFixed(2).padStart(6)}`,
  )
}
const stat = (a) => {
  if (!a.length) return { sd: 0, over25: 0, over50: 0, over75: 0 }
  const mean = a.reduce((s, v) => s + v, 0) / a.length
  return {
    sd: Math.sqrt(a.reduce((s, v) => s + (v - mean) ** 2, 0) / a.length),
    over25: a.filter((v) => v > 0.25).length,
    over50: a.filter((v) => v > 0.5).length,
    over75: a.filter((v) => v > 0.75).length,
  }
}
const sx = stat(jumpsX)
const sy = stat(jumpsY)
console.log(`\n半径回弹次数 ${backR}；左边缘倒退次数 ${backL}；右边缘倒退次数 ${backR2}`)
console.log(
  `相邻帧圆心跳变：Δcx max ${maxJumpX.toFixed(2)}px σ ${sx.sd.toFixed(3)}（>0.25px ${sx.over25} 次 / >0.5px ${sx.over50} 次 / >0.75px ${sx.over75} 次，共 ${jumpsX.length} 次）`,
)
console.log(`                Δcy max ${maxJumpY.toFixed(2)}px σ ${sy.sd.toFixed(3)}（>0.25px ${sy.over25} 次 / >0.5px ${sy.over50} 次 / >0.75px ${sy.over75} 次）`)
console.log('判读：圆心本应一动不动（只是半径在缩）。跳变越大越多 = 用户看到的"线条抖动"越明显。')
