export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

/** 学期第 week 周的 day（1=周一）对应日期 */
export function courseDate(semesterStartISO: string, week: number, day: number): Date {
  return addDays(parseISODate(semesterStartISO), (week - 1) * 7 + (day - 1))
}

export function fmtMD(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export function fmtISO(d: Date): string {
  const p = (v: number) => String(v).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** 第 week 周的日期范围文案，如 9/14 ~ 9/20 */
export function weekRangeLabel(semesterStartISO: string, week: number): string {
  const a = courseDate(semesterStartISO, week, 1)
  const b = courseDate(semesterStartISO, week, 7)
  return `${fmtMD(a)} ~ ${fmtMD(b)}`
}

export interface MonthGroup {
  month: number // 1..12
  weeks: number[]
}

/**
 * 把周按「月」分组（该周 7 天中所属天数最多的月份），
 * 对应「课程每月都变、按月排班」的使用方式。
 */
export function monthGroups(semesterStartISO: string, weekCount: number): MonthGroup[] {
  const groups: MonthGroup[] = []
  for (let week = 1; week <= weekCount; week++) {
    const counts = new Map<number, number>()
    for (let day = 1; day <= 7; day++) {
      const m = courseDate(semesterStartISO, week, day).getMonth() + 1
      counts.set(m, (counts.get(m) ?? 0) + 1)
    }
    let best = 0
    let bestN = -1
    for (const [m, n] of counts) {
      if (n > bestN) {
        best = m
        bestN = n
      }
    }
    const last = groups[groups.length - 1]
    if (last && last.month === best) last.weeks.push(week)
    else groups.push({ month: best, weeks: [week] })
  }
  return groups
}
