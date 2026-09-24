/** 食材分类 */
export type IngredientCategory =
  | '蔬菜'
  | '水果'
  | '肉类'
  | '蛋类'
  | '奶制品'
  | '海鲜'
  | '豆制品'
  | '调味品'
  | '主食'
  | '其他'

/** 保存方式 */
export type StorageMethod = '冷藏' | '冷冻' | '常温'

/** 冰箱真实分区 */
export type StorageArea = '冷冻区' | '冷藏区' | '蔬果保鲜区' | '门架区' | '常温区'

/** 食材新鲜状态：新鲜 / 即将到期 / 建议尽快食用 / 已超过最佳食用期 */
export type IngredientStatus = 'fresh' | 'soon' | 'urgent' | 'expired'

/** 冰箱中的一条食材记录 */
export interface Ingredient {
  id: string
  name: string
  emoji: string
  category: IngredientCategory
  /** 数量 */
  quantity: number
  /** 单位：个 / 把 / 根 / g ... */
  unit: string
  /** 购买日期 yyyy-MM-dd */
  purchaseDate: string
  /** 保存方式 */
  storageMethod: StorageMethod
  /** 存放位置（冰箱分区） */
  storageArea: StorageArea
  /** 最佳食用期 yyyy-MM-dd */
  bestBeforeDate: string
  /** 运行时计算，不持久化 */
  status?: IngredientStatus
  /** 剩余天数，运行时计算 */
  daysLeft?: number
  /** 图片（本地临时路径 / 网络地址） */
  image?: string
  /** AI 识别置信度 0~1 */
  confidence?: number
  /** 备注 */
  note?: string
  /** 来源：ai / manual / scan */
  source?: 'ai' | 'manual' | 'scan'
  createdAt?: number
}

/** 食材知识库条目 */
export interface StorageOption {
  method: StorageMethod
  area: StorageArea
  /** 参考保存天数 */
  days: number
  /** 展示文案 */
  label: string
}

export interface FoodKnowledge {
  name: string
  emoji: string
  category: IngredientCategory
  defaultUnit: string
  defaultQuantity: number
  /** 第一个为推荐方案 */
  options: StorageOption[]
  /** 是否适合冷冻 */
  freezable: boolean
  /** 保存注意事项 */
  tips: string
  /** 别名，便于识别结果归一 */
  aliases: string[]
}
