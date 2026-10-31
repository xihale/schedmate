import { ref } from 'vue'

/** 一闪而过的反馈：写入、拒绝、撤销。不占常驻位子，所以顶栏里给它留一行高度。 */
export const statusText = ref('')

let timer = 0

export function flash(text: string, ms = 2800): void {
  statusText.value = text
  window.clearTimeout(timer)
  timer = window.setTimeout(() => {
    statusText.value = ''
  }, ms)
}
