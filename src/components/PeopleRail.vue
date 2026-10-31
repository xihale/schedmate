<script setup lang="ts">
import { computed } from 'vue'
import { useConfigStore } from '../stores/config'
import { useDutyStore } from '../stores/duty'
import { useSchedule } from '../composables/useSchedule'
import { WEEK_COUNT } from '../types'
import type { PersonId } from '../types'
import { focusLabel } from '../lib/dates'

const config = useConfigStore()
const duty = useDutyStore()
const { focusWeeks } = useSchedule()

const persons = computed(() => config.state.persons)

/** 聚焦区间（默认整月）内每人的已排节数 */
const counts = computed(() => {
  const c: Record<PersonId, number> = {}
  for (const p of persons.value) c[p.id] = 0
  const weeks = new Set(focusWeeks.value)
  for (const [key, entry] of Object.entries(duty.state.map)) {
    if (!weeks.has(Number(key.split('|')[0]))) continue
    c[entry.personId] = (c[entry.personId] ?? 0) + 1
  }
  return c
})

/** 列头与「范围」下拉同源：整月叫「N月」，其他区间叫「第X-Y周」 */
const rangeLabel = computed(() =>
  focusLabel(config.state.semesterStart, focusWeeks.value[0], focusWeeks.value[focusWeeks.value.length - 1], WEEK_COUNT),
)

function isVisible(pid: PersonId): boolean {
  return !config.state.ui.hiddenIds.includes(pid)
}

function toggle(pid: PersonId): void {
  const hidden = config.state.ui.hiddenIds
  const i = hidden.indexOf(pid)
  if (i >= 0) hidden.splice(i, 1)
  else hidden.push(pid)
}
</script>

<template>
  <aside class="rail" aria-label="人员">
    <div class="head"><span>人员</span><span>{{ rangeLabel }}</span></div>
    <button
      v-for="p in persons"
      :key="p.id"
      class="person"
      :class="{ off: !isVisible(p.id) }"
      :aria-pressed="isVisible(p.id)"
      :title="isVisible(p.id) ? '隐藏' : '显示'"
      @click="toggle(p.id)"
    >
      <i class="sw" :style="{ background: p.color }" aria-hidden="true" />
      <span class="name">{{ p.name }}</span>
      <span class="count">{{ counts[p.id] }}</span>
    </button>
  </aside>
</template>

<style scoped>
.rail {
  width: var(--rail-w);
  flex: none;
  padding: 0 var(--pad);
  padding-top: 104px;
}

.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 8px 8px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 500;
}

.person {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  height: 34px;
  padding: 0 8px;
  margin-bottom: 2px;
  border: 0;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.15s ease, opacity 0.15s ease;
}

.person:hover {
  background-color: var(--tint);
}

.sw {
  width: 10px;
  height: 10px;
  flex: none;
  transition: transform 0.15s ease;
}

.person:hover .sw {
  transform: scale(1.15);
}

.name {
  flex: 1;
  min-width: 0;
  font-weight: 500;
  font-size: 13px;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.15s ease;
}

.count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 18px;
  padding: 0 6px;
  background: rgba(0, 0, 0, 0.04);
  color: var(--muted);
  font-size: 11px;
  font-weight: 500;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.person:hover .count {
  background: rgba(0, 0, 0, 0.08);
  color: var(--ink);
}

.person.off {
  opacity: 0.4;
}

.person.off:hover {
  opacity: 0.7;
}

.person.off .sw {
  background: transparent !important;
  box-shadow: inset 0 0 0 1px var(--faint);
  transform: none;
}

.person.off .count {
  background: transparent;
}
</style>
