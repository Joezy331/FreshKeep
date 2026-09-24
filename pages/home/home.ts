import { listIngredients, getStats } from '../../services/food/fridge'
import { recommendRecipes } from '../../services/recipe/recommend'
import { buildReminders, todaySuggestion, markAllRead } from '../../services/notification/reminder'
import { track } from '../../utils/analytics'
import { greetingText } from '../../utils/date'
import type { Ingredient } from '../../types/ingredient'
import type { RecipeRecommendation } from '../../types/recipe'

interface HomeData {
  greeting: string
  stats: any
  expiring: any[]
  recipes: RecipeRecommendation[]
  suggestion: string
  reminderCount: number
  reminders: any[]
  showNotify: boolean
  bar: { fresh: number; soon: number; expired: number }
  loading: boolean
}

Page({
  data: {
    greeting: '',
    stats: { kinds: 0, items: 0, fresh: 0, soon: 0, urgent: 0, expired: 0, attention: 0 },
    expiring: [],
    recipes: [],
    suggestion: '',
    reminderCount: 0,
    reminders: [],
    showNotify: false,
    bar: { fresh: 0, soon: 0, expired: 0 },
    loading: true,
  } as HomeData,

  onLoad() {
    this.setData({ greeting: greetingText() })
  },

  onShow() {
    this.refresh()
    track('fridge_view')
  },

  refresh() {
    try {
      const list = listIngredients()
      const stats = getStats()
      const allRecs = recommendRecipes(list, { useExpiring: true, limit: 8 })

      const expiring = list
        .filter(
          (i: Ingredient) =>
            i.status === 'urgent' || i.status === 'expired' || i.status === 'soon'
        )
        .slice(0, 3)
        .map((i: Ingredient) => {
          const hit = allRecs.find((r) => r.matchedIngredients.indexOf(i.name) >= 0)
          return {
            ...i,
            suggestion: hit ? `今天可以用${i.name}做${hit.recipe.name}` : `建议尽快安排${i.name}`
          }
        })

      const total = Math.max(1, stats.kinds)
      const bar = {
        fresh: Math.round((stats.fresh / total) * 100),
        soon: Math.round(((stats.soon + stats.urgent) / total) * 100),
        expired: Math.round((stats.expired / total) * 100)
      }

      this.setData({
        stats,
        expiring,
        recipes: allRecs.slice(0, 3),
        suggestion: todaySuggestion(),
        reminderCount: buildReminders().filter((r) => !r.read).length,
        bar,
        loading: false
      })
      track('recipe_recommendation_view', { count: allRecs.length })
    } catch (e) {
      console.error('[home] refresh failed', e)
      this.setData({ loading: false })
    }
  },

  goScan() {
    track('photo_recognition_click', { from: 'home_scan_button' })
    wx.navigateTo({ url: '/pages/scan/scan' })
  },

  quickCamera() {
    track('photo_recognition_click', { from: 'home_camera' })
    wx.navigateTo({ url: '/pages/scan/scan?source=camera' })
  },

  quickAlbum() {
    track('photo_recognition_click', { from: 'home_album' })
    wx.navigateTo({ url: '/pages/scan/scan?source=album' })
  },

  quickManual() {
    wx.navigateTo({ url: '/pages/ingredient/ingredient?mode=manual' })
  },

  goRecipe(e: any) {
    const id = e.detail.id
    track('recipe_detail_view', { id, from: 'home' })
    wx.navigateTo({ url: `/pages/recipe-detail/recipe-detail?id=${id}` })
  },

  goRecipeById(e: any) {
    const id = e.currentTarget.dataset.id
    track('recipe_detail_view', { id, from: 'home_more' })
    wx.navigateTo({ url: `/pages/recipe-detail/recipe-detail?id=${id}` })
  },

  onCook(e: any) {
    const name = e.detail.name
    track('expiration_reminder_clicked', { name, from: 'home' })
    const list = listIngredients()
    const recs = recommendRecipes(list, { useExpiring: true, limit: 1 })
    if (recs.length) {
      wx.navigateTo({ url: `/pages/recipe-detail/recipe-detail?id=${recs[0].recipe.id}` })
    } else {
      wx.switchTab({ url: '/pages/recipe/recipe' })
    }
  },

  onIngredientTap(e: any) {
    wx.navigateTo({ url: `/pages/ingredient/ingredient?mode=edit&id=${e.detail.id}` })
  },

  openNotify() {
    const reminders = buildReminders()
    this.setData({ reminders, showNotify: true })
  },

  closeNotify() {
    this.setData({ showNotify: false })
  },

  readAll() {
    markAllRead()
    this.setData({ reminders: buildReminders(), reminderCount: 0 })
    wx.showToast({ title: '已全部标记已读', icon: 'none' })
  },

  goSettings() {
    wx.switchTab({ url: '/pages/profile/profile' })
  },

  goMore() {
    wx.switchTab({ url: '/pages/recipe/recipe' })
  },

  goFridge() {
    wx.switchTab({ url: '/pages/fridge/fridge' })
  },

  noop() {
    /* 阻止冒泡 */
  }
})
