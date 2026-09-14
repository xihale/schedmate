<script setup lang="ts">
import { ref } from 'vue'
import { exportDutySummary, exportRendered } from '../lib/export'

const visible = defineModel<boolean>({ required: true })
const kind = ref<'duties' | 'full' | 'summary'>('duties')

function doExport(): void {
  if (kind.value === 'summary') exportDutySummary()
  else exportRendered(kind.value === 'full')
}
</script>

<template>
  <el-dialog v-model="visible" title="导出 xlsx" width="480px">
    <el-radio-group v-model="kind" class="kinds">
      <el-radio value="duties">
        <div>
          <div>排班情况</div>
          <div class="desc">只看排班：仅当月几周，谁被排在哪一目了然</div>
        </div>
      </el-radio>
      <el-radio value="full">
        <div>
          <div>带课程的排班情况</div>
          <div class="desc">课程浅色 + 排班实色，仅当月几周</div>
        </div>
      </el-radio>
      <el-radio value="summary">
        <div>
          <div>排班总表</div>
          <div class="desc">明细（周/星期/日期/节次/人员）+ 汇总，仅当月几周</div>
        </div>
      </el-radio>
    </el-radio-group>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="doExport">导出</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.kinds {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: stretch;
}

.desc {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
