import { findFood, normalizeFoodName } from '../../data/food-database'
import type { RecognizedItem, IngredientCategory, StorageArea, StorageMethod } from './types'

/**
 * 识别核心（纯函数，不依赖 wx，可在 Node 单测中真实执行）
 * ---------------------------------------------------------------
 * 职责：
 *  - 把「百度 dish 返回的候选列表」转成统一的 RecognizedItem[]（候选数组，非 Top-1）
 *  - 对 Provider 已产出的候选再做一次集中式归一化（保证 known 透出、去重）
 *  - 置信度归一（0~1；>1 视为百分制自动 /100），并叠加未命中的负偏置
 * 不负责网络请求、不写存储、不打埋点，便于单元测试覆盖。
 */

/** 百度 dish 单条原始结构 */
export interface BaiduCandidate {
  name?: string
  probability?: number
  calorie?: number
}

/** 把百度 dish 返回的候选列表 → 候选食材数组（保留多个候选，按原顺序，去重） */
export function buildCandidatesFromBaidu(results: BaiduCandidate[]): RecognizedItem[] {
  if (!Array.isArray(results)) return []
  const items: RecognizedItem[] = []
  const seen = new Set<string>()
  results.forEach((r) => {
    const raw = String((r && r.name) || '').trim()
    if (!raw) return
    const norm = normalizeFoodName(raw)
    if (seen.has(norm.canonical)) return
    seen.add(norm.canonical)
    items.push(toRecognizedItem(norm, Number(r.probability)))
  })
  return items
}

/** 对 Provider 已产出的 RecognizedItem[] 再做集中式归一化（统一 known 透出 + 去重） */
export function normalizeCandidates(items: RecognizedItem[]): RecognizedItem[] {
  if (!Array.isArray(items)) return []
  const out: RecognizedItem[] = []
  const seen = new Set<string>()
  items.forEach((it) => {
    const norm = normalizeFoodName(it.name)
    const key = `${norm.canonical}|${it.storageMethod || ''}`
    if (seen.has(key)) return
    seen.add(key)
    // 命中知识库时，分类以知识库为准（单一事实来源），避免 Provider 带来错误分类
    const dbCat = norm.known ? findFood(norm.canonical)?.category : undefined
    out.push({
      ...it,
      name: norm.canonical,
      category: (dbCat ?? (norm.known ? it.category : '其他')) as IngredientCategory,
      known: norm.known,
      confidence: clampConfidence(it.confidence + norm.confidenceBias)
    })
  })
  return out
}

/** 归一化结果 → RecognizedItem */
function toRecognizedItem(
  norm: ReturnType<typeof normalizeFoodName>,
  probability: number
): RecognizedItem {
  const food = norm.known ? findFood(norm.canonical) : undefined
  const method: StorageMethod = food ? food.options[0].method : '冷藏'
  const area: StorageArea = food ? food.options[0].area : '冷藏区'
  const days = food ? food.options[0].days : 5
  return {
    name: norm.canonical,
    confidence: clampConfidence(probability + norm.confidenceBias),
    category: norm.category,
    storageMethod: method,
    storageArea: area,
    recommendedDays: days,
    emoji: food ? food.emoji : '🥗',
    tips: food ? food.tips : '未收录该食材，已按冷藏 5 天记录，请确认名称与保存方式。',
    known: norm.known
  }
}

/** 置信度归一：NaN/<=0 → 0.8；>1 → 视为百分制 /100；上限 1 */
export function clampConfidence(v: number): number {
  let c = Number(v)
  if (isNaN(c) || c <= 0) c = 0.8
  if (c > 1) c = c / 100
  if (c > 1) c = 1
  return Number(c.toFixed(2))
}
