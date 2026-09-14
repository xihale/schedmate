<script setup lang="ts">
import { computed } from 'vue'
import { ArrowLeft, ArrowRight, RefreshLeft, RefreshRight } from '@element-plus/icons-vue'
import { useConfigStore } from '../stores/config'
import { useDutyStore } from '../stores/duty'
import { WEEK_COUNT } from '../types'
import type { PersonId } from '../types'
import { weekRangeLabel } from '../lib/dates'
import WeekGrid from '../components/WeekGrid.vue'

const config = useConfigStore()
const duty = useDutyStore()

const week = computed({
  get: () => config.state.ui.week,
  set: (v: number) => (config.state.ui.week = v),
})

const brush = computed({
  get: () => config.state.brushPersonId,
  set: (v: string | null) => (config.state.brushPersonId = (v as never) ?? null),
})

const weekOptions = computed(() =>
  Array.from({ length: WEEK_COUNT }, (_, i) => ({
    value: i + 1,
    label: `第 ${i + 1} 周（${weekRangeLabel(config.state.semesterStart, i + 1)}）`,
  })),
)

function stepWeek(delta: number): void {
  const next = Math.min(WEEK_COUNT, Math.max(1, week.value + delta))
  week.value = next
}

/** 本周每人已排节数 */
const weeklyCounts = computed(() => {
  const c: Record<PersonId, number> = { A: 0, B: 0 }
  for (const [key, entry] of Object.entries(duty.state.map)) {
    if (Number(key.split('|')[0]) === config.state.ui.week) c[entry.personId]++
  }
  return c
})

function isVisible(pid: PersonId): boolean {
  return pid === 'A' ? config.state.ui.showA : config.state.ui.showB
}

function toggleVisible(pid: PersonId): void {
  if (pid === 'A') config.state.ui.showA = !config.state.ui.showA
  else config.state.ui.showB = !config.state.ui.showB
}
</script>

<template>
  <div class="week-view">
    <div class="toolbar">
      <el-button-group>
        <el-button :icon="ArrowLeft" @click="stepWeek(-1)" />
        <el-select v-model="week" style="width: 190px">
          <el-option v-for="o in weekOptions" :key="o.value" :value="o.value" :label="o.label" />
        </el-select>
        <el-button :icon="ArrowRight" @click="stepWeek(1)" />
      </el-button-group>

      <el-divider direction="vertical" />

      <span class="lbl">拖刷</span>
      <el-radio-group v-model="brush" size="small">
        <el-radio-button :value="null">关</el-radio-button>
        <el-radio-button v-for="p in config.state.persons" :key="p.id" :value="p.id">
          {{ p.name }}
        </el-radio-button>
      </el-radio-group>

      <el-divider direction="vertical" />

      <button
        v-for="p in config.state.persons"
        :key="p.id"
        class="person-toggle"
        :class="{ off: !isVisible(p.id) }"
        :title="`点击显示/隐藏 ${p.name} 的课程`"
        @click="toggleVisible(p.id)"
      >
        <span class="dot" :style="{ background: p.color }" />
        <span class="pname">{{ p.name }}</span>
        <span class="count">{{ weeklyCounts[p.id] }}</span>
      </button>

      <el-divider direction="vertical" />

      <el-tooltip content="撤销" placement="top">
        <el-button :icon="RefreshLeft" :disabled="!duty.canUndo" @click="duty.undo()" />
      </el-tooltip>
      <el-tooltip content="重做" placement="top">
        <el-button :icon="RefreshRight" :disabled="!duty.canRedo" @click="duty.redo()" />
      </el-tooltip>
    </div>

    <WeekGrid />
  </div>
</template>

<style scoped>
.week-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 2px 2px 0;
}

.lbl {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.person-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--el-border-color-lighter);
  background: #fff;
  border-radius: 14px;
  padding: 4px 10px;
  cursor: pointer;
  font-size: 12px;
  transition:
    opacity 0.12s,
    border-color 0.12s;
}

.person-toggle:hover {
  border-color: var(--el-color-primary-light-5);
}

.person-toggle.off {
  opacity: 0.4;
}

.person-toggle.off .pname {
  text-decoration: line-through;
}

.person-toggle .dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
}

.person-toggle .count {
  font-weight: 700;
  color: var(--el-text-color-secondary);
}
</style>
