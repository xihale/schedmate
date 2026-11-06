import { DAY_NAMES, PERIOD_COUNT } from '../types'
import { useSchedule } from '../composables/useSchedule'
import { courseDate, focusLabel, fmtMD } from './dates'
import { dutyFill } from './palette'

const thin = { style: 'thin', color: { rgb: 'D0D7DE' } }
const allBorders = { top: thin, bottom: thin, left: thin, right: thin }
const centerWrap = { vertical: 'center', horizontal: 'center', wrapText: true }

type AnyCell = { t: string; v: unknown; s?: unknown }

/** 文件名/工作表名里的日期不能带 /（路径与 sheet 名非法字符），用 点分 */
function dot(d: Date): string {
  return `${d.getMonth() + 1}.${d.getDate()}`
}

/**
 * 唯一的导出：当前聚焦区间的排班表。
 * 每周一 sheet 复刻 节次×星期 网格，列头带具体日期（周一 11/2），sheet 名与文件名带日期范围；
 * 月聚焦的跨界周只导出本月的日子；一格一个人名（实色底白字），课程不出现。
 */
export async function exportFocusDuties(): Promise<void> {
  // xlsx-js-style 体积很大，点击导出时才动态加载
  const XLSX = await import('xlsx-js-style')
  const { cell, config, focusWeeks, dayInFocus } = useSchedule()
  const wb = XLSX.utils.book_new()
  const weeks = focusWeeks.value
  const startISO = config.state.semesterStart

  /** 本周落在聚焦内的日子（月聚焦的跨界周只留本月列；周次聚焦恒 7 天） */
  const activeDays = (week: number): number[] =>
    [1, 2, 3, 4, 5, 6, 7].filter((d) => dayInFocus(week, d))

  let first: Date | null = null
  let last: Date | null = null

  for (const week of weeks) {
    const days = activeDays(week)
    const aoa: (string | number)[][] = []
    aoa.push(['节次\\星期', ...days.map((d) => `${DAY_NAMES[d - 1]} ${fmtMD(courseDate(startISO, week, d))}`)])
    for (let p = 1; p <= PERIOD_COUNT; p++) aoa.push([p, ...days.map(() => '')])

    const ws = XLSX.utils.aoa_to_sheet(aoa)

    days.forEach((day, ci) => {
      for (let p = 1; p <= PERIOD_COUNT; p++) {
        const info = cell(week, day, p)
        const addr = XLSX.utils.encode_cell({ r: p, c: ci + 1 })

        let fill = 'FFFFFF'
        let fontColor = '333333'

        if (info.duty) {
          fill = dutyFill(config.personById[info.duty.personId]?.color ?? '#889098').replace('#', '').toUpperCase()
          fontColor = 'FFFFFF'
        }

        if (info.duty) {
          const name = config.personName(info.duty.personId)
          ;(ws as Record<string, AnyCell>)[addr] = { t: 's', v: info.conflict ? `${name}（冲突）` : name }
        }

        const target = (ws as Record<string, AnyCell>)[addr]
        target.s = {
          ...allBorders,
          alignment: centerWrap,
          font: { bold: false, sz: 11, color: { rgb: fontColor } },
          fill: { fgColor: { rgb: fill } },
        }
      }
    })

    // 表头与节次列样式
    for (let r = 0; r <= PERIOD_COUNT; r++) {
      for (let c = 0; c <= days.length; c++) {
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

    ws['!cols'] = [{ wch: 9 }, ...days.map(() => ({ wch: 18 }))]
    ws['!rows'] = Array.from({ length: PERIOD_COUNT + 1 }, () => ({ hpt: 34 }))

    const a = courseDate(startISO, week, days[0])
    const b = courseDate(startISO, week, days[days.length - 1])
    if (!first || a < first) first = a
    if (!last || b > last) last = b
    XLSX.utils.book_append_sheet(wb, ws, `第${week}周 ${dot(a)}~${dot(b)}`)
  }

  const label = focusLabel(config.state.ui.focus)
  XLSX.writeFile(wb, `排班（${label} ${dot(first!)}~${dot(last!)}）.xlsx`)
}
