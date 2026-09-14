<script setup lang="ts">
import { computed } from 'vue'
import { useConfigStore } from '../stores/config'
import { useSchedule } from '../composables/useSchedule'
import { darken, rgba } from '../lib/palette'

const props = defineProps<{
  week: number
  day: number
  period: number
  preview?: boolean
  halfCount: number
}>()

defineEmits<{ press: [e: MouseEvent]; enter: [] }>()

const config = useConfigStore()
const { cell } = useSchedule()

const info = computed(() => cell(props.week, props.day, props.period))

/** 左 A 右 B */
const sides = computed(() => [
  { pid: 'A' as const, half: info.value.a, visible: config.state.ui.showA },
  { pid: 'B' as const, half: info.value.b, visible: config.state.ui.showB },
])

function halfStyle(side: (typeof sides.value)[number]): Record<string, string> {
  const personColor = config.personById[side.pid].color
  const style: Record<string, string> = {}
  // 有课 = 人员实色块（不看课程名）
  if (side.half.status === 'course') {
    style.background = personColor
    if (side.half.course.start === props.period) {
      style.title = `${side.half.course.name}${side.half.course.location ? ' · ' + side.half.course.location : ''}`
    }
  }
  // 排班 = 浅色底 + 人名
  if (info.value.duty?.personId === side.pid && side.half.status !== 'course') {
    style.background = rgba(personColor, 0.16)
    style.color = `#${darken(personColor, 0.8)}`
  }
  return style
}

function dutyTagStyle(side: (typeof sides.value)[number]): Record<string, string> {
  return { color: `#${darken(config.personById[side.pid].color, 0.8)}` }
}
</script>

<template>
  <div
    class="dcell"
    :class="{ 'is-preview': preview, 'is-conflict': info.conflict }"
    :style="{ '--halves': halfCount }"
    @pointerdown="$emit('press', $event)"
    @pointerenter="$emit('enter')"
  >
    <div
      v-for="side in sides"
      v-show="side.visible"
      :key="side.pid"
      class="half"
      :class="{ 'is-nodata': side.half.status === 'nodata' }"
      :style="halfStyle(side)"
    >
      <span
        v-if="info.duty?.personId === side.pid"
        class="duty-tag"
        :style="dutyTagStyle(side)"
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
  cursor: pointer;
  transition: background-color 0.12s;
}

.dcell:hover {
  background: #fafbfc;
}

.dcell.edge-r {
  border-right: none;
}

.dcell.edge-b {
  border-bottom: none;
}

.dcell.is-preview {
  background: var(--el-color-primary-light-8);
  box-shadow: inset 0 0 0 2px var(--el-color-primary);
}

.dcell.is-conflict {
  box-shadow: inset 0 0 0 2px var(--el-color-danger);
}

.half {
  position: relative;
  min-width: 0;
  overflow: hidden;
}

/* 左右分层的 A/B 分隔线 */
.half + .half {
  border-left: 1px solid #fff;
}

/* 未导入（视作可排）：斜纹提示 */
.half.is-nodata {
  background-image: repeating-linear-gradient(45deg, transparent 0 6px, rgba(0, 0, 0, 0.035) 6px 8px);
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
