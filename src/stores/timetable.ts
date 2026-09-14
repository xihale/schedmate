import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Course, ImportMeta, ImportReport, PersonId } from '../types'
import { loadJSON, persistOn } from '../lib/persist'
import { parseTimetable } from '../lib/parse'

const KEY = 'schedmate:v1:timetable'

interface TimetableState {
  courses: Course[]
  meta: Partial<Record<PersonId, ImportMeta>>
}

export const useTimetableStore = defineStore('timetable', () => {
  const state = ref<TimetableState>(loadJSON(KEY, { courses: [], meta: {} }))
  persistOn(() => state.value, KEY)

  const hasAnyData = computed(() => state.value.courses.length > 0)

  /** 全部去重课程名（用于调色板/图例/设置） */
  const courseNames = computed(() => Array.from(new Set(state.value.courses.map((c) => c.name))).sort((a, b) => a.localeCompare(b, 'zh')))

  async function importFor(personId: PersonId, file: File): Promise<ImportReport> {
    const buf = await file.arrayBuffer()
    const { courses, report } = parseTimetable(personId, buf, file.name)
    // 整体替换该人课程；已有排班不删，冲突由派生层标红
    state.value.courses = state.value.courses.filter((c) => c.personId !== personId).concat(courses)
    state.value.meta[personId] = {
      fileName: file.name,
      weeks: report.weeks,
      courseCount: report.courseCount,
      importedAt: Date.now(),
    }
    return report
  }

  function clearPerson(personId: PersonId): void {
    state.value.courses = state.value.courses.filter((c) => c.personId !== personId)
    delete state.value.meta[personId]
  }

  function clearAll(): void {
    state.value.courses = []
    state.value.meta = {}
  }

  return { state, hasAnyData, courseNames, importFor, clearPerson, clearAll }
})
