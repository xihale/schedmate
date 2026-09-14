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
      <TopBar />
    </header>
    <el-main class="app-main">
      <div v-if="!timetable.hasAnyData" class="empty-drop">
        <div class="empty-title">把课表 xlsx 拖进来</div>
        <div class="empty-sub">一份文件一个人 · 文件名用中文名会直接作为人名 · 可以一次拖多份</div>
      </div>
      <WeekView v-else />
    </el-main>

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

.empty-drop {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 96px 24px;
  border: 2px dashed var(--el-border-color-lighter);
  border-radius: 16px;
  background: #fff;
}

.empty-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--el-text-color-regular);
}

.empty-sub {
  font-size: 13px;
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
