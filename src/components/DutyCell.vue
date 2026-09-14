<script setup lang="ts">
import { computed, ref } from 'vue'
import { useConfigStore } from '../stores/config'
import { useSchedule } from '../composables/useSchedule'
import { rgba } from '../lib/palette'

const props = defineProps<{
  week: number
  day: number
  period: number
  preview?: boolean
  previewPid?: 'A' | 'B' | null
  halfCount: number
}>()

const emit = defineEmits<{ press: [pid: 'A' | 'B', e: MouseEvent]; enter: [pid: 'A' | 'B'] }>()

const config = useConfigStore()
const { cell } = useSchedule()

const info = computed(() => cell(props.week, props.day, props.period))
const hideCourses = computed(() => config.state.ui.hideCourses)

/** 左 A 右 B */
const sides = computed(() => [
  { pid: 'A' as const, half: info.value.a, visible: config.state.ui.showA },
  { pid: 'B' as const, half: info.value.b, visible: config.state.ui.showB },
])

function halfStyle(side: (typeof sides.value)[number]): Record<string, string> {
  const personColor = config.personById[side.pid].color
  const style: Record<string, string> = {}
  if (side.half.status === 'course') {
    // 有课：人员浅色底作背景，让排班的实色更醒目；只看排班时完全隐去
    style.background = hideCourses.value ? '#fff' : rgba(personColor, 0.14)
  }
  if (info.value.duty?.personId === side.pid && side.half.status !== 'course') {
    // 排班：人员实色底 + 白字，一眼看出谁值班
    style.background = personColor
    style.color = '#fff'
  }
  return style
}

/** 课程名悬浮提示只标在连堂锚点节 */
function halfTitle(side: (typeof sides.value)[number]): string | undefined {
  if (side.half.status === 'course' && side.half.course.start === props.period) {
    const c = side.half.course
    return `${c.name}${c.location ? ' · ' + c.location : ''}`
  }
  return undefined
}

/** 点到有课的半格：抖一下表示不可排 */
const shakePid = ref<'A' | 'B' | null>(null)
function onDown(side: (typeof sides.value)[number], e: MouseEvent): void {
  if (side.half.status === 'course') {
    shakePid.value = side.pid
    window.setTimeout(() => (shakePid.value = null), 350)
    return
  }
  emit('press', side.pid, e)
}

function halfClass(side: (typeof sides.value)[number]): Record<string, boolean> {
  return {
    'is-nodata': side.half.status === 'nodata',
    'is-preview': !!props.preview && props.previewPid === side.pid,
    'is-shake': shakePid.value === side.pid,
    // 缺口：此人前一周的排班在本周因课程冲突断档，红框提示手动调整
    'is-gap': info.value.gapFrom === side.pid,
  }
}
</script>

<template>
  <div
    class="dcell"
    :class="{ 'is-conflict': info.conflict }"
    :style="{ '--halves': halfCount }"
  >
    <div
      v-for="side in sides"
      v-show="side.visible"
      :key="side.pid"
      class="half"
      :class="halfClass(side)"
      :style="halfStyle(side)"
      :title="halfTitle(side)"
      @pointerdown="onDown(side, $event)"
      @pointerenter="$emit('enter', side.pid)"
    >
      <span
        v-if="info.duty?.personId === side.pid && side.half.status !== 'course'"
        class="duty-tag"
        :title="`已排：${config.personName(side.pid)}${info.duty.note ? ' · ' + info.duty.note : ''}`"
      >
        {{ config.personName(side.pid) }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.dcell {
  display: grid;
  grid-template-columns: repeat(var(--halves, 2), 1fr);
  min-height: 58px;
  background: #fff;
  border-right: 1px solid var(--el-border-color-extra-light);
  border-bottom: 1px solid var(--el-border-color-extra-light);
}

.dcell.edge-r {
  border-right: none;
}

.dcell.edge-b {
  border-bottom: none;
}

.dcell.is-conflict {
  box-shadow: inset 0 0 0 2px var(--el-color-danger);
}

.half {
  position: relative;
  min-width: 0;
  overflow: hidden;
  cursor: pointer;
  transition: background-color 0.12s;
}

/* 左右分层的 A/B 分隔线 */
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
.half.is-gap {
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
  font-weight: 700;
  overflow: hidden;
  white-space: nowrap;
}
</style>
