import { listIngredients } from '../../services/food/fridge'
import { recommendRecipes, parseIntent } from '../../services/recipe/recommend'
// 直接依赖叶子模块，不走 services/ai 的 barrel，避免间接引入风险
import { getAiConfig, isAiReady } from '../../services/ai/config'
import { chat } from '../../services/ai/opencode-zen'
import { track } from '../../utils/analytics'
import { toast } from '../../utils/ui'
import type { RecipeRecommendation } from '../../types/recipe'

interface Filters {
  onlyFridge: boolean
  noSpicy: boolean
  maxTime: number
  useExpiring: boolean
  keyword: string
}

const QUICK_FILTERS = [
  { key: 'useExpiring', label: '优先消耗临期' },
  { key: 'onlyFridge', label: '只用冰箱里的' },
  { key: 'noSpicy', label: '不要辣' },
  { key: 'quick', label: '15 分钟内' }
]

const EXAMPLES = ['我今天不想吃辣的', '15分钟以内', '只想用冰箱里的东西', '我想消耗快过期的菜']

Page({
  data: {
    kinds: 0,
    expiringText: '',
    input: '',
    aiReply: '',
    aiThinking: false,
    aiModel: '',
    chips: [] as string[],
    list: [] as RecipeRecommendation[],
    quickFilters: QUICK_FILTERS,
    examples: EXAMPLES,
    active: {
      onlyFridge: false,
      noSpicy: false,
      maxTime: 0,
      useExpiring: true,
      keyword: ''
    } as Filters,
    loading: true
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    try {
      const fridge = listIngredients()
      const active = (this as any).data.active as Filters
      const list = recommendRecipes(fridge, {
        onlyFridge: active.onlyFridge,
        noSpicy: active.noSpicy,
        maxTime: active.maxTime || undefined,
        useExpiring: active.useExpiring,
        keyword: active.keyword || undefined
      })
      const expiring = fridge.filter((i) => i.status === 'urgent' || i.status === 'expired')
      this.setData({
        kinds: fridge.length,
        expiringText: expiring.length ? `优先消耗：${expiring.map((i) => i.name).join('、')}` : '',
        list,
        loading: false
      })
      track('recipe_recommendation_view', { count: list.length, filters: active })
    } catch (e) {
      console.error('[recipe] refresh failed', e)
      this.setData({ loading: false })
      toast('推荐失败，请稍后重试')
    }
  },

  onInput(e: any) {
    this.setData({ input: e.detail.value })
  },

  onSend() {
    const text = ((this as any).data.input as string).trim()
    if (!text) {
      toast('说说你想吃什么，比如「不想吃辣」')
      return
    }
    const fridge = listIngredients()
    const parsed = parseIntent(text, fridge)
    const active = { ...(this as any).data.active } as Filters
    if (parsed.filters.noSpicy) active.noSpicy = true
    if (parsed.filters.onlyFridge) active.onlyFridge = true
    if (parsed.filters.maxTime) active.maxTime = parsed.filters.maxTime
    if (parsed.filters.useExpiring) active.useExpiring = true
    if (parsed.filters.keyword) active.keyword = parsed.filters.keyword

    this.setData({ active, aiReply: parsed.reply, chips: parsed.chips, input: '' })
    track('recipe_filter_applied', { text, chips: parsed.chips })
    this.refresh()

    // 已配置真实大模型时，用大模型生成一句「人话」推荐理由（失败静默，不影响规则结果）
    if (isAiReady()) {
      this.askAi(text, fridge)
    }
  },

  async askAi(text: string, fridge: any[]) {
    const cfg = getAiConfig()
    this.setData({ aiThinking: true, aiModel: cfg.model })
    try {
      const names = fridge.map((i) => i.name).slice(0, 30).join('、')
      const expiring = fridge
        .filter((i) => i.status === 'urgent' || i.status === 'expired' || i.status === 'soon')
        .map((i) => `${i.name}(还剩${i.daysLeft}天)`)
        .join('、')
      const prompt =
        `我冰箱里有这些食材：${names || '暂无'}。需要优先消耗的：${expiring || '无'}。` +
        `用户要求：${text}。请用一句话（40 字以内）推荐今天做哪道菜，并说明为什么，只输出这句话。`
      const reply = await chat({
        text: prompt,
        system: '你是家庭食材管理助手，回答简洁、具体、可执行。'
      })
      if (reply) {
        this.setData({ aiReply: `${(this as any).data.aiReply}\n🤖 ${cfg.model}：${reply}` })
      }
    } catch (e) {
      console.warn('[recipe] AI 文案失败，保持规则结果', e)
    } finally {
      this.setData({ aiThinking: false })
    }
  },

  onExample(e: any) {
    this.setData({ input: e.currentTarget.dataset.text })
    this.onSend()
  },

  onQuick(e: any) {
    const key = e.currentTarget.dataset.key
    const active = { ...(this as any).data.active } as Filters
    if (key === 'quick') active.maxTime = active.maxTime === 15 ? 0 : 15
    else if (key === 'useExpiring') active.useExpiring = !active.useExpiring
    else if (key === 'onlyFridge') active.onlyFridge = !active.onlyFridge
    else if (key === 'noSpicy') active.noSpicy = !active.noSpicy
    this.setData({ active })
    track('recipe_filter_applied', { key })
    this.refresh()
  },

  isActive(key: string): boolean {
    const a = (this as any).data.active as Filters
    if (key === 'quick') return a.maxTime === 15
    return !!(a as any)[key]
  },

  clearAll() {
    this.setData({
      active: { onlyFridge: false, noSpicy: false, maxTime: 0, useExpiring: true, keyword: '' },
      chips: [],
      aiReply: ''
    })
    this.refresh()
  },

  goDetail(e: any) {
    const id = e.detail.id
    track('recipe_detail_view', { id, from: 'recipe_list' })
    wx.navigateTo({ url: `/pages/recipe-detail/recipe-detail?id=${id}` })
  },

  goScan() {
    wx.navigateTo({ url: '/pages/scan/scan?source=camera' })
  },

  noop() {
    /* noop */
  }
})
