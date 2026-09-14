import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Person, PersonId } from '../types'
import { loadJSON, persistOn } from '../lib/persist'

const KEY = 'schedmate:v1:config'

interface ConfigState {
  persons: Person[]
  semesterStart: string // 第1周周一，ISO 日期
  brushPersonId: PersonId | null // 拖刷人选，null = 关
  ui: {
    tab: 'week' | 'overview'
    week: number
    highlightDay: number | null // 从鸟瞰下钻时高亮的列
    showA: boolean
    showB: boolean
  }
}

export const useConfigStore = defineStore('config', () => {
  const state = ref<ConfigState>(
    loadJSON(KEY, {
      persons: [
        { id: 'A', name: '同学A', color: '#4C84F0' },
        { id: 'B', name: '同学B', color: '#41A86E' },
      ],
      semesterStart: '2026-08-31',
      brushPersonId: null,
      ui: { tab: 'week', week: 1, highlightDay: null, showA: true, showB: true },
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
