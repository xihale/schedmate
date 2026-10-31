import { reactive } from 'vue'

/**
 * 周页签的浸色：写入之后，从这个周往后一格一格浸上这个人的颜色，被课挡住的周不浸、缺一角。
 * 只在写入后的短暂时间里存在，之后退回纸色；它是反馈，不是常驻编码。
 */
export const wash = reactive<{ weeks: Record<number, string> }>({ weeks: {} })

const stamps: Record<number, number> = {}
let clearTimer = 0

export function washWeeks(weeks: number[], color: string): void {
  window.clearTimeout(clearTimer)
  weeks.forEach((w, i) => {
    window.clearTimeout(stamps[w])
    stamps[w] = window.setTimeout(() => {
      wash.weeks[w] = color
    }, i * 60)
  })
  const total = weeks.length * 60 + 2200
  clearTimer = window.setTimeout(() => {
    for (const w of weeks) delete wash.weeks[w]
  }, total)
}
