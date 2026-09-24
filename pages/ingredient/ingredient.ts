import { getAllFoodNames, findFood, AREA_BY_METHOD, FRIDGE_ZONES } from '../../data/food-database'
import { getStorageAdvice, defaultAreaForMethod, describeDays, DISCLAIMER } from '../../services/food/storage-advice'
import { addIngredient, updateIngredient, removeIngredient } from '../../services/food/fridge'
import { listIngredients } from '../../services/food/fridge'
import { today, addDays } from '../../utils/date'
import { get, set, KEYS, genId } from '../../utils/storage'
import { track } from '../../utils/analytics'
import { toast, confirm as uiConfirm } from '../../utils/ui'
import type { RecognizedItem } from '../../services/ai/types'
import type { Ingredient, StorageMethod, StorageArea } from '../../types/ingredient'

interface EditItem {
  key: string
  name: string
  emoji: string
  quantity: number
  unit: string
  purchaseDate: string
  storageMethod: StorageMethod
  storageArea: StorageArea
  bestBeforeDate: string
  confidence: number
  tips: string
  adviceText: string
  recommendedDays: number
  areaOptions: StorageArea[]
  quickDays: number[]
}

const UNITS = ['个', '把', '根', '颗', '块', 'g', 'ml', 'kg', '份', '袋', '盒']
const METHODS: StorageMethod[] = ['冷藏', '冷冻', '常温']

function emptyItem(): EditItem {
  return {
    key: genId('e'),
    name: '',
    emoji: '🥗',
    quantity: 1,
    unit: '个',
    purchaseDate: today(),
    storageMethod: '冷藏',
    storageArea: '冷藏区',
    bestBeforeDate: addDays(today(), 5),
    confidence: 0,
    tips: '选择食材后，会自动给出保存建议。',
    adviceText: '待选择',
    recommendedDays: 5,
    areaOptions: AREA_BY_METHOD['冷藏'],
    quickDays: [3, 5, 7]
  }
}

