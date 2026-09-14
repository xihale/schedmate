import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Person, PersonId } from '../types'
import { PERSON_PALETTE } from '../types'
import { loadJSON, persistOn } from '../lib/persist'
import { parseISODate } from '../lib/dates'

// v3：人数动态化（导入几份课表就有几个人），ui.showA/showB 改为 hiddenIds；升 key 使旧配置不干扰
const KEY = 'schedmate:v3:config'

interface ConfigState {
  persons: Person[]
  nextPersonIndex: number // 人员 id 生成计数，只增不减
  semesterStart: string // 第1周周一，ISO 日期
  ui: {
    week: number
    hiddenIds: PersonId[] // 隐藏列的人员
    hideCourses: boolean // 只看排班：隐去课程，每人一格只显示谁当班
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
      persons: [],
      nextPersonIndex: 1,
      semesterStart: DEFAULT_START,
      ui: { week: currentWeek(DEFAULT_START), hiddenIds: [], hideCourses: false },
    }),
  )
  persistOn(() => state.value, KEY)

  const personById = computed(
    () => Object.fromEntries(state.value.persons.map((p) => [p.id, p])) as Record<PersonId, Person>,
  )

  function personName(id: PersonId): string {
    return personById.value[id]?.name ?? id
  }

  /** 新增一个人员：id 自增，配色按顺序轮换 */
  function addPerson(name: string): Person {
    const person: Person = {
      id: `p${state.value.nextPersonIndex++}`,
      name,
      color: PERSON_PALETTE[(state.value.persons.length + 1) % PERSON_PALETTE.length],
    }
    // 首个人固定用蓝色，与既有习惯一致
    if (state.value.persons.length === 0) person.color = PERSON_PALETTE[0]
    state.value.persons.push(person)
    return person
  }

  function removePerson(id: PersonId): void {
    state.value.persons = state.value.persons.filter((p) => p.id !== id)
    state.value.ui.hiddenIds = state.value.ui.hiddenIds.filter((x) => x !== id)
  }

  return { state, personById, personName, addPerson, removePerson }
})
