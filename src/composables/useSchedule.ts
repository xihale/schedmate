import { computed } from 'vue'
import type { Course, DutyEntry, PersonId } from '../types'
import { dutyKey } from '../types'
import { useTimetableStore } from '../stores/timetable'
import { useDutyStore } from '../stores/duty'
import { useConfigStore } from '../stores/config'

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
    return { a: half('A', week, day, period), b: half('B', week, day, period), duty: entry, conflict }
  }

  /** 此人此节是否可被排：无课 且 该节尚未排人 */
  function available(personId: PersonId, week: number, day: number, period: number): boolean {
    if (duty.state.map[dutyKey(week, day, period)]) return false
    return half(personId, week, day, period).status !== 'course'
  }

  return { config, timetable, duty, busyIndex, importedWeeks, half, cell, available }
}
