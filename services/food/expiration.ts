import { addDays, daysUntil } from '../../utils/date'
import type { Ingredient, IngredientStatus } from '../../types/ingredient'

/** 临期阈值：<=1 天 建议尽快食用；<=3 天 即将到期 */
export const URGENT_DAYS = 1
export const SOON_DAYS = 3

export const STATUS_TEXT: Record<IngredientStatus, string> = {
  fresh: '新鲜',
  soon: '即将到期',
  urgent: '建议尽快食用',
  expired: '已超过最佳食用期'
}

/** 计算单个食材状态 */
export function computeStatus(bestBeforeDate: string): {
  status: IngredientStatus
  daysLeft: number
} {
  const daysLeft = daysUntil(bestBeforeDate)
  let status: IngredientStatus = 'fresh'
  if (daysLeft < 0) status = 'expired'
  else if (daysLeft <= URGENT_DAYS) status = 'urgent'
  else if (daysLeft <= SOON_DAYS) status = 'soon'
  return { status, daysLeft }
}

/** 批量注入运行时状态 */
export function withStatus(list: Ingredient[]): Ingredient[] {
  return list.map((item) => {
    const { status, daysLeft } = computeStatus(item.bestBeforeDate)
    return { ...item, status, daysLeft }
  })
}

/** 根据购买日期 + 保存天数推算最佳食用期 */
export function calcBestBefore(purchaseDate: string, days: number): string {
  return addDays(purchaseDate, Math.max(0, days))
}

/** 是否已过期（超过最佳食用期） */
export function isExpired(item: Ingredient): boolean {
  return daysUntil(item.bestBeforeDate) < 0
}

export interface FridgeStats {
  /** 种类数 */
  kinds: number
  /** 件数 */
  items: number
  fresh: number
  soon: number
  urgent: number
  expired: number
  /** 需要优先消耗的（urgent + expired） */
  attention: number
}

export function computeStats(list: Ingredient[]): FridgeStats {
  const items = withStatus(list)
  const s: FridgeStats = {
    kinds: items.length,
    items: 0,
    fresh: 0,
    soon: 0,
    urgent: 0,
    expired: 0,
    attention: 0
  }
  items.forEach((i) => {
    // g / ml / kg 按 1 件计，避免数字失真
    const weightUnit = ['g', 'ml', 'kg'].indexOf(i.unit) >= 0
    s.items += weightUnit ? 1 : Number(i.quantity) || 1
    if (i.status === 'fresh') s.fresh += 1
    else if (i.status === 'soon') s.soon += 1
    else if (i.status === 'urgent') s.urgent += 1
    else s.expired += 1
  })
  s.attention = s.urgent + s.expired
  return s
}

/** 状态排序权重：越紧急越靠前 */
export const STATUS_WEIGHT: Record<IngredientStatus, number> = {
  expired: 0,
  urgent: 1,
  soon: 2,
  fresh: 3
}

export function sortByUrgency(list: Ingredient[]): Ingredient[] {
  return withStatus(list).sort(
    (a, b) =>
      STATUS_WEIGHT[a.status as IngredientStatus] - STATUS_WEIGHT[b.status as IngredientStatus] ||
      (a.daysLeft ?? 0) - (b.daysLeft ?? 0)
  )
}
