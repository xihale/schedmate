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
  return '#' + to2(ch(0)) + to2(ch(2)) + to2(ch(4))
}

/** 排班实色底：默认六色本就 ≥5:1，原样平涂；用户自选浅色时压深 0.65 兜底白字可读 */
export function dutyFill(hex: string): string {
  return contrastOnWhite(hex) >= 4.5 ? hex : darken(hex, 0.65)
}

function luminance(hex: string): number {
  const n = hex.replace('#', '')
  const ch = [0, 2, 4].map((i) => {
    const v = parseInt(n.slice(i, i + 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
}

function contrastOnWhite(hex: string): number {
  return 1.05 / (luminance(hex) + 0.05)
}
