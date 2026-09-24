import { findFood, AREA_BY_METHOD } from '../../data/food-database'
import type { FoodKnowledge, StorageArea, StorageMethod } from '../../types/ingredient'
import { addDays } from '../../utils/date'

export interface StorageAdvice {
  method: StorageMethod
  area: StorageArea
  days: number
  tips: string
  freezable: boolean
  /** 该食材的全部可选方案 */
  options: { method: StorageMethod; area: StorageArea; days: number; label: string }[]
}

const FALLBACK: StorageAdvice = {
  method: '冷藏',
  area: '冷藏区',
  days: 5,
  tips: '暂未收录该食材的保存建议，默认按冷藏处理，请结合实际情况判断。',
  freezable: false,
  options: [
    { method: '冷藏', area: '冷藏区', days: 5, label: '冷藏 · 冷藏区' },
    { method: '冷冻', area: '冷冻区', days: 30, label: '冷冻 · 冷冻区' },
    { method: '常温', area: '常温区', days: 3, label: '常温 · 阴凉处' }
  ]
}

/** 根据食材名 + （可选）指定保存方式，给出保存建议 */
export function getStorageAdvice(name: string, method?: StorageMethod): StorageAdvice {
  const food = findFood(name)
  if (!food) return FALLBACK
  const options = food.options
  const picked = method ? options.find((o) => o.method === method) || options[0] : options[0]
  return {
    method: picked.method,
    area: picked.area,
    days: picked.days,
    tips: food.tips,
    freezable: food.freezable,
    options
  }
}

/** 切换保存方式后，自动给出对应的默认分区 */
export function defaultAreaForMethod(name: string, method: StorageMethod): StorageArea {
  const food: FoodKnowledge | undefined = findFood(name)
  if (food) {
    const hit = food.options.find((o) => o.method === method)
    if (hit) return hit.area
  }
  return AREA_BY_METHOD[method][0]
}

/** 根据购买日期 + 参考保存天数，推算最佳食用期 */
export function calcBestBeforeFix(purchaseDate: string, days: number): string {
  return addDays(purchaseDate || new Date().toISOString().slice(0, 10), Math.max(0, days || 0))
}

/** 保存时长文案：把天数转成人类可读 */
export function describeDays(days: number): string {
  if (days >= 60) return `约 ${Math.round(days / 30)} 个月以内最佳`
  if (days >= 30) return `约 1 个月以内最佳`
  if (days >= 7) return `约 ${days} 天`
  return `约 ${Math.max(1, days)} 天`
}

export const DISCLAIMER =
  '以上保存时长为参考值，仅供食材管理使用；实际情况请结合食材状态（气味、颜色、触感）判断。'
