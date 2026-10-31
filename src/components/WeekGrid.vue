<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useConfigStore } from '../stores/config'
import { useSchedule } from '../composables/useSchedule'
import { DAY_NAMES, PERIOD_COUNT, dutyKey } from '../types'
import type { PersonId } from '../types'
import { courseDate, fmtMD } from '../lib/dates'
import { flash } from '../lib/status'
import { washWeeks } from '../lib/wash'
import DutyCell from './DutyCell.vue'

const config = useConfigStore()
const schedule = useSchedule()

const week = computed(() => config.state.ui.week)
const persons = computed(() => config.state.persons)

/** 拖动：同一个人同一天，从起始节到当前节；起止相同就是一次点击 */
const drag = ref<{ pid: PersonId; day: number; start: number; end: number } | null>(null)
const denial = ref<{ pid: PersonId; day: number; period: number; text: string } | null>(null)
let denialTimer = 0

const gridEl = ref<HTMLElement | null>(null)
const activeId = ref<string | null>(null)
/** 打开换人菜单的格：`${day}-${period}` */
const menuAt = ref<string | null>(null)
/** 已排格拖动多选：按下起手，滑过的已排格进集合，松手一起取消 */
const selection = ref<Set<string>>(new Set())
const selDrag = ref(false)

const periods = Array.from({ length: PERIOD_COUNT }, (_, i) => i + 1)

function personColor(pid: PersonId): string {
  return config.personById[pid]?.color ?? '#889098'
}

function blockReason(pid: PersonId, day: number, period: number): string | null {
  const info = schedule.cell(week.value, day, period)
  const i = persons.value.findIndex((p) => p.id === pid)
  const half = info.halves[i]
  if (half?.status === 'course') return `有课 ${half.course.name}`
  return null
}

function deny(pid: PersonId, day: number, period: number, text: string): void {
  denial.value = { pid, day, period, text }
  flash(`${DAY_NAMES[day - 1]}第 ${period} 节：${text}`)
  window.clearTimeout(denialTimer)
  denialTimer = window.setTimeout(() => {
    denial.value = null
  }, 1500)
}

/** 如实说出写了哪些周：连续的折叠成区间，稀疏的列出来 */
function weeksLabel(weeks: number[]): string {
  const ws = [...weeks].sort((a, b) => a - b)
  const parts: string[] = []
  let i = 0
  while (i < ws.length) {
    let j = i
    while (j + 1 < ws.length && ws[j + 1] === ws[j] + 1) j++
    parts.push(i === j ? `${ws[i]}` : `${ws[i]}–${ws[j]}`)
    i = j + 1
  }
  const text = parts.join('、')
  return text.length > 16 ? `${ws[0]}–${ws[ws.length - 1]} 中的 ${ws.length} 周` : text
}

/** 键盘进来的人写完不该丢位置：同一条 slot 还在，就把焦点放回去 */
function restoreFocus(fromKeyboard: boolean): void {
  if (!fromKeyboard) return
  nextTick(() => focusSlot(activeId.value))
}

/** 点或拖：写入、取消，都在这里落到 store */
function write(pid: PersonId, day: number, period: number, fromKeyboard = false): void {
  const info = schedule.cell(week.value, day, period)
  if (info.duty?.personId === pid) {
    const removed = schedule.removeWithSync(week.value, day, period, pid)
    const n = Object.keys(removed).length
    flash(schedule.config.state.ui.syncWrite ? (n > 1 ? `已取消 ${n} 周` : '已取消') : '已取消本周')
    restoreFocus(fromKeyboard)
    return
  }
  const why = blockReason(pid, day, period)
  if (why) {
    deny(pid, day, period, why)
    return
  }
  const written = schedule.assignWithSync(week.value, day, period, pid)
  const keys = Object.keys(written)
  if (!keys.length) {
    flash('没有可写的周')
    return
  }
  const weeks = [...new Set(keys.map((k) => Number(k.split('|')[0])))]
  washWeeks(weeks, personColor(pid))
  // 逐周对账：写了哪些、被课挡了哪些，一行说完；只排本周时没有对账
  const parts = [schedule.config.state.ui.syncWrite ? `已排 第 ${weeksLabel(weeks)} 周` : `已排 第 ${week.value} 周 第 ${day} 天第 ${period} 节`]
  if (schedule.config.state.ui.syncWrite) {
    const writtenSet = new Set(weeks)
    const blocked = schedule.focusWeeks.value.filter(
      (w) =>
        w > week.value &&
        !writtenSet.has(w) &&
        !schedule.duty.state.map[dutyKey(w, day, period)] &&
        schedule.busyIndex.value.has(`${pid}|${w}|${day}|${period}`),
    )
    if (blocked.length) parts.push(`第 ${weeksLabel(blocked)} 周有课，留空`)
  }
  flash(parts.join('，'))
  restoreFocus(fromKeyboard)
}

