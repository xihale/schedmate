<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { useDutyStore } from '../stores/duty'
import { flash } from '../lib/status'
import WeekTabs from '../components/WeekTabs.vue'
import PeopleRail from '../components/PeopleRail.vue'
import WeekGrid from '../components/WeekGrid.vue'

const duty = useDutyStore()

function onKey(e: KeyboardEvent): void {
  const t = e.target
  if (t instanceof HTMLElement && t.closest('input, textarea, select, [contenteditable="true"]')) return
  if (!(e.ctrlKey || e.metaKey)) return
  const key = e.key.toLowerCase()
  /** 撤销/重做的方向如实：这步到底抹掉了还是恢复了几处 */
  function deltaFlash(prefix: string, before: number): void {
    const delta = duty.count - before
    if (delta < 0) flash(`${prefix}，少 ${-delta} 节`)
    else if (delta > 0) flash(`${prefix}，多 ${delta} 节`)
    else flash(prefix)
  }
  if (key === 'z' && !e.shiftKey) {
    if (!duty.canUndo) return
    e.preventDefault()
    const before = duty.count
    duty.undo()
    deltaFlash('已撤销', before)
  } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
    if (!duty.canRedo) return
    e.preventDefault()
    const before = duty.count
    duty.redo()
    deltaFlash('已重做', before)
  }
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <section class="week-view">
    <PeopleRail />
    <div class="work">
      <WeekTabs />
      <div class="grid-wrap"><WeekGrid /></div>
    </div>
  </section>
</template>

<style scoped>
.week-view {
  display: flex;
  height: 100%;
}

.work {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: 0 var(--pad) var(--pad) 0;
}

.grid-wrap {
  flex: 1;
  min-height: 0;
}
</style>
