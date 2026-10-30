<script setup lang="ts">
import { computed } from 'vue'
import { RefreshLeft, RefreshRight } from '@element-plus/icons-vue'
import { useConfigStore } from '../stores/config'
import { useDutyStore } from '../stores/duty'
import { useSchedule } from '../composables/useSchedule'
import { WEEK_COUNT } from '../types'
import type { PersonId } from '../types'
import { courseDate, fmtMD, monthGroups, todayWeek, weekRangeLabel } from '../lib/dates'
import WeekGrid from '../components/WeekGrid.vue'

const config = useConfigStore()
const duty = useDutyStore()
const { focusWeeks, weeksWithGaps } = useSchedule()

const week = computed({
  get: () => config.state.ui.week,
  set: (v: number) => (config.state.ui.week = v),
})

const dutiesOnly = computed({
  get: () => config.state.ui.hideCourses,
  set: (v: boolean) => (config.state.ui.hideCourses = v),
})

/** 聚焦预设：各月分组 + 从本周起的 2/3/4 周；选中的区间决定同步/缺口/导出范围 */
interface FocusPreset {
  id: string
  label: string
  title: string
  weeks: number[]
}

const presets = computed<FocusPreset[]>(() => {
  const startISO = config.state.semesterStart
  const ps: FocusPreset[] = monthGroups(startISO, WEEK_COUNT).map((g) => ({
    id: `m${g.month}`,
    label: `${g.month}月`,
    title: `${fmtMD(courseDate(startISO, g.weeks[0], 1))} ~ ${fmtMD(courseDate(startISO, g.weeks[g.weeks.length - 1], 7))}`,
    weeks: [...g.weeks],
  }))
  const tw = todayWeek(startISO, WEEK_COUNT)
  for (const n of [2, 3, 4]) {
    const end = Math.min(WEEK_COUNT, tw + n - 1)
    if (tw > end) break
    const weeks = Array.from({ length: end - tw + 1 }, (_, i) => tw + i)
    ps.push({
      id: `r${n}`,
      label: `本周起${weeks.length}周`,
      title: `${fmtMD(courseDate(startISO, weeks[0], 1))} ~ ${fmtMD(courseDate(startISO, weeks[weeks.length - 1], 7))}`,
      weeks,
    })
  }
  return ps
})

/** 当前聚焦命中的预设；自定义/失配区间则无高亮 */
const activePreset = computed(() => {
  const fw = focusWeeks.value
  return presets.value.find((p) => p.weeks.length === fw.length && p.weeks.every((w, i) => w === fw[i]))?.id
})

function pickPreset(id: string | number | boolean | undefined): void {
  const p = presets.value.find((x) => x.id === String(id))
  if (!p) return
  config.state.ui.focus = { start: p.weeks[0], end: p.weeks[p.weeks.length - 1] }
  if (!p.weeks.includes(week.value)) week.value = p.weeks[0]
}

/** 本周每人已排节数 */
const weeklyCounts = computed(() => {
  const c: Record<string, number> = {}
  for (const p of config.state.persons) c[p.id] = 0
  for (const [key, entry] of Object.entries(duty.state.map)) {
    if (Number(key.split('|')[0]) === week.value) c[entry.personId] = (c[entry.personId] ?? 0) + 1
  }
  return c
})

function isVisible(pid: PersonId): boolean {
  return !config.state.ui.hiddenIds.includes(pid)
}

function toggleVisible(pid: PersonId): void {
  const hidden = config.state.ui.hiddenIds
  const i = hidden.indexOf(pid)
  if (i >= 0) hidden.splice(i, 1)
  else hidden.push(pid)
}
</script>

<template>
  <div class="week-view">
    <div class="toolbar">
      <el-radio-group :model-value="activePreset" @update:model-value="pickPreset">
        <el-radio-button v-for="p in presets" :key="p.id" :value="p.id" :title="`${p.label}：${p.title}`">{{ p.label }}</el-radio-button>
      </el-radio-group>

      <el-radio-group v-model="week">
        <el-radio-button
          v-for="w in focusWeeks"
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
  row-gap: 6px;
  flex-wrap: wrap;
  padding: 2px 2px 0;
}

@media (max-width: 900px) {
  .toolbar {
    gap: 6px;
  }

  .toolbar :deep(.el-radio-button__inner) {
    padding: 5px 8px;
    font-size: 12px;
  }

  .toolbar :deep(.el-button) {
    padding: 5px 8px;
  }
}

.person-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--el-border-color-lighter);
  background: #fff;
  border-radius: 999px;
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
  color: var(--el-text-color-regular);
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
