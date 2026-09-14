const BASE_COLORS = [
  '#4C84F0', // 蓝
  '#E8833A', // 橙
  '#41A86E', // 绿
  '#9B6BD8', // 紫
  '#D9A62E', // 金
  '#38A3BF', // 青
  '#D95F7F', // 玫红
  '#8BB63F', // 草绿
  '#6A5ACD', // 靛
  '#CD5C5C', // 红
  '#2E8B8B', // 墨青
  '#A0522D', // 棕
]

export function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

/** 同名课程稳定同色；用户覆盖优先 */
export function courseBase(name: string, overrides: Record<string, string> = {}): string {
  return overrides[name] ?? BASE_COLORS[hashString(name) % BASE_COLORS.length]
}

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
