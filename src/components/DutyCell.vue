<script setup lang="ts">
import { computed, ref } from 'vue'
import { useConfigStore } from '../stores/config'
import { useSchedule } from '../composables/useSchedule'
import { rgba } from '../lib/palette'
import type { Person, PersonId } from '../types'

const props = defineProps<{
  week: number
  day: number
  period: number
  preview?: boolean
  previewPid?: PersonId | null
}>()

const emit = defineEmits<{ press: [pid: PersonId, e: MouseEvent]; enter: [pid: PersonId] }>()

const config = useConfigStore()
const { cell } = useSchedule()

const info = computed(() => cell(props.week, props.day, props.period))
const dutiesOnly = computed(() => config.state.ui.hideCourses)

/** 未被隐藏的人员，顺序即格子里的左右顺序 */
const visiblePersons = computed(() => config.state.persons.filter((p) => !config.state.ui.hiddenIds.includes(p.id)))

/** 点到有课的半格：抖一下表示不可排 */
const shakePid = ref<PersonId | null>(null)
function onDown(pid: PersonId, e: MouseEvent): void {
  const i = config.state.persons.findIndex((p) => p.id === pid)
  if (info.value.halves[i]?.status === 'course') {
    shakePid.value = pid
    window.setTimeout(() => (shakePid.value = null), 350)
    return
  }
  emit('press', pid, e)
}

function halfStyle(p: Person, i: number): Record<string, string> {
  const style: Record<string, string> = {}
  const half = info.value.halves[i]
  if (half?.status === 'course') {
    // 有课：人员浅色底作背景，让排班的实色更醒目
    style.background = rgba(p.color, 0.14)
  }
  if (info.value.duty?.personId === p.id && half?.status !== 'course') {
    // 排班：人员实色底 + 白字，一眼看出谁值班
    style.background = p.color
    style.color = '#fff'
  }
  return style
}

/** 课程名悬浮提示只标在连堂锚点节 */
function halfTitle(i: number): string | undefined {
  const half = info.value.halves[i]
  if (half?.status === 'course' && half.course.start === props.period) {
    const c = half.course
    return `${c.name}${c.location ? ' · ' + c.location : ''}`
  }
  return undefined
}

function halfClass(p: Person, i: number): Record<string, boolean> {
  return {
    'is-nodata': info.value.halves[i]?.status === 'nodata',
    'is-preview': !!props.preview && props.previewPid === p.id,
    'is-shake': shakePid.value === p.id,
    // 缺口：此人前一周的排班在本周因课程冲突断档，红框提示手动调整
    'is-gap': info.value.gapFrom === p.id,
  }
}

/** 只看排班：整格只显示当班人 */
const soloDuty = computed(() => {
  const d = info.value.duty
  if (!d || config.state.ui.hiddenIds.includes(d.personId)) return null
  return {
    color: config.personById[d.personId]?.color,
    name: config.personName(d.personId),
  }
})
</script>

<template>
  <!-- 只看排班：单人单格，只显示谁在这个时候上班 -->
  <div v-if="dutiesOnly" class="solo" :class="{ 'is-preview': preview, 'is-conflict': info.conflict }">
    <div
      v-if="soloDuty"
      class="solo-duty"
      :class="{ 'is-gap': !!info.gapFrom }"
      :style="{ background: soloDuty.color }"
      :title="`已排：${soloDuty.name}`"
    >
      {{ soloDuty.name }}
    </div>
    <div v-else-if="info.gapFrom" class="solo-gap" :title="`此处缺 ${config.personName(info.gapFrom)}，需手动调整`" />
  </div>

  <!-- 正常视图：每个人员一格，左→右按导入顺序 -->
  <div v-else class="dcell" :class="{ 'is-conflict': info.conflict }" :style="{ '--halves': visiblePersons.length }">
    <div
      v-for="(p, i) in visiblePersons"
      :key="p.id"
      class="half"
      :class="halfClass(p, i)"
      :style="halfStyle(p, i)"
      :title="halfTitle(i)"
      @pointerdown="onDown(p.id, $event)"
      @pointerenter="$emit('enter', p.id)"
    >
      <span
        v-if="info.duty?.personId === p.id && info.halves[i]?.status !== 'course'"
        class="duty-tag"
        :title="`已排：${config.personName(p.id)}`"
      >
        {{ p.name }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.dcell {
  display: grid;
  grid-template-columns: repeat(var(--halves, 1), 1fr);
  min-height: 58px;
  background: #fff;
  border-bottom: 1px solid var(--el-border-color-extra-light);
  container-type: inline-size;
}

.dcell.edge-b {
  border-bottom: none;
}

/* 天与天之间的分隔：明显深于行分隔，让「哪天是哪天」一目了然 */
.dcell.day-sep,
.solo.day-sep {
  border-left: 1px solid var(--el-border-color-dark);
}

.dcell.is-conflict,
.solo.is-conflict {
  box-shadow: inset 0 0 0 2px var(--el-color-danger);
}

.half {
  position: relative;
  min-width: 0;
  overflow: hidden;
  cursor: pointer;
  transition: background-color 0.12s;
}

/* 同一天内左右人员的分隔：一条白线 */
.half + .half {
  border-left: 1px solid #fff;
}

/* 未导入（视作可排）：斜纹提示 */
.half.is-nodata {
  background-image: repeating-linear-gradient(45deg, transparent 0 6px, rgba(0, 0, 0, 0.035) 6px 8px);
}

.half.is-preview {
  box-shadow: inset 0 0 0 2px var(--el-color-primary);
}

/* 缺口：应延续的排班因课程冲突空缺，红框提示手动调整 */
.half.is-gap,
.solo-duty.is-gap,
.solo-gap {
  box-shadow: inset 0 0 0 2px var(--el-color-danger);
  background-color: rgba(245, 108, 108, 0.08);
}

.half.is-shake {
  animation: shake 0.3s;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  30% { transform: translateX(-3px); }
  60% { transform: translateX(3px); }
}

.duty-tag {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  /* 半格宽度 = 1/N 格宽，字随宽度缩放，人多格窄时也不挤爆 */
  font-size: clamp(9px, calc(90cqw / var(--halves, 1)), 12px);
  font-weight: 700;
  overflow: hidden;
  white-space: nowrap;
}

/* 只看排班的单列格 */
.solo {
  min-height: 58px;
  background: #fff;
  border-bottom: 1px solid var(--el-border-color-extra-light);
  container-type: inline-size;
}

.solo.is-preview {
  box-shadow: inset 0 0 0 2px var(--el-color-primary);
}

.solo-duty {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  /* 人名文字随格子宽度缩放：格窄字小，格宽字大 */
  font-size: clamp(9px, 18cqw, 13px);
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
}
</style>
