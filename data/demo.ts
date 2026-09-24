import { addDays, today } from '../utils/date'
import { findFood } from './food-database'
import type { Ingredient } from '../types/ingredient'

/**
 * Demo 演示数据：首次启动自动写入，保证打开即可看到完整效果。
 * 日期按「今天」动态计算，任何时候打开都能看到 新鲜 / 即将到期 / 建议尽快食用 三种状态。
 */
export function buildDemoIngredients(): Ingredient[] {
  const t = today()
  const base: Omit<Ingredient, 'emoji' | 'category' | 'id'>[] = [
    {
      name: '西红柿',
      quantity: 3,
      unit: '个',
      purchaseDate: addDays(t, -4),
      storageMethod: '冷藏',
      storageArea: '蔬果保鲜区',
      bestBeforeDate: addDays(t, 2),
      source: 'ai',
      confidence: 0.98,
      note: '菜市场买的，有点软了'
    },
    {
      name: '鸡蛋',
      quantity: 6,
      unit: '个',
      purchaseDate: addDays(t, -2),
      storageMethod: '冷藏',
      storageArea: '门架区',
      bestBeforeDate: addDays(t, 12),
      source: 'manual'
    },
    {
      name: '菠菜',
      quantity: 1,
      unit: '把',
      purchaseDate: addDays(t, -2),
      storageMethod: '冷藏',
      storageArea: '蔬果保鲜区',
      bestBeforeDate: addDays(t, 1),
      source: 'ai',
      confidence: 0.95
    },
    {
      name: '葱',
      quantity: 2,
      unit: '根',
      purchaseDate: addDays(t, -2),
      storageMethod: '冷藏',
      storageArea: '蔬果保鲜区',
      bestBeforeDate: addDays(t, 5),
      source: 'ai',
      confidence: 0.93
    },
    {
      name: '牛肉',
      quantity: 300,
      unit: 'g',
      purchaseDate: addDays(t, -1),
      storageMethod: '冷冻',
      storageArea: '冷冻区',
      bestBeforeDate: addDays(t, 60),
      source: 'ai',
      confidence: 0.96
    },
    {
      name: '牛奶',
      quantity: 500,
      unit: 'ml',
      purchaseDate: addDays(t, -3),
      storageMethod: '冷藏',
      storageArea: '冷藏区',
      bestBeforeDate: addDays(t, 4),
      source: 'manual'
    },
    {
      name: '豆腐',
      quantity: 1,
      unit: '块',
      purchaseDate: addDays(t, -2),
      storageMethod: '冷藏',
      storageArea: '冷藏区',
      bestBeforeDate: addDays(t, 1),
      source: 'manual'
    },
    {
      name: '土豆',
      quantity: 4,
      unit: '个',
      purchaseDate: addDays(t, -5),
      storageMethod: '常温',
      storageArea: '常温区',
      bestBeforeDate: addDays(t, 15),
      source: 'manual'
    }
  ]

  return base.map((b, index) => {
    const food = findFood(b.name)
    return {
      ...b,
      id: `demo_${index}`,
      emoji: food ? food.emoji : '🥗',
      category: food ? food.category : ('其他' as any),
      createdAt: Date.now() - index * 60000
    } as Ingredient
  })
}

export const DEFAULT_USER = {
  id: 'u_local',
  nickname: '厨房小白',
  avatar: '',
  preferences: {
    dislikes: ['不吃辣'],
    favoriteRecipes: ['r_tomato_egg'],
    householdSize: 2
  },
  notificationSettings: {
    expiration: true,
    advanceDays: 1,
    dailyTip: true,
    dailyTipTime: '17:30'
  }
}
