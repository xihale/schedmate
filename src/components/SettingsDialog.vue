<script setup lang="ts">
import { useConfigStore } from '../stores/config'
import { useTimetableStore } from '../stores/timetable'
import { useDutyStore } from '../stores/duty'
import { ElMessageBox, ElMessage } from 'element-plus'

const visible = defineModel<boolean>({ required: true })
const config = useConfigStore()
const timetable = useTimetableStore()
const duty = useDutyStore()

function addPerson(): void {
  const used = new Set(config.state.persons.map((p) => p.name))
  let n = config.state.persons.length + 1
  let name = `新人${n}`
  while (used.has(name)) {
    n += 1
    name = `新人${n}`
  }
  config.addPerson(name)
}

async function removePerson(id: string, name: string): Promise<void> {
  const courses = timetable.state.courses.filter((c) => c.personId === id).length
  const duties = Object.values(duty.state.map).filter((e) => e.personId === id).length
  try {
    await ElMessageBox.confirm(
      `将去掉「${name}」的 ${courses} 门课和 ${duties} 条排班。人员移除不能撤销，撤销记录也会清空。`,
      '移除人员',
      { type: 'warning', confirmButtonText: '移除', cancelButtonText: '取消', confirmButtonType: 'danger' },
    )
  } catch {
    return
  }
  timetable.clearPerson(id)
  duty.forgetPerson(id)
  config.removePerson(id)
  ElMessage.success(`已移除${name}`)
}

async function clearDuties(): Promise<void> {
  try {
    await ElMessageBox.confirm(`确定清空 ${duty.count} 条排班？课表还在。`, '清空排班', {
      type: 'warning',
      confirmButtonText: '清空',
      cancelButtonText: '取消',
      confirmButtonType: 'danger',
    })
  } catch {
    return
  }
  duty.clearAllDuties()
  ElMessage.success('排班已清空')
}

async function clearEverything(): Promise<void> {
  try {
    await ElMessageBox.confirm(
      `将删除全部课表和 ${duty.count} 条排班。人员姓名、颜色和学期起点会保留。`,
      '清空课表和排班',
      { type: 'warning', confirmButtonText: '清空', cancelButtonText: '取消', confirmButtonType: 'danger' },
    )
  } catch {
    return
  }
  timetable.clearAll()
  duty.clearAllDuties()
  ElMessage.success('课表和排班已清空')
}
</script>

<template>
  <el-dialog v-model="visible" title="设置" width="460px" align-center>
    <section class="sec">
      <h4>人员</h4>
      <div v-for="p in config.state.persons" :key="p.id" class="person">
        <el-color-picker v-model="p.color" size="small" :aria-label="`${p.name}的颜色`" />
        <el-input v-model="p.name" maxlength="10" aria-label="姓名" />
        <button class="link danger" @click="removePerson(p.id, p.name)">移除</button>
      </div>
      <button class="btn-add" @click="addPerson">＋ 添加人员</button>
    </section>

    <section class="sec">
      <h4>学期</h4>
      <label class="row">
        <span>第 1 周周一</span>
        <el-date-picker v-model="config.state.semesterStart" type="date" value-format="YYYY-MM-DD" :clearable="false" style="width: 160px" />
      </label>
    </section>

    <section class="sec">
      <h4>数据</h4>
      <div class="row">
        <button class="link danger" @click="clearDuties">清空排班</button>
        <button class="link danger" @click="clearEverything">清空课表和排班</button>
      </div>
    </section>
  </el-dialog>
</template>

<style scoped>
.sec + .sec {
  margin-top: 24px;
}

h4 {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
  letter-spacing: 0.02em;
}

.person {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 6px;
  margin: 2px 0;
  transition: background-color 0.15s ease;
}

.person:hover {
  background: var(--tint);
}

.btn-add {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 30px;
  padding: 0 12px;
  margin-top: 6px;
  border: 1px dashed var(--line-strong);
  background: transparent;
  font-size: 12px;
  font-weight: 500;
  color: var(--ink);
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.btn-add:hover {
  border-color: var(--ink);
  background: var(--tint);
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 4px 0;
}

.link {
  flex: none;
  height: 28px;
  padding: 0 10px;
  border: 0;
  background: transparent;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.link:hover {
  background: var(--tint);
}

.danger {
  color: var(--red);
}

.danger:hover {
  background: rgba(227, 6, 19, 0.08);
}
</style>
