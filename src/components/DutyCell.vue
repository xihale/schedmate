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
  highlight?: boolean
  halfCount: number
}>()

defineEmits<{ press: [e: MouseEvent]; enter: [] }>()

const config = useConfigStore()
const { cell } = useSchedule()

const info = computed(() => cell(props.week, props.day, props.period))

const sides = computed(() => [
  { pid: 'A' as const, half: info.value.a, visible: config.state.ui.showA },
  { pid: 'B' as const, half: info.value.b, visible: config.state.ui.showB },
])

function halfStyle(side: (typeof sides.value)[number]): Record<string, string> {
  const personColor = config.personById[side.pid].color
  const style: Record<string, string> = {}
  // 课程 = 人员深色底白字（事实，视觉最重）
  if (side.half.status === 'course') {
    style.background = personColor
    style.color = '#fff'
  }
  // 排班 = 浅色底人员深字（决策，视觉次之）；与课程同格时保持课程深色，靠冲突红环提示
  if (info.value.duty?.personId === side.pid && side.half.status !== 'course') {
    style.background = rgba(personColor, 0.16)
    style.color = `#${darken(personColor, 0.8)}`
  }
  return style
}

function dutyTagStyle(side: (typeof sides.value)[number]): Record<string, string> {
  const personColor = config.personById[side.pid].color
  return { color: side.half.status === 'course' ? '#fff' : `#${darken(personColor, 0.8)}` }
}

function isAnchor(side: (typeof sides.value)[number]): boolean {
  return side.half.status === 'course' && side.half.course.start === props.period
}
</script>

<template>
  <div
    class="dcell"
    :class="{
      'is-preview': preview,
      'is-conflict': info.conflict,
      'is-highlight': highlight,
    }"
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
      <template v-if="side.half.status === 'course'">
        <template v-if="isAnchor(side)">
          <div class="cname" :title="`${side.half.course.name} ${side.half.course.location}`">
            {{ side.half.course.name }}
          </div>
          <div v-if="side.half.course.location" class="cloc">{{ side.half.course.location }}</div>
        </template>
      </template>

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
  grid-template-rows: repeat(var(--halves, 2), 1fr);
  min-height: 68px;
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

.dcell.is-highlight {
  background: var(--el-color-primary-light-9);
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
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3px 6px;
  min-width: 0;
  overflow: hidden;
}

.half + .half {
  border-top: 1px solid var(--el-border-color-extra-light);
}

/* 未导入（视作可排）：斜纹提示，不用文字 */
.half.is-nodata {
  background-image: repeating-linear-gradient(45deg, transparent 0 6px, rgba(0, 0, 0, 0.035) 6px 8px);
}

.cname {
  font-size: 11px;
  font-weight: 600;
  line-height: 1.25;
  max-height: 2.5em;
  overflow: hidden;
  text-align: center;
}

.cloc {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.78);
  white-space: nowrap;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.duty-tag {
  position: absolute;
  top: 2px;
  right: 3px;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  max-width: calc(100% - 5px);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
