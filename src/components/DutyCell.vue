<script setup lang="ts">
import { computed } from 'vue'
import { useConfigStore } from '../stores/config'
import { useSchedule } from '../composables/useSchedule'
import { dutyFill, rgba } from '../lib/palette'
import { DAY_NAMES } from '../types'
import type { Person, PersonId } from '../types'

const props = defineProps<{
  week: number
  day: number
  period: number
  previewPid?: PersonId | null
  denial?: { pid: PersonId; text: string } | null
  activeId: string | null
  cellId: string
  menuOpen: boolean
  selected?: boolean
}>()

const emit = defineEmits<{
  press: [pid: PersonId]
  enter: [pid: PersonId]
  pick: [pid: PersonId]
  cancel: [pid: PersonId]
  select: [pid: PersonId]
  swap: [pid: PersonId]
  menu: [open: boolean]
}>()

const config = useConfigStore()
const { cell } = useSchedule()

const info = computed(() => cell(props.week, props.day, props.period))
const solo = computed(() => config.state.ui.hideCourses)

const visible = computed(() => config.state.persons.filter((p) => !config.state.ui.hiddenIds.includes(p.id)))
const halfOf = (pid: PersonId) => info.value.halves[config.state.persons.findIndex((x) => x.id === pid)]

const dutyPerson = computed<Person | null>(() => {
  const d = info.value.duty
  return d ? (config.personById[d.personId] ?? null) : null
})
const swappable = computed(() => visible.value.filter((p) => p.id !== dutyPerson.value?.id && halfOf(p.id)?.status !== 'course'))

const where = computed(() => `${DAY_NAMES[props.day - 1]}第${props.period}节`)
const slotId = (pid: PersonId) => `${props.cellId}-${pid}`

/** 已排格的一次点击：普通 = 取消，Ctrl/Cmd = 多选待取消 */
function onBrickClick(e: MouseEvent): void {
  if (!dutyPerson.value) return
  if (e.ctrlKey || e.metaKey) emit('select', dutyPerson.value.id)
  else emit('cancel', dutyPerson.value.id)
}

function colTitle(p: Person): string {
  const h = halfOf(p.id)
  if (h?.status === 'course') return `${p.name}：${h.course.name}${h.course.location ? ' · ' + h.course.location : ''}`
  return `${p.name}：空闲`
}

function colAria(p: Person): string {
  const h = halfOf(p.id)
  if (h?.status === 'course') return `${where.value}，${p.name}有课：${h.course.name}`
  return `${where.value}，排${p.name}`
}

function colStyle(p: Person): Record<string, string> {
  if (props.previewPid === p.id) return { background: dutyFill(p.color) }
  return { '--c': p.color, '--c-soft': rgba(p.color, 0.12) }
}
</script>

