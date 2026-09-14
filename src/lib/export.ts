import * as XLSX from 'xlsx-js-style'
import { DAY_NAMES, PERIOD_COUNT, WEEK_COUNT, parseDutyKey } from '../types'
import type { Course } from '../types'
import { useSchedule } from '../composables/useSchedule'
import { darken, mixWithWhite } from './palette'
import { courseDate, fmtISO } from './dates'

const thin = { style: 'thin', color: { rgb: 'D0D7DE' } }
const allBorders = { top: thin, bottom: thin, left: thin, right: thin }
const centerWrap = { vertical: 'center', horizontal: 'center', wrapText: true }

type AnyCell = { t: string; v: unknown; s?: unknown }

/** 导出「排班总表」：明细 sheet + 按周汇总 sheet */
export function exportDutySummary(): void {
  const { duty, config, busyIndex } = useSchedule()
  const map = duty.state.map

  const detail: (string | number)[][] = [['周次', '星期', '日期', '节次', '人员', '课程冲突', '备注']]
  const perWeek: Record<number, Record<string, number>> = {}
  for (let w = 1; w <= WEEK_COUNT; w++) perWeek[w] = { A: 0, B: 0 }

  const keys = Object.keys(map).sort((x, y) => {
    const a = parseDutyKey(x)
    const b = parseDutyKey(y)
    return a.week - b.week || a.day - b.day || a.period - b.period
  })

  for (const key of keys) {
    const { week, day, period } = parseDutyKey(key)
    const entry = map[key]
    const conflict = busyIndex.value.has(`${entry.personId}|${week}|${day}|${period}`)
    detail.push([
      week,
      DAY_NAMES[day - 1],
      fmtISO(courseDate(config.state.semesterStart, week, day)),
      period,
      config.personName(entry.personId),
      conflict ? '⚠ 与该人课程冲突' : '',
      entry.note ?? '',
    ])
    perWeek[week][entry.personId]++
  }

  const summary: (string | number)[][] = [
    ['人员', ...Array.from({ length: WEEK_COUNT }, (_, i) => `第${i + 1}周`), '合计'],
  ]
  for (const pid of ['A', 'B'] as const) {
    const row: (string | number)[] = [config.personName(pid)]
    let total = 0
    for (let w = 1; w <= WEEK_COUNT; w++) {
      const n = perWeek[w][pid]
      total += n
      row.push(n)
    }
    row.push(total)
    summary.push(row)
  }

  const wb = XLSX.utils.book_new()
  const wsDetail = XLSX.utils.aoa_to_sheet(detail)
  wsDetail['!cols'] = [{ wch: 6 }, { wch: 8 }, { wch: 12 }, { wch: 6 }, { wch: 10 }, { wch: 16 }, { wch: 20 }]
  XLSX.utils.book_append_sheet(wb, wsDetail, '排班明细')
  const wsSummary = XLSX.utils.aoa_to_sheet(summary)
  wsSummary['!cols'] = [{ wch: 10 }, ...Array.from({ length: WEEK_COUNT + 1 }, () => ({ wch: 7 }))]
  XLSX.utils.book_append_sheet(wb, wsSummary, '汇总')

  XLSX.writeFile(wb, '排班总表.xlsx')
}

/** 导出「课表+排班渲染表」：每周一 sheet 复刻 节次×星期 网格，含课程色与排班标记 */
export function exportRendered(): void {
  const { cell, config, timetable, duty } = useSchedule()
  const wb = XLSX.utils.book_new()

  const hasDataWeeks = new Set<number>()
  for (const c of timetable.state.courses) hasDataWeeks.add(c.week)
  for (const key of Object.keys(duty.state.map)) hasDataWeeks.add(parseDutyKey(key).week)

  for (let week = 1; week <= WEEK_COUNT; week++) {
    const aoa: (string | number)[][] = []
    aoa.push(['节次\\星期', ...DAY_NAMES])
    for (let p = 1; p <= PERIOD_COUNT; p++) aoa.push([`第${p}节`, '', '', '', '', '', '', ''])

    const ws = XLSX.utils.aoa_to_sheet(aoa)
    const merges: XLSX.Range[] = []

    for (let day = 1; day <= 7; day++) {
      for (let p = 1; p <= PERIOD_COUNT; p++) {
        const info = cell(week, day, p)
        const addr = XLSX.utils.encode_cell({ r: p, c: day })

        const aCourse = info.a.status === 'course' && info.a.course.start === p ? info.a.course : null
        const bCourse = info.b.status === 'course' && info.b.course.start === p ? info.b.course : null
        const anchor: Course | null = aCourse ?? bCourse

        const lines: string[] = []
        let fill = 'FFFFFF'
        let fontColor = '333333'

        if (aCourse && bCourse) {
          lines.push(`【A】${aCourse.name}${aCourse.location ? ` ${aCourse.location}` : ''}`)
          lines.push(`【B】${bCourse.name}${bCourse.location ? ` ${bCourse.location}` : ''}`)
          fill = 'EDF0F3'
        } else if (anchor) {
          const c = anchor
          lines.push(c.name)
          if (c.location) lines.push(c.location)
          // 课程 = 人员实色底 + 白字（与页面一致）
          const base = config.personById[c.personId].color
          fill = base.replace('#', '').toUpperCase()
          fontColor = 'FFFFFF'
        }

        if (info.duty) {
          lines.push(`▶ ${config.personName(info.duty.personId)}${info.conflict ? '（冲突）' : ''}`)
          if (!anchor) {
            // 排班 = 浅色底 + 人员深字
            const base = config.personById[info.duty.personId].color
            fill = mixWithWhite(base, 0.2)
            fontColor = darken(base, 0.75)
          }
        }

        if (anchor && anchor.end > anchor.start) {
          merges.push({ s: { r: p, c: day }, e: { r: p + (anchor.end - anchor.start), c: day } })
        }

        if (lines.length > 0) (ws as Record<string, AnyCell>)[addr] = { t: 's', v: lines.join('\n') }

        const isHeader = false
        const c = (ws as Record<string, AnyCell>)[addr]
        c.s = {
          ...allBorders,
          alignment: centerWrap,
          font: { bold: isHeader, sz: 10, color: { rgb: fontColor } },
          fill: { fgColor: { rgb: fill } },
        }
      }
    }

    // 表头与节次列样式
    for (let r = 0; r <= PERIOD_COUNT; r++) {
      for (let c = 0; c <= 7; c++) {
        const addr = XLSX.utils.encode_cell({ r, c })
        const isHeader = r === 0 || c === 0
        if (!isHeader) continue
        const target = (ws as Record<string, AnyCell>)[addr]
        target.s = {
          ...allBorders,
          alignment: centerWrap,
          font: { bold: true, sz: 10, color: { rgb: '333333' } },
          fill: { fgColor: { rgb: 'F2F3F5' } },
        }
      }
    }

    ws['!merges'] = merges
    ws['!cols'] = [{ wch: 9 }, ...Array.from({ length: 7 }, () => ({ wch: 17 }))]
    ws['!rows'] = Array.from({ length: PERIOD_COUNT + 1 }, () => ({ hpt: 34 }))
    XLSX.utils.book_append_sheet(wb, ws, `第${week}周`)
  }

  XLSX.writeFile(wb, '课表排班渲染表.xlsx')
}
