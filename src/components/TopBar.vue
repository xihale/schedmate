<script setup lang="ts">
import { ref } from 'vue'
import { Setting, Download } from '@element-plus/icons-vue'
import { exportMonthDuties } from '../lib/export'
import SettingsDialog from './SettingsDialog.vue'

const settingsOpen = ref(false)
</script>

<template>
  <div class="top-bar">
    <span class="hint">拖入课表 xlsx 即可导入 / 更新，一份文件一个人</span>
    <el-button size="small" round :icon="Download" type="primary" plain @click="exportMonthDuties">导出本月排班</el-button>
    <el-button size="small" round :icon="Setting" @click="settingsOpen = true">设置</el-button>

    <SettingsDialog v-model="settingsOpen" />
  </div>
</template>

<style scoped>
.top-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.hint {
  margin-right: auto;
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
