import type { RecipeRecommendation } from '../../types/recipe'

Component({
  properties: {
    item: { type: Object, value: null },
    /** 是否展示匹配细节（首页精简模式可关闭） */
    detail: { type: Boolean, value: true }
  },
  data: {
    stars: '',
    matchedList: [] as { name: string; ok: boolean }[],
    missingList: [] as { name: string; ok: boolean }[],
    useFirstText: ''
  },
  observers: {
    item: function (rec: RecipeRecommendation) {
      if (!rec) return
      const stars = '⭐'.repeat(rec.recipe.difficulty)
      this.setData({
        stars,
        matchedList: (rec.matchedIngredients || []).map((n) => ({ name: n, ok: true })),
        missingList: (rec.missingIngredients || []).map((n) => ({ name: n, ok: false })),
        useFirstText: (rec.useFirst || [])
          .map((u) => `${u.emoji}${u.name}(${u.daysLeft < 0 ? '已过期' : '还剩' + u.daysLeft + '天'})`)
          .join('  ')
      })
    }
  },
  methods: {
    onTap() {
      const rec = (this as any).data.item as RecipeRecommendation
      if (!rec) return
      this.triggerEvent('tap', { id: rec.recipe.id })
    }
  }
})
