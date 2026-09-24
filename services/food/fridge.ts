import { get, set, KEYS, genId } from '../../utils/storage'
import { FRIDGE_ZONES } from '../../data/food-database'
import { findFood } from '../../data/food-database'
import { today } from '../../utils/date'
import { withStatus, computeStats, computeStatus, sortByUrgency, type FridgeStats } from './expiration'
import { getStorageAdvice, calcBestBeforeFix } from './storage-advice'
import type { Ingredient, StorageArea } from '../../types/ingredient'

/** 读取全部食材（带运行时状态） */
export function listIngredients(): Ingredient[] {
  const raw = get<Ingredient[]>(KEYS.INGREDIENTS, [])
  return sortByUrgency(Array.isArray(raw) ? raw : [])
}

function persist(list: Ingredient[]) {
  return set(KEYS.INGREDIENTS, list)
}

export interface AddIngredientInput {
  name: string
  quantity: number
  unit: string
  purchaseDate: string
  storageMethod?: Ingredient['storageMethod']
  storageArea?: StorageArea
  bestBeforeDate?: string
  image?: string
  confidence?: number
  source?: Ingredient['source']
  note?: string
}

/** 新增食材：自动补全 emoji / 分类 / 保存建议 / 最佳食用期 */
export function addIngredient(input: AddIngredientInput): Ingredient {
  const food = findFood(input.name)
  const advice = getStorageAdvice(input.name, input.storageMethod)
  const method = input.storageMethod || advice.method
  const item: Ingredient = {
    id: genId('ing'),
    name: input.name,
    emoji: food ? food.emoji : '🥗',
    category: food ? food.category : '其他',
    quantity: Number(input.quantity) || 1,
    unit: input.unit || (food ? food.defaultUnit : '份'),
    purchaseDate: input.purchaseDate || today(),
    storageMethod: method,
    storageArea: input.storageArea || advice.area,
    bestBeforeDate:
      input.bestBeforeDate || calcBestBeforeFix(input.purchaseDate || today(), advice.days),
    image: input.image,
    confidence: input.confidence,
    source: input.source || 'manual',
    note: input.note,
    createdAt: Date.now()
  }
  const list = get<Ingredient[]>(KEYS.INGREDIENTS, [])
  list.unshift(item)
  persist(list)
  const { status, daysLeft } = computeStatus(item.bestBeforeDate)
  return { ...item, status, daysLeft }
}

export function updateIngredient(id: string, patch: Partial<Ingredient>): Ingredient | null {
  const list = get<Ingredient[]>(KEYS.INGREDIENTS, [])
  const idx = list.findIndex((i) => i.id === id)
  if (idx < 0) return null
  list[idx] = { ...list[idx], ...patch }
  persist(list)
  return list[idx]
}

export function removeIngredient(id: string): boolean {
  const list = get<Ingredient[]>(KEYS.INGREDIENTS, [])
  const next = list.filter((i) => i.id !== id)
  persist(next)
  return next.length !== list.length
}

/** 消耗：减少数量，归零则移除。返回剩余数量（0 表示已移除） */
export function consumeIngredient(id: string, amount?: number): number {
  const list = get<Ingredient[]>(KEYS.INGREDIENTS, [])
  const idx = list.findIndex((i) => i.id === id)
  if (idx < 0) return 0
  const item = list[idx]
  const used = amount === undefined ? Number(item.quantity) : amount
  const left = Number(item.quantity) - used
  if (left <= 0) {
    list.splice(idx, 1)
  } else {
    list[idx] = { ...item, quantity: left }
  }
  persist(list)
  return Math.max(0, left)
}

/** 按冰箱分区聚合 */
export function groupByZone(list: Ingredient[]) {
  return FRIDGE_ZONES.map((zone) => ({
    ...zone,
    items: sortByUrgency(list.filter((i) => i.storageArea === zone.area))
  }))
}

/** 搜索 + 分类筛选 */
export function filterIngredients(
  list: Ingredient[],
  keyword: string,
  category: string
): Ingredient[] {
  const k = (keyword || '').trim()
  return list.filter((i) => {
    const matchKw = !k || i.name.includes(k)
    const matchCat = !category || category === '全部' || i.category === category
    return matchKw && matchCat
  })
}

export function getStats(): FridgeStats {
  return computeStats(listIngredients())
}

export function getById(id: string): Ingredient | undefined {
  return listIngredients().find((i) => i.id === id)
}

export { withStatus, sortByUrgency }
