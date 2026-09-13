/**
 * 1px 级线条伪影检测：逐像素找"孤立偏差"，再按行/列聚成连续线段。
 *
 * 判据：p(x,y) 与上下各 2px 的均值之差 >= minDev（够显眼），
 * 且上下 2px 彼此接近（<= contrastMax，说明它夹在平坦区里，不是真实硬边）。
 * 真实圆弧边缘在 y 方向是单调过渡，上下邻居差异大，会被 contrastMax 过滤掉，
 * 因此该判据对"扫过去的圆弧"不敏感，只对"凭空出现的细线"敏感。
 */
const idx = (width, x, y) => y * width + x

function runsOf(hits, width, height, minRun, gap = 2) {
  // 逐行找连续段
  const found = []
  for (let y = 0; y < height; y++) {
    let x = 0
    const row = y * width
    while (x < width) {
      if (!hits[row + x]) {
        x++
        continue
      }
      const from = x
      let last = x
      let n = 0
      while (x < width && x - last <= gap) {
        if (hits[row + x]) {
          last = x
          n++
        }
        x++
      }
      if (last - from + 1 >= minRun) found.push({ pos: y, from, to: last, n: n })
    }
  }
  return found
}

function runsOfColumns(hits, width, height, minRun, gap = 2) {
  const found = []
  for (let x = 0; x < width; x++) {
    let y = 0
    while (y < height) {
      if (!hits[y * width + x]) {
        y++
        continue
      }
      const from = y
      let last = y
      let n = 0
      while (y < height && y - last <= gap) {
        if (hits[y * width + x]) {
          last = y
          n++
        }
        y++
      }
      if (last - from + 1 >= minRun) found.push({ pos: x, from, to: last, n: n })
    }
  }
  return found
}

export function detectLines(frame, opts = {}) {
  const { minDev = 5, contrastMax = 10, minRun = 48, border = 8 } = opts
  const { width, height, lum } = frame
  const vertical = new Uint8Array(width * height) // 竖向孤立偏差 → 水平细线
  const horizontal = new Uint8Array(width * height) // 横向孤立偏差 → 竖直细线
  let hairlinePixels = 0
  let maxIsolatedDev = 0

  for (let y = border; y < height - border; y++) {
    for (let x = border; x < width - border; x++) {
      const i = idx(width, x, y)
      const v = lum[i]
      const up = lum[i - 2 * width]
      const dn = lum[i + 2 * width]
      const abs = Math.abs(v - (up + dn) / 2)
      if (abs >= minDev && Math.abs(up - dn) <= contrastMax) {
        vertical[i] = 1
        hairlinePixels++
        if (abs > maxIsolatedDev) maxIsolatedDev = abs
      }
      const lf = lum[i - 2]
      const rt = lum[i + 2]
      const absH = Math.abs(v - (lf + rt) / 2)
      if (absH >= minDev && Math.abs(lf - rt) <= contrastMax) horizontal[i] = 1
    }
  }

  const rows = runsOf(vertical, width, height, minRun).map((r) => ({ y: r.pos, from: r.from, to: r.to, len: r.to - r.from + 1 }))
  const cols = runsOfColumns(horizontal, width, height, minRun).map((r) => ({ x: r.pos, from: r.from, to: r.to, len: r.to - r.from + 1 }))

  // 强度：线段上像素的平均 |偏差|
  const strength = (list, axis) =>
    list.map((l) => {
      let sum = 0
      let n = 0
      for (let a = l.from; a <= l.to; a++) {
        const i = axis === 'row' ? idx(width, a, l.y) : idx(width, l.x, a)
        const v = lum[i]
        const dev =
          axis === 'row'
            ? v - (lum[i - 2 * width] + lum[i + 2 * width]) / 2
            : v - (lum[i - 2] + lum[i + 2]) / 2
        sum += Math.abs(dev)
        n++
      }
      return { ...l, meanDev: sum / Math.max(1, n), dir: 'mixed' }
    })

  return {
    rows: strength(rows, 'row').sort((a, b) => b.len * b.meanDev - a.len * a.meanDev),
    cols: strength(cols, 'col').sort((a, b) => b.len * b.meanDev - a.len * a.meanDev),
    hairlinePixels,
    maxIsolatedDev,
  }
}

/** 一行摘要，便于逐帧打印 */
export function summarize(detection) {
  const parts = []
  for (const l of detection.rows.slice(0, 3)) parts.push(`row y=${l.y} x${l.from}-${l.to} dev=${l.meanDev.toFixed(1)}`)
  for (const l of detection.cols.slice(0, 3)) parts.push(`col x=${l.x} y${l.from}-${l.to} dev=${l.meanDev.toFixed(1)}`)
  return parts.length ? parts.join(' | ') : '—'
}

/** 面积型指标：孤立像素占比（ppm），用于跨帧比较"抖动量" */
export function hairlineRate(detection, frame) {
  return (detection.hairlinePixels / (frame.width * frame.height)) * 1e6
}