Page({
  data: {
    mode: 'manual',
    title: '确认食材',
    items: [] as EditItem[],
    foodNames: [] as string[],
    methods: METHODS,
    units: UNITS,
    areas: FRIDGE_ZONES.map((z: any) => z.area),
    image: '',
    disclaimer: DISCLAIMER,
    editId: ''
  },

  onLoad(options: any) {
    const mode = options.mode || 'manual'
    const titles: Record<string, string> = {
      confirm: '确认识别结果',
      manual: '手动添加食材',
      edit: '编辑食材'
    }
    this.setData({ mode, title: titles[mode] || '确认食材', foodNames: getAllFoodNames() })

    if (mode === 'confirm') {
      const pending = get<{ items: RecognizedItem[]; image: string }>(KEYS.PENDING, null as any)
      if (!pending || !pending.items || !pending.items.length) {
        toast('没有待确认的食材')
        setTimeout(() => wx.navigateBack(), 800)
        return
      }
      const items = pending.items.map((r) => this.fromRecognized(r))
      this.setData({ items, image: pending.image || '' })
      wx.setNavigationBarTitle({ title: `发现 ${items.length} 种食材` })
    } else if (mode === 'edit') {
      const id = options.id
      const ing = listIngredients().find((i) => i.id === id)
      if (!ing) {
        toast('食材不存在')
        setTimeout(() => wx.navigateBack(), 800)
        return
      }
      this.setData({ items: [this.fromIngredient(ing)], editId: id })
    } else {
      this.setData({ items: [emptyItem()] })
    }
  },

  fromRecognized(r: RecognizedItem): EditItem {
    const food = findFood(r.name)
    const advice = getStorageAdvice(r.name)
    const purchaseDate = today()
    return {
      key: genId('e'),
      name: r.name,
      emoji: r.emoji || (food ? food.emoji : '🥗'),
      quantity: food ? food.defaultQuantity : 1,
      unit: food ? food.defaultUnit : '个',
      purchaseDate,
      storageMethod: r.storageMethod || advice.method,
      storageArea: r.storageArea || advice.area,
      bestBeforeDate: addDays(purchaseDate, r.recommendedDays || advice.days),
      confidence: r.confidence || 0,
      tips: r.tips || advice.tips,
      adviceText: `建议${r.storageMethod || advice.method} · ${r.storageArea || advice.area} · ${describeDays(
        r.recommendedDays || advice.days
      )}`,
      recommendedDays: r.recommendedDays || advice.days,
      areaOptions: AREA_BY_METHOD[r.storageMethod || advice.method],
      quickDays: [3, r.recommendedDays || advice.days, 7].filter(
        (v, i, a) => a.indexOf(v) === i
      )
    }
  },

  fromIngredient(ing: Ingredient): EditItem {
    const advice = getStorageAdvice(ing.name, ing.storageMethod)
    return {
      key: ing.id,
      name: ing.name,
      emoji: ing.emoji,
      quantity: ing.quantity,
      unit: ing.unit,
      purchaseDate: ing.purchaseDate,
      storageMethod: ing.storageMethod,
      storageArea: ing.storageArea,
      bestBeforeDate: ing.bestBeforeDate,
      confidence: ing.confidence || 0,
      tips: advice.tips,
      adviceText: `建议${advice.method} · ${advice.area} · ${describeDays(advice.days)}`,
      recommendedDays: advice.days,
      areaOptions: AREA_BY_METHOD[ing.storageMethod],
      quickDays: [3, advice.days, 7].filter((v, i, a) => a.indexOf(v) === i)
    }
  },

  /** 重新计算某条的保存建议与最佳食用期 */
  refreshAdvice(idx: number, keepDate: boolean) {
    const items = (this as any).data.items as EditItem[]
    const it = { ...items[idx] }
    const advice = getStorageAdvice(it.name, it.storageMethod)
    it.emoji = (findFood(it.name) || { emoji: '🥗' }).emoji
    it.tips = advice.tips
    it.adviceText = `建议${advice.method} · ${advice.area} · ${describeDays(advice.days)}`
    it.recommendedDays = advice.days
    it.areaOptions = AREA_BY_METHOD[it.storageMethod]
    if (it.areaOptions.indexOf(it.storageArea) < 0) it.storageArea = advice.area
    if (!keepDate) it.bestBeforeDate = addDays(it.purchaseDate, advice.days)
    it.quickDays = [3, advice.days, 7].filter((v, i, a) => a.indexOf(v) === i)
    items[idx] = it
    this.setData({ items })
  },

  onName(e: any) {
    const idx = Number(e.currentTarget.dataset.idx)
    const items = (this as any).data.items as EditItem[]
    items[idx] = { ...items[idx], name: (this as any).data.foodNames[e.detail.value] }
    this.setData({ items })
    this.refreshAdvice(idx, false)
  },

  onQty(e: any) {
    const idx = Number(e.currentTarget.dataset.idx)
    const items = (this as any).data.items as EditItem[]
    const v = Number(e.detail.value)
    items[idx] = { ...items[idx], quantity: isNaN(v) || v <= 0 ? 1 : v }
    this.setData({ items })
  },

  onUnit(e: any) {
    const idx = Number(e.currentTarget.dataset.idx)
    const items = (this as any).data.items as EditItem[]
    items[idx] = { ...items[idx], unit: UNITS[e.detail.value] }
    this.setData({ items })
  },

  onPurchase(e: any) {
    const idx = Number(e.currentTarget.dataset.idx)
    const items = (this as any).data.items as EditItem[]
    items[idx] = { ...items[idx], purchaseDate: e.detail.value }
    this.setData({ items })
    this.refreshAdvice(idx, false)
  },

  onMethod(e: any) {
    const idx = Number(e.currentTarget.dataset.idx)
    const items = (this as any).data.items as EditItem[]
    const method = METHODS[e.detail.value]
    items[idx] = { ...items[idx], storageMethod: method }
    this.setData({ items })
    this.refreshAdvice(idx, false)
  },

  onArea(e: any) {
    const idx = Number(e.currentTarget.dataset.idx)
    const items = (this as any).data.items as EditItem[]
    const area = items[idx].areaOptions[e.detail.value]
    items[idx] = { ...items[idx], storageArea: area }
    this.setData({ items })
  },

  onBestBefore(e: any) {
    const idx = Number(e.currentTarget.dataset.idx)
    const items = (this as any).data.items as EditItem[]
    items[idx] = { ...items[idx], bestBeforeDate: e.detail.value }
    this.setData({ items })
  },

  onQuickDays(e: any) {
    const idx = Number(e.currentTarget.dataset.idx)
    const days = Number(e.currentTarget.dataset.days)
    const items = (this as any).data.items as EditItem[]
    items[idx] = { ...items[idx], bestBeforeDate: addDays(items[idx].purchaseDate, days) }
    this.setData({ items })
  },

  async submit() {
    const items = (this as any).data.items as EditItem[]
    const mode = (this as any).data.mode
    const valid = items.filter((i) => i.name)
    if (!valid.length) {
      toast('请先选择食材名称')
      return
    }

    if (mode === 'edit') {
      const it = valid[0]
      updateIngredient((this as any).data.editId, {
        name: it.name,
        emoji: it.emoji,
        quantity: it.quantity,
        unit: it.unit,
        purchaseDate: it.purchaseDate,
        storageMethod: it.storageMethod,
        storageArea: it.storageArea,
        bestBeforeDate: it.bestBeforeDate
      })
      toast('已更新', 'success')
      setTimeout(() => wx.navigateBack(), 600)
      return
    }

    valid.forEach((it) => {
      addIngredient({
        name: it.name,
        quantity: it.quantity,
        unit: it.unit,
        purchaseDate: it.purchaseDate,
        storageMethod: it.storageMethod,
        storageArea: it.storageArea,
        bestBeforeDate: it.bestBeforeDate,
        image: (this as any).data.image,
        confidence: it.confidence || undefined,
        source: mode === 'confirm' ? 'ai' : 'manual'
      })
      track('ingredient_added', {
        name: it.name,
        method: it.storageMethod,
        area: it.storageArea,
        source: mode === 'confirm' ? 'ai' : 'manual'
      })
    })

    set(KEYS.PENDING, null)
    toast(`已加入冰箱 · ${valid.length} 种`, 'success')
    setTimeout(() => {
      wx.switchTab({ url: '/pages/fridge/fridge' })
    }, 700)
  },

  async removeItem() {
    const id = (this as any).data.editId
    if (!id) return
    const ok = await uiConfirm('确定要移除这个食材吗？', '移除食材')
    if (!ok) return
    removeIngredient(id)
    track('ingredient_deleted', { id })
    toast('已移除')
    setTimeout(() => wx.navigateBack(), 600)
  },

  rescan() {
    wx.navigateBack()
  },

  goBack() {
    wx.navigateBack()
  }
})
