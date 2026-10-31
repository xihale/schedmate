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
  selstart: []
  selenter: []
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

/** 已排格按下起手：左键才进多选，右键留给换人菜单 */
function onBrickDown(e: PointerEvent): void {
  if (e.button !== 0) return
  emit('selstart')
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
    <!-- 已排：按住拖过多格一起取消，松手生效；右键/Shift+回车换人 -->
    <button
      v-if="dutyPerson"
      class="brick"
      :class="{ selected: props.selected }"
      :data-slot="slotId(dutyPerson.id)"
      :data-pid="dutyPerson.id"
      :tabindex="activeId === slotId(dutyPerson.id) ? 0 : -1"
      :style="{ background: dutyFill(dutyPerson.color) }"
      :aria-label="`${where}，${dutyPerson.name}值班${info.conflict ? '，冲突' : ''}${props.selected ? '，松开取消' : ''}，回车取消，Shift+回车换人`"
      aria-haspopup="menu"
      :aria-expanded="menuOpen"
      :title="props.selected ? '松开即取消' : '按住拖动多选 · 松手取消 · 右键换人'"
      @pointerdown="onBrickDown"
      @pointerenter="emit('selenter')"
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
  background: #ffffff;
  border-right: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}

.col {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  padding: 2px;
  border: 0;
  background: transparent;
  cursor: pointer;
  touch-action: none;
}

.col:hover:not(.busy),
.col:focus-visible:not(.busy) {
  background: var(--c-soft);
}

.col-name {
  display: none;
  font-size: 11px;
  font-weight: 600;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
}

.col:hover:not(.busy) .col-name,
.col:focus-visible .col-name {
  display: block;
}

.col:focus-visible {
  outline: 1px solid var(--ink);
  outline-offset: -1px;
}

/* 有课：斜纹底，一眼与空闲区分，不可排 */
.col.busy {
  cursor: not-allowed;
  background: repeating-linear-gradient(
    45deg,
    transparent 0 4px,
    rgba(17, 17, 17, 0.09) 4px 6px
  );
}

.col.preview {
  cursor: pointer;
}

.col.preview .col-name {
  display: block;
  color: #fff;
}

.col.denied {
  box-shadow: inset 0 0 0 2px var(--red);
}

.brick {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  min-width: 0;
  margin: 2px;
  padding: 6px 8px;
  border: 0;
  color: #fff;
  text-align: left;
  cursor: pointer;
}

.brick:hover {
  filter: brightness(0.92);
}

.brick:focus-visible {
  outline: 2px solid #ffffff;
  outline-offset: -3px;
}

/* 待取消：白色内环标出 */
.brick.selected {
  box-shadow: inset 0 0 0 2px #ffffff;
}

/* 悬停/聚焦时亮出 ×：这一下是取消 */
.brick::after {
  content: '×';
  position: absolute;
  top: 3px;
  right: 7px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1;
  color: #ffffff;
  opacity: 0;
}

.brick:hover::after,
.brick:focus-visible::after {
  opacity: 0.9;
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
  font-size: 10px;
  font-weight: 600;
  padding: 1px 5px;
  background: var(--red);
  color: #fff;
  letter-spacing: 0.02em;
}

.conflict .brick {
  box-shadow: inset 0 0 0 2px var(--red);
}

.brick.selected.conflict {
  box-shadow: inset 0 0 0 2px #ffffff, inset 0 0 0 4px var(--red);
}

.gap {
  box-shadow: inset 0 0 0 1.5px var(--red);
}

.gap-tag {
  position: absolute;
  top: 4px;
  left: 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--red);
  background: rgba(227, 6, 19, 0.08);
  padding: 1px 5px;
  pointer-events: none;
}

.deny {
  position: absolute;
  left: 4px;
  right: 4px;
  bottom: 4px;
  z-index: 3;
  padding: 3px 6px;
  background: var(--red);
  color: #fff;
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
  animation: denyPop 0.15s ease-out;
}

@keyframes denyPop {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

.menu {
  position: absolute;
  top: calc(100% - 2px);
  left: 4px;
  z-index: 20;
  min-width: 136px;
  padding: 4px;
  background: #ffffff;
  border: 1px solid var(--ink);
  animation: menuFadeIn 0.12s ease-out;
}

@keyframes menuFadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

.item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 30px;
  padding: 0 10px;
  border: 0;
  background: none;
  text-align: left;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 500;
  color: var(--ink);
  cursor: pointer;
}

.item:hover,
.item:focus-visible {
  background: var(--tint);
  outline: none;
}

.empty {
  display: block;
  padding: 6px 10px;
  font-size: 12px;
  color: var(--muted);
}

.sw {
  width: 8px;
  height: 8px;
  flex: none;
}
</style>
