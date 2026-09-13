/**
 * 从一帧里提取"圆形蒙版边缘"并做最小二乘圆拟合（Kasa + 一轮粗差剔除）。
 * 供 fit.mjs / steps.mjs 共用：给出该帧实际渲染出的圆心与半径（亚像素）。
 */
import { decodePng } from './png.mjs'

export function decodeFrame(buf) {
  return decodePng(buf)
}

function fitCircle(points) {
  let Sx = 0
  let Sy = 0
  let Sxx = 0
  let Syy = 0
  let Sxy = 0
  let Sxz = 0
  let Syz = 0
  let Sz = 0
  const n = points.length
  for (const p of points) {
    const z = p.x * p.x + p.y * p.y
    Sx += p.x
    Sy += p.y
    Sxx += p.x * p.x
    Syy += p.y * p.y
    Sxy += p.x * p.y
    Sxz += p.x * z
    Syz += p.y * z
    Sz += z
  }
  const A = [
    [Sxx, Sxy, Sx, -Sxz],
    [Sxy, Syy, Sy, -Syz],
    [Sx, Sy, n, -Sz],
  ]
  for (let i = 0; i < 3; i++) {
    let piv = i
    for (let r = i + 1; r < 3; r++) if (Math.abs(A[r][i]) > Math.abs(A[piv][i])) piv = r
    ;[A[i], A[piv]] = [A[piv], A[i]]
    const d = A[i][i]
    if (Math.abs(d) < 1e-9) return null
    for (let c = i; c < 4; c++) A[i][c] /= d
    for (let r = 0; r < 3; r++) {
      if (r === i) continue
      const f = A[r][i]
      for (let c = i; c < 4; c++) A[r][c] -= f * A[i][c]
    }
  }
  const D = A[0][3]
  const E = A[1][3]
  const F = A[2][3]
  const cx = -D / 2
  const cy = -E / 2
  return { cx, cy, r: Math.sqrt(Math.max(0, cx * cx + cy * cy - F)) }
}

/** 阈值穿越点提取（排除圆心处 120x44 的触发按钮矩形） */
export function collectEdgePoints(frame, { cx, cy, scale = 1 }) {
  const { width, height, lum } = frame
  const sample = []
  for (let i = 0; i < lum.length; i += 53) sample.push(lum[i])
  sample.sort((a, b) => a - b)
  const thr = (sample[Math.floor(sample.length * 0.02)] + sample[Math.floor(sample.length * 0.98)]) / 2
  const pts = []
  for (let y = 3; y < height - 3; y++) {
    const dy = y + 0.5 - cy
    if (Math.abs(dy) <= 26 * scale) continue
    for (let x = 5; x < width - 5; x++) {
      const a = lum[y * width + x - 1]
      const b = lum[y * width + x]
      if ((a - thr) * (b - thr) >= 0) continue
      const t = (thr - a) / (b - a)
      const xe = x - 0.5 + t
      if (Math.abs(xe - cx) <= 64 * scale) continue
      pts.push({ x: xe, y: y + 0.5 })
    }
  }
  return { pts, thr }
}

/** 一帧 → { cx, cy, r, rms, n } */
export function fitFrame(frame, { idealCx, idealCy, scale = 1 } = {}) {
  const { pts } = collectEdgePoints(frame, { cx: idealCx, cy: idealCy, scale })
  if (pts.length < 100) return null
  let fit = fitCircle(pts)
  if (!fit) return null
  const kept = pts.filter((p) => Math.abs(Math.hypot(p.x - fit.cx, p.y - fit.cy) - fit.r) < 1.5)
  if (kept.length > 100) fit = fitCircle(kept) ?? fit
  let sum = 0
  for (const p of kept) {
    const d = Math.hypot(p.x - fit.cx, p.y - fit.cy) - fit.r
    sum += d * d
  }
  return { ...fit, rms: Math.sqrt(sum / kept.length), n: kept.length }
}
