import { listIngredients, groupByZone, filterIngredients, getStats } from '../../services/food/fridge'
import { recommendRecipes } from '../../services/recipe/recommend'
import { track } from '../../utils/analytics'
import type { Ingredient } from '../../types/ingredient'

const CATEGORIES = ['全部', '蔬菜', '水果', '肉类', '蛋类', '奶制品', '海鲜', '豆制品', '调味品', '主食', '其他']

Page({
  data: {
    stats: { kinds: 0, items: 0, fresh: 0, soon: 0, urgent: 0, expired: 0, attention: 0 },
    zones: [] as any[],
    keyword: '',
    categories: CATEGORIES,
    activeCategory: '全部',
    hasResult: true,
    loading: true
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    try {
      const all = listIngredients()
      const list = filterIngredients(all, (this as any).data.keyword, (this as any).data.activeCategory)
      const zones = groupByZone(list)
      this.setData({
        stats: getStats(),
        zones,
        hasResult: zones.some((z: any) => (z.items || []).length > 0),
        loading: false
      })
      track('fridge_view', { kinds: all.length })
    } catch (e) {
      console.error('[fridge] refresh failed', e)
      this.setData({ loading: false })
    }
  },

  onSearch(e: any) {
    this.setData({ keyword: e.detail.value })
    this.refresh()
  },

  onCategory(e: any) {
    const cat = e.currentTarget.dataset.cat
    if (cat === (this as any).data.activeCategory) return
    this.setData({ activeCategory: cat })
    this.refresh()
  },

  onItemTap(e: any) {
    const id = e.detail.id
    if (!id) return
    wx.navigateTo({ url: `/pages/ingredient/ingredient?mode=edit&id=${id}` })
  },

  onCook(e: any) {
    const id = e.detail.id
    const name = e.detail.name
    track('expiration_reminder_clicked', { id, name, from: 'fridge' })
    const list = listIngredients()
    const recs = recommendRecipes(list, { useExpiring: true, limit: 1 })
    if (recs.length) {
      wx.navigateTo({ url: `/pages/recipe-detail/recipe-detail?id=${recs[0].recipe.id}` })
    } else {
      wx.switchTab({ url: '/pages/recipe/recipe' })
    }
  },

  showAddSheet() {
    wx.showActionSheet({
      itemList: ['拍照识别', '从相册选择', '手动添加'],
      success: (res: any) => {
        if (res.tapIndex === 0) {
          track('photo_recognition_click', { from: 'fridge_sheet' })
          wx.navigateTo({ url: '/pages/scan/scan?source=camera' })
        } else if (res.tapIndex === 1) {
          track('photo_recognition_click', { from: 'fridge_sheet' })
          wx.navigateTo({ url: '/pages/scan/scan?source=album' })
        } else {
          wx.navigateTo({ url: '/pages/ingredient/ingredient?mode=manual' })
        }
      },
      fail: () => {}
    })
  },

  goScan() {
    track('photo_recognition_click', { from: 'fridge_empty' })
    wx.navigateTo({ url: '/pages/scan/scan?source=camera' })
  },

  onClearKeyword() {
    this.setData({ keyword: '' })
    this.refresh()
  }
})
