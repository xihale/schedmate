<script setup lang="ts">
import { useTimetableStore } from './stores/timetable'
import { useImport } from './composables/useImport'
import TopBar from './components/TopBar.vue'
import WeekView from './views/WeekView.vue'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import { IDLE_TTL_DAYS, PURGED_FLAG } from './lib/persist'

function readPurgedFlag(): boolean {
  try {
    const purged = sessionStorage.getItem(PURGED_FLAG) === '1'
    if (purged) sessionStorage.removeItem(PURGED_FLAG)
    return purged
  } catch {
    return false
  }
}

const timetable = useTimetableStore()
const { importing, importFiles } = useImport()
const autoCleared = ref(readPurgedFlag())

const overlayVisible = ref(false)
const pickHint = ref('')
const fileRef = ref<HTMLInputElement | null>(null)
let hideTimer: number | undefined

const isXlsx = (f: globalThis.File) => /\.xlsx?$/i.test(f.name)

function onDragOver(e: DragEvent): void {
  if (![...(e.dataTransfer?.types ?? [])].includes('Files')) return
  e.preventDefault()
  overlayVisible.value = true
  window.clearTimeout(hideTimer)
  hideTimer = window.setTimeout(() => (overlayVisible.value = false), 250)
}

function onDrop(e: DragEvent): void {
  window.clearTimeout(hideTimer)
  overlayVisible.value = false
  const files = [...(e.dataTransfer?.files ?? [])].filter(isXlsx)
  if (files.length === 0) {
    pickHint.value = '只接受 .xlsx 课表'
    return
  }
  e.preventDefault()
  pickHint.value = ''
  importFiles(files)
}

function pick(): void {
  fileRef.value?.click()
}

async function onPick(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement
  const all = [...(input.files ?? [])]
  const files = all.filter(isXlsx)
  input.value = ''
  if (all.length > 0 && files.length === 0) {
    pickHint.value = '只接受 .xlsx 课表'
    return
  }
  if (files.length === 0) return
  pickHint.value = ''
  await importFiles(files)
}

onMounted(() => {
  window.addEventListener('dragover', onDragOver)
  window.addEventListener('drop', onDrop)
})
onBeforeUnmount(() => {
  window.removeEventListener('dragover', onDragOver)
  window.removeEventListener('drop', onDrop)
  window.clearTimeout(hideTimer)
})
</script>

<template>
  <el-config-provider :locale="zhCn">
    <div class="shell">
      <header class="head">
        <h1 class="brand">SchedMate</h1>
        <TopBar v-if="timetable.hasAnyData" />
      </header>

      <main v-if="timetable.hasAnyData" class="main">
        <WeekView />
      </main>

      <main v-else class="intro">
        <h2 class="intro-title">导入课表</h2>
        <p class="intro-lead">每人一份 xlsx，可多选，也可直接拖进窗口。</p>
        <button class="intro-btn" :disabled="importing" @click="pick">{{ importing ? '导入中…' : '选择文件' }}</button>
        <p class="intro-hint" :class="{ bad: pickHint }" aria-live="polite">{{ pickHint }}</p>
        <p v-if="autoCleared" class="intro-note">已自动清理 {{ IDLE_TTL_DAYS }} 天未使用的数据</p>
        <input ref="fileRef" class="file" type="file" accept=".xls,.xlsx" multiple @change="onPick" />
      </main>

      <div v-show="overlayVisible" class="drop">松开导入</div>
    </div>
  </el-config-provider>
</template>

<style scoped>
.shell {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.head {
  display: flex;
  align-items: center;
  gap: 32px;
  height: 56px;
  padding: 0 var(--pad);
  border-bottom: 1px solid var(--line);
  flex: none;
}

.brand {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.01em;
  flex: none;
}

.main {
  flex: 1;
  min-height: 0;
}

.intro {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 calc(var(--pad) * 4);
  padding-bottom: 12vh;
}

.intro-title {
  margin: 0;
  font-size: 40px;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.1;
}

.intro-lead {
  margin: 16px 0 40px;
  color: var(--muted);
  font-size: 15px;
}

.intro-btn {
  align-self: flex-start;
  height: 42px;
  padding: 0 24px;
  border: 0;
  background: var(--ink);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.intro-btn:hover {
  background: #000000;
}

.intro-btn:disabled {
  background: var(--muted);
  cursor: progress;
}

.intro-hint {
  min-height: 20px;
  margin: 12px 0 0;
  color: var(--muted);
}

.intro-hint.bad {
  color: var(--red);
}

.intro-note {
  margin: 8px 0 0;
  color: var(--muted);
  font-size: 13px;
}

.file {
  display: none;
}

.drop {
  position: fixed;
  inset: 16px;
  z-index: 3000;
  display: grid;
  place-items: center;
  border: 2px dashed var(--ink);
  background: rgba(255, 255, 255, 0.94);
  font-size: 22px;
  font-weight: 700;
  pointer-events: none;
}
</style>
