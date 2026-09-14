<script setup lang="ts">
import { computed } from 'vue'
import { RefreshLeft, RefreshRight } from '@element-plus/icons-vue'
import { useConfigStore } from '../stores/config'
import { useDutyStore } from '../stores/duty'
import { useSchedule } from '../composables/useSchedule'
import { WEEK_COUNT } from '../types'
import type { PersonId } from '../types'
import { monthGroups, weekRangeLabel } from '../lib/dates'
import WeekGrid from '../components/WeekGrid.vue'

const config = useConfigStore()
const duty = useDutyStore()
const { weeksWithGaps } = useSchedule()

const week = computed({
  get: () => config.state.ui.week,
  set: (v: number) => (config.state.ui.week = v),
})

const dutiesOnly = computed({
  get: () => config.state.ui.hideCourses,
  set: (v: boolean) => (config.state.ui.hideCourses = v),
})

/** 月分组与当前月；切月默认落到该月第一周 */
const groups = computed(() => monthGroups(config.state.semesterStart, WEEK_COUNT))
const currentGroup = computed(() => groups.value.find((g) => g.weeks.includes(week.value)) ?? groups.value[0])
const monthWeeks = computed(() => currentGroup.value?.weeks ?? [])

function pickMonth(month: string | number | boolean | undefined): void {
  const g = groups.value.find((x) => x.month === Number(month))
  if (g && !g.weeks.includes(week.value)) week.value = g.weeks[0]
}

/** 本周每人已排节数 */
const weeklyCounts = computed(() => {
  const c: Record<PersonId, number> = { A: 0, B: 0 }
  for (const [key, entry] of Object.entries(duty.state.map)) {
    if (Number(key.split('|')[0]) === week.value) c[entry.personId]++
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
      <el-radio-group :model-value="currentGroup?.month" @update:model-value="pickMonth">
        <el-radio-button v-for="g in groups" :key="g.month" :value="g.month">{{ g.month }}月</el-radio-button>
      </el-radio-group>

      <el-radio-group v-model="week">
        <el-radio-button
          v-for="w in monthWeeks"
          :key="w"
          :value="w"
          :title="weeksWithGaps.has(w) ? `第${w}周有与课程冲突的排班，需手动调整` : weekRangeLabel(config.state.semesterStart, w)"
        >
          第{{ w }}周
          <span v-if="weeksWithGaps.has(w)" class="gap-dot" />
        </el-radio-button>
      </el-radio-group>

      <el-divider direction="vertical" />

      <el-button size="small" :type="dutiesOnly ? 'primary' : 'default'" :plain="!dutiesOnly" round @click="dutiesOnly = !dutiesOnly">
        只看排班
      </el-button>

      <el-divider direction="vertical" />

      <button
        v-for="p in config.state.persons"
        :key="p.id"
        class="person-toggle"
        :class="{ off: !isVisible(p.id) }"
        :title="`点击显示/隐藏 ${p.name}`"
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

/* 周按钮上的缺口提示：该周有排班与课程冲突，待手动调整 */
.gap-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--el-color-danger);
  margin-left: 4px;
  vertical-align: middle;
}
</style>
