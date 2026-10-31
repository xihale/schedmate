import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { DutyEntry, DutyMap } from '../types'
import { loadJSON, persistOn } from '../lib/persist'

// v2：人员动态化后 personId 含义改变，升 key 使旧缓存不干扰
const KEY = 'schedmate:v2:duty'
const MAX_UNDO = 60

export const useDutyStore = defineStore('duty', () => {
  const state = ref<{ map: DutyMap }>(loadJSON(KEY, { map: {} }))
  const undoStack = ref<string[]>([])
  const redoStack = ref<string[]>([])
  persistOn(() => state.value, KEY)

  const dutyMap = computed(() => state.value.map)
  const count = computed(() => Object.keys(state.value.map).length)
  const canUndo = computed(() => undoStack.value.length > 0)
  const canRedo = computed(() => redoStack.value.length > 0)

  function snapshot(): void {
    undoStack.value.push(JSON.stringify(state.value.map))
    if (undoStack.value.length > MAX_UNDO) undoStack.value.shift()
    redoStack.value = []
  }

  function apply(entries: Record<string, DutyEntry | null>): void {
    for (const [key, entry] of Object.entries(entries)) {
      if (entry === null) delete state.value.map[key]
      else state.value.map[key] = entry
    }
  }

  function setDuty(key: string, entry: DutyEntry | null): void {
    snapshot()
    apply({ [key]: entry })
  }

  /** 拖拽连排等批量写，只记一次 undo */
  function batchSet(entries: Record<string, DutyEntry | null>): void {
    snapshot()
    apply(entries)
  }

  function undo(): void {
    const snap = undoStack.value.pop()
    if (!snap) return
    redoStack.value.push(JSON.stringify(state.value.map))
    state.value.map = JSON.parse(snap)
  }

  function redo(): void {
    const snap = redoStack.value.pop()
    if (!snap) return
    undoStack.value.push(JSON.stringify(state.value.map))
    state.value.map = JSON.parse(snap)
  }

  function clearAllDuties(): void {
    snapshot()
    state.value.map = {}
  }


  /** 移除人员：删掉他的排班，并清空撤销栈，避免撤销把已删的人写回来 */
  function forgetPerson(personId: string): void {
    for (const [key, entry] of Object.entries(state.value.map)) {
      if (entry.personId === personId) delete state.value.map[key]
    }
    resetHistory()
  }
  /** 重导课表后调用：事实已变，旧快照无意义 */
  function resetHistory(): void {
    undoStack.value = []
    redoStack.value = []
  }

  return { state, dutyMap, count, canUndo, canRedo, setDuty, batchSet, undo, redo, clearAllDuties, resetHistory, forgetPerson }
})
