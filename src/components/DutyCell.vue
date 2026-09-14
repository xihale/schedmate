<script setup lang="ts">
import { computed } from 'vue'
import { useConfigStore } from '../stores/config'
import { useSchedule } from '../composables/useSchedule'
import { courseBase, rgba } from '../lib/palette'

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
  const style: Record<string, string> = {}
  if (side.half.status === 'course') {
    const base = courseBase(side.half.course.name, config.state.colorOverrides)
    style.background = rgba(base, side.half.course.start === props.period ? 0.28 : 0.14)
  }
  if (info.value.duty?.personId === side.pid) {
    style.background = rgba(config.personById[side.pid].color, side.half.status === 'course' ? 0.35 : 0.2)
  }
  return style
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
      'has-duty': !!info.duty,
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
      <span v-else-if="side.half.status === 'nodata'" class="free-tag">未导入</span>
      <span v-else class="free-tag">空闲</span>

      <span
        v-if="info.duty?.personId === side.pid"
        class="duty-flag"
        :style="{ background: config.personById[side.pid].color }"
        :title="`已排：${config.personName(side.pid)}${info.duty.note ? ' · ' + info.duty.note : ''}`"
      >
        {{ config.personName(side.pid).slice(0, 2) }}
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
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  transition:
    box-shadow 0.12s,
    border-color 0.12s;
}

.dcell:hover {
  border-color: var(--el-color-primary-light-5);
}

.dcell.is-highlight {
  box-shadow: 0 0 0 1.5px var(--el-color-primary-light-7);
}

.dcell.is-preview {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 1px var(--el-color-primary) inset;
}

.dcell.has-duty {
  border-color: var(--el-color-primary-light-5);
}

.dcell.is-conflict {
  border-color: var(--el-color-danger);
  box-shadow: 0 0 0 1px var(--el-color-danger) inset;
}

.half {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2px 4px;
  min-width: 0;
  overflow: hidden;
}

.half + .half {
  border-top: 1px dashed var(--el-border-color-lighter);
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
  color: var(--el-text-color-secondary);
  white-space: nowrap;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.free-tag {
  font-size: 10px;
  color: var(--el-text-color-placeholder);
}

.duty-flag {
  position: absolute;
  top: 2px;
  right: 2px;
  color: #fff;
  font-size: 10px;
  line-height: 1;
  padding: 2px 4px;
  border-radius: 3px;
  max-width: calc(100% - 4px);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
