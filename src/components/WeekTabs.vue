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
  align-items: center;
  gap: 4px;
  height: 52px;
  overflow-x: auto;
  flex: none;
  padding: 6px 0;
}

.tab {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  gap: 1px;
  min-width: 68px;
  padding: 5px 12px;
  border: 0;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  text-align: left;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.tab:hover {
  background: var(--tint);
  color: var(--ink);
}

.tab:active {
  transform: none;
}

.tab.current {
  color: #ffffff;
  background: var(--ink);
}

.tab.current .num {
  font-weight: 600;
  color: #ffffff;
}

.tab.current .date {
  color: rgba(255, 255, 255, 0.55);
}

/* 写入后的短暂浸色：底部一条颜色，不描边 */
.tab.washed {
  box-shadow: inset 0 -2px 0 var(--wash);
}

.num {
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
}

.date {
  font-size: 11px;
  color: var(--muted);
}

.marks {
  position: absolute;
  top: 7px;
  right: 7px;
  display: flex;
  align-items: center;
  gap: 3px;
}

.marks i {
  display: block;
  width: 5px;
  height: 5px;
}

.gap {
  background: var(--red);
}

.done {
  background: currentColor;
  opacity: 0.3;
}
</style>