<template>
  <div
    class="cell"
    role="gridcell"
    :aria-label="where"
    :class="{ conflict: info.conflict, gap: !!info.gapFrom && !dutyPerson, filled: !!dutyPerson }"
  >
    <!-- 已排：点一下取消，Ctrl/Cmd 多选，右键/Shift+回车换人 -->
    <button
      v-if="dutyPerson"
      class="brick"
      :class="{ selected: props.selected }"
      :data-slot="slotId(dutyPerson.id)"
      :data-pid="dutyPerson.id"
      :tabindex="activeId === slotId(dutyPerson.id) ? 0 : -1"
      :style="{ background: dutyFill(dutyPerson.color) }"
      :aria-label="`${where}，${dutyPerson.name}值班${info.conflict ? '，冲突' : ''}${props.selected ? '，已选中' : ''}，回车取消，Shift+回车换人`"
      aria-haspopup="menu"
      :aria-expanded="menuOpen"
      :title="props.selected ? '已加入待取消' : '点击取消 · Ctrl+点击多选 · 右键换人'"
      @click="onBrickClick"
      @contextmenu.prevent="dutyPerson && emit('menu', true)"
      @keydown.enter.exact.prevent="dutyPerson && emit('cancel', dutyPerson.id)"
      @keydown.shift.enter.prevent="emit('menu', true)"
      @keydown.space.prevent="emit('menu', !menuOpen)"
    >
      <span class="name">{{ dutyPerson.name }}</span>
      <span v-if="info.conflict" class="flag">冲突</span>
    </button>

    <!-- 未排：每人一列，有课斜纹 -->
    <template v-else-if="!solo">
      <button
        v-for="p in visible"
        :key="p.id"
        class="col"
        :class="{
          busy: halfOf(p.id)?.status === 'course',
          preview: previewPid === p.id,
          denied: denial?.pid === p.id,
        }"
        :data-slot="slotId(p.id)"
        :data-pid="p.id"
        :tabindex="activeId === slotId(p.id) ? 0 : -1"
        :style="colStyle(p)"
        :title="colTitle(p)"
        :aria-label="colAria(p)"
        @pointerdown.prevent="emit('press', p.id)"
        @pointerenter="emit('enter', p.id)"
        @keydown.enter.space.prevent="emit('pick', p.id)"
      >
        <span class="col-name">{{ p.name }}</span>
      </button>
    </template>

    <span v-if="info.gapFrom && !dutyPerson" class="gap-tag">缺 {{ config.personName(info.gapFrom) }}</span>
    <span v-if="denial" class="deny" role="alert">{{ denial.text }}</span>

    <div v-if="menuOpen && dutyPerson" class="menu" role="menu" @pointerdown.stop>
      <button
        v-for="p in swappable"
        :key="p.id"
        role="menuitem"
        class="item"
        @click="emit('swap', p.id)"
      >
        <i class="sw" :style="{ background: p.color }" />换成 {{ p.name }}
      </button>
      <span v-if="!swappable.length" class="empty">没有可换的人</span>
    </div>
  </div>
</template>

<style scoped>
.cell {
  position: relative;
  display: flex;
  min-width: 0;
  min-height: 0;
  border-right: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}

.col {
  position: relative;
  flex: 1;
  min-width: 0;
  padding: 0;
  border: 0;
  background: #fff;
  cursor: pointer;
  touch-action: none;
}

/* 空闲：底部一条人的颜色 */
.col::after {
  content: '';
  position: absolute;
  left: 3px;
  right: 3px;
  bottom: 4px;
  height: 2px;
  background: var(--c);
}

.col + .col {
  border-left: 1px dotted var(--line);
}

.col-name {
  display: none;
  font-size: 12px;
  font-weight: 600;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
}

.col:hover:not(.busy),
.col:focus-visible:not(.busy) {
  background: var(--c-soft);
}

.col:hover:not(.busy) .col-name,
.col:focus-visible .col-name {
  display: block;
}

.col:focus-visible {
  outline-offset: -2px;
}

/* 有课：灰底，不可排 */
.col.busy {
  background: var(--tint);
  cursor: not-allowed;
}

.col.busy::after {
  display: none;
}

.col.preview {
  cursor: pointer;
}

.col.preview::after {
  display: none;
}

.col.preview .col-name {
  display: block;
  color: #fff;
}

.col.denied {
  box-shadow: inset 0 0 0 2px var(--red);
}

.brick {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  min-width: 0;
  padding: 6px 8px;
  border: 0;
  color: #fff;
  text-align: left;
  cursor: pointer;
}

.brick:focus-visible {
  outline-offset: -3px;
  outline-color: #fff;
}

.name {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.flag {
  font-size: 11px;
  font-weight: 700;
  padding: 0 4px;
  background: var(--red);
  color: #fff;
}

.conflict .brick {
  box-shadow: inset 0 0 0 2px var(--red);
}

.gap {
  box-shadow: inset 0 0 0 1px var(--red);
}

.gap-tag {
  position: absolute;
  top: 4px;
  left: 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--red);
  pointer-events: none;
}

.deny {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 3;
  padding: 2px 6px;
  background: var(--red);
  color: #fff;
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
}

.menu {
  position: absolute;
  top: calc(100% - 4px);
  left: 4px;
  z-index: 20;
  min-width: 132px;
  padding: 4px 0;
  background: #fff;
  border: 1px solid var(--ink);
}

.item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 30px;
  padding: 0 12px;
  border: 0;
  background: none;
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
}

.item:hover,
.item:focus-visible {
  background: var(--tint);
  outline: none;
}

.sw {
  width: 10px;
  height: 10px;
  flex: none;
}

.remove {
  margin-top: 4px;
  border-top: 1px solid var(--line);
  color: var(--red);
}
</style>
