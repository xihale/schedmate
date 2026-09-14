<script setup lang="ts">
import { computed } from 'vue'
import { useConfigStore } from '../stores/config'
import { useSchedule } from '../composables/useSchedule'
import { DAY_NAMES, PERIOD_COUNT } from '../types'
import { weekRangeLabel } from '../lib/dates'
import { rgba } from '../lib/palette'

const config = useConfigStore()
const schedule = useSchedule()

const rows = computed(() => schedule.overview.value)

/** 点击鸟瞰格 → 下钻到周视图并高亮该天 */
function drill(week: number, day: number): void {
  config.state.ui.week = week
  config.state.ui.highlightDay = day
  config.state.ui.tab = 'week'
}

function cellFill(dutyTotal: number): string {
  const ratio = Math.min(1, dutyTotal / PERIOD_COUNT)
  if (ratio === 0) return 'transparent'
  return rgba('#4C84F0', 0.08 + ratio * 0.22)
}
</script>

<template>
  <div class="overview">
    <div class="matrix-wrap">
      <div class="matrix">
        <div class="head row-label">
          <span>周次</span>
        </div>
        <div v-for="d in DAY_NAMES" :key="d" class="head">{{ d }}</div>

        <template v-for="row in rows" :key="row.week">
          <div class="row-label">
            <span class="wname">第{{ row.week }}周</span>
            <span class="wdate">{{ weekRangeLabel(config.state.semesterStart, row.week) }}</span>
          </div>
          <div
            v-for="d in row.days"
            :key="d.day"
            class="ocell"
            :class="{ 'edge-r': d.day === 7, 'edge-b': row.week === 20 }"
            :style="{ background: cellFill(d.dutyTotal) }"
            title="点击下钻到该周该天"
            @click="drill(d.week, d.day)"
          >
            <template v-if="d.dutyTotal > 0">
              <span v-if="d.aCount > 0" class="badge" :style="{ background: config.personById.A.color }">
                {{ d.aCount }}
              </span>
              <span v-if="d.bCount > 0" class="badge" :style="{ background: config.personById.B.color }">
                {{ d.bCount }}
              </span>
            </template>
            <span class="free" :class="{ dim: d.free === 0 }">{{ d.free > 0 ? `可排${d.free}` : '满' }}</span>
          </div>
        </template>
      </div>
    </div>

    <div class="stats">
      <div class="stat">
        <span class="dot" :style="{ background: config.personById.A.color }" />
        {{ config.personName('A') }} 已排 <b>{{ schedule.totals.value.a }}</b> 节
      </div>
      <div class="stat">
        <span class="dot" :style="{ background: config.personById.B.color }" />
        {{ config.personName('B') }} 已排 <b>{{ schedule.totals.value.b }}</b> 节
      </div>
      <div class="stat">合计已排 <b>{{ schedule.totals.value.dutyTotal }}</b> 节</div>
      <div class="stat">剩余可排 <b>{{ schedule.totals.value.free }}</b> 节</div>
      <span class="hint">格子内：色块数字 = 已排节数（颜色对应人员），“可排N” = 双方空闲且未排的节数</span>
    </div>
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
  gap: 4px;
  cursor: pointer;
  transition: background-color 0.12s;
}

.ocell:hover {
  background: var(--el-color-primary-light-9) !important;
}

.ocell.edge-r {
  border-right: none;
}

.ocell.edge-b {
  border-bottom: none;
}

.badge {
  color: #fff;
  font-size: 11px;
  line-height: 1;
  padding: 3px 5px;
  border-radius: 4px;
}

.free {
  font-size: 10px;
  color: var(--el-text-color-secondary);
}

.free.dim {
  color: var(--el-text-color-placeholder);
}

.stats {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
  padding: 10px 4px;
  font-size: 13px;
}

.stat b {
  color: var(--el-color-primary);
}

.dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 4px;
}

.hint {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}
</style>
