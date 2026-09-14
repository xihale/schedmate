<script setup lang="ts">
import { computed } from 'vue'
import { useConfigStore } from '../stores/config'
import { useSchedule } from '../composables/useSchedule'
import { DAY_NAMES, WEEK_COUNT } from '../types'
import { monthGroups, weekRangeLabel } from '../lib/dates'

const config = useConfigStore()
const schedule = useSchedule()

const rows = computed(() => schedule.overview.value)
const groups = computed(() => monthGroups(config.state.semesterStart, WEEK_COUNT))

const rowByWeek = computed(() => {
  const m = new Map<number, (typeof rows.value)[number]['days']>()
  for (const r of rows.value) m.set(r.week, r.days)
  return m
})

function monthStat(weeks: number[]): { dutyTotal: number; free: number } {
  let dutyTotal = 0
  let free = 0
  for (const w of weeks) {
    for (const d of rowByWeek.value.get(w) ?? []) {
      dutyTotal += d.dutyTotal
      free += d.free
    }
  }
  return { dutyTotal, free }
}

function daysOf(week: number) {
  return rowByWeek.value.get(week) ?? []
}

/** 点击鸟瞰格 → 下钻到周视图并高亮该天 */
function drill(week: number, day: number): void {
  config.state.ui.week = week
  config.state.ui.highlightDay = day
  config.state.ui.tab = 'week'
}

function cellTitle(d: { dutyTotal: number; free: number }): string {
  return `已排 ${d.dutyTotal} 节 · 可排 ${d.free} 节`
}
</script>

<template>
  <div class="overview">
    <div class="matrix">
      <div class="head corner-head">周次</div>
      <div v-for="d in DAY_NAMES" :key="d" class="head">{{ d }}</div>

      <template v-for="g in groups" :key="g.month">
        <div class="month-row">
          <span class="mname">{{ g.month }}月</span>
          <span class="mstat">已排 {{ monthStat(g.weeks).dutyTotal }} · 可排 {{ monthStat(g.weeks).free }}</span>
        </div>

        <template v-for="w in g.weeks" :key="w">
          <div class="row-label">
            <span class="wname">第{{ w }}周</span>
            <span class="wdate">{{ weekRangeLabel(config.state.semesterStart, w) }}</span>
          </div>
          <div
            v-for="d in daysOf(w)"
            :key="d.day"
            class="ocell"
            :class="{ 'edge-r': d.day === 7, 'edge-b': w === WEEK_COUNT }"
            :title="cellTitle(d)"
            @click="drill(d.week, d.day)"
          >
            <span
              v-for="i in d.aCount"
              :key="`a${i}`"
              class="pdot"
              :style="{ background: config.personById.A.color }"
            />
            <span
              v-for="i in d.bCount"
              :key="`b${i}`"
              class="pdot"
              :style="{ background: config.personById.B.color }"
            />
            <span v-if="d.free > 0" class="free-n">{{ d.free }}</span>
          </div>
        </template>
      </template>
    </div>
    <div class="hint">点格子下钻到对应周；圆点 = 已排（颜色对应人员），数字 = 双方空闲可排节数</div>
  </div>
</template>

<style scoped>
/* 连续矩阵：外层面板，内部发丝线，与周视图同一套扁平语言 */
.matrix {
  display: grid;
  grid-template-columns: 110px repeat(7, 1fr);
  background: #fff;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  overflow: hidden;
}

.head {
  background: #fafbfc;
  text-align: center;
  padding: 8px 0;
  font-weight: 600;
  font-size: 13px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.month-row {
  grid-column: 1 / -1;
  display: flex;
  align-items: baseline;
  gap: 10px;
  background: #f7f8fa;
  border-bottom: 1px solid var(--el-border-color-lighter);
  padding: 5px 12px;
}

.mname {
  font-weight: 700;
  font-size: 13px;
}

.mstat {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.row-label {
  background: #fafbfc;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 2px 10px;
  font-size: 12px;
  border-right: 1px solid var(--el-border-color-extra-light);
  border-bottom: 1px solid var(--el-border-color-extra-light);
}

.wname {
  font-weight: 600;
}

.wdate {
  font-size: 10px;
  color: var(--el-text-color-secondary);
}

.ocell {
  min-height: 34px;
  border-right: 1px solid var(--el-border-color-extra-light);
  border-bottom: 1px solid var(--el-border-color-extra-light);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 2px;
  padding: 2px;
  cursor: pointer;
  transition: background-color 0.12s;
}

.ocell:hover {
  background: var(--el-color-primary-light-9);
}

.ocell.edge-r {
  border-right: none;
}

.ocell.edge-b {
  border-bottom: none;
}

.pdot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.free-n {
  font-size: 10px;
  color: var(--el-text-color-secondary);
  margin-left: 2px;
}

.hint {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  padding: 8px 4px 0;
}
</style>
