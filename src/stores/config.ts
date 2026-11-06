import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Person, PersonId } from '../types'
import { PERSON_PALETTE, WEEK_COUNT } from '../types'
import { loadJSON, persistOn } from '../lib/persist'
import { clampFocus, monthSpans, todayWeek } from '../lib/dates'

// v3：人数动态化（导入几份课表就有几个人），ui.showA/showB 改为 hiddenIds；升 key 使旧配置不干扰
const KEY = 'schedmate:v3:config'

export interface FocusRange {
  start: number // 含端点
  end: number
  /** 月聚焦的月份（1..12）：跨界周里只露出该月的日子；周次聚焦无此字段 */
  month?: number
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
    /** 写入是否向后同步：关掉后所有改动只写当前周 */
    syncWrite: boolean
  }
}

/** 默认聚焦：今天日期所在的月；今天已在该月最后一周（月末）→ 默认下个月 */
function defaultFocus(startISO: string): FocusRange {
  const spans = monthSpans(startISO, WEEK_COUNT)
  const tw = todayWeek(startISO, WEEK_COUNT)
  let i = spans.findIndex((s) => s.month === new Date().getMonth() + 1)
  if (i < 0) i = spans.findIndex((s) => s.weeks.includes(tw))
  if (i < 0) return { start: tw, end: tw }
  const s = spans[i]
  if (s.weeks[s.weeks.length - 1] === tw && i + 1 < spans.length) {
    const n = spans[i + 1]
    return { start: n.weeks[0], end: n.weeks[n.weeks.length - 1], month: n.month }
  }
  return { start: s.weeks[0], end: s.weeks[s.weeks.length - 1], month: s.month }
}

function defaultUi(startISO: string): ConfigState['ui'] {
  return {
    week: todayWeek(startISO, WEEK_COUNT),
    focus: defaultFocus(startISO),
    hiddenIds: [],
    hideCourses: false,
    syncWrite: true,
  }
}

const DEFAULT_START = '2026-08-31'

/** 兼容无 focus 字段的旧存档：补默认聚焦，并把落在区间外的 week 拉回区间 */
function normalize(s: ConfigState): ConfigState {
  s.ui.focus = clampFocus(s.ui.focus ?? defaultFocus(s.semesterStart), WEEK_COUNT)
  s.ui.syncWrite = s.ui.syncWrite ?? true
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
