import type { IngredientCategory } from './ingredient'

export interface RecipeIngredient {
  name: string
  amount: string
  /** 可选食材，不影响匹配度 */
  optional?: boolean
  /** 家庭常备调味品（盐/油/生抽等），默认视为已有 */
  pantry?: boolean
}

export interface Recipe {
  id: string
  name: string
  emoji: string
  /** 一句话描述 */
  desc: string
  ingredients: RecipeIngredient[]
  steps: string[]
  /** 难度 1~3 */
  difficulty: number
  /** 预计耗时（分钟） */
  time: number
  tags: string[]
  category?: IngredientCategory
  /** 是否含辣 */
  spicy?: boolean
}

/** 推荐结果（运行时生成，含匹配信息） */
export interface RecipeRecommendation {
  recipe: Recipe
  /** 匹配度 0~100 */
  matchScore: number
  /** 冰箱中已有的食材名 */
  matchedIngredients: string[]
  /** 缺少的食材名 */
  missingIngredients: string[]
  /** 优先消耗的临期食材 */
  useFirst: { name: string; emoji: string; daysLeft: number; status: string }[]
  /** 无需额外购买 */
  noExtraBuy: boolean
  /** 推荐理由（AI 文案） */
  reason: string
}

export type RecipeFilterKey =
  | 'all'
  | 'cookable'
  | 'noSpicy'
  | 'quick'
  | 'onlyFridge'
  | 'useExpiring'
