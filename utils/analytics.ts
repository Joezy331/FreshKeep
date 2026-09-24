import { TrackEvent } from '../types/user'
import { get, set, KEYS } from './storage'

export interface EventLog {
  event: string
  props?: Record<string, any>
  ts: number
}

const MAX_LOGS = 300

/** 埋点：先写内存队列再落盘，保证不阻塞 UI */
let queue: EventLog[] = get<EventLog[]>(KEYS.EVENTS, [])

export function track(event: TrackEvent | string, props?: Record<string, any>): void {
  const log: EventLog = { event, props: props || {}, ts: Date.now() }
  queue.push(log)
  if (queue.length > MAX_LOGS) queue = queue.slice(queue.length - MAX_LOGS)
  // 异步落盘，避免频繁同步写
  setTimeout(() => {
    set(KEYS.EVENTS, queue)
  }, 0)
  if (wx.getRealtimeLogManager) {
    try {
      wx.getRealtimeLogManager().info('[fk-track]', event, JSON.stringify(props || {}))
    } catch (e) {
      /* ignore */
    }
  }
}

export function getEvents(): EventLog[] {
  return get<EventLog[]>(KEYS.EVENTS, [])
}

export function clearEvents(): void {
  queue = []
  set(KEYS.EVENTS, [])
}

export interface MetricSummary {
  /** AI 识别成功率 */
  recognitionRate: string
  /** 食材添加数 */
  ingredientAdded: number
  /** 食材消耗数 */
  ingredientConsumed: number
  /** 临期食材消耗率 */
  expiringConsumeRate: string
  /** 食谱点击率（详情/推荐曝光） */
  recipeCtr: string
  total: number
  counts: Record<string, number>
}

export function getSummary(): MetricSummary {
  const events = getEvents()
  const counts: Record<string, number> = {}
  events.forEach((e) => {
    counts[e.event] = (counts[e.event] || 0) + 1
  })
  const c = (k: string) => counts[k] || 0
  const rate = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : '--')
  return {
    recognitionRate: rate(c('photo_recognition_success'), c('photo_recognition_click')),
    ingredientAdded: c('ingredient_added'),
    ingredientConsumed: c('ingredient_consumed'),
    expiringConsumeRate: rate(c('ingredient_consumed'), c('expiration_reminder_clicked')),
    recipeCtr: rate(c('recipe_detail_view'), c('recipe_recommendation_view')),
    total: events.length,
    counts
  }
}
