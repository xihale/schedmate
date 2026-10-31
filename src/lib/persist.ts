import { watch } from 'vue'

const PREFIX = 'schedmate:'
const META_KEY = `${PREFIX}meta`
/** 数据闲置多少天后自动清理；改这里即可调整保留期。 */
export const IDLE_TTL_DAYS = 15
const IDLE_TTL_MS = IDLE_TTL_DAYS * 24 * 60 * 60 * 1000
/** 本次会话刚清理过数据的标记，用于空态提示（读完即删）。 */
export const PURGED_FLAG = `${PREFIX}purged`

/** 记录最近一次使用时间：打开页面或写入数据都会刷新闲置计时。 */
export function touch(): void {
  try {
    localStorage.setItem(META_KEY, JSON.stringify({ touchedAt: Date.now() }))
  } catch {
    /* 存储不可用时忽略 */
  }
}

/**
 * 启动时清理闲置过期的存档。
 * 没有 meta 的旧存档视为「刚用过」，避免升级后第一次打开就清掉现有数据。
 * @returns 是否发生了清理
 */
export function purgeIfIdle(): boolean {
  let touchedAt = 0
  try {
    const raw = localStorage.getItem(META_KEY)
    if (raw) {
      const meta: unknown = JSON.parse(raw)
      if (meta && typeof meta === 'object' && 'touchedAt' in meta && typeof meta.touchedAt === 'number') {
        touchedAt = meta.touchedAt
      }
    }
  } catch {
    /* meta 损坏时按缺失处理 */
  }
  if (!touchedAt || Date.now() - touchedAt <= IDLE_TTL_MS) return false
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(PREFIX)) localStorage.removeItem(key)
    }
    sessionStorage.setItem(PURGED_FLAG, '1')
  } catch {
    /* 存储不可用时没有可清理的数据 */
  }
  return true
}

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
          touch()
        } catch {
          /* 存储满时静默失败 */
        }
      }, 250)
    },
    { deep: true },
  )
}
