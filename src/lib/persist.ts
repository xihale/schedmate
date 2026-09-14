import { watch } from 'vue'

export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

/** 深度 watch + 防抖写入 localStorage */
export function persistOn(source: () => unknown, key: string): void {
  let timer: number | undefined
  watch(
    source,
    (v) => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        try {
          localStorage.setItem(key, JSON.stringify(v))
        } catch {
          /* 存储满时静默失败 */
        }
      }, 250)
    },
    { deep: true },
  )
}
