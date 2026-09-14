<script setup lang="ts">
import { ref } from 'vue'
import { exportDutySummary, exportRendered } from '../lib/export'

const visible = defineModel<boolean>({ required: true })
const kind = ref<'duty' | 'rendered'>('duty')

function doExport(): void {
  if (kind.value === 'duty') exportDutySummary()
  else exportRendered()
}
</script>

<template>
  <el-dialog v-model="visible" title="导出 xlsx" width="460px">
    <el-radio-group v-model="kind" class="kinds">
      <el-radio value="duty">
        <div>
          <div>排班总表</div>
          <div class="desc">明细（周/星期/日期/节次/人员）+ 按人按周汇总</div>
        </div>
      </el-radio>
      <el-radio value="rendered">
        <div>
          <div>课表排班渲染表</div>
          <div class="desc">每周一 sheet 复刻课表网格：课程染色、连堂合并、排班标记</div>
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
