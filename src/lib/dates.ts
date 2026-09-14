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
