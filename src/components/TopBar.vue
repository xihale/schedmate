<script setup lang="ts">
import { computed, ref } from 'vue'
import { exportFocusDuties } from '../lib/export'
import { courseDate, fmtMD, monthGroups, todayWeek } from '../lib/dates'
import { WEEK_COUNT } from '../types'
import { useConfigStore } from '../stores/config'
import { useDutyStore } from '../stores/duty'
import { useSchedule } from '../composables/useSchedule'
import { useImport } from '../composables/useImport'
import { flash, statusText } from '../lib/status'
import SettingsDialog from './SettingsDialog.vue'

const settingsOpen = ref(false)
const config = useConfigStore()
const duty = useDutyStore()
const { focusWeeks } = useSchedule()
const { importing, importFiles } = useImport()
const fileRef = ref<HTMLInputElement | null>(null)

interface Preset {
  id: string
  label: string
  title: string
  weeks: number[]
}

/** 写入范围：某个整月，或从本周起 N 周 */
const presets = computed<Preset[]>(() => {
  const startISO = config.state.semesterStart
  const span = (weeks: number[]) =>
    `${fmtMD(courseDate(startISO, weeks[0], 1))}–${fmtMD(courseDate(startISO, weeks[weeks.length - 1], 7))}`
  const list: Preset[] = monthGroups(startISO, WEEK_COUNT).map((g) => ({
    id: `m${g.month}`,
    label: `${g.month}月`,
    title: span(g.weeks),
    weeks: [...g.weeks],
  }))
  const tw = todayWeek(startISO, WEEK_COUNT)
  const seen = new Set<number>()
  for (const n of [2, 3, 4, 6, 8, 12]) {
    const end = Math.min(WEEK_COUNT, tw + n - 1)
    const len = end - tw + 1
    if (seen.has(len)) continue
    seen.add(len)
    const weeks = Array.from({ length: len }, (_, i) => tw + i)
    list.push({ id: `r${n}`, label: `本周起 ${len} 周`, title: span(weeks), weeks })
  }
  return list
})

const activePreset = computed(() => {
  const fw = focusWeeks.value
  return presets.value.find((p) => p.weeks.length === fw.length && p.weeks.every((w, i) => w === fw[i]))?.id ?? ''
})

const monthPresets = computed(() => presets.value.filter((p) => p.id.startsWith('m')))
const rollPresets = computed(() => presets.value.filter((p) => p.id.startsWith('r')))

const dutiesOnly = computed({
  get: () => config.state.ui.hideCourses,
  set: (v: boolean) => (config.state.ui.hideCourses = v),
})

function onRange(e: Event): void {
  const id = (e.target as HTMLSelectElement).value
  const p = presets.value.find((x) => x.id === id)
  if (!p) return
  config.state.ui.focus = { start: p.weeks[0], end: p.weeks[p.weeks.length - 1] }
  if (!p.weeks.includes(config.state.ui.week)) config.state.ui.week = p.weeks[0]
  flash(`范围：${p.label} ${p.title}`)
}

function undo(): void {
  duty.undo()
  flash('已撤销')
}

function redo(): void {
  duty.redo()
  flash('已重做')
}

function pick(): void {
  fileRef.value?.click()
}

async function onPick(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement
  const files = [...(input.files ?? [])].filter((f) => /\.xlsx?$/i.test(f.name))
  input.value = ''
  if (files.length === 0) {
    flash('只接受 .xlsx 课表')
    return
  }
  await importFiles(files)
}
</script>

<template>
  <div class="bar">
    <label class="range">
      <span class="range-label">范围</span>
      <select class="range-select" :value="activePreset" aria-label="排班范围" @change="onRange">
        <option v-if="!activePreset" value="">第 {{ focusWeeks[0] }}–{{ focusWeeks[focusWeeks.length - 1] }} 周</option>
        <optgroup label="整月">
          <option v-for="p in monthPresets" :key="p.id" :value="p.id">{{ p.label }}　{{ p.title }}</option>
        </optgroup>
        <optgroup label="本周起">
          <option v-for="p in rollPresets" :key="p.id" :value="p.id">{{ p.label }}　{{ p.title }}</option>
        </optgroup>
      </select>
    </label>

    <p class="status" aria-live="polite">{{ statusText }}</p>

    <nav class="tools">
      <button :disabled="!duty.canUndo" title="Ctrl+Z" @click="undo">撤销</button>
      <button :disabled="!duty.canRedo" title="Ctrl+Shift+Z" @click="redo">重做</button>
      <span class="sep" aria-hidden="true" />
      <button :aria-pressed="dutiesOnly" :class="{ on: dutiesOnly }" @click="dutiesOnly = !dutiesOnly">只看排班</button>
      <span class="sep" aria-hidden="true" />
      <button :disabled="importing" @click="pick">导入</button>
      <button @click="exportFocusDuties">导出</button>
      <button @click="settingsOpen = true">设置</button>
    </nav>

    <input ref="fileRef" class="file" type="file" accept=".xls,.xlsx" multiple @change="onPick" />
    <SettingsDialog v-model="settingsOpen" />
  </div>
</template>

<style scoped>
.bar {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 24px;
}

.range {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
}

.range-label {
  color: var(--muted);
}

.range-select {
  height: 32px;
  padding: 0 28px 0 10px;
  border: 1px solid var(--line);
  border-radius: 0;
  background: #fff
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%23111' stroke-width='1.2'/%3E%3C/svg%3E")
    no-repeat right 10px center;
  appearance: none;
  font: inherit;
  font-weight: 600;
  color: var(--ink);
  cursor: pointer;
}

.range-select:hover {
  border-color: var(--ink);
}

.status {
  flex: 1;
  min-width: 0;
  margin: 0;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tools {
  display: flex;
  align-items: center;
  gap: 2px;
  flex: none;
}

.tools button {
  height: 32px;
  padding: 0 10px;
  border: 0;
  background: none;
  cursor: pointer;
  font-weight: 500;
}

.tools button:hover:not(:disabled) {
  background: var(--tint);
}

.tools button:disabled {
  color: var(--faint);
  cursor: default;
}

.tools button.on {
  background: var(--ink);
  color: #fff;
}

.sep {
  width: 1px;
  height: 16px;
  margin: 0 8px;
  background: var(--line);
}

.file {
  display: none;
}
</style>
