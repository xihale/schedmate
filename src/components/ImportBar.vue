<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Upload, Setting, Download } from '@element-plus/icons-vue'
import { useConfigStore } from '../stores/config'
import { useTimetableStore } from '../stores/timetable'
import { useImport } from '../composables/useImport'
import type { PersonId } from '../types'
import SettingsDialog from './SettingsDialog.vue'
import ExportDialog from './ExportDialog.vue'

const config = useConfigStore()
const timetable = useTimetableStore()
const { importing, importAndReport } = useImport()

const settingsOpen = ref(false)
const exportOpen = ref(false)
const dragOverPid = ref<PersonId | null>(null)

async function onFile(personId: PersonId, raw?: File | null): Promise<void> {
  if (!raw) return
  await importAndReport(personId, raw)
}

function clearPerson(personId: PersonId): void {
  timetable.clearPerson(personId)
  ElMessage.success(`${config.personName(personId)} 的课表已移除（排班记录保留）`)
}

/** 拖到某个人格上：直接导入给该人 */
function onDropTo(personId: PersonId, e: DragEvent): void {
  dragOverPid.value = null
  const files = [...(e.dataTransfer?.files ?? [])].filter((f) => /\.xlsx?$/i.test(f.name))
  if (files.length === 0) return
  if (files.length > 1) ElMessage.info('拖到人名上一次只导入一份，其余已忽略；多份请拖到窗口空白处')
  importAndReport(personId, files[0])
}
</script>

<template>
  <div class="import-bar">
    <div
      v-for="p in config.state.persons"
      :key="p.id"
      class="person-chip"
      :class="{ 'drag-over': dragOverPid === p.id }"
      @dragover.prevent="dragOverPid = p.id"
      @dragleave="dragOverPid === p.id && (dragOverPid = null)"
      @drop.prevent.stop="onDropTo(p.id, $event)"
    >
      <span class="dot" :style="{ background: p.color }" />
      <el-upload
        :show-file-list="false"
        :auto-upload="false"
        accept=".xlsx"
        :on-change="(f: { raw?: File }) => onFile(p.id, f.raw)"
      >
        <el-button size="small" :icon="Upload" :loading="importing === p.id">
          {{ p.name }}·课表
        </el-button>
      </el-upload>
      <span v-if="timetable.state.meta[p.id]" class="meta" :title="timetable.state.meta[p.id]!.fileName">
        {{ timetable.state.meta[p.id]!.weeks.length }} 周 / {{ timetable.state.meta[p.id]!.courseCount }} 课
      </span>
      <el-button v-if="timetable.state.meta[p.id]" link size="small" type="danger" @click="clearPerson(p.id)">
        移除
      </el-button>
    </div>

    <el-divider direction="vertical" />
    <el-button size="small" :icon="Setting" @click="settingsOpen = true">设置</el-button>
    <el-button size="small" type="primary" :icon="Download" @click="exportOpen = true">导出</el-button>

    <SettingsDialog v-model="settingsOpen" />
    <ExportDialog v-model="exportOpen" />
  </div>
</template>

<style scoped>
.import-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.person-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 6px;
  border-radius: 8px;
  border: 1px dashed transparent;
  transition:
    border-color 0.12s,
    background-color 0.12s;
}

.person-chip.drag-over {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex: none;
}

.meta {
  font-size: 12px;
  color: #909399;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
