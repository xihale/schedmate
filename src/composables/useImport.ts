import { ref } from 'vue'
import { ElMessage, ElNotification } from 'element-plus'
import type { ImportReport, PersonId } from '../types'
import { useTimetableStore } from '../stores/timetable'
import { useDutyStore } from '../stores/duty'
import { useConfigStore } from '../stores/config'

function reportText(r: ImportReport): string {
  const parts = [`${r.weeks.length} 周 / ${r.courseCount} 节课`]
  if (r.clampedCount > 0) parts.push(`${r.clampedCount} 个连堂截断到第 8 节`)
  if (r.skippedCount > 0) parts.push(`忽略第 8 节之后的课 ${r.skippedCount} 块`)
  return parts.join('，')
}

/** 导入入口共用：点击上传 / 拖放导入都走这里 */
export function useImport() {
  const config = useConfigStore()
  const timetable = useTimetableStore()
  const duty = useDutyStore()

  const importing = ref<PersonId | null>(null)

  /** @returns 是否成功 */
  async function importAndReport(personId: PersonId, file: File): Promise<boolean> {
    importing.value = personId
    try {
      const report = await timetable.importFor(personId, file)
      duty.resetHistory() // 事实已变，旧 undo 快照无意义
      ElNotification.success({
        title: `${config.personName(personId)} 课表已导入`,
        message: `${file.name}：${reportText(report)}`,
        duration: 6000,
      })
      return true
    } catch (e) {
      ElMessage.error(e instanceof Error ? e.message : '解析失败，请确认文件格式')
      return false
    } finally {
      importing.value = null
    }
  }

  return { importing, importAndReport }
}
