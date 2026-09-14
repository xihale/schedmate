<script setup lang="ts">
import { useTimetableStore } from './stores/timetable'
import { useImport } from './composables/useImport'
import TopBar from './components/TopBar.vue'
import WeekView from './views/WeekView.vue'
import { onBeforeUnmount, onMounted, ref } from 'vue'

const timetable = useTimetableStore()
const { importFiles } = useImport()

// ---- 全窗口拖拽导入：拖入的每份课表就是一个人 ----
const overlayVisible = ref(false)
let hideTimer: number | undefined

const isXlsx = (f: globalThis.File) => /\.xlsx?$/i.test(f.name)

function onDragOver(e: DragEvent): void {
  if (![...(e.dataTransfer?.types ?? [])].includes('Files')) return
  e.preventDefault() // 允许在窗口任意位置 drop
  overlayVisible.value = true
  window.clearTimeout(hideTimer)
  hideTimer = window.setTimeout(() => (overlayVisible.value = false), 250)
}

function onDrop(e: DragEvent): void {
  window.clearTimeout(hideTimer)
  overlayVisible.value = false
  const files = [...(e.dataTransfer?.files ?? [])].filter(isXlsx)
  if (files.length === 0) return
  e.preventDefault()
  importFiles(files)
}

onMounted(() => {
  window.addEventListener('dragover', onDragOver)
  window.addEventListener('drop', onDrop)
})
onBeforeUnmount(() => {
  window.removeEventListener('dragover', onDragOver)
  window.removeEventListener('drop', onDrop)
})
</script>

<template>
  <el-container direction="vertical">
    <header class="app-header">
      <div class="brand">SchedMate</div>
      <TopBar v-if="timetable.hasAnyData" />
    </header>
    <el-main v-if="timetable.hasAnyData" class="app-main">
      <WeekView />
    </el-main>
    <div v-else class="empty-stage">
      <div class="empty-title">把课表 xlsx 拖进来</div>
    </div>

    <div v-show="overlayVisible" class="drop-overlay">
      <div class="drop-frame">
        <div class="drop-text">松开导入课表 xlsx</div>
      </div>
    </div>
  </el-container>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  gap: 16px;
  background: #fff;
  border-bottom: 1px solid var(--el-border-color-extra-light);
  padding: 0 20px;
  height: 52px;
}

.brand {
  font-size: 16px;
  font-weight: 700;
  white-space: nowrap;
}

.app-main {
  padding: 16px 20px;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

/* 空态：占满整个窗口的拖入提示 */
.empty-stage {
  height: calc(100vh - 52px - 16px);
  margin: 8px;
  border: 2px dashed var(--el-border-color-lighter);
  border-radius: 16px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-title {
  font-size: 18px;
  color: var(--el-text-color-secondary);
}

.drop-overlay {
  position: fixed;
  inset: 0;
  z-index: 3000;
  background: rgba(64, 158, 255, 0.08);
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.drop-frame {
  border: 3px dashed var(--el-color-primary);
  border-radius: 16px;
  position: absolute;
  inset: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.6);
}

.drop-text {
  font-size: 22px;
  font-weight: 700;
  color: var(--el-color-primary);
}
</style>
