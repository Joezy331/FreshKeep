import { RECIPE_DATABASE } from '../../data/recipe-database'
import { findFood } from '../../data/food-database'
import { daysLeftText } from '../../utils/date'
import type { Ingredient } from '../../types/ingredient'
import type { Recipe, RecipeRecommendation } from '../../types/recipe'

export interface RecommendOptions {
  /** 耗时上限（分钟） */
  maxTime?: number
  /** 不要辣 */
  noSpicy?: boolean
  /** 只用冰箱里有的（无需额外购买） */
  onlyFridge?: boolean
  /** 优先消耗临期食材 */
  useExpiring?: boolean
  /** 关键词（菜名） */
  keyword?: string
  limit?: number
  /** 常做菜 id 列表 */
  favoriteIds?: string[]
}

const STATUS_URGENCY: Record<string, number> = {
  expired: 1,
  urgent: 1,
  soon: 0.7,
  fresh: 0.3
}

/**
 * AI 食谱推荐引擎
 * ---------------------------------------------------------------
 * 推荐优先级：
 *   1. 即将过期食材      → urgency 权重最高（30 分）
 *   2. 冰箱已有食材占比  → matchRatio（55 分）
 *   3. 用户常做菜        → favBonus
 *   4. 制作时间短        → timeScore
 *   5. 缺少食材最少      → noExtraBuy 加分 / missing 惩罚
 */
export function recommendRecipes(
  fridge: Ingredient[],
  options: RecommendOptions = {}
): RecipeRecommendation[] {
  const { maxTime, noSpicy, onlyFridge, useExpiring, keyword, limit, favoriteIds = [] } = options

  // 冰箱食材索引：同名取最接近过期的那条（D3: 别名归一，番茄→西红柿）
  const fridgeMap: Record<string, Ingredient> = {}
  fridge.forEach((i) => {
    const canon = (findFood(i.name)?.name || i.name).trim()
    const exist = fridgeMap[canon]
    if (!exist || (i.daysLeft ?? 99) < (exist.daysLeft ?? 99)) fridgeMap[canon] = i
  })

  const list: RecipeRecommendation[] = []

  RECIPE_DATABASE.forEach((recipe) => {
    if (noSpicy && recipe.spicy) return
    if (maxTime && recipe.time > maxTime) return
    if (keyword && !recipe.name.includes(keyword) && !recipe.tags.some((t) => t.includes(keyword)))
      return

    const required = recipe.ingredients.filter((i) => !i.optional && !i.pantry)
    const matched: string[] = []
    const missing: string[] = []

    required.forEach((ri) => {
      if (fridgeMap[ri.name]) matched.push(ri.name)
      else missing.push(ri.name)
    })

    if (matched.length === 0) return
    if (onlyFridge && missing.length > 0) return

    const matchRatio = required.length ? matched.length / required.length : 0

    const urgencyVals = matched.map((m) => STATUS_URGENCY[fridgeMap[m].status || 'fresh'] ?? 0.3)
    const urgency = urgencyVals.length
      ? urgencyVals.reduce((a, b) => a + b, 0) / urgencyVals.length
      : 0

    const timeScore = Math.max(0, Math.min(1, (40 - recipe.time) / 30))
    const favBonus = favoriteIds.indexOf(recipe.id) >= 0 ? 1 : 0
    const noExtraBuy = missing.length === 0

    let score =
      matchRatio * 55 +
      (useExpiring ? urgency * 42 : urgency * 22) +
      timeScore * 8 +
      favBonus * 4 +
      (noExtraBuy ? 3 : 0) -
      missing.length * 2

    score = Math.max(35, Math.min(99, Math.round(score)))

    const useFirst = matched
      .map((m) => fridgeMap[m])
      .filter((i) => i.status === 'urgent' || i.status === 'expired' || i.status === 'soon')
      .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0))
      .map((i) => ({
        name: i.name,
        emoji: i.emoji,
        daysLeft: i.daysLeft ?? 0,
        status: i.status || 'fresh'
      }))

    let reason = ''
    if (noExtraBuy) reason = `冰箱里已有 ${matched.join('、')}，无需额外购买`
    else reason = `已有 ${matched.join('、')}，还差 ${missing.join('、')}`
    if (useFirst.length) {
      reason += `；优先消耗${useFirst[0].name}（${daysLeftText(useFirst[0].daysLeft)}）`
    }

    list.push({
      recipe,
      matchScore: score,
      matchedIngredients: matched,
      missingIngredients: missing,
      useFirst,
      noExtraBuy,
      reason
    })
  })

  list.sort((a, b) => {
    if (useExpiring) {
      const au = a.useFirst.length ? Math.min(...a.useFirst.map((u) => u.daysLeft)) : 99
      const bu = b.useFirst.length ? Math.min(...b.useFirst.map((u) => u.daysLeft)) : 99
      if (au !== bu) return au - bu
    }
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore
    return a.recipe.time - b.recipe.time
  })

  return limit ? list.slice(0, limit) : list
}

/** 单条推荐（供详情页使用） */
export function recommendOne(
  fridge: Ingredient[],
  recipeId: string,
  options: RecommendOptions = {}
): RecipeRecommendation | undefined {
  return recommendRecipes(fridge, options).find((r) => r.recipe.id === recipeId)
}

/* -------------------------------------------------------------------------- */
/*  自然语言意图解析：把「我今天不想吃辣的」转成结构化筛选条件                  */
/* -------------------------------------------------------------------------- */

export interface ParsedIntent {
  filters: RecommendOptions
  chips: string[]
  reply: string
}

export function parseIntent(text: string, fridge: Ingredient[]): ParsedIntent {
  const t = (text || '').trim()
  const filters: RecommendOptions = {}
  const chips: string[] = []

  if (/不.*辣|不要辣|不吃辣|微辣|清淡/.test(t)) {
    filters.noSpicy = true
    chips.push('不要辣')
  }
  const minute = t.match(/(\d+)\s*(分钟|min)/)
  if (minute) {
    filters.maxTime = Number(minute[1])
    chips.push(`${minute[1]} 分钟内`)
  } else if (/十分钟|10分钟|很快|快手|简单|省事/.test(t)) {
    filters.maxTime = 15
    chips.push('15 分钟内')
  }
  if (/冰箱|不买|不用买|无需购买|现有|只有/.test(t)) {
    filters.onlyFridge = true
    chips.push('只用冰箱里的')
  }
  if (/过期|临期|快过期|坏掉|消耗|用掉/.test(t)) {
    filters.useExpiring = true
    chips.push('优先消耗临期')
  }
  // 菜名关键词：「想吃西红柿」这类，但排除「不想吃辣的」这种否定表达
  const kw = t.match(/(?:^|[^不没别])(?:想吃|来个|做个|我要|我想吃)([^，。,\s]{1,6})/)
  if (kw && kw[1]) {
    const cleaned = kw[1].replace(/[的了吧呢啊东西菜饭]/g, '')
    if (cleaned.length >= 1) {
      filters.keyword = cleaned
      chips.push(`想吃${cleaned}`)
    }
  }

  let reply = ''
  if (!chips.length) {
    reply = '好的，我先按你冰箱里的食材和临期情况来安排。'
  } else {
    const expiring = fridge.filter((i) => i.status === 'urgent' || i.status === 'expired')
    reply = `已按「${chips.join(' · ')}」为你筛选。`
    if (expiring.length) {
      reply += `另外，${expiring
        .slice(0, 2)
        .map((i) => i.name)
        .join('、')}快到最佳食用期了，建议优先安排。`
    }
  }
  return { filters, chips, reply }
}
