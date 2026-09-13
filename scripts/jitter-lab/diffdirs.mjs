/**
 * 逐像素比较两个帧目录（同名文件），用于"改实现前后渲染是否等价"的回归。
 * 用法：node scripts/jitter-lab/diffdirs.mjs <dirA> <dirB> [--stride=7]
 */
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { decodePng } from './png.mjs'

const args = {}
const positional = []
for (const raw of process.argv.slice(2)) {
  const m = /^--([^=]+)(?:=(.*))?$/.exec(raw)
  if (m) args[m[1]] = m[2] ?? true
  else positional.push(raw)
}
const [dirA, dirB] = positional
if (!dirA || !dirB) {
  console.error('用法: node scripts/jitter-lab/diffdirs.mjs <dirA> <dirB> [--stride=7]')
  process.exit(1)
}
const stride = Number(args.stride ?? 7)
const filesA = (await readdir(dirA)).filter((f) => f.endsWith('.png')).sort()
const filesB = new Set((await readdir(dirB)).filter((f) => f.endsWith('.png')))
console.log(`A=${dirA}（${filesA.length} 帧）  B=${dirB}`)
console.log('  帧                                平均|Δ|   最大|Δ|   >2 占比')
let worst = { mean: 0, file: '' }
for (const file of filesA) {
  if (!filesB.has(file)) {
    console.log(`  ${file.padEnd(34)} （B 中缺失，跳过）`)
    continue
  }
  const A = decodePng(await readFile(join(dirA, file)))
  const B = decodePng(await readFile(join(dirB, file)))
  if (A.width !== B.width || A.height !== B.height) {
    console.log(`  ${file.padEnd(34)} 尺寸不同（${A.width}x${A.height} vs ${B.width}x${B.height}）`)
    continue
  }
  let sum = 0
  let max = 0
  let over = 0
  let n = 0
  for (let p = 0; p < A.lum.length; p += stride) {
    const d = Math.abs(A.lum[p] - B.lum[p])
    sum += d
    if (d > max) max = d
    if (d > 2) over++
    n++
  }
  const mean = sum / n
  if (mean > worst.mean) worst = { mean, file }
  console.log(`  ${file.padEnd(34)} ${mean.toFixed(3).padStart(8)} ${max.toFixed(1).padStart(8)} ${((over / n) * 100).toFixed(2).padStart(8)}%`)
}
console.log(`\n最大平均差：${worst.mean.toFixed(3)}/255 @ ${worst.file}`)
