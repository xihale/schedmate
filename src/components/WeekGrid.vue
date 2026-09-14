<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useConfigStore } from '../stores/config'
import { useSchedule } from '../composables/useSchedule'
import { DAY_NAMES, PERIOD_COUNT, dutyKey } from '../types'
import type { PersonId } from '../types'
import { courseDate, fmtMD } from '../lib/dates'
import DutyCell from './DutyCell.vue'
import DutyPopover from './DutyPopover.vue'

const config = useConfigStore()
const schedule = useSchedule()
const { available } = schedule

const week = computed(() => config.state.ui.week)

const popover = reactive({ visible: false, week: 1, day: 1, period: 1, x: 0, y: 0 })

/** 拖刷状态：同一天从起始节到当前节 */
const drag = ref<{ day: number; start: number; end: number } | null>(null)

function onCellPress(day: number, period: number, e: MouseEvent): void {
  const brushPid = config.state.brushPersonId
  if (brushPid) {
    drag.value = { day, start: period, end: period }
  } else {
    popover.week = week.value
    popover.day = day
    popover.period = period
    popover.x = e.clientX
    popover.y = e.clientY
    popover.visible = true
  }
}

function onCellEnter(day: number, period: number): void {
  if (drag.value && drag.value.day === day) drag.value.end = period
}

function isPreview(day: number, period: number): boolean {
  const d = drag.value
  if (!d || d.day !== day) return false
  const [lo, hi] = d.start <= d.end ? [d.start, d.end] : [d.end, d.start]
  return period >= lo && period <= hi
}

function commitDrag(): void {
  const d = drag.value
  drag.value = null
  if (!d) return
  const brushPid = config.state.brushPersonId
  if (!brushPid) return
  const [lo, hi] = d.start <= d.end ? [d.start, d.end] : [d.end, d.start]
  const entries: Record<string, { personId: PersonId }> = {}
  let skipped = 0
  for (let p = lo; p <= hi; p++) {
    if (available(brushPid, week.value, d.day, p)) {
      entries[dutyKey(week.value, d.day, p)] = { personId: brushPid }
    } else {
      skipped++
    }
  }
  const written = Object.keys(entries).length
  if (written > 0) schedule.duty.batchSet(entries)
  if (written > 1) {
    ElMessage.success(`已连排 ${written} 节${skipped > 0 ? `，跳过 ${skipped} 节（无课冲突或已排）` : ''}`)
  } else if (skipped > 0) {
    ElMessage.warning(`该格不可排：所选拖刷人此节有课，或已被排过`)
  }
}

function onWindowPointerUp(): void {
  if (drag.value) commitDrag()
}

onMounted(() => window.addEventListener('pointerup', onWindowPointerUp))
onBeforeUnmount(() => window.removeEventListener('pointerup', onWindowPointerUp))

function dayDate(day: number): string {
  return fmtMD(courseDate(config.state.semesterStart, week.value, day))
}

function toggleHighlight(day: number): void {
  config.state.ui.highlightDay = config.state.ui.highlightDay === day ? null : day
}

const highlightDay = computed(() => config.state.ui.highlightDay)
const showA = computed(() => config.state.ui.showA)
const showB = computed(() => config.state.ui.showB)

const visibleHalfCount = computed(() => (showA.value ? 1 : 0) + (showB.value ? 1 : 0))

const periodLabels = Array.from({ length: PERIOD_COUNT }, (_, i) => i + 1)
</script>

<template>
  <div class="week-grid" :class="{ dragging: !!drag }">
    <div class="corner cell-base" />
    <div
      v-for="(dname, i) in DAY_NAMES"
      :key="dname"
      class="day-head cell-base"
      :class="{ 'is-highlight': highlightDay === i + 1 }"
      @click="toggleHighlight(i + 1)"
    >
      <span class="dname">{{ dname }}</span>
      <span class="ddate">{{ dayDate(i + 1) }}</span>
    </div>

    <template v-for="p in periodLabels" :key="p">
      <div class="period-label cell-base">
        第<br />
        {{ p }}
        <br />节
      </div>
      <DutyCell
        v-for="d in 7"
        :key="`${p}-${d}`"
        :week="week"
        :day="d"
        :period="p"
        :preview="isPreview(d, p)"
        :highlight="highlightDay === d"
        :half-count="visibleHalfCount"
        @press="(e: MouseEvent) => onCellPress(d, p, e)"
        @enter="onCellEnter(d, p)"
      />
    </template>

    <DutyPopover
      v-model:visible="popover.visible"
      :week="popover.week"
      :day="popover.day"
      :period="popover.period"
      :x="popover.x"
      :y="popover.y"
    />
  </div>
</template>

<style scoped>
.week-grid {
  display: grid;
  grid-template-columns: 52px repeat(7, minmax(104px, 1fr));
  gap: 3px;
  user-select: none;
}

.week-grid.dragging {
  cursor: crosshair;
}

.cell-base {
  background: #fff;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
}

.day-head {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 6px;
  padding: 6px 4px;
  cursor: pointer;
  transition: border-color 0.15s;
}

.day-head.is-highlight {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 1px var(--el-color-primary) inset;
}

.dname {
  font-weight: 600;
  font-size: 13px;
}

.ddate {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.period-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: var(--el-text-color-secondary);
  line-height: 1.3;
}
</style>
