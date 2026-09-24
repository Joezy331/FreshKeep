import { getRecipeById } from '../../data/recipe-database'
import { listIngredients, consumeIngredient } from '../../services/food/fridge'
import { recommendOne } from '../../services/recipe/recommend'
import { track } from '../../utils/analytics'
import { toast } from '../../utils/ui'
import type { RecipeRecommendation } from '../../types/recipe'

Page({
  data: {
    rec: null as RecipeRecommendation | null,
    rows: [] as any[],
    steps: [] as any[],
    stars: '',
    useFirst: [] as any[],
    showCook: false,
    consumeList: [] as any[]
  },

  onLoad(options: any) {
    const id = options.id
    if (!id) {
      toast('缺少菜谱参数')
      return
    }
    this.build(id)
  },

  build(id: string) {
    const fridge = listIngredients()
    let rec = recommendOne(fridge, id, { useExpiring: true })

    if (!rec) {
      const r = getRecipeById(id)
      if (!r) {
        toast('菜谱不存在')
        setTimeout(() => wx.navigateBack(), 700)
        return
      }
      const names = fridge.map((i) => i.name)
      const required = r.ingredients.filter((i) => !i.optional && !i.pantry)
      rec = {
        recipe: r,
        matchScore: 0,
        matchedIngredients: required.filter((i) => names.indexOf(i.name) >= 0).map((i) => i.name),
        missingIngredients: required.filter((i) => names.indexOf(i.name) < 0).map((i) => i.name),
        useFirst: [],
        noExtraBuy: false,
        reason: '冰箱里暂时没有匹配的食材'
      }
    }

    const names = fridge.map((i) => i.name)
    const rows = rec.recipe.ingredients.map((ing) => ({
      name: ing.name,
      amount: ing.amount,
      have: !!ing.pantry || names.indexOf(ing.name) >= 0,
      pantry: !!ing.pantry,
      optional: !!ing.optional
    }))

    const steps = rec.recipe.steps.map((s, i) => ({
      no: String(i + 1).padStart(2, '0'),
      text: s
    }))

    const consumeList = fridge
      .filter((i) => rec!.matchedIngredients.indexOf(i.name) >= 0)
      .map((i) => ({ ...i, checked: true }))

    this.setData({
      rec,
      rows,
      steps,
      stars: '⭐'.repeat(rec.recipe.difficulty),
      useFirst: rec.useFirst || [],
      consumeList
    })
    wx.setNavigationBarTitle({ title: rec.recipe.name })
  },

  openCook() {
    track('recipe_cook_clicked', { id: (this as any).data.rec.recipe.id })
    this.setData({ showCook: true })
  },

  closeCook() {
    this.setData({ showCook: false })
  },

  toggleConsume(e: any) {
    const idx = Number(e.currentTarget.dataset.idx)
    const list = (this as any).data.consumeList
    list[idx].checked = !list[idx].checked
    this.setData({ consumeList: list })
  },

  confirmCook() {
    const list = (this as any).data.consumeList as any[]
    const picked = list.filter((i) => i.checked)
    if (!picked.length) {
      toast('请选择要消耗的食材')
      return
    }
    picked.forEach((i) => {
      consumeIngredient(i.id)
      track('ingredient_consumed', { id: i.id, name: i.name, from: 'recipe_detail' })
    })
    this.setData({ showCook: false })
    wx.showToast({ title: `已消耗 ${picked.length} 种食材`, icon: 'success', duration: 1600 })
    setTimeout(() => {
      wx.switchTab({ url: '/pages/home/home' })
    }, 1400)
  },

  goFridge() {
    wx.switchTab({ url: '/pages/fridge/fridge' })
  },

  noop() {
    /* noop */
  }
})
