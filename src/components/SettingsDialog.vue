<script setup lang="ts">
import { useConfigStore } from '../stores/config'
import { useTimetableStore } from '../stores/timetable'
import { useDutyStore } from '../stores/duty'
import { ElMessageBox, ElMessage } from 'element-plus'

const visible = defineModel<boolean>({ required: true })
const config = useConfigStore()
const timetable = useTimetableStore()
const duty = useDutyStore()

async function clearDuties(): Promise<void> {
  await ElMessageBox.confirm('确定清空全部排班记录？', '清空排班', {
    type: 'warning',
    confirmButtonText: '清空',
    cancelButtonText: '取消',
  })
  duty.clearAllDuties()
  ElMessage.success('排班已清空')
}

async function clearEverything(): Promise<void> {
  await ElMessageBox.confirm('将清空课表、排班与全部本地数据，用于完全重来。', '清空全部数据', {
    type: 'warning',
    confirmButtonText: '全部清空',
    cancelButtonText: '取消',
  })
  timetable.clearAll()
  duty.clearAllDuties()
  ElMessage.success('已全部清空')
}
</script>

<template>
  <el-dialog v-model="visible" title="设置" width="640px">
    <h4 class="section-title">人员</h4>
    <div class="persons">
      <div v-for="p in config.state.persons" :key="p.id" class="person-row">
        <span class="pid">{{ p.id }}</span>
        <el-input v-model="p.name" maxlength="10" style="width: 140px" />
        <el-color-picker v-model="p.color" />
      </div>
    </div>

    <h4 class="section-title">学期</h4>
    <div class="row">
      第 1 周周一：
      <el-date-picker
        v-model="config.state.semesterStart"
        type="date"
        value-format="YYYY-MM-DD"
        :clearable="false"
        style="width: 160px"
      />
    </div>

    <h4 class="section-title danger">危险区</h4>
    <div class="row">
      <el-button size="small" type="danger" plain @click="clearDuties">清空全部排班</el-button>
      <el-button size="small" type="danger" plain @click="clearEverything">清空全部数据</el-button>
    </div>
  </el-dialog>
</template>

<style scoped>
.section-title {
  margin: 18px 0 10px;
}

.section-title.danger {
  color: var(--el-color-danger);
}

.persons {
  display: flex;
  gap: 24px;
}

.person-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pid {
  font-weight: 700;
  color: var(--el-text-color-secondary);
}

.row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.hint {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}
</style>
