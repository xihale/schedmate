import * as XLSX from 'xlsx-js-style'
import type { Course, ImportReport, PersonId } from '../types'
import { PERIOD_COUNT, WEEK_COUNT } from '../types'

const SHEET_RE = /^第\s*(\d+)\s*周$/

type RowRange = { s: { r: number; c: number }; e: { r: number; c: number } }

/**
 * 解析一份课表 xlsx。
 * 已实测的结构约定：
 * - 每周一个 sheet，名为「第N周」
 * - A1 = 「节次\星期」，B1:H1 = 周一..周日（列 c=1..7），行 r=period（表头占 r=0，第1节在 r=1）
 * - 课程格内容 `课程名\n地点`；连堂 = 纵向合并单元格
 * - 只取前 8 节；跨过第 8 节的连堂截断到第 8 节
 */
export function parseTimetable(personId: PersonId, buf: ArrayBuffer, fileName: string): { courses: Course[]; report: ImportReport } {
  const wb = XLSX.read(buf, { type: 'array' })
  const courses: Course[] = []
  const weeks: number[] = []
  let clampedCount = 0
  let skippedCount = 0

  for (const sheetName of wb.SheetNames) {
    const m = SHEET_RE.exec(sheetName.trim())
    if (!m) continue
    const week = Number(m[1])
    if (week < 1 || week > WEEK_COUNT) continue
    const ws = wb.Sheets[sheetName]
    if (!ws) continue
    weeks.push(week)

    const merges = (ws['!merges'] ?? []) as unknown as RowRange[]
    const seen = new Set<string>()

    for (let day = 1; day <= 7; day++) {
      for (let period = 1; period <= PERIOD_COUNT; period++) {
        const addr = XLSX.utils.encode_cell({ r: period, c: day })
        const cell = ws[addr] as { v?: unknown } | undefined
        const text = cell?.v != null ? String(cell.v).trim() : ''
        if (!text) continue

        const isAnchor = merges.some((r) => r.s.r === period && r.s.c === day)
        const insideOther = merges.some(
          (r) => !(r.s.r === period && r.s.c === day) && period >= r.s.r && period <= r.e.r && day >= r.s.c && day <= r.e.c,
        )
        if (!isAnchor && insideOther) continue

        let end = period
        const merge = merges.find((r) => r.s.r === period && r.s.c === day && r.e.c === r.s.c && r.e.r > r.s.r)
        if (merge) {
          end = Math.min(merge.e.r, PERIOD_COUNT)
          if (merge.e.r > PERIOD_COUNT) clampedCount++
        }

        const [nameLine, ...rest] = text.split('\n')
        const name = nameLine.trim()
        const location = rest.join(' ').replace(/\s+/g, ' ').trim()
        const key = `${day}|${period}|${end}|${name}|${location}`
        if (seen.has(key)) continue
        seen.add(key)
        courses.push({ personId, week, day, start: period, end, name, location })
      }
    }

    // 统计完全落在第 8 节之后、被忽略的课程块
    for (let r = PERIOD_COUNT + 1; r <= 12; r++) {
      for (let c = 1; c <= 7; c++) {
        const addr = XLSX.utils.encode_cell({ r, c })
        const cell = ws[addr] as { v?: unknown } | undefined
        const text = cell?.v != null ? String(cell.v).trim() : ''
        if (!text) continue
        const isAnchor = merges.some((mg) => mg.s.r === r && mg.s.c === c)
        const inside = merges.some((mg) => r >= mg.s.r && r <= mg.e.r && c >= mg.s.c && c <= mg.e.c)
        if (!inside || isAnchor) skippedCount++
      }
    }
  }

  if (weeks.length === 0) {
    throw new Error('未找到「第N周」命名的工作表，请确认导入的是课表文件')
  }

  weeks.sort((a, b) => a - b)
  const report: ImportReport = {
    personId,
    fileName,
    weeks,
    courseCount: courses.length,
    clampedCount,
    skippedCount,
  }
  return { courses, report }
}
