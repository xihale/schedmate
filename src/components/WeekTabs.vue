<script setup lang="ts">
import { computed } from 'vue'
import { useConfigStore } from '../stores/config'
import { useDutyStore } from '../stores/duty'
import { useSchedule } from '../composables/useSchedule'
import { fmtMD, courseDate } from '../lib/dates'
import { wash } from '../lib/wash'
import { flash } from '../lib/status'

const config = useConfigStore()
const duty = useDutyStore()
const { focusWeeks, weeksWithGaps, gapMap } = useSchedule()

const week = computed({
  get: () => config.state.ui.week,
  set: (v: number) => (config.state.ui.week = v),
})

/** 每周已排节数，页签上只用来判断这周是否已经动过 */
const counts = computed(() => {
  const c: Record<number, number> = {}
  for (const key of Object.keys(duty.state.map)) {
    const w = Number(key.split('|')[0])
    c[w] = (c[w] ?? 0) + 1
  }
  return c
})

function tabStyle(w: number): Record<string, string> {
  const color = wash.weeks[w]
  if (!color) return {}
  return { '--wash': color }
}

/** 点带缺角的周：一行字说出缺口在哪，不弹面板 */
function onTab(w: number): void {
  week.value = w
  if (!weeksWithGaps.value.has(w)) return
  const DAY_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  const items = [...gapMap.value.entries()]
    .filter(([k]) => Number(k.split('|')[0]) === w)
    .map(([k, pid]) => {
      const [, d, p] = k.split('|').map(Number)
      return `${DAY_NAMES[d - 1]}${p}节 ${config.personName(pid)}`
    })
  flash(`第 ${w} 周缺人：${items.join('、')}`)
}
</script>

<template>
  <div class="tabs" role="tablist" aria-label="周">
    <button
      v-for="w in focusWeeks"
      :key="w"
      class="tab"
      role="tab"
      :aria-selected="w === week"
      :class="{ current: w === week, washed: !!wash.weeks[w] }"
      :style="tabStyle(w)"
      @click="onTab(w)"
    >
      <span class="num">第 {{ w }} 周</span>
      <span class="date">{{ fmtMD(courseDate(config.state.semesterStart, w, 1)) }}</span>
      <span class="marks">
        <i v-if="weeksWithGaps.has(w)" class="gap" aria-label="缺人" />
        <i v-else-if="counts[w]" class="done" aria-label="已排" />
      </span>
    </button>
  </div>
</template>

<style scoped>
.tabs {
  display: flex;
  height: 64px;
  overflow-x: auto;
  flex: none;
}

.tab {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  gap: 2px;
  min-width: 76px;
  padding: 0 14px 0 0;
  border: 0;
  background: none;
  color: var(--muted);
  cursor: pointer;
  text-align: left;
  transition: color 0.15s;
}

.tab::before {
  content: '';
  position: absolute;
  left: 0;
  right: 14px;
  bottom: 0;
  height: 3px;
  background: transparent;
  transition: background-color 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.tab:hover {
  color: var(--ink);
}

.tab.current {
  color: var(--ink);
}

.tab.current::before {
  background: var(--ink);
}

.tab.washed::before {
  background: var(--wash);
}

.num {
  font-weight: 600;
  white-space: nowrap;
}

.date {
  font-size: 12px;
}

.marks {
  position: absolute;
  top: 14px;
  right: 6px;
  display: flex;
}

.marks i {
  display: block;
  width: 6px;
  height: 6px;
}

.gap {
  background: var(--red);
}

.done {
  background: var(--ink);
  opacity: 0.25;
}
</style>
