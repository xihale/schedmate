<script setup lang="ts">
import { computed } from 'vue'
import { useConfigStore } from './stores/config'
import { useTimetableStore } from './stores/timetable'
import ImportBar from './components/ImportBar.vue'
import WeekView from './views/WeekView.vue'
import OverviewView from './views/OverviewView.vue'

const config = useConfigStore()
const timetable = useTimetableStore()

const tab = computed({
  get: () => config.state.ui.tab,
  set: (v) => (config.state.ui.tab = v),
})
</script>

<template>
  <el-container direction="vertical">
    <header class="app-header">
      <div class="brand">SchedMate<span class="sub">双人排班</span></div>
      <ImportBar />
    </header>
    <el-main class="app-main">
      <el-tabs v-model="tab">
        <el-tab-pane label="周视图 · 细排" name="week">
          <el-empty v-if="!timetable.hasAnyData" description="先在右上角导入 A / B 两份课表 xlsx">
            <template #image>
              <div style="font-size: 48px">📅</div>
            </template>
          </el-empty>
          <WeekView v-else />
        </el-tab-pane>
        <el-tab-pane label="鸟瞰 · 20 周总览" name="overview">
          <el-empty v-if="!timetable.hasAnyData" description="先在右上角导入 A / B 两份课表 xlsx" />
          <OverviewView v-else />
        </el-tab-pane>
      </el-tabs>
    </el-main>
  </el-container>
</template>
