import * as XLSX from 'xlsx-js-style'
import { DAY_NAMES, PERIOD_COUNT } from '../types'
import { useSchedule } from '../composables/useSchedule'
import { WEEK_COUNT } from '../types'
import { monthGroups } from './dates'

const thin = { style: 'thin', color: { rgb: 'D0D7DE' } }
const allBorders = { top: thin, bottom: thin, left: thin, right: thin }
const centerWrap = { vertical: 'center', horizontal: 'center', wrapText: true }

type AnyCell = { t: string; v: unknown; s?: unknown }

/** 当前查看的月份分组：排班按月进行，导出也只含当月这几周 */
function currentMonthGroup(): { month: number; weeks: number[] } {
  const { config } = useSchedule()
  return (
    monthGroups(config.state.semesterStart, WEEK_COUNT).find((g) => g.weeks.includes(config.state.ui.week)) ?? {
      month: 1,
      weeks: [],
    }
  )
}

/**
 * 唯一的导出：当前月份的排班表。
 * 每周一 sheet 复刻 节次×星期 网格，一格一个人名（实色底白字），课程不出现。
 */
export function exportMonthDuties(): void {
  const { cell, config } = useSchedule()
  const wb = XLSX.utils.book_new()
  const group = currentMonthGroup()

  for (const week of group.weeks) {
    const aoa: (string | number)[][] = []
    aoa.push(['节次\\星期', ...DAY_NAMES])
    for (let p = 1; p <= PERIOD_COUNT; p++) aoa.push([`第${p}节`, '', '', '', '', '', '', ''])

    const ws = XLSX.utils.aoa_to_sheet(aoa)

    for (let day = 1; day <= 7; day++) {
      for (let p = 1; p <= PERIOD_COUNT; p++) {
        const info = cell(week, day, p)
        const addr = XLSX.utils.encode_cell({ r: p, c: day })

        let fill = 'FFFFFF'
        let fontColor = '333333'

        if (info.duty) {
          fill = config.personById[info.duty.personId]?.color.replace('#', '').toUpperCase() ?? '889098'
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

    ws['!cols'] = [{ wch: 9 }, ...Array.from({ length: 7 }, () => ({ wch: 18 }))]
    ws['!rows'] = Array.from({ length: PERIOD_COUNT + 1 }, () => ({ hpt: 34 }))
    XLSX.utils.book_append_sheet(wb, ws, `第${week}周`)
  }

  XLSX.writeFile(wb, `排班（${group.month}月）.xlsx`)
}
