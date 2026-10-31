import { ref } from 'vue'
import { ElNotification } from 'element-plus'
import type { ImportReport, Person } from '../types'
import { useTimetableStore } from '../stores/timetable'
import { useDutyStore } from '../stores/duty'
import { useConfigStore } from '../stores/config'

const CHINESE = /[\u4e00-\u9fff]/

function reportText(r: ImportReport): string {
  const parts = [`${r.weeks.length} 周 / ${r.courseCount} 节课`]
  if (r.clampedCount > 0) parts.push(`${r.clampedCount} 个连堂截断到第 8 节`)
  if (r.skippedCount > 0) parts.push(`忽略第 8 节之后的课 ${r.skippedCount} 块`)
  return parts.join('，')
}

/**
 * 导入入口：拖入的每份课表对应一个人员。
 * 文件名含中文 → 用它当人名（同名文件重导=更新该人）；
 * 否则 → 依导入顺序分配代号 A/B/C…（同名文件重导=更新该人）。
 */
export function useImport() {
  const config = useConfigStore()
  const timetable = useTimetableStore()
  const duty = useDutyStore()

  const importing = ref(false)

  function resolvePerson(file: File): Person {
    const stem = file.name.replace(/\.xlsx?$/i, '')
    if (CHINESE.test(stem)) {
      return config.state.persons.find((p) => p.name === stem) ?? config.addPerson(stem)
    }
    // 非中文文件名：按「上一次导入的文件名」匹配更新，否则分配未占用的字母代号
    const existing = config.state.persons.find((p) => timetable.state.meta[p.id]?.fileName === file.name)
    if (existing) return existing
    const used = new Set(config.state.persons.map((p) => p.name))
    const code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').find((ch) => !used.has(ch)) ?? `P${config.state.persons.length + 1}`
    return config.addPerson(code)
  }

  /** @returns 是否全部成功 */
  async function importFiles(files: File[]): Promise<boolean> {
    importing.value = true
    const lines: string[] = []
    try {
      for (const file of files) {
        const known = config.state.persons.length
        const person = resolvePerson(file)
        const created = config.state.persons.length > known
        let report
        try {
          report = await timetable.importFor(person.id, file)
        } catch (e) {
          // 解析失败不该在人员尺上留一个空人
          if (created) config.removePerson(person.id)
          throw e
        }
        const safeName = file.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        lines.push(`${person.name}（${safeName}）：${reportText(report)}`)
      }
      duty.resetHistory() // 事实已变，旧 undo 快照无意义
      if (lines.length) {
        ElNotification.success({
          title: `已导入 ${lines.length} 份课表`,
          message: lines.join('<br>'),
          dangerouslyUseHTMLString: true,
          duration: 6000,
        })
      }
      return true
    } catch (e) {
      ElNotification.error({
        title: '导入失败',
        message: e instanceof Error ? e.message : '解析失败，请确认文件格式',
        duration: 6000,
      })
      return false
    } finally {
      importing.value = false
    }
  }

  return { importing, importFiles }
}
