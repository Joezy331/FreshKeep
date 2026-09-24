import type { FoodKnowledge, StorageArea, StorageMethod } from '../types/ingredient'

/**
 * 食材知识库 Food Knowledge Base
 * ---------------------------------------------------------------
 * 所有保存时长均为「参考值，仅供食材管理使用」，
 * 实际能否食用请结合食材状态（气味 / 颜色 / 触感）判断。
 */
export const FOOD_DATABASE: FoodKnowledge[] = [
  {
    name: '西红柿',
    emoji: '🍅',
    category: '蔬菜',
    defaultUnit: '个',
    defaultQuantity: 3,
    options: [
      { method: '冷藏', area: '蔬果保鲜区', days: 6, label: '冷藏 · 蔬果保鲜区' },
      { method: '常温', area: '常温区', days: 3, label: '常温 · 阴凉通风处' }
    ],
    freezable: false,
    tips: '建议放入冰箱蔬果保鲜区，避免与容易释放乙烯的水果（如香蕉、苹果）长时间混放。',
    aliases: ['番茄', '圣女果', 'tomato']
  },
  {
    name: '鸡蛋',
    emoji: '🥚',
    category: '蛋类',
    defaultUnit: '个',
    defaultQuantity: 6,
    options: [
      { method: '冷藏', area: '门架区', days: 30, label: '冷藏 · 冰箱门架蛋格' },
      { method: '常温', area: '常温区', days: 10, label: '常温 · 阴凉处' }
    ],
    freezable: false,
    tips: '大头朝上竖放，放在门架蛋格比门侧更稳；不要清洗后再存放。',
    aliases: ['土鸡蛋', '蛋', 'egg']
  },
  {
    name: '菠菜',
    emoji: '🥬',
    category: '蔬菜',
    defaultUnit: '把',
    defaultQuantity: 1,
    options: [
      { method: '冷藏', area: '蔬果保鲜区', days: 3, label: '冷藏 · 蔬果保鲜区' }
    ],
    freezable: true,
    tips: '用厨房纸包裹后装保鲜袋，吸走多余水分可多放 1-2 天；叶菜类建议尽快食用。',
    aliases: ['spinach']
  },
  {
    name: '生菜',
    emoji: '🥬',
    category: '蔬菜',
    defaultUnit: '颗',
    defaultQuantity: 1,
    options: [
      { method: '冷藏', area: '蔬果保鲜区', days: 4, label: '冷藏 · 蔬果保鲜区' }
    ],
    freezable: false,
    tips: '擦干水分后放入保鲜袋，避免贴壁冻伤。',
    aliases: ['lettuce']
  },
  {
    name: '白菜',
    emoji: '🥬',
    category: '蔬菜',
    defaultUnit: '颗',
    defaultQuantity: 1,
    options: [
      { method: '冷藏', area: '蔬果保鲜区', days: 10, label: '冷藏 · 蔬果保鲜区' },
      { method: '常温', area: '常温区', days: 5, label: '常温 · 通风处' }
    ],
    freezable: false,
    tips: '整颗存放更耐放，切开后需包保鲜膜尽快食用。',
    aliases: ['大白菜', 'cabbage']
  },
  {
    name: '胡萝卜',
    emoji: '🥕',
    category: '蔬菜',
    defaultUnit: '根',
    defaultQuantity: 3,
    options: [
      { method: '冷藏', area: '蔬果保鲜区', days: 14, label: '冷藏 · 蔬果保鲜区' }
    ],
    freezable: true,
    tips: '切去顶部缨子再存放，能减少水分流失。',
    aliases: ['红萝卜', 'carrot']
  },
  {
    name: '土豆',
    emoji: '🥔',
    category: '蔬菜',
    defaultUnit: '个',
    defaultQuantity: 4,
    options: [
      { method: '常温', area: '常温区', days: 20, label: '常温 · 避光阴凉处' }
    ],
    freezable: false,
    tips: '不要放冰箱，低温会加速淀粉糖化；避光保存防止发芽变绿。',
    aliases: ['马铃薯', 'potato']
  },
  {
    name: '黄瓜',
    emoji: '🥒',
    category: '蔬菜',
    defaultUnit: '根',
    defaultQuantity: 3,
    options: [
      { method: '冷藏', area: '蔬果保鲜区', days: 5, label: '冷藏 · 蔬果保鲜区' }
    ],
    freezable: false,
    tips: '用厨房纸包裹后放入保鲜袋，避免冻伤变软。',
    aliases: ['青瓜', 'cucumber']
  },
  {
    name: '茄子',
    emoji: '🍆',
    category: '蔬菜',
    defaultUnit: '个',
    defaultQuantity: 2,
    options: [
      { method: '冷藏', area: '蔬果保鲜区', days: 5, label: '冷藏 · 蔬果保鲜区' }
    ],
    freezable: false,
    tips: '表面不要沾水，用纸袋或保鲜袋宽松包裹。',
    aliases: ['eggplant']
  },
  {
    name: '青椒',
    emoji: '🫑',
    category: '蔬菜',
    defaultUnit: '个',
    defaultQuantity: 3,
    options: [
      { method: '冷藏', area: '蔬果保鲜区', days: 7, label: '冷藏 · 蔬果保鲜区' }
    ],
    freezable: true,
    tips: '擦干水分后装袋，避免与高湿叶菜混放。',
    aliases: ['辣椒', '柿子椒', 'pepper']
  },
  {
    name: '葱',
    emoji: '🧅',
    category: '调味品',
    defaultUnit: '根',
    defaultQuantity: 2,
    options: [
      { method: '冷藏', area: '蔬果保鲜区', days: 7, label: '冷藏 · 蔬果保鲜区' },
      { method: '冷冻', area: '冷冻区', days: 60, label: '冷冻 · 切段冷冻' }
    ],
    freezable: true,
    tips: '擦干后用厨房纸包裹再装袋；长期保存可切段冷冻。',
    aliases: ['小葱', '香葱', 'scallion']
  },
  {
    name: '姜',
    emoji: '🫚',
    category: '调味品',
    defaultUnit: '块',
    defaultQuantity: 1,
    options: [
      { method: '常温', area: '常温区', days: 15, label: '常温 · 通风处' },
      { method: '冷藏', area: '蔬果保鲜区', days: 30, label: '冷藏 · 蔬果保鲜区' }
    ],
    freezable: true,
    tips: '保持干燥，可用厨房纸包裹后放入保鲜袋。',
    aliases: ['生姜', 'ginger']
  },
  {
    name: '蒜',
    emoji: '🧄',
    category: '调味品',
    defaultUnit: '头',
    defaultQuantity: 1,
    options: [
      { method: '常温', area: '常温区', days: 30, label: '常温 · 通风避光处' }
    ],
    freezable: false,
    tips: '整头存放更耐放，剥好的蒜瓣需冷藏并尽快使用。',
    aliases: ['大蒜', 'garlic']
  },
  {
    name: '苹果',
    emoji: '🍎',
    category: '水果',
    defaultUnit: '个',
    defaultQuantity: 5,
    options: [
      { method: '冷藏', area: '蔬果保鲜区', days: 20, label: '冷藏 · 蔬果保鲜区' }
    ],
    freezable: false,
    tips: '会释放乙烯，建议单独存放，避免加速叶菜老化。',
    aliases: ['apple']
  },
  {
    name: '香蕉',
    emoji: '🍌',
    category: '水果',
    defaultUnit: '根',
    defaultQuantity: 5,
    options: [
      { method: '常温', area: '常温区', days: 4, label: '常温 · 阴凉通风处' }
    ],
    freezable: true,
    tips: '不要放冰箱，低温会变黑；悬挂存放可减缓压伤。',
    aliases: ['banana']
  },
  {
    name: '牛肉',
    emoji: '🥩',
    category: '肉类',
    defaultUnit: 'g',
    defaultQuantity: 300,
    options: [
      { method: '冷冻', area: '冷冻区', days: 90, label: '冷冻 · 冷冻室（3个月内最佳）' },
      { method: '冷藏', area: '冷藏区', days: 2, label: '冷藏 · 冷藏室下层' }
    ],
    freezable: true,
    tips: '按每顿用量分装冷冻，避免反复解冻；冷藏生肉放在下层防止汁水滴落。',
    aliases: ['牛腩', '牛排', 'beef']
  },
  {
    name: '猪肉',
    emoji: '🥓',
    category: '肉类',
    defaultUnit: 'g',
    defaultQuantity: 300,
    options: [
      { method: '冷冻', area: '冷冻区', days: 90, label: '冷冻 · 冷冻室（3个月内最佳）' },
      { method: '冷藏', area: '冷藏区', days: 2, label: '冷藏 · 冷藏室下层' }
    ],
    freezable: true,
    tips: '生熟分开存放，分装冷冻更方便取用。',
    aliases: ['五花肉', '里脊', 'pork']
  },
  {
    name: '鸡肉',
    emoji: '🍗',
    category: '肉类',
    defaultUnit: 'g',
    defaultQuantity: 300,
    options: [
      { method: '冷冻', area: '冷冻区', days: 90, label: '冷冻 · 冷冻室（3个月内最佳）' },
      { method: '冷藏', area: '冷藏区', days: 2, label: '冷藏 · 冷藏室下层' }
    ],
    freezable: true,
    tips: '建议 24 小时内食用或立即冷冻；解冻后不建议再次冷冻。',
    aliases: ['鸡胸肉', '鸡翅', 'chicken']
  },
  {
    name: '鱼',
    emoji: '🐟',
    category: '海鲜',
    defaultUnit: '条',
    defaultQuantity: 1,
    options: [
      { method: '冷冻', area: '冷冻区', days: 60, label: '冷冻 · 冷冻室（2个月内最佳）' },
      { method: '冷藏', area: '冷藏区', days: 1, label: '冷藏 · 冷藏室下层' }
    ],
    freezable: true,
    tips: '去除内脏并擦干后分装冷冻，海鲜类建议尽快食用。',
    aliases: ['鲜鱼', 'fish']
  },
  {
    name: '虾',
    emoji: '🦐',
    category: '海鲜',
    defaultUnit: 'g',
    defaultQuantity: 250,
    options: [
      { method: '冷冻', area: '冷冻区', days: 60, label: '冷冻 · 冷冻室（2个月内最佳）' },
      { method: '冷藏', area: '冷藏区', days: 1, label: '冷藏 · 冷藏室下层' }
    ],
    freezable: true,
    tips: '可冷冻保存，建议装袋时加水封存防止风干。',
    aliases: ['基围虾', 'shrimp']
  },
  {
    name: '牛奶',
    emoji: '🥛',
    category: '奶制品',
    defaultUnit: 'ml',
    defaultQuantity: 500,
    options: [
      { method: '冷藏', area: '冷藏区', days: 7, label: '冷藏 · 冷藏室中层' }
    ],
    freezable: false,
    tips: '放在冷藏室中层而非门架，温度更稳定；开封后请尽快喝完。',
    aliases: ['鲜奶', 'milk']
  },
  {
    name: '豆腐',
    emoji: '🍲',
    category: '豆制品',
    defaultUnit: '块',
    defaultQuantity: 1,
    options: [
      { method: '冷藏', area: '冷藏区', days: 3, label: '冷藏 · 冷藏室中层' },
      { method: '冷冻', area: '冷冻区', days: 30, label: '冷冻 · 做成冻豆腐' }
    ],
    freezable: true,
    tips: '泡在清水中冷藏并每天换水，可延长 1-2 天。',
    aliases: ['嫩豆腐', '老豆腐', 'tofu']
  },
  {
    name: '香菇',
    emoji: '🍄',
    category: '蔬菜',
    defaultUnit: 'g',
    defaultQuantity: 200,
    options: [
      { method: '冷藏', area: '蔬果保鲜区', days: 5, label: '冷藏 · 蔬果保鲜区' }
    ],
    freezable: true,
    tips: '不要水洗，用纸袋存放吸湿，避免塑料袋闷湿。',
    aliases: ['冬菇', 'mushroom']
  },
  {
    name: '西兰花',
    emoji: '🥦',
    category: '蔬菜',
    defaultUnit: '颗',
    defaultQuantity: 1,
    options: [
      { method: '冷藏', area: '蔬果保鲜区', days: 5, label: '冷藏 · 蔬果保鲜区' }
    ],
    freezable: true,
    tips: '擦干水分装保鲜袋，长期保存可焯水后冷冻。',
    aliases: ['西蓝花', 'broccoli']
  },
  {
    name: '洋葱',
    emoji: '🧅',
    category: '蔬菜',
    defaultUnit: '个',
    defaultQuantity: 2,
    options: [
      { method: '常温', area: '常温区', days: 20, label: '常温 · 通风干燥处' }
    ],
    freezable: false,
    tips: '需要通风，不要和土豆一起存放，会互相加速变质。',
    aliases: ['onion']
  },
  {
    name: '柠檬',
    emoji: '🍋',
    category: '水果',
    defaultUnit: '个',
    defaultQuantity: 3,
    options: [
      { method: '冷藏', area: '蔬果保鲜区', days: 20, label: '冷藏 · 蔬果保鲜区' }
    ],
    freezable: true,
    tips: '装保鲜袋冷藏，切面朝下可减缓失水。',
    aliases: ['lemon']
  },
  {
    name: '米饭',
    emoji: '🍚',
    category: '主食',
    defaultUnit: '碗',
    defaultQuantity: 2,
    options: [
      { method: '冷冻', area: '冷冻区', days: 30, label: '冷冻 · 冷冻室' },
      { method: '冷藏', area: '冷藏区', days: 2, label: '冷藏 · 冷藏室' }
    ],
    freezable: true,
    tips: '剩饭趁热分装冷冻，复热口感更好。',
    aliases: ['剩饭', 'rice']
  },
  {
    name: '酸奶',
    emoji: '🥣',
    category: '奶制品',
    defaultUnit: '盒',
    defaultQuantity: 3,
    options: [
      { method: '冷藏', area: '冷藏区', days: 10, label: '冷藏 · 冷藏室中层' }
    ],
    freezable: false,
    tips: '请按包装标示日期食用，开封后当天喝完。',
    aliases: ['yogurt']
  }
]

