<script setup lang="ts">
import { computed } from 'vue'
import { ArrowLeft, ArrowRight, RefreshLeft, RefreshRight } from '@element-plus/icons-vue'
import { useConfigStore } from '../stores/config'
import { useDutyStore } from '../stores/duty'
import { useSchedule } from '../composables/useSchedule'
import { WEEK_COUNT } from '../types'
import { weekRangeLabel } from '../lib/dates'
import { courseBase, rgba } from '../lib/palette'
import WeekGrid from '../components/WeekGrid.vue'

const config = useConfigStore()
const duty = useDutyStore()
const { timetable } = useSchedule()

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

const legend = computed(() =>
  timetable.courseNames.map((name) => ({
    name,
    color: courseBase(name, config.state.colorOverrides),
  })),
)
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
      <span class="hint">选中人名后，在格子间拖动可连排</span>

      <el-divider direction="vertical" />

      <el-checkbox v-model="config.state.ui.showA">显示 {{ config.personName('A') }}</el-checkbox>
      <el-checkbox v-model="config.state.ui.showB">显示 {{ config.personName('B') }}</el-checkbox>

      <el-divider direction="vertical" />

      <el-button size="small" :icon="RefreshLeft" :disabled="!duty.canUndo" @click="duty.undo()">撤销</el-button>
      <el-button size="small" :icon="RefreshRight" :disabled="!duty.canRedo" @click="duty.redo()">重做</el-button>
      <span class="hint">已排 {{ duty.count }} 节</span>
    </div>

    <WeekGrid />

    <div class="legend">
      <div v-for="item in legend" :key="item.name" class="legend-item">
        <span class="swatch" :style="{ background: rgba(item.color, 0.25), borderColor: item.color }" />
        <span class="lname">{{ item.name }}</span>
        <el-color-picker
          size="small"
          :model-value="config.state.colorOverrides[item.name] || item.color"
          @update:model-value="(v: string | null) => v && (config.state.colorOverrides[item.name] = v)"
        />
      </div>
    </div>
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
  background: #fff;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  padding: 10px 12px;
}

.lbl {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.hint {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  background: #fff;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  padding: 8px 12px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.swatch {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  border: 1px solid;
}

.lname {
  font-size: 12px;
  color: var(--el-text-color-regular);
}
</style>
