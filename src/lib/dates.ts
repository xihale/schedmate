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

export interface MonthSpan {
  month: number // 1..12
  weeks: number[] // 与该月有交集的所有周（升序连续；相邻两月在跨界周重叠）
  from: Date // 该月落在本学期内的第 1 天
  to: Date // 该月落在本学期内的最后 1 天
}

/**
 * 按「月」给出聚焦预设：凡是含该月任何一天的周都算（不做周多数归属），
 * 这样 11/30、1/1 这类落在跨界周里的日子不会被丢给隔壁月。
 */
export function monthSpans(semesterStartISO: string, weekCount: number): MonthSpan[] {
  const spans = new Map<number, { weeks: Set<number>; from: Date; to: Date }>()
  for (let week = 1; week <= weekCount; week++) {
    for (let day = 1; day <= 7; day++) {
      const d = courseDate(semesterStartISO, week, day)
      const m = d.getMonth() + 1
      const s = spans.get(m)
      if (s) {
        s.weeks.add(week)
        if (d < s.from) s.from = d
        if (d > s.to) s.to = d
      } else {
        spans.set(m, { weeks: new Set([week]), from: d, to: d })
      }
    }
  }
  // Map 保持首次出现顺序 = 时间顺序
  return [...spans.entries()].map(([month, s]) => ({
    month,
    weeks: [...s.weeks].sort((a, b) => a - b),
    from: s.from,
    to: s.to,
  }))
}

/** 今天所在的教学周（clamp 到 1..weekCount） */
export function todayWeek(semesterStartISO: string, weekCount: number): number {
  const diff = Date.now() - parseISODate(semesterStartISO).getTime()
  return Math.min(weekCount, Math.max(1, Math.floor(diff / (7 * 86400000)) + 1))
}

/** 聚焦区间归一化：clamp 到 1..weekCount，且保证 start ≤ end；month 等附加字段原样保留 */
export function clampFocus<T extends { start: number; end: number }>(
  f: T,
  weekCount: number,
): T {
  const start = Math.min(Math.max(1, Math.round(f.start)), weekCount)
  const end = Math.min(Math.max(start, Math.round(f.end)), weekCount)
  return { ...f, start, end }
}

/** 聚焦区间的文案：月聚焦 → "11月"，否则 → "第10-13周" / "第10周" */
export function focusLabel(f: { start: number; end: number; month?: number }): string {
  if (f.month != null) return `${f.month}月`
  return f.start === f.end ? `第${f.start}周` : `第${f.start}-${f.end}周`
}