/** 已排格按下：开一次多选，起点先进集合 */
function onSelPress(day: number, period: number): void {
  const key = dutyKey(week.value, day, period)
  if (!schedule.duty.state.map[key]) return
  menuAt.value = null
  selDrag.value = true
  selection.value = new Set([key])
}

/** 拖到的已排格加入本次取消；空格不参与 */
function onSelEnter(day: number, period: number): void {
  if (!selDrag.value) return
  const key = dutyKey(week.value, day, period)
  if (!schedule.duty.state.map[key] || selection.value.has(key)) return
  const next = new Set(selection.value)
  next.add(key)
  selection.value = next
}

/** 松手才落库：选中的格按同步规则展开，合并成一次撤销 */
function commitSelect(): void {
  const keys = [...selection.value]
  selDrag.value = false
  selection.value = new Set()
  if (!keys.length) return
  const removed = schedule.removeManyWithSync(keys)
  const total = Object.keys(removed).length
  if (keys.length === 1) {
    flash(schedule.config.state.ui.syncWrite ? (total > 1 ? `已取消 ${total} 周` : '已取消') : '已取消本周')
    return
  }
  flash(total > keys.length ? `已取消 ${keys.length} 处，同步连带 ${total - keys.length} 处` : `已取消 ${keys.length} 处排班`)
}

function onPress(pid: PersonId, day: number, period: number): void {
  const info = schedule.cell(week.value, day, period)
  if (info.duty?.personId === pid) {
    write(pid, day, period)
    return
  }
  const why = blockReason(pid, day, period)
  if (why) {
    deny(pid, day, period, why)
    return
  }
  drag.value = { pid, day, start: period, end: period }
}

function onEnter(pid: PersonId, day: number, period: number): void {
  const d = drag.value
  if (d && d.pid === pid && d.day === day) d.end = period
}

function onPick(pid: PersonId, day: number, period: number): void {
  const fromKeyboard = document.activeElement instanceof HTMLElement && !!document.activeElement.dataset.slot
  write(pid, day, period, fromKeyboard)
}

function previewPid(day: number, period: number): PersonId | null {
  const d = drag.value
  if (!d || d.day !== day) return null
  const [lo, hi] = d.start <= d.end ? [d.start, d.end] : [d.end, d.start]
  if (period < lo || period > hi) return null
  return schedule.available(d.pid, week.value, day, period) || (period === d.start) ? d.pid : null
}

function setMenu(day: number, period: number, open: boolean): void {
  menuAt.value = open ? `${day}-${period}` : null
}

function onCancel(pid: PersonId, day: number, period: number): void {
  menuAt.value = null
  write(pid, day, period, true)
}

function onSwap(to: PersonId, day: number, period: number): void {
  menuAt.value = null
  const from = schedule.cell(week.value, day, period).duty?.personId
  if (!from) return
  const written = schedule.replaceWithSync(week.value, day, period, from, to)
  const weeks = [...new Set(written.map((k) => Number(k.split('|')[0])))]
  washWeeks(weeks, personColor(to))
  flash(`换成 ${config.personName(to)}，第 ${weeksLabel(weeks)} 周`)
  restoreFocus(true)
}

function onDocPointer(e: PointerEvent): void {
  const t = e.target
  if (menuAt.value && !(t instanceof Element && t.closest('.menu, .brick'))) menuAt.value = null
  if (!selDrag.value) selection.value = new Set()
}

function onEsc(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    menuAt.value = null
    selDrag.value = false
    selection.value = new Set()
  }
}

function commitDrag(): void {
  const d = drag.value
  drag.value = null
  if (!d) return
  if (d.start === d.end) {
    write(d.pid, d.day, d.start)
    return
  }
  const [lo, hi] = d.start <= d.end ? [d.start, d.end] : [d.end, d.start]
  const entries: Record<string, { personId: PersonId }> = {}
  let skipped = 0
  for (let p = lo; p <= hi; p++) {
    if (schedule.available(d.pid, week.value, d.day, p)) schedule.collectSync(entries, week.value, d.day, p, d.pid)
    else skipped += 1
  }
  const keys = Object.keys(entries)
  if (!keys.length) {
    flash('这些节都不能排')
    return
  }
  schedule.duty.batchSet(entries)
  const weeks = [...new Set(keys.map((k) => Number(k.split('|')[0])))]
  washWeeks(weeks, personColor(d.pid))
  const here = keys.filter((k) => k.startsWith(`${week.value}|`)).length
  const dragWeeks = [...new Set(keys.map((k) => Number(k.split('|')[0])))]
  flash(`连排 ${here} 节，第 ${weeksLabel(dragWeeks)} 周${skipped ? `，跳过 ${skipped} 节` : ''}`)
}

function onWindowPointerUp(): void {
  if (drag.value) commitDrag()
  if (selDrag.value) commitSelect()
}

/** 键盘：一条一条走，格子里的条序就是从人员尺来的顺序 */
function slots(): HTMLElement[] {
  return [...(gridEl.value?.querySelectorAll<HTMLElement>('[data-slot]') ?? [])]
}

