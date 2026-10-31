<script setup lang="ts">
import { computed } from 'vue'
import { useConfigStore } from '../stores/config'
import { useDutyStore } from '../stores/duty'
import type { PersonId } from '../types'

const config = useConfigStore()
const duty = useDutyStore()

const persons = computed(() => config.state.persons)

/** 本周每人的已排节数：判断要不要换人的依据，留着 */
const counts = computed(() => {
  const c: Record<PersonId, number> = {}
  for (const p of persons.value) c[p.id] = 0
  const week = config.state.ui.week
  for (const [key, entry] of Object.entries(duty.state.map)) {
    if (Number(key.split('|')[0]) !== week) continue
    c[entry.personId] = (c[entry.personId] ?? 0) + 1
  }
  return c
})

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
    <div class="head"><span>人员</span><span>本周</span></div>
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
  padding-top: 112px;
}

.head {
  display: flex;
  justify-content: space-between;
  padding-bottom: 8px;
  color: var(--muted);
  font-size: 12px;
}

.person {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  height: 36px;
  padding: 0;
  border: 0;
  border-top: 1px solid var(--line);
  background: none;
  cursor: pointer;
  text-align: left;
}

.sw {
  width: 12px;
  height: 12px;
  flex: none;
}

.name {
  flex: 1;
  min-width: 0;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.count {
  color: var(--muted);
}

.person:hover .name {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.person.off .sw {
  background: transparent !important;
  box-shadow: inset 0 0 0 1px var(--faint);
}

.person.off .name,
.person.off .count {
  color: var(--faint);
}
</style>
