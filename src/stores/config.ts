import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Person, PersonId } from '../types'
import { PERSON_PALETTE, WEEK_COUNT } from '../types'
import { loadJSON, persistOn } from '../lib/persist'
import { clampFocus, monthGroups, todayWeek } from '../lib/dates'

// v3：人数动态化（导入几份课表就有几个人），ui.showA/showB 改为 hiddenIds；升 key 使旧配置不干扰
const KEY = 'schedmate:v3:config'

export interface FocusRange {
  start: number // 含端点
  end: number
}

interface ConfigState {
  persons: Person[]
  nextPersonIndex: number // 人员 id 生成计数，只增不减
  semesterStart: string // 第1周周一，ISO 日期
  ui: {
    week: number
    /** 聚焦区间：排班同步、缺口检测、导出都只作用于这些周 */
    focus: FocusRange
    hiddenIds: PersonId[] // 隐藏列的人员
    hideCourses: boolean // 只看排班：隐去课程，每人一格只显示谁当班
  }
}

/** 默认聚焦的月分组：今天所在周的分组；今天在分组最后一周（月末）→ 用下一个分组 */
function defaultFocus(startISO: string): FocusRange {
  const groups = monthGroups(startISO, WEEK_COUNT)
  const tw = todayWeek(startISO, WEEK_COUNT)
  const i = groups.findIndex((g) => g.weeks.includes(tw))
  if (i < 0) return { start: tw, end: tw }
  const g = groups[i]
  if (g.weeks[g.weeks.length - 1] === tw && i + 1 < groups.length) return clampFocus({ start: groups[i + 1].weeks[0], end: groups[i + 1].weeks[groups[i + 1].weeks.length - 1] }, WEEK_COUNT)
  return { start: g.weeks[0], end: g.weeks[g.weeks.length - 1] }
}

function defaultUi(startISO: string): ConfigState['ui'] {
  return {
    week: todayWeek(startISO, WEEK_COUNT),
    focus: defaultFocus(startISO),
    hiddenIds: [],
    hideCourses: false,
  }
}

const DEFAULT_START = '2026-08-31'

/** 兼容无 focus 字段的旧存档：补默认聚焦，并把落在区间外的 week 拉回区间 */
function normalize(s: ConfigState): ConfigState {
  s.ui.focus = clampFocus(s.ui.focus ?? defaultFocus(s.semesterStart), WEEK_COUNT)
  if (s.ui.week < s.ui.focus.start || s.ui.week > s.ui.focus.end) s.ui.week = s.ui.focus.start
  return s
}

export const useConfigStore = defineStore('config', () => {
  const state = ref<ConfigState>(
    normalize(loadJSON(KEY, { persons: [], nextPersonIndex: 1, semesterStart: DEFAULT_START, ui: defaultUi(DEFAULT_START) })),
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
