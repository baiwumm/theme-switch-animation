'use client'

import NumberFlow from '@number-flow/react'
import { useEffect, useState } from 'react'

/**
 * 数值滚动（token-usage 同款手法）：NumberFlow 只在 value 变化时过渡，
 * 所以挂载先渲染 0、effect 里提交真实值——首屏同样有从 0 滚入的动画，
 * 后续值变化（如画廊切换 duration 档位）则原地滚动。
 */
export function FlowNumber({
  value,
  suffix,
}: {
  value: number
  suffix?: string
}) {
  const [entered, setEntered] = useState(false)
  useEffect(() => setEntered(true), [])
  // useGrouping: false —— 本站数值都是 15 / 950 / 1000 这类短数，别滚成 1,000
  return (
    <NumberFlow
      format={{ useGrouping: false }}
      suffix={suffix}
      value={entered ? value : 0}
    />
  )
}