function onFocusIn(e: FocusEvent): void {
  const t = e.target
  if (t instanceof HTMLElement && t.dataset.slot) activeId.value = t.dataset.slot
}

function focusSlot(id: string | null): void {
  if (!id) return
  activeId.value = id
  nextTick(() => {
    const el = slots().find((s) => s.dataset.slot === id)
    el?.focus()
  })
}

function neighbor(from: HTMLElement, key: string): HTMLElement | null {
  const list = slots()
  if (key === 'ArrowLeft' || key === 'ArrowRight') {
    const i = list.indexOf(from)
    return list[i + (key === 'ArrowRight' ? 1 : -1)] ?? null
  }
  const cell = from.closest<HTMLElement>('[data-day]')
  const day = cell?.dataset.day
  const pid = from.dataset.pid
  const nextPeriod = Number(cell?.dataset.period) + (key === 'ArrowDown' ? 1 : -1)
  const inCell = (el: HTMLElement) => {
    const c = el.closest<HTMLElement>('[data-day]')
    return c?.dataset.day === day && Number(c?.dataset.period) === nextPeriod
  }
  return list.find((el) => inCell(el) && el.dataset.pid === pid) ?? list.find(inCell) ?? null
}

function onKeydown(e: KeyboardEvent): void {
  const t = e.target
  if (!(t instanceof HTMLElement) || !t.dataset.slot) return
  if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return
  const next = neighbor(t, e.key)
  if (!next) return
  e.preventDefault()
  focusSlot(next.dataset.slot ?? null)
}

function armFirst(): void {
  const first = slots().find((el) => el.tabIndex === 0)
  if (first) activeId.value = first.dataset.slot ?? null
}

function dayDate(day: number): string {
  return fmtMD(courseDate(config.state.semesterStart, week.value, day))
}

onMounted(() => {
  window.addEventListener('pointerup', onWindowPointerUp)
  window.addEventListener('pointerdown', onDocPointer)
  window.addEventListener('keydown', onEsc)
  nextTick(armFirst)
})
onBeforeUnmount(() => {
  window.removeEventListener('pointerup', onWindowPointerUp)
  window.removeEventListener('pointerdown', onDocPointer)
  window.removeEventListener('keydown', onEsc)
  window.clearTimeout(denialTimer)
})

watch(
  () => [week.value, config.state.ui.hideCourses, persons.value.length, config.state.ui.hiddenIds.length] as const,
  () => {
    denial.value = null
    drag.value = null
    menuAt.value = null
    selDrag.value = false
    selection.value = new Set()
    nextTick(armFirst)
  },
)
</script>

<template>
  <div
    ref="gridEl"
    class="grid"
    :class="{ solo: config.state.ui.hideCourses }"
    role="grid"
    :aria-label="`第${week}周`"
    @keydown="onKeydown"
    @focusin="onFocusIn"
  >
    <div class="corner" role="presentation" />
    <div v-for="(name, i) in DAY_NAMES" :key="name" class="day-head" role="columnheader">
      <span class="day-name">{{ name }}</span>
      <span class="day-date">{{ dayDate(i + 1) }}</span>
    </div>

    <template v-for="p in periods" :key="p">
      <div class="period" role="rowheader">{{ p }}</div>
      <DutyCell
        v-for="d in 7"
        :key="`${week}-${d}-${p}`"
        :week="week"
        :day="d"
        :period="p"
        :cell-id="`${d}-${p}`"
        :active-id="activeId"
        :preview-pid="previewPid(d, p)"
        :denial="denial && denial.day === d && denial.period === p ? denial : null"
        :menu-open="menuAt === `${d}-${p}`"
        :selected="selection.has(dutyKey(week, d, p))"
        :data-day="d"
        :data-period="p"
        @press="(pid) => onPress(pid, d, p)"
        @enter="(pid) => onEnter(pid, d, p)"
        @pick="(pid) => onPick(pid, d, p)"
        @cancel="(pid) => onCancel(pid, d, p)"
        @selstart="() => onSelPress(d, p)"
        @selenter="() => onSelEnter(d, p)"
        @swap="(pid) => onSwap(pid, d, p)"
        @menu="(open) => setMenu(d, p, open)"
      />
    </template>
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: 40px repeat(7, minmax(0, 1fr));
  grid-template-rows: 44px repeat(7, minmax(52px, 1fr));
  height: 100%;
  border-top: 1px solid var(--line);
  user-select: none;
}

.corner,
.day-head {
  border-bottom: 1px solid var(--line);
}

.day-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 0 10px;
  align-self: stretch;
  padding-top: 14px;
}

.day-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
}

.day-date {
  color: var(--muted);
  font-size: 11px;
}

.period {
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 8px 0 0 4px;
  border-bottom: 1px solid var(--line);
  color: var(--muted);
  font-size: 11px;
  font-weight: 600;
}

.grid > :deep(.cell:nth-child(8n + 2)) {
  border-left: 1px solid var(--line);
}
</style>
