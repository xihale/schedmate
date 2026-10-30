export function rgba(hex: string, alpha: number): string {
  const n = hex.replace('#', '')
  const r = parseInt(n.slice(0, 2), 16)
  const g = parseInt(n.slice(2, 4), 16)
  const b = parseInt(n.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** 与白色混合，ratio 为原色占比（0~1），用于 xlsx 填充色 */
export function mixWithWhite(hex: string, ratio: number): string {
  const n = hex.replace('#', '')
  const ch = (i: number) => Math.round(parseInt(n.slice(i, i + 2), 16) * ratio + 255 * (1 - ratio))
  const to2 = (v: number) => v.toString(16).padStart(2, '0').toUpperCase()
  return to2(ch(0)) + to2(ch(2)) + to2(ch(4))
}

/** 加深文字色（乘以系数） */
export function darken(hex: string, ratio: number): string {
  const n = hex.replace('#', '')
  const ch = (i: number) => Math.round(parseInt(n.slice(i, i + 2), 16) * ratio)
  const to2 = (v: number) => v.toString(16).padStart(2, '0').toUpperCase()
  return to2(ch(0)) + to2(ch(2)) + to2(ch(4))
}

/** 排班实色底：压深到白字可读（WCAG ≥4.5:1），六种人员色在 0.65 倍下全部达标（最紧的橙 ≈4.8） */
export function dutyFill(hex: string): string {
  return darken(hex, 0.65)
}
