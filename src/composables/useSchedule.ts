import { computed } from 'vue'
import type { Course, DutyEntry, PersonId } from '../types'
import { PERIOD_COUNT, WEEK_COUNT, dutyKey, parseDutyKey } from '../types'
import { useTimetableStore } from '../stores/timetable'
import { useDutyStore } from '../stores/duty'
import { useConfigStore } from '../stores/config'
import { clampFocus } from '../lib/dates'

export type Half =
  | { status: 'course'; course: Course }
  | { status: 'free' }
  | { status: 'nodata' } // 该周无此人课表（如 B 的 1-2 周 / 未导入），视作可排

export interface CellInfo {
  /** 每个人员一格，顺序同 config.persons */
  halves: Half[]
  duty?: DutyEntry
  /** 排给了当节有课的人 → 冲突（重导课表后可能出现），标红保留 */
  conflict: boolean
  /** 缺口：聚焦区间内前一周有此人的排班，本周因其课程冲突而空缺，待手动调整 */
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
    const r: Record<string, Set<number>> = {}
    for (const [pid, meta] of Object.entries(timetable.state.meta)) {
      if (!meta) continue
      r[pid] = new Set(meta.weeks)
    }
    return r
  })

  function half(personId: PersonId, week: number, day: number, period: number): Half {
    const c = busyIndex.value.get(`${personId}|${week}|${day}|${period}`)
    if (c) return { status: 'course', course: c }
    if (!importedWeeks.value[personId]?.has(week)) return { status: 'nodata' }
    return { status: 'free' }
  }

  function cell(week: number, day: number, period: number): CellInfo {
    const entry = duty.state.map[dutyKey(week, day, period)]
    const conflict =
      !!entry && busyIndex.value.has(`${entry.personId}|${week}|${day}|${period}`)
    return {
      halves: config.state.persons.map((p) => half(p.id, week, day, period)),
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

  /** 当前聚焦区间内的周（clamp 后升序）；同步、缺口、导出的作用范围 */
  const focusWeeks = computed(() => {
    const { start, end } = clampFocus(config.state.ui.focus, WEEK_COUNT)
    const weeks: number[] = []
    for (let w = start; w <= end; w++) weeks.push(w)
    return weeks
  })

  /**
   * 缺口：聚焦区间内，前一周 (d,p) 有此人的排班、本周没有、且此人本周该节有课。
   * 全派生：手动补上（排任何人）即消失；删掉前一周的排班也随之消失。
   */
  const gapMap = computed(() => {
    const m = new Map<string, PersonId>()
    const weeks = focusWeeks.value
    for (let i = 1; i < weeks.length; i++) {
      const w = weeks[i]
      const pw = weeks[i - 1]
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
    return m
  })

  /** 有缺口（待手动调整）的周集合 */
  const weeksWithGaps = computed(() => new Set([...gapMap.value.keys()].map((k) => Number(k.split('|')[0]))))

  /** 写入向后波及的周：开同步 → 聚焦区间内后续周；关同步 → 只有当前周 */
  function laterWeeks(week: number): number[] {
    return config.state.ui.syncWrite ? focusWeeks.value.filter((x) => x > week) : []
  }

  /** 把 entries 累加上 (week,day,period,pid) 及其同步范围内的后续周写入 */
  function collectSync(
    entries: Record<string, DutyEntry>,
    week: number,
    day: number,
    period: number,
    pid: PersonId,
  ): void {
    for (const w of [week, ...laterWeeks(week)]) {
      const key = dutyKey(w, day, period)
      if (duty.state.map[key]) continue
      if (busyIndex.value.has(`${pid}|${w}|${day}|${period}`)) continue // 课程冲突：留缺口
      entries[key] = { personId: pid }
    }
  }

  /** 排班并在聚焦区间内向后同步。返回实际写入的格。 */
  function assignWithSync(week: number, day: number, period: number, pid: PersonId): Record<string, DutyEntry> {
    const entries: Record<string, DutyEntry> = {}
    collectSync(entries, week, day, period, pid)
    if (Object.keys(entries).length) duty.batchSet(entries)
    return entries
  }

  /** 取消排班，同步范围内后续周的同人同位排班一并取消。返回实际删掉的格。 */
  function removeWithSync(week: number, day: number, period: number, pid: PersonId): Record<string, null> {
    const entries: Record<string, null> = {}
    for (const w of [week, ...laterWeeks(week)]) {
      const key = dutyKey(w, day, period)
      if (duty.state.map[key]?.personId === pid) entries[key] = null
    }
    if (Object.keys(entries).length) duty.batchSet(entries)
    return entries
  }

  /** 批量取消：每格按同步规则展开，合并成一次撤销。返回实际删掉的格。 */
  function removeManyWithSync(keys: string[]): Record<string, null> {
    const entries: Record<string, null> = {}
    for (const key of keys) {
      const cur = duty.state.map[key]
      if (!cur) continue
      const { week, day, period } = parseDutyKey(key)
      entries[key] = null
      for (const w of laterWeeks(week)) {
        const k = dutyKey(w, day, period)
        if (duty.state.map[k]?.personId === cur.personId) entries[k] = null
      }
    }
    if (Object.keys(entries).length) duty.batchSet(entries)
    return entries
  }

  /** 换人：本格及同步范围内后续周里 from 的同位排班换成 to（to 有课的周空出来），只记一次撤销。返回写入 to 的格。 */
  function replaceWithSync(week: number, day: number, period: number, from: PersonId, to: PersonId): string[] {
    const entries: Record<string, DutyEntry | null> = {}
    const written: string[] = []
    for (const w of [week, ...laterWeeks(week)]) {
      const key = dutyKey(w, day, period)
      const cur = duty.state.map[key]
      if (cur && cur.personId !== from) continue
      if (busyIndex.value.has(`${to}|${w}|${day}|${period}`)) {
        if (cur) entries[key] = null
        continue
      }
      entries[key] = { personId: to }
      written.push(key)
    }
    if (Object.keys(entries).length) duty.batchSet(entries)
    return written
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
    focusWeeks,
    gapMap,
    weeksWithGaps,
    collectSync,
    assignWithSync,
    removeWithSync,
    removeManyWithSync,
    replaceWithSync,
  }
}
