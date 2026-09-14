<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage, ElNotification } from 'element-plus'
import { Upload, Setting, Download } from '@element-plus/icons-vue'
import { useConfigStore } from '../stores/config'
import { useTimetableStore } from '../stores/timetable'
import { useDutyStore } from '../stores/duty'
import type { ImportReport, PersonId } from '../types'
import SettingsDialog from './SettingsDialog.vue'
import ExportDialog from './ExportDialog.vue'

const config = useConfigStore()
const timetable = useTimetableStore()
const duty = useDutyStore()

const settingsOpen = ref(false)
const exportOpen = ref(false)
const importing = ref<PersonId | null>(null)

function reportText(r: ImportReport): string {
  const parts = [`${r.weeks.length} 周 / ${r.courseCount} 节课`]
  if (r.clampedCount > 0) parts.push(`${r.clampedCount} 个连堂截断到第 8 节`)
  if (r.skippedCount > 0) parts.push(`忽略第 8 节之后的课 ${r.skippedCount} 块`)
  return parts.join('，')
}

async function onFile(personId: PersonId, raw?: File | null): Promise<void> {
  if (!raw) return
  importing.value = personId
  try {
    const report = await timetable.importFor(personId, raw)
    duty.resetHistory() // 事实已变，旧 undo 快照无意义
    ElNotification.success({
      title: `${config.personName(personId)} 课表已导入`,
      message: `${report.fileName}：${reportText(report)}`,
      duration: 6000,
    })
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '解析失败，请确认文件格式')
  } finally {
    importing.value = null
  }
}

function clearPerson(personId: PersonId): void {
  timetable.clearPerson(personId)
  ElMessage.success(`${config.personName(personId)} 的课表已移除（排班记录保留）`)
}
</script>

<template>
  <div class="import-bar">
    <div v-for="p in config.state.persons" :key="p.id" class="person-chip">
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