/** 名称索引（含别名） */
const FOOD_MAP: Record<string, FoodKnowledge> = {}
FOOD_DATABASE.forEach((f) => {
  FOOD_MAP[f.name] = f
  f.aliases.forEach((a) => {
    FOOD_MAP[a] = f
  })
})

export function findFood(name: string): FoodKnowledge | undefined {
  if (!name) return undefined
  return FOOD_MAP[name.trim()]
}

/** 精确 or 模糊查找 */
export function searchFood(keyword: string): FoodKnowledge[] {
  const k = (keyword || '').trim()
  if (!k) return []
  return FOOD_DATABASE.filter(
    (f) => f.name.includes(k) || f.aliases.some((a) => a.includes(k))
  )
}

export function getAllFoodNames(): string[] {
  return FOOD_DATABASE.map((f) => f.name)
}

/** 冰箱分区展示顺序 + 视觉配置 */
export interface ZoneConfig {
  area: StorageArea
  emoji: string
  desc: string
  /** 温度说明 */
  temp: string
}

export const FRIDGE_ZONES: ZoneConfig[] = [
  { area: '冷冻区', emoji: '❄️', desc: '肉类 / 海鲜 / 长期保存', temp: '-18℃' },
  { area: '冷藏区', emoji: '🧊', desc: '蛋奶 / 豆制品 / 熟食', temp: '4℃' },
  { area: '蔬果保鲜区', emoji: '🥬', desc: '叶菜 / 根茎 / 水果', temp: '高湿' },
  { area: '门架区', emoji: '🥚', desc: '鸡蛋 / 调味品 / 饮品', temp: '温度波动大' },
  { area: '常温区', emoji: '🧺', desc: '根茎 / 未切开果蔬', temp: '室温' }
]

export const STORAGE_METHODS: StorageMethod[] = ['冷藏', '冷冻', '常温']

export const AREA_BY_METHOD: Record<StorageMethod, StorageArea[]> = {
  冷冻: ['冷冻区'],
  冷藏: ['冷藏区', '蔬果保鲜区', '门架区'],
  常温: ['常温区']
}
