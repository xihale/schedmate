export type PersonId = 'A' | 'B'

export interface Person {
  id: PersonId
  name: string
  color: string
}

/** 事实：解析自 xlsx，导入后只读 */
export interface Course {
  personId: PersonId
  week: number // 1..20
  day: number // 1..7，周一..周日
  start: number // 起始节 1..8
  end: number // 连堂结束节，已截断到 ≤8
  name: string
  location: string
}

/** 决策：排班，key = `${week}|${day}|${period}`，按节存 */
export interface DutyEntry {
  personId: PersonId
  note?: string
}

export type DutyMap = Record<string, DutyEntry>

export interface ImportMeta {
  fileName: string
  weeks: number[]
  courseCount: number
  importedAt: number
}

export interface ImportReport {
  personId: PersonId
  fileName: string
  weeks: number[]
  courseCount: number
  clampedCount: number // 连堂跨过第 8 节被截断的次数
  skippedCount: number // 完全落在第 8 节之后被忽略的课程块数
}

export const WEEK_COUNT = 20
export const PERIOD_COUNT = 8
export const DAY_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] as const

export const dutyKey = (week: number, day: number, period: number) => `${week}|${day}|${period}`

export function parseDutyKey(key: string) {
  const [week, day, period] = key.split('|').map(Number)
  return { week, day, period }
}
