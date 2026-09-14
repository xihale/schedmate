<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Close } from '@element-plus/icons-vue'
import { useConfigStore } from '../stores/config'
import { useSchedule } from '../composables/useSchedule'
import { DAY_NAMES, dutyKey } from '../types'
import { courseDate, fmtMD } from '../lib/dates'

const props = defineProps<{
  visible: boolean
  week: number
  day: number
  period: number
  x: number
  y: number
}>()

const emit = defineEmits<{ 'update:visible': [v: boolean] }>()

const config = useConfigStore()
const schedule = useSchedule()

const info = computed(() => schedule.cell(props.week, props.day, props.period))
const dateLabel = computed(() => fmtMD(courseDate(config.state.semesterStart, props.week, props.day)))

const note = ref('')
watch(
  () => [props.week, props.day, props.period, props.visible] as const,
  () => {
    note.value = info.value.duty?.note ?? ''
  },
)

function close(): void {
  emit('update:visible', false)
}

function assign(pid: 'A' | 'B'): void {
  schedule.duty.setDuty(dutyKey(props.week, props.day, props.period), { personId: pid, note: note.value || undefined })
  note.value = ''
}

function removeDuty(): void {
  schedule.duty.setDuty(dutyKey(props.week, props.day, props.period), null)
  note.value = ''
}

function saveNote(): void {
  const duty = info.value.duty
  if (!duty) return
  schedule.duty.setDuty(dutyKey(props.week, props.day, props.period), {
    personId: duty.personId,
    note: note.value.trim() || undefined,
  })
}

function personStatus(pid: 'A' | 'B'): { schedulable: boolean; text: string; kind: 'free' | 'busy' | 'nodata' } {
  const h = schedule.half(pid, props.week, props.day, props.period)
  if (h.status === 'course') return { schedulable: false, text: `该节有课：${h.course.name}`, kind: 'busy' }
  if (h.status === 'nodata') return { schedulable: true, text: '该周未导入课表（视作空闲）', kind: 'nodata' }
  return { schedulable: true, text: '空闲，可安排', kind: 'free' }
}

const posStyle = computed(() => {
  const W = 300
  const H = 330
  return {
    left: `${Math.min(props.x, window.innerWidth - W - 12)}px`,
    top: `${Math.min(props.y, window.innerHeight - H - 12)}px`,
  }
})
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="pop-overlay" @pointerdown.stop.prevent="close">
      <div class="pop-card" :style="posStyle" @pointerdown.stop>
        <div class="pop-head">
          <div>
            <div class="pop-title">第{{ week }}周 · {{ DAY_NAMES[day - 1] }} · 第{{ period }}节</div>
            <div class="pop-date">{{ dateLabel }}</div>
          </div>
          <el-button :icon="Close" text size="small" @click="close" />
        </div>

        <el-alert
          v-if="info.conflict"
          type="error"
          :closable="false"
          title="冲突：当前排班者此节有课（可能因重导课表产生）"
          class="conflict-alert"
        />

        <div v-if="info.duty" class="current">
          <span class="cur-label">当前：</span>
          <el-tag :color="config.personById[info.duty.personId].color" effect="dark" size="small" class="cur-tag">
            {{ config.personName(info.duty.personId) }}
          </el-tag>
          <el-button link size="small" type="danger" @click="removeDuty">移除排班</el-button>
        </div>

        <div class="candidates">
          <div class="sec-label">{{ info.duty ? '换人' : '谁可以排在这里？' }}</div>
          <div v-for="p in config.state.persons" :key="p.id" class="candidate" :class="{ disabled: !personStatus(p.id).schedulable }">
            <span class="dot" :style="{ background: p.color }" />
            <div class="cinfo">
              <div class="pname">{{ p.name }}</div>
              <div class="pstat">{{ personStatus(p.id).text }}</div>
            </div>
            <el-button
              v-if="info.duty?.personId !== p.id"
              size="small"
              type="primary"
              plain
              :disabled="!personStatus(p.id).schedulable"
              @click="assign(p.id)"
            >
              排{{ p.name }}
            </el-button>
          </div>
        </div>

        <div v-if="info.duty" class="note-row">
          <el-input v-model="note" size="small" placeholder="备注（回车保存）" @keyup.enter="saveNote" @blur="saveNote" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.pop-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
}

.pop-card {
  position: fixed;
  width: 300px;
  background: #fff;
  border-radius: 10px;
  box-shadow: var(--el-box-shadow-light);
  border: 1px solid var(--el-border-color-lighter);
  padding: 12px;
}

.pop-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.pop-title {
  font-weight: 600;
  font-size: 14px;
}

.pop-date {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 2px;
}

.conflict-alert {
  margin: 8px 0;
  padding: 4px 8px;
}

.current {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0;
}

.cur-tag {
  border: none;
  color: #fff;
}

.sec-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin: 10px 0 6px;
}

.candidate {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  margin-bottom: 6px;
}

.candidate.disabled {
  opacity: 0.55;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex: none;
}

.cinfo {
  flex: 1;
  min-width: 0;
}

.pname {
  font-size: 13px;
  font-weight: 600;
}

.pstat {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note-row {
  margin-top: 8px;
}
</style>
