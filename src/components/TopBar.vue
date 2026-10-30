<script setup lang="ts">
import { ref } from 'vue'
import { Setting, Download } from '@element-plus/icons-vue'
import { exportFocusDuties } from '../lib/export'
import SettingsDialog from './SettingsDialog.vue'

const settingsOpen = ref(false)
</script>

<template>
  <div class="top-bar">
    <el-button size="small" round :icon="Download" type="primary" plain @click="exportFocusDuties">导出当前排班</el-button>
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
  justify-content: flex-end;
}
</style>
