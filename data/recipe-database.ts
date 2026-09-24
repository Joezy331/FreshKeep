import type { Recipe } from '../types/recipe'

/**
 * 内置菜谱库
 * pantry: 家庭常备调味品（默认视为已有，不计入匹配度）
 * optional: 可选食材（不影响匹配度）
 */
export const RECIPE_DATABASE: Recipe[] = [
  {
    id: 'r_tomato_egg',
    name: '西红柿炒鸡蛋',
    emoji: '🍅',
    desc: '国民下饭菜，10 分钟搞定',
    ingredients: [
      { name: '西红柿', amount: '2 个' },
      { name: '鸡蛋', amount: '3 个' },
      { name: '葱', amount: '1 根', optional: true },
      { name: '盐', amount: '适量', pantry: true },
      { name: '食用油', amount: '适量', pantry: true }
    ],
    steps: [
      '西红柿顶部划十字，开水烫后去皮切块',
      '鸡蛋打散，加少许盐搅匀',
      '锅中倒油，油热后倒入蛋液',
      '鸡蛋炒至凝固盛出备用',
      '锅中留底油，下西红柿翻炒出汁',
      '倒回鸡蛋，加盐翻匀',
      '撒葱花，出锅'
    ],
    difficulty: 1,
    time: 10,
    tags: ['快手', '家常', '下饭'],
    category: '蛋类'
  },
  {
    id: 'r_tomato_egg_noodle',
    name: '番茄鸡蛋面',
    emoji: '🍜',
    desc: '一碗热汤面，酸香开胃',
    ingredients: [
      { name: '西红柿', amount: '2 个' },
      { name: '鸡蛋', amount: '2 个' },
      { name: '葱', amount: '1 根', optional: true },
      { name: '面条', amount: '1 人份', optional: true },
      { name: '盐', amount: '适量', pantry: true }
    ],
    steps: [
      '西红柿切块，鸡蛋打散',
      '热油炒蛋，盛出备用',
      '下西红柿炒出浓汁',
      '加两碗清水煮开',
      '下面条煮至八分熟',
      '倒回鸡蛋，加盐调味',
      '撒葱花出锅'
    ],
    difficulty: 1,
    time: 15,
    tags: ['主食', '汤面'],
    category: '主食'
  },
  {
    id: 'r_spinach_egg_soup',
    name: '菠菜鸡蛋汤',
    emoji: '🥣',
    desc: '清爽快手汤，消耗绿叶菜',
    ingredients: [
      { name: '菠菜', amount: '1 把' },
      { name: '鸡蛋', amount: '2 个' },
      { name: '姜', amount: '2 片', optional: true },
      { name: '盐', amount: '适量', pantry: true }
    ],
    steps: [
      '菠菜洗净切段，鸡蛋打散',
      '锅中加水与姜片煮开',
      '下菠菜焯烫 30 秒',
      '缓缓倒入蛋液并搅散',
      '加盐调味',
      '淋几滴香油出锅'
    ],
    difficulty: 1,
    time: 10,
    tags: ['快手', '汤羹', '清淡'],
    category: '蔬菜'
  },
  {
    id: 'r_garlic_spinach',
    name: '蒜蓉菠菜',
    emoji: '🥬',
    desc: '蒜香十足，5 分钟出锅',
    ingredients: [
      { name: '菠菜', amount: '1 把' },
      { name: '蒜', amount: '3 瓣' },
      { name: '盐', amount: '适量', pantry: true },
      { name: '食用油', amount: '适量', pantry: true }
    ],
    steps: [
      '菠菜洗净切段，蒜切末',
      '水开加少许盐，菠菜焯 20 秒捞出',
      '热锅冷油下蒜末爆香',
      '倒入菠菜大火快炒',
      '加盐调味立即出锅'
    ],
    difficulty: 1,
    time: 8,
    tags: ['快手', '素菜'],
    category: '蔬菜'
  },
  {
    id: 'r_scallion_beef',
    name: '葱爆牛肉',
    emoji: '🥩',
    desc: '大火快炒，牛肉嫩滑',
    ingredients: [
      { name: '牛肉', amount: '300g' },
      { name: '葱', amount: '3 根' },
      { name: '姜', amount: '2 片', optional: true },
      { name: '生抽', amount: '1 勺', pantry: true },
      { name: '食用油', amount: '适量', pantry: true }
    ],
    steps: [
      '牛肉逆纹切薄片，加生抽抓匀腌 10 分钟',
      '葱切段，姜切丝',
      '大火热锅，倒油烧至冒烟',
      '下牛肉快速滑炒至变色盛出',
      '锅留底油，下葱姜爆香',
      '倒回牛肉大火翻匀',
      '调味出锅'
    ],
    difficulty: 2,
    time: 20,
    tags: ['家常', '下饭'],
    category: '肉类'
  },
  {
    id: 'r_tomato_beef',
    name: '番茄牛腩',
    emoji: '🍲',
    desc: '慢炖浓汤，拌饭一绝',
    ingredients: [
      { name: '牛肉', amount: '400g' },
      { name: '西红柿', amount: '3 个' },
      { name: '洋葱', amount: '半个', optional: true },
      { name: '姜', amount: '3 片', optional: true },
      { name: '盐', amount: '适量', pantry: true }
    ],
    steps: [
      '牛肉切块冷水下锅焯去血沫',
      '西红柿切块，洋葱切丝',
      '热油炒西红柿至出沙',
      '加牛肉翻炒均匀',
      '加热水没过食材',
      '小火炖 60 分钟至软烂',
      '加盐调味收汁'
    ],
    difficulty: 2,
    time: 80,
    tags: ['炖菜', '汤羹'],
    category: '肉类'
  },
  {
    id: 'r_potato_shred',
    name: '醋溜土豆丝',
    emoji: '🥔',
    desc: '脆爽开胃的经典素菜',
    ingredients: [
      { name: '土豆', amount: '2 个' },
      { name: '青椒', amount: '1 个', optional: true },
      { name: '蒜', amount: '2 瓣', optional: true },
      { name: '醋', amount: '1 勺', pantry: true },
      { name: '盐', amount: '适量', pantry: true }
    ],
    steps: [
      '土豆切细丝，清水冲洗淀粉',
      '青椒切丝，蒜切末',
      '热油爆香蒜末',
      '下土豆丝大火快炒',
      '加青椒丝继续翻炒',
      '沿锅边淋醋，加盐出锅'
    ],
    difficulty: 1,
    time: 15,
    tags: ['素菜', '快手'],
    category: '蔬菜'
  },
  {
    id: 'r_pepper_pork',
    name: '青椒肉丝',
    emoji: '🫑',
    desc: '米饭杀手，简单下饭',
    ingredients: [
      { name: '猪肉', amount: '200g' },
      { name: '青椒', amount: '2 个' },
      { name: '姜', amount: '2 片', optional: true },
      { name: '生抽', amount: '1 勺', pantry: true },
      { name: '食用油', amount: '适量', pantry: true }
    ],
    steps: [
      '猪肉切丝，加生抽腌 10 分钟',
      '青椒去籽切丝',
      '热油下肉丝炒至变色盛出',
      '锅留油下青椒炒至断生',
      '倒回肉丝翻炒均匀',
      '调味出锅'
    ],
    difficulty: 1,
    time: 18,
    tags: ['家常', '下饭'],
    category: '肉类'
  },
  {
    id: 'r_mapo_tofu',
    name: '家常豆腐',
    emoji: '🍲',
    desc: '嫩滑入味，配饭刚好',
    ingredients: [
      { name: '豆腐', amount: '1 块' },
      { name: '葱', amount: '1 根', optional: true },
      { name: '蒜', amount: '2 瓣', optional: true },
      { name: '生抽', amount: '1 勺', pantry: true },
      { name: '食用油', amount: '适量', pantry: true }
    ],
    steps: [
      '豆腐切小块，淡盐水浸泡 5 分钟',
      '沥干水分备用',
      '热油将豆腐煎至两面金黄',
      '下蒜末炒香',
      '加生抽与半碗水',
      '中火烧 3 分钟收汁',
      '撒葱花出锅'
    ],
    difficulty: 1,
    time: 20,
    tags: ['素菜', '家常'],
    category: '豆制品'
  },
  {
    id: 'r_cabbage_tofu_soup',
    name: '白菜豆腐汤',
    emoji: '🥣',
    desc: '清淡暖胃，食材简单',
    ingredients: [
      { name: '白菜', amount: '3 片' },
      { name: '豆腐', amount: '半块' },
      { name: '姜', amount: '2 片', optional: true },
      { name: '盐', amount: '适量', pantry: true }
    ],
    steps: [
      '白菜切段，豆腐切块',
      '锅中加水与姜片煮开',
      '下白菜煮 3 分钟',
      '加入豆腐继续煮 5 分钟',
      '加盐调味出锅'
    ],
    difficulty: 1,
    time: 15,
    tags: ['汤羹', '清淡'],
    category: '蔬菜'
  },
  {
    id: 'r_steam_fish',
    name: '清蒸鱼',
    emoji: '🐟',
    desc: '原汁原味，鲜到眉毛',
    ingredients: [
      { name: '鱼', amount: '1 条' },
      { name: '姜', amount: '4 片' },
      { name: '葱', amount: '2 根' },
      { name: '生抽', amount: '2 勺', pantry: true },
      { name: '食用油', amount: '适量', pantry: true }
    ],
    steps: [
      '鱼处理干净，两面划几刀',
      '盘底垫姜丝，鱼身铺姜片',
      '水开后上锅蒸 8 分钟',
      '倒掉盘中腥水',
      '铺新鲜葱丝',
      '淋热油激香',
      '沿盘边淋生抽'
    ],
    difficulty: 2,
    time: 25,
    tags: ['蒸菜', '清淡', '海鲜'],
    category: '海鲜'
  },
  {
    id: 'r_garlic_shrimp',
    name: '蒜蓉虾',
    emoji: '🦐',
    desc: '蒜香浓郁，宴客也拿得出手',
    ingredients: [
      { name: '虾', amount: '250g' },
      { name: '蒜', amount: '5 瓣' },
      { name: '葱', amount: '1 根', optional: true },
      { name: '盐', amount: '适量', pantry: true },
      { name: '食用油', amount: '适量', pantry: true }
    ],
    steps: [
      '虾开背去虾线，洗净沥干',
      '蒜切末备用',
      '热油下蒜末小火炒香',
      '转大火下虾翻炒',
      '炒至虾身变红卷曲',
      '加盐翻匀撒葱花'
    ],
    difficulty: 1,
    time: 15,
    tags: ['海鲜', '快手'],
    category: '海鲜'
  },
  {
    id: 'r_cucumber_salad',
    name: '凉拌黄瓜',
    emoji: '🥒',
    desc: '3 分钟凉菜，爽脆解腻',
    ingredients: [
      { name: '黄瓜', amount: '2 根' },
      { name: '蒜', amount: '3 瓣' },
      { name: '醋', amount: '1 勺', pantry: true },
      { name: '盐', amount: '适量', pantry: true }
    ],
    steps: [
      '黄瓜拍裂后切段',
      '加盐抓匀腌 5 分钟',
      '倒掉腌出的水分',
      '蒜切末撒上',
      '加醋拌匀',
      '冷藏 5 分钟更爽脆'
    ],
    difficulty: 1,
    time: 6,
    tags: ['凉菜', '快手'],
    category: '蔬菜'
  },
  {
    id: 'r_carrot_egg',
    name: '胡萝卜炒鸡蛋',
    emoji: '🥕',
    desc: '清甜配色，孩子爱吃',
    ingredients: [
      { name: '胡萝卜', amount: '1 根' },
      { name: '鸡蛋', amount: '2 个' },
      { name: '葱', amount: '1 根', optional: true },
      { name: '盐', amount: '适量', pantry: true },
      { name: '食用油', amount: '适量', pantry: true }
    ],
    steps: [
      '胡萝卜切细丝',
      '鸡蛋打散加盐',
      '热油炒蛋盛出',
      '锅中补油下胡萝卜丝',
      '中火炒至变软',
      '倒回鸡蛋翻匀',
      '撒葱花出锅'
    ],
    difficulty: 1,
    time: 12,
    tags: ['家常', '快手'],
    category: '蔬菜'
  },
  {
    id: 'r_lettuce_salad',
    name: '手撕生菜',
    emoji: '🥬',
    desc: '零难度，保留脆爽口感',
    ingredients: [
      { name: '生菜', amount: '1 颗' },
      { name: '蒜', amount: '2 瓣', optional: true },
      { name: '生抽', amount: '1 勺', pantry: true },
      { name: '食用油', amount: '适量', pantry: true }
    ],
    steps: [
      '生菜洗净撕成大片',
      '沥干水分',
      '热油爆香蒜末',
      '大火下生菜快炒 20 秒',
      '加生抽调味立即出锅'
    ],
    difficulty: 1,
    time: 6,
    tags: ['素菜', '快手'],
    category: '蔬菜'
  },
  {
    id: 'r_egg_fried_rice',
    name: '蛋炒饭',
    emoji: '🍚',
    desc: '剩饭救星，粒粒分明',
    ingredients: [
      { name: '米饭', amount: '2 碗' },
      { name: '鸡蛋', amount: '2 个' },
      { name: '葱', amount: '1 根', optional: true },
      { name: '胡萝卜', amount: '半根', optional: true },
      { name: '盐', amount: '适量', pantry: true }
    ],
    steps: [
      '剩饭抓散，避免结块',
      '鸡蛋打散加盐',
      '热油炒蛋至半凝固',
      '下米饭大火翻炒',
      '加胡萝卜丁炒匀',
      '加盐调味',
      '撒葱花出锅'
    ],
    difficulty: 1,
    time: 12,
    tags: ['主食', '快手'],
    category: '主食'
  },
  {
    id: 'r_mushroom_chicken',
    name: '香菇滑鸡',
    emoji: '🍄',
    desc: '鲜香滑嫩，拌饭一绝',
    ingredients: [
      { name: '鸡肉', amount: '300g' },
      { name: '香菇', amount: '6 朵' },
      { name: '姜', amount: '3 片' },
      { name: '生抽', amount: '2 勺', pantry: true },
      { name: '食用油', amount: '适量', pantry: true }
    ],
    steps: [
      '鸡肉切块，加生抽腌 15 分钟',
      '香菇泡发切片',
      '热油下姜片爆香',
      '下鸡块炒至表面变白',
      '加香菇翻炒',
      '加半碗水焖 10 分钟',
      '收汁调味出锅'
    ],
    difficulty: 2,
    time: 30,
    tags: ['家常', '炖菜'],
    category: '肉类'
  },
  {
    id: 'r_eggplant',
    name: '蒜香茄子',
    emoji: '🍆',
    desc: '软糯入味，少油版',
    ingredients: [
      { name: '茄子', amount: '2 个' },
      { name: '蒜', amount: '4 瓣' },
      { name: '青椒', amount: '1 个', optional: true },
      { name: '生抽', amount: '1 勺', pantry: true },
      { name: '食用油', amount: '适量', pantry: true }
    ],
    steps: [
      '茄子切条，盐水浸泡 5 分钟',
      '沥干后上锅蒸 8 分钟',
      '蒜切末，青椒切丝',
      '热油爆香蒜末',
      '下茄子与青椒翻炒',
      '加生抽调味'
    ],
    difficulty: 1,
    time: 20,
    tags: ['素菜', '少油'],
    category: '蔬菜'
  },
  {
    id: 'r_onion_egg',
    name: '洋葱炒蛋',
    emoji: '🧅',
    desc: '甜香下饭，5 分钟搞定',
    ingredients: [
      { name: '洋葱', amount: '1 个' },
      { name: '鸡蛋', amount: '3 个' },
      { name: '盐', amount: '适量', pantry: true },
      { name: '食用油', amount: '适量', pantry: true }
    ],
    steps: [
      '洋葱切丝，鸡蛋打散',
      '热油炒蛋盛出',
      '锅中下洋葱中火炒软',
      '倒回鸡蛋翻匀',
      '加盐调味出锅'
    ],
    difficulty: 1,
    time: 10,
    tags: ['快手', '家常'],
    category: '蔬菜'
  }
]

export function getRecipeById(id: string): Recipe | undefined {
  return RECIPE_DATABASE.find((r) => r.id === id)
}
