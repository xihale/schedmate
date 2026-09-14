import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Person, PersonId } from '../types'
import { loadJSON, persistOn } from '../lib/persist'
import { parseISODate } from '../lib/dates'

// v2：人员默认名改为 A/B、去掉 tab 与高亮列字段；升 key 使旧配置不干扰
const KEY = 'schedmate:v2:config'

interface ConfigState {
  persons: Person[]
  semesterStart: string // 第1周周一，ISO 日期
  ui: {
    week: number
    showA: boolean
    showB: boolean
    hideCourses: boolean // 只看排班：课程块退为浅灰，排班块变实色
  }
}

/** 默认定位到今天所在周 */
function currentWeek(startISO: string): number {
  const diff = Date.now() - parseISODate(startISO).getTime()
  return Math.min(20, Math.max(1, Math.floor(diff / (7 * 86400000)) + 1))
}

const DEFAULT_START = '2026-08-31'

export const useConfigStore = defineStore('config', () => {
  const state = ref<ConfigState>(
    loadJSON(KEY, {
      persons: [
        { id: 'A', name: 'A', color: '#4C84F0' },
        { id: 'B', name: 'B', color: '#41A86E' },
      ],
      semesterStart: DEFAULT_START,
      ui: { week: currentWeek(DEFAULT_START), showA: true, showB: true, hideCourses: false },
    }),
  )
  persistOn(() => state.value, KEY)

  const personById = computed(
    () => Object.fromEntries(state.value.persons.map((p) => [p.id, p])) as Record<PersonId, Person>,
  )

  function personName(id: PersonId): string {
    return personById.value[id]?.name ?? id
  }

  return { state, personById, personName }
})
