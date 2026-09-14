import { computed } from 'vue'
import type { Course, DutyEntry, PersonId } from '../types'
import { PERIOD_COUNT, WEEK_COUNT, dutyKey } from '../types'
import { useTimetableStore } from '../stores/timetable'
import { useDutyStore } from '../stores/duty'
import { useConfigStore } from '../stores/config'
import { monthGroups } from '../lib/dates'

export type Half =
  | { status: 'course'; course: Course }
  | { status: 'free' }
  | { status: 'nodata' } // 该周无此人课表（如 B 的 1-2 周 / 未导入），视作可排

export interface CellInfo {
  a: Half
  b: Half
  duty?: DutyEntry
  /** 排给了当节有课的人 → 冲突（重导课表后可能出现），标红保留 */
  conflict: boolean
  /** 缺口：本月前一周有此人的排班，本周因其课程冲突而空缺，待手动调整 */
  gapFrom?: PersonId
}

/**
 * 派生层：所有视图共用，无第二份真相。
 * 事实（courses）与决策（dutyMap）在此汇合，算出每个格子的可用性与渲染模型。
 */
export function useSchedule() {
  const timetable = useTimetableStore()
  const duty = useDutyStore()
  const config = useConfigStore()

  /** personId|week|day|period -> Course，课程铺平到每一节，O(1) 查询 */
  const busyIndex = computed(() => {
    const m = new Map<string, Course>()
    for (const c of timetable.state.courses) {
      for (let p = c.start; p <= c.end; p++) m.set(`${c.personId}|${c.week}|${c.day}|${p}`, c)
    }
    return m
  })

  /** 每人已导入的周集合，用于区分 free / nodata */
  const importedWeeks = computed(() => {
    const r: Record<PersonId, Set<number>> = { A: new Set(), B: new Set() }
    for (const pid of ['A', 'B'] as const) {
      const meta = timetable.state.meta[pid]
      if (meta) for (const w of meta.weeks) r[pid].add(w)
    }
    return r
  })

  function half(personId: PersonId, week: number, day: number, period: number): Half {
    const c = busyIndex.value.get(`${personId}|${week}|${day}|${period}`)
    if (c) return { status: 'course', course: c }
    if (!importedWeeks.value[personId].has(week)) return { status: 'nodata' }
    return { status: 'free' }
  }

  function cell(week: number, day: number, period: number): CellInfo {
    const entry = duty.state.map[dutyKey(week, day, period)]
    const conflict =
      !!entry && busyIndex.value.has(`${entry.personId}|${week}|${day}|${period}`)
    return {
      a: half('A', week, day, period),
      b: half('B', week, day, period),
      duty: entry,
      conflict,
      gapFrom: gapMap.value.get(dutyKey(week, day, period)),
    }
  }

  /** 此人此节是否可被排：无课 且 该节尚未排人 */
  function available(personId: PersonId, week: number, day: number, period: number): boolean {
    if (duty.state.map[dutyKey(week, day, period)]) return false
    return half(personId, week, day, period).status !== 'course'
  }

  /** 同月内排在 week 之后的周（自动同步范围） */
  function monthWeeksAfter(week: number): number[] {
    const g = monthGroups(config.state.semesterStart, WEEK_COUNT).find((x) => x.weeks.includes(week))
    return g ? g.weeks.filter((w) => w > week) : []
  }

  /**
   * 缺口：同一月内，前一周 (d,p) 有此人的排班、本周没有、且此人本周该节有课。
   * 全派生：手动补上（排任何人）即消失；删掉前一周的排班也随之消失。
   */
  const gapMap = computed(() => {
    const m = new Map<string, PersonId>()
    for (const g of monthGroups(config.state.semesterStart, WEEK_COUNT)) {
      for (let i = 1; i < g.weeks.length; i++) {
        const w = g.weeks[i]
        const pw = g.weeks[i - 1]
        for (let d = 1; d <= 7; d++) {
          for (let p = 1; p <= PERIOD_COUNT; p++) {
            const prev = duty.state.map[dutyKey(pw, d, p)]
            const cur = duty.state.map[dutyKey(w, d, p)]
            if (prev && !cur && busyIndex.value.has(`${prev.personId}|${w}|${d}|${p}`)) {
              m.set(dutyKey(w, d, p), prev.personId)
            }
          }
        }
      }
    }
    return m
  })

  /** 有缺口（待手动调整）的周集合 */
  const weeksWithGaps = computed(() => new Set([...gapMap.value.keys()].map((k) => Number(k.split('|')[0]))))

  /** 把 entries 累加上 (week,day,period,pid) 及其同月后续周的同步写入 */
  function collectSync(
    entries: Record<string, DutyEntry>,
    week: number,
    day: number,
    period: number,
    pid: PersonId,
  ): void {
    for (const w of [week, ...monthWeeksAfter(week)]) {
      const key = dutyKey(w, day, period)
      if (duty.state.map[key]) continue
      if (busyIndex.value.has(`${pid}|${w}|${day}|${period}`)) continue // 课程冲突：留缺口
      entries[key] = { personId: pid }
    }
  }

  /** 排班并按月向后同步 */
  function assignWithSync(week: number, day: number, period: number, pid: PersonId): void {
    const entries: Record<string, DutyEntry> = {}
    collectSync(entries, week, day, period, pid)
    if (Object.keys(entries).length) duty.batchSet(entries)
  }

  /** 取消排班，同月后续周的同人同位排班一并取消 */
  function removeWithSync(week: number, day: number, period: number, pid: PersonId): void {
    const entries: Record<string, null> = {}
    for (const w of [week, ...monthWeeksAfter(week)]) {
      const key = dutyKey(w, day, period)
      if (duty.state.map[key]?.personId === pid) entries[key] = null
    }
    if (Object.keys(entries).length) duty.batchSet(entries)
  }

  return {
    config,
    timetable,
    duty,
    busyIndex,
    importedWeeks,
    half,
    cell,
    available,
    gapMap,
    weeksWithGaps,
    collectSync,
    assignWithSync,
    removeWithSync,
  }
}
