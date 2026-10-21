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
  },

  /* ---------------- 以下为识别覆盖度扩充（不改动既有 28 条，纯新增） ---------------- */

  // 叶菜细分
  {
    name: '小白菜', emoji: '🥬', category: '蔬菜', defaultUnit: '把', defaultQuantity: 1,
    options: [{ method: '冷藏', area: '蔬果保鲜区', days: 3, label: '冷藏 · 蔬果保鲜区' }],
    freezable: true, tips: '用厨房纸包裹装袋，吸湿可多放 1-2 天。',
    aliases: ['青菜', '鸡毛菜', 'bok choy']
  },
  {
    name: '上海青', emoji: '🥬', category: '蔬菜', defaultUnit: '颗', defaultQuantity: 2,
    options: [{ method: '冷藏', area: '蔬果保鲜区', days: 4, label: '冷藏 · 蔬果保鲜区' }],
    freezable: true, tips: '擦干水分冷藏，叶菜类建议尽快食用。',
    aliases: ['油菜', 'shanghai qing']
  },
  {
    name: '油麦菜', emoji: '🥬', category: '蔬菜', defaultUnit: '把', defaultQuantity: 1,
    options: [{ method: '冷藏', area: '蔬果保鲜区', days: 4, label: '冷藏 · 蔬果保鲜区' }],
    freezable: true, tips: '冷藏保存，尽快食用保持脆嫩。',
    aliases: ['麦菜', 'lettuce leaf']
  },
  {
    name: '空心菜', emoji: '🥬', category: '蔬菜', defaultUnit: '把', defaultQuantity: 1,
    options: [{ method: '冷藏', area: '蔬果保鲜区', days: 3, label: '冷藏 · 蔬果保鲜区' }],
    freezable: true, tips: '焯水后冷冻可长期保存；鲜食冷藏 2-3 天。',
    aliases: ['蕹菜', 'water spinach']
  },
  {
    name: '韭菜', emoji: '🥬', category: '蔬菜', defaultUnit: '把', defaultQuantity: 1,
    options: [{ method: '冷藏', area: '蔬果保鲜区', days: 3, label: '冷藏 · 蔬果保鲜区' }],
    freezable: true, tips: '捆好后直立放冷藏，根部洒少许水更耐放。',
    aliases: ['韭', 'chinese chives']
  },
  {
    name: '芹菜', emoji: '🥬', category: '蔬菜', defaultUnit: '根', defaultQuantity: 2,
    options: [{ method: '冷藏', area: '蔬果保鲜区', days: 7, label: '冷藏 · 蔬果保鲜区' }],
    freezable: true, tips: '撕去老筋冷藏；焯水冷冻可长期保存。',
    aliases: ['西芹', 'celery']
  },

  // 根茎类
  {
    name: '红薯', emoji: '🍠', category: '蔬菜', defaultUnit: '个', defaultQuantity: 3,
    options: [{ method: '常温', area: '常温区', days: 20, label: '常温 · 避光通风处' }],
    freezable: false, tips: '不要放冰箱，低温易坏；避光保存防发芽。',
    aliases: ['地瓜', 'sweet potato']
  },
  {
    name: '山药', emoji: '🥔', category: '蔬菜', defaultUnit: '根', defaultQuantity: 1,
    options: [
      { method: '常温', area: '常温区', days: 15, label: '常温 · 通风处' },
      { method: '冷藏', area: '蔬果保鲜区', days: 30, label: '冷藏 · 蔬果保鲜区' }
    ],
    freezable: true, tips: '带泥常温通风处更耐放；去皮后易氧化变黑。',
    aliases: ['淮山', 'yam']
  },
  {
    name: '莲藕', emoji: '🪷', category: '蔬菜', defaultUnit: '节', defaultQuantity: 1,
    options: [{ method: '冷藏', area: '蔬果保鲜区', days: 7, label: '冷藏 · 蔬果保鲜区' }],
    freezable: true, tips: '切后泡清水防氧化；焯水冷冻可长期保存。',
    aliases: ['莲菜', 'lotus root']
  },
  {
    name: '白萝卜', emoji: '🥕', category: '蔬菜', defaultUnit: '根', defaultQuantity: 1,
    options: [{ method: '冷藏', area: '蔬果保鲜区', days: 14, label: '冷藏 · 蔬果保鲜区' }],
    freezable: true, tips: '去叶冷藏，叶可做菜；切片晾晒成萝卜干。',
    aliases: ['萝卜', 'white radish']
  },

  // 瓜果类
  {
    name: '冬瓜', emoji: '🥒', category: '蔬菜', defaultUnit: '块', defaultQuantity: 1,
    options: [{ method: '冷藏', area: '蔬果保鲜区', days: 7, label: '冷藏 · 蔬果保鲜区' }],
    freezable: true, tips: '切开后贴保鲜膜冷藏，尽快食用。',
    aliases: ['donggua', 'winter melon']
  },
  {
    name: '南瓜', emoji: '🎃', category: '蔬菜', defaultUnit: '块', defaultQuantity: 1,
    options: [{ method: '常温', area: '常温区', days: 30, label: '常温 · 阴凉通风处' }],
    freezable: true, tips: '整颗常温通风处耐放；切块后冷藏并尽快食用。',
    aliases: ['pumpkin']
  },
  {
    name: '苦瓜', emoji: '🥒', category: '蔬菜', defaultUnit: '根', defaultQuantity: 1,
    options: [{ method: '冷藏', area: '蔬果保鲜区', days: 5, label: '冷藏 · 蔬果保鲜区' }],
    freezable: true, tips: '冷藏保存，焯水冷冻可长期保存。',
    aliases: ['bitter melon', '凉瓜']
  },
  {
    name: '彩椒', emoji: '🫑', category: '蔬菜', defaultUnit: '个', defaultQuantity: 2,
    options: [{ method: '冷藏', area: '蔬果保鲜区', days: 7, label: '冷藏 · 蔬果保鲜区' }],
    freezable: true, tips: '擦干水分装袋，避免挤压冻伤。',
    aliases: ['甜椒', 'bell pepper']
  },

  // 更多水果
  {
    name: '橙子', emoji: '🍊', category: '水果', defaultUnit: '个', defaultQuantity: 4,
    options: [{ method: '冷藏', area: '蔬果保鲜区', days: 20, label: '冷藏 · 蔬果保鲜区' }],
    freezable: false, tips: '单独存放，避免与叶菜混放加速老化。',
    aliases: ['orange']
  },
  {
    name: '柚子', emoji: '🍊', category: '水果', defaultUnit: '个', defaultQuantity: 1,
    options: [{ method: '冷藏', area: '蔬果保鲜区', days: 25, label: '冷藏 · 蔬果保鲜区' }],
    freezable: false, tips: '通风阴凉处或冷藏均可，整果耐放。',
    aliases: ['pomelo', 'yuzu']
  },
  {
    name: '葡萄', emoji: '🍇', category: '水果', defaultUnit: '串', defaultQuantity: 1,
    options: [{ method: '冷藏', area: '蔬果保鲜区', days: 7, label: '冷藏 · 蔬果保鲜区' }],
    freezable: true, tips: '不要水洗，吃前再洗；用纸袋装冷藏。',
    aliases: ['提子', 'grape']
  },
  {
    name: '草莓', emoji: '🍓', category: '水果', defaultUnit: '盒', defaultQuantity: 1,
    options: [{ method: '冷藏', area: '蔬果保鲜区', days: 3, label: '冷藏 · 蔬果保鲜区' }],
    freezable: true, tips: '吃前再洗，去蒂冷藏，极易压伤。',
    aliases: ['strawberry']
  },
  {
    name: '蓝莓', emoji: '🫐', category: '水果', defaultUnit: '盒', defaultQuantity: 1,
    options: [{ method: '冷藏', area: '蔬果保鲜区', days: 7, label: '冷藏 · 蔬果保鲜区' }],
    freezable: true, tips: '原盒冷藏，吃前冲洗，表面白霜是果粉勿搓掉。',
    aliases: ['blueberry']
  },
  {
    name: '梨', emoji: '🍐', category: '水果', defaultUnit: '个', defaultQuantity: 3,
    options: [{ method: '冷藏', area: '蔬果保鲜区', days: 15, label: '冷藏 · 蔬果保鲜区' }],
    freezable: false, tips: '冷藏保存，切开后尽快食用防氧化。',
    aliases: ['雪梨', 'pear']
  },
  {
    name: '桃子', emoji: '🍑', category: '水果', defaultUnit: '个', defaultQuantity: 3,
    options: [{ method: '冷藏', area: '蔬果保鲜区', days: 5, label: '冷藏 · 蔬果保鲜区' }],
    freezable: false, tips: '冷藏可延缓软化，尽快食用口感最佳。',
    aliases: ['水蜜桃', 'peach']
  },
  {
    name: '猕猴桃', emoji: '🥝', category: '水果', defaultUnit: '个', defaultQuantity: 3,
    options: [{ method: '冷藏', area: '蔬果保鲜区', days: 10, label: '冷藏 · 蔬果保鲜区' }],
    freezable: true, tips: '硬果常温催熟，软后冷藏；与苹果同放催熟更快。',
    aliases: ['奇异果', 'kiwi']
  },

  // 菌菇类
  {
    name: '平菇', emoji: '🍄', category: '蔬菜', defaultUnit: 'g', defaultQuantity: 200,
    options: [{ method: '冷藏', area: '蔬果保鲜区', days: 4, label: '冷藏 · 蔬果保鲜区' }],
    freezable: true, tips: '不要水洗，用纸袋吸湿，避免塑料袋闷湿。',
    aliases: ['蚝菇', 'oyster mushroom']
  },
  {
    name: '金针菇', emoji: '🍄', category: '蔬菜', defaultUnit: 'g', defaultQuantity: 200,
    options: [{ method: '冷藏', area: '蔬果保鲜区', days: 5, label: '冷藏 · 蔬果保鲜区' }],
    freezable: true, tips: '去根冷藏，焯水冷冻可长期保存。',
    aliases: ['enoki', '金针']
  },
  {
    name: '杏鲍菇', emoji: '🍄', category: '蔬菜', defaultUnit: 'g', defaultQuantity: 200,
    options: [{ method: '冷藏', area: '蔬果保鲜区', days: 7, label: '冷藏 · 蔬果保鲜区' }],
    freezable: true, tips: '冷藏保存，切片炒食或焯水冷冻。',
    aliases: ['king oyster mushroom']
  },
  {
    name: '口蘑', emoji: '🍄', category: '蔬菜', defaultUnit: 'g', defaultQuantity: 200,
    options: [{ method: '冷藏', area: '蔬果保鲜区', days: 5, label: '冷藏 · 蔬果保鲜区' }],
    freezable: true, tips: '冷藏保存，表面勿沾水，吃前再洗。',
    aliases: ['白蘑菇', 'white mushroom']
  },
  {
    name: '木耳', emoji: '🍄', category: '蔬菜', defaultUnit: 'g', defaultQuantity: 100,
    options: [{ method: '冷藏', area: '蔬果保鲜区', days: 4, label: '冷藏 · 蔬果保鲜区' }],
    freezable: true, tips: '鲜木耳冷藏 3-4 天；干木耳泡发后尽快食用。',
    aliases: ['黑木耳', 'wood ear']
  },

  // 肉类部位 / 水产
  {
    name: '排骨', emoji: '🍖', category: '肉类', defaultUnit: 'g', defaultQuantity: 400,
    options: [
      { method: '冷冻', area: '冷冻区', days: 90, label: '冷冻 · 冷冻室（3个月内最佳）' },
      { method: '冷藏', area: '冷藏区', days: 2, label: '冷藏 · 冷藏室下层' }
    ],
    freezable: true, tips: '分块冷冻，生熟分开，冷藏生肉放下层防汁水滴落。',
    aliases: ['猪排', 'ribs']
  },
  {
    name: '鸡腿', emoji: '🍗', category: '肉类', defaultUnit: 'g', defaultQuantity: 300,
    options: [
      { method: '冷冻', area: '冷冻区', days: 90, label: '冷冻 · 冷冻室（3个月内最佳）' },
      { method: '冷藏', area: '冷藏区', days: 2, label: '冷藏 · 冷藏室下层' }
    ],
    freezable: true, tips: '建议 24 小时内食用或立即冷冻；解冻后不重复冷冻。',
    aliases: ['鸡大腿', 'chicken leg', '鸡翅']
  },
  {
    name: '蟹', emoji: '🦀', category: '海鲜', defaultUnit: '只', defaultQuantity: 2,
    options: [
      { method: '冷冻', area: '冷冻区', days: 30, label: '冷冻 · 冷冻室' },
      { method: '冷藏', area: '冷藏区', days: 1, label: '冷藏 · 冷藏室下层（现吃）' }
    ],
    freezable: true, tips: '鲜活现做最佳；短期冷藏，长期冷冻。',
    aliases: ['螃蟹', 'crab']
  },
  {
    name: '贝', emoji: '🦪', category: '海鲜', defaultUnit: 'g', defaultQuantity: 300,
    options: [
      { method: '冷冻', area: '冷冻区', days: 30, label: '冷冻 · 冷冻室' },
      { method: '冷藏', area: '冷藏区', days: 1, label: '冷藏 · 冷藏室下层（现吃）' }
    ],
    freezable: true, tips: '鲜活现做最佳；带壳冷藏 1 天，长期冷冻。',
    aliases: ['贝壳', '扇贝', 'scallop', 'clam']
  },

  // 蛋奶
  {
    name: '鸭蛋', emoji: '🥚', category: '蛋类', defaultUnit: '个', defaultQuantity: 6,
    options: [
      { method: '冷藏', area: '门架区', days: 30, label: '冷藏 · 冰箱门架蛋格' },
      { method: '常温', area: '常温区', days: 10, label: '常温 · 阴凉处' }
    ],
    freezable: false, tips: '大头朝上竖放；咸鸭蛋请按包装标示。',
    aliases: ['duck egg']
  },

  // 主食半成品
  {
    name: '面条', emoji: '🍜', category: '主食', defaultUnit: '把', defaultQuantity: 1,
    options: [
      { method: '常温', area: '常温区', days: 30, label: '常温 · 阴凉干燥处（干面）' },
      { method: '冷藏', area: '冷藏区', days: 2, label: '冷藏 · 冷藏室（鲜面）' }
    ],
    freezable: true, tips: '干面常温避潮；鲜面冷藏并尽快食用。',
    aliases: ['面', 'noodle']
  },
  {
    name: '面包', emoji: '🍞', category: '主食', defaultUnit: '个', defaultQuantity: 1,
    options: [
      { method: '常温', area: '常温区', days: 3, label: '常温 · 阴凉处' },
      { method: '冷冻', area: '冷冻区', days: 30, label: '冷冻 · 切片冷冻复烤' }
    ],
    freezable: true, tips: '常温 2-3 天；长期吃不完切片冷冻，复烤如新。',
    aliases: ['吐司', 'bread']
  },
  {
    name: '馒头', emoji: '🍞', category: '主食', defaultUnit: '个', defaultQuantity: 3,
    options: [
      { method: '冷冻', area: '冷冻区', days: 30, label: '冷冻 · 冷冻室' },
      { method: '常温', area: '常温区', days: 2, label: '常温 · 阴凉处' }
    ],
    freezable: true, tips: '剩馒头趁热分装冷冻，复蒸口感更好。',
    aliases: ['mantou']
  },
  {
    name: '饺子', emoji: '🥟', category: '主食', defaultUnit: '个', defaultQuantity: 10,
    options: [
      { method: '冷冻', area: '冷冻区', days: 30, label: '冷冻 · 冷冻室' },
      { method: '冷藏', area: '冷藏区', days: 2, label: '冷藏 · 冷藏室（现吃）' }
    ],
    freezable: true, tips: '生饺子平铺冷冻定型后再装袋防粘。',
    aliases: ['dumpling', '馄饨']
  },
  {
    name: '火腿', emoji: '🍖', category: '主食', defaultUnit: 'g', defaultQuantity: 200,
    options: [
      { method: '冷藏', area: '冷藏区', days: 7, label: '冷藏 · 冷藏室中层' },
      { method: '冷冻', area: '冷冻区', days: 60, label: '冷冻 · 冷冻室' }
    ],
    freezable: true, tips: '开封后冷藏并尽快食用，久存建议冷冻。',
    aliases: ['ham', '方腿']
  },
  {
    name: '培根', emoji: '🥓', category: '主食', defaultUnit: 'g', defaultQuantity: 150,
    options: [
      { method: '冷藏', area: '冷藏区', days: 7, label: '冷藏 · 冷藏室中层' },
      { method: '冷冻', area: '冷冻区', days: 30, label: '冷冻 · 冷冻室' }
    ],
    freezable: true, tips: '未开封冷藏；开封后尽快食用，长期冷冻。',
    aliases: ['bacon']
  },
  {
    name: '香肠', emoji: '🌭', category: '主食', defaultUnit: 'g', defaultQuantity: 200,
    options: [
      { method: '冷藏', area: '冷藏区', days: 14, label: '冷藏 · 冷藏室中层' },
      { method: '冷冻', area: '冷冻区', days: 60, label: '冷冻 · 冷冻室' }
    ],
    freezable: true, tips: '冷藏短期；长期或大量建议冷冻。',
    aliases: ['腊肠', 'sausage']
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

/** 全部分类（与 types/ingredient.ts 的 IngredientCategory 保持一致） */
export const INGREDIENT_CATEGORIES: IngredientCategory[] = [
  '蔬菜',
  '水果',
  '肉类',
  '蛋类',
  '奶制品',
  '海鲜',
  '豆制品',
  '调味品',
  '主食',
  '其他'
]

/**
 * 归一化结果
 * ---------------------------------------------------------------
 * known=true  → 命中知识库，canonical 为知识库标准名，可直接信任保存建议
 * known=false → 未命中，canonical 保留模型原始输出，category 暂置「其他」，
 *               并透出 known:false 让前端高亮「未在知识库中，请确认」，
 *               **绝不静默强制映射**，避免把错识食材当成已收录处理。
 */
export interface NormalizedFood {
  raw: string
  canonical: string
  category: IngredientCategory
  known: boolean
  /** 未命中时给一个偏低的置信度偏移，提示用户复核 */
  confidenceBias: number
}

/** 集中式名称归一化：别名 → 标准名，未命中不强制归为「其他」 */
export function normalizeFoodName(raw: string): NormalizedFood {
  const name = (raw || '').trim()
  if (!name) return { raw: name, canonical: name, category: '其他', known: false, confidenceBias: -0.3 }
  const food = findFood(name)
  if (food) {
    return {
      raw: name,
      canonical: food.name,
      category: food.category as IngredientCategory,
      known: true,
      confidenceBias: 0
    }
  }
  // 未命中：保留原名称，标记 unknown，交由确认页让用户校正
  return { raw: name, canonical: name, category: '其他', known: false, confidenceBias: -0.2 }
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
