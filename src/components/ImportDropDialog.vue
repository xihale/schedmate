<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { PersonId } from '../types'
import { useConfigStore } from '../stores/config'
import { useTimetableStore } from '../stores/timetable'
import { useImport } from '../composables/useImport'

const props = defineProps<{ files: File[] }>()
const visible = defineModel<boolean>({ required: true })

const config = useConfigStore()
const timetable = useTimetableStore()
const { importing, importAndReport } = useImport()

/** 每个文件分配到的人员，默认按拖入顺序 A、B */
const assign = ref<PersonId[]>([])

watch(
  () => props.files,
  (files) => {
    const empty = (['A', 'B'] as PersonId[]).filter((pid) => !timetable.state.meta[pid])
    assign.value = files.map((_, i) => empty[i] ?? (i === 0 ? 'A' : 'B'))
  },
  { immediate: true },
)

const duplicate = computed(() => new Set(assign.value).size !== assign.value.length)

async function confirm(): Promise<void> {
  const pairs = props.files.map((f, i) => ({ file: f, pid: assign.value[i] }))
  for (const { file, pid } of pairs) {
    const ok = await importAndReport(pid, file)
    if (!ok) return // 失败时保持对话框打开，方便重试
  }
  visible.value = false
}
</script>

<template>
  <el-dialog v-model="visible" title="导入课表" width="500px">
    <div class="lead">把文件分配给对应的人（默认按拖入顺序）：</div>
    <div v-for="(f, i) in files" :key="`${f.name}-${i}`" class="row">
      <span class="fname" :title="f.name">{{ f.name }}</span>
      <el-radio-group v-model="assign[i]" size="small">
        <el-radio-button v-for="p in config.state.persons" :key="p.id" :value="p.id">
          {{ p.name }}
        </el-radio-button>
      </el-radio-group>
    </div>
    <el-alert
      v-if="duplicate"
      type="warning"
      :closable="false"
      title="有两个人分到了同一个文件，后导入的会覆盖先导入的"
      class="dup-alert"
    />
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="importing !== null" :disabled="duplicate" @click="confirm">
        导入
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.lead {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin-bottom: 10px;
}

.row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.fname {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dup-alert {
  margin-top: 4px;
  padding: 4px 8px;
}
</style>
