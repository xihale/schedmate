<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useConfigStore } from './stores/config'
import { useTimetableStore } from './stores/timetable'
import ImportBar from './components/ImportBar.vue'
import ImportDropDialog from './components/ImportDropDialog.vue'
import WeekView from './views/WeekView.vue'
import OverviewView from './views/OverviewView.vue'

const config = useConfigStore()
const timetable = useTimetableStore()

const tab = computed({
  get: () => config.state.ui.tab,
  set: (v) => (config.state.ui.tab = v),
})

// ---- 全窗口拖拽导入 ----
const dropFiles = ref<File[]>([])
const dropDialogOpen = ref(false)
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
  dropFiles.value = files
  dropDialogOpen.value = true
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
      <ImportBar />
    </header>
    <el-main class="app-main">
      <el-tabs v-model="tab">
        <el-tab-pane label="周视图" name="week">
          <div v-if="!timetable.hasAnyData" class="empty-drop">
            <div class="empty-icon">📅</div>
            <div class="empty-title">把两份课表 xlsx 拖进窗口</div>
          </div>
          <WeekView v-else />
        </el-tab-pane>
        <el-tab-pane label="鸟瞰" name="overview">
          <el-empty v-if="!timetable.hasAnyData" description="先导入课表" />
          <OverviewView v-else />
        </el-tab-pane>
      </el-tabs>
    </el-main>

    <div v-show="overlayVisible" class="drop-overlay">
      <div class="drop-frame">
        <div class="drop-text">松开导入课表 xlsx</div>
      </div>
    </div>

    <ImportDropDialog v-model="dropDialogOpen" :files="dropFiles" />
  </el-container>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  gap: 16px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  padding: 0 20px;
  height: 56px;
}

.brand {
  font-size: 18px;
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
  padding: 72px 24px;
  border: 2px dashed var(--el-border-color);
  border-radius: 12px;
  background: #fff;
}

.empty-icon {
  font-size: 44px;
}

.empty-title {
  font-size: 16px;
  font-weight: 600;
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
