<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useConfigStore } from '../stores/config'
import { useSchedule } from '../composables/useSchedule'
import { DAY_NAMES, PERIOD_COUNT, dutyKey } from '../types'
import type { PersonId } from '../types'
import { courseDate, fmtMD } from '../lib/dates'
import DutyCell from './DutyCell.vue'

const config = useConfigStore()
const schedule = useSchedule()
const { available } = schedule

const week = computed(() => config.state.ui.week)

/** 拖动状态：同一半格（同人同列）从起始节到当前节；起止相同即为点击 */
const drag = ref<{ pid: PersonId; day: number; start: number; end: number } | null>(null)

function onHalfPress(pid: PersonId, day: number, period: number): void {
  drag.value = { pid, day, start: period, end: period }
}

function onHalfEnter(pid: PersonId, day: number, period: number): void {
  const d = drag.value
  if (d && d.pid === pid && d.day === day) d.end = period
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
  const key = dutyKey(week.value, d.day, d.start)

  // 点击：切换该半格的排班（含聚焦区间内向后同步/取消）
  if (d.start === d.end) {
    const existing = schedule.duty.dutyMap[key]
    if (existing?.personId === d.pid) {
      schedule.removeWithSync(week.value, d.day, d.start, d.pid)
    } else if (available(d.pid, week.value, d.day, d.start)) {
      schedule.assignWithSync(week.value, d.day, d.start, d.pid)
    }
    // 有课或已被另一人占用：颜色已说明，静默忽略
    return
  }

  // 拖动：整段连排并同步，遇不可排的节跳过
  const [lo, hi] = d.start <= d.end ? [d.start, d.end] : [d.end, d.start]
  const entries: Record<string, { personId: PersonId }> = {}
  for (let p = lo; p <= hi; p++) {
    if (available(d.pid, week.value, d.day, p)) schedule.collectSync(entries, week.value, d.day, p, d.pid)
  }
  if (Object.keys(entries).length) schedule.duty.batchSet(entries)
}

function onWindowPointerUp(): void {
  if (drag.value) commitDrag()
}

onMounted(() => window.addEventListener('pointerup', onWindowPointerUp))
onBeforeUnmount(() => window.removeEventListener('pointerup', onWindowPointerUp))

function dayDate(day: number): string {
  return fmtMD(courseDate(config.state.semesterStart, week.value, day))
}

const periodLabels = Array.from({ length: PERIOD_COUNT }, (_, i) => i + 1)
</script>

<template>
  <div class="grid-scroll">
    <div class="week-grid" :class="{ dragging: !!drag, solo: config.state.ui.hideCourses }">
      <div class="corner" />
      <div v-for="(dname, i) in DAY_NAMES" :key="dname" class="day-head" :class="{ 'day-sep': i > 0 }">
        <span class="dname">{{ dname }}</span>
        <span class="ddate">{{ dayDate(i + 1) }}</span>
      </div>

      <template v-for="p in periodLabels" :key="p">
        <div class="period-label">{{ p }}</div>
        <DutyCell
          v-for="d in 7"
          :key="`${p}-${d}`"
          :week="week"
          :day="d"
          :period="p"
          :preview="isPreview(d, p)"
          :preview-pid="drag?.pid ?? null"
          :class="{ 'edge-b': p === PERIOD_COUNT, 'day-sep': d > 1 }"
          @press="(pid) => onHalfPress(pid, d, p)"
          @enter="(pid) => onHalfEnter(pid, d, p)"
        />
      </template>
    </div>
  </div>
</template>

<style scoped>
/* 窗口太窄时横向滚动，而不是把格子压坏 */
.grid-scroll {
  overflow-x: auto;
  border-radius: 12px;
}

/* 连续无框课表：外层一个圆角面板，内部仅发丝线分隔，不断开 */
.week-grid {
  display: grid;
  grid-template-columns: 44px repeat(7, minmax(80px, 1fr));
  min-width: 604px;
  background: #fff;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  overflow: hidden;
  user-select: none;
}

/* 只看排班：每天一列，窄屏也放得下 */
.week-grid.solo {
  grid-template-columns: 44px repeat(7, minmax(48px, 1fr));
  min-width: 380px;
}

.week-grid.dragging {
  cursor: crosshair;
}

.corner,
.day-head,
.period-label {
  background: #fafbfc;
}

.day-head {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 6px;
  padding: 8px 4px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.day-head.day-sep {
  border-left: 1px solid var(--el-border-color-dark);
}

.dname {
  font-weight: 600;
  font-size: 13px;
}

.ddate {
  font-size: 11px;
  color: var(--el-text-color-regular);
}

.period-label {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: var(--el-text-color-regular);
  border-right: 1px solid var(--el-border-color-dark);
}

@media (max-width: 900px) {
  .dname {
    font-size: 12px;
  }

  .ddate {
    display: none;
  }

  .day-head {
    gap: 0;
  }
}
</style>
