import { get, set, KEYS } from '../../utils/storage'
import { daysLeftText } from '../../utils/date'
import { listIngredients } from '../food/fridge'
import { recommendRecipes } from '../recipe/recommend'
import type { Ingredient } from '../../types/ingredient'
import type { NotificationItem } from '../../types/user'

/**
 * 提醒引擎（MVP：前端本地模拟）
 * ---------------------------------------------------------------
 * 后续接入微信订阅消息时，只需在 pushSubscriptionMessage() 里
 * 调用服务端 subscribeMessage.send 即可，前端结构不变。
 */

export function buildReminders(): NotificationItem[] {
  const list = listIngredients()
  const readMap = get<Record<string, boolean>>(KEYS.NOTIFICATIONS, {})
  const items: NotificationItem[] = []

  list.forEach((i: Ingredient) => {
    const daysLeft = i.daysLeft ?? 0
    if (daysLeft > 3) return
    const level = daysLeft < 0 ? 'expired' : daysLeft <= 1 ? 'urgent' : 'soon'
    const recipes = recommendRecipes(list, { useExpiring: true, limit: 1 })
    let title = ''
    let body = ''
    if (level === 'expired') {
      title = `${i.name} 已超过记录的最佳食用期限`
      body = '建议检查食材状态，如有异味、变色、发黏等异常情况，请勿食用。'
    } else if (level === 'urgent') {
      title = `${i.name} ${daysLeftText(daysLeft)}`
      body = `你的${i.name}就要进入最佳食用期末期啦，推荐今天消耗。`
    } else {
      title = `${i.name} ${daysLeftText(daysLeft)}`
      body = `再过 ${daysLeft} 天就到最佳食用期，可以开始安排菜谱了。`
    }
    items.push({
      id: `n_${i.id}_${daysLeft}`,
      type: 'expiration',
      title,
      body,
      ingredientId: i.id,
      recipeId: recipes[0] ? recipes[0].recipe.id : undefined,
      level: level as any,
      createdAt: Date.now(),
      read: !!readMap[`n_${i.id}_${daysLeft}`]
    })
  })

  return items.sort((a, b) => {
    const w = { expired: 0, urgent: 1, soon: 2, fresh: 3 } as any
    return w[a.level] - w[b.level]
  })
}

export function unreadCount(): number {
  return buildReminders().filter((n) => !n.read).length
}

export function markRead(id: string): void {
  const map = get<Record<string, boolean>>(KEYS.NOTIFICATIONS, {})
  map[id] = true
  set(KEYS.NOTIFICATIONS, map)
}

export function markAllRead(): void {
  const map = get<Record<string, boolean>>(KEYS.NOTIFICATIONS, {})
  buildReminders().forEach((n) => {
    map[n.id] = true
  })
  set(KEYS.NOTIFICATIONS, map)
}

/** 首页「今日建议」文案 */
export function todaySuggestion(): string {
  const list = listIngredients()
  const urgent = list.filter((i) => i.status === 'urgent' || i.status === 'expired')
  const soon = list.filter((i) => i.status === 'soon')
  if (urgent.length) {
    return `今天优先吃${urgent
      .slice(0, 2)
      .map((i) => i.name)
      .join('和')}`
  }
  if (soon.length) {
    return `可以开始安排${soon
      .slice(0, 2)
      .map((i) => i.name)
      .join('和')}了`
  }
  if (list.length) return '冰箱状态不错，试试用现有食材做道新菜'
  return '冰箱还空着，买菜回来拍张照试试'
}

/**
 * 微信订阅消息接入位（预留）
 * @param tmplId 模板 ID
 * @param payload 模板参数
 */
export function requestSubscribe(tmplId: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!wx.requestSubscribeMessage) {
      resolve(false)
      return
    }
    wx.requestSubscribeMessage({
      tmplIds: [tmplId],
      success: (res: any) => resolve(res[tmplId] === 'accept'),
      fail: () => resolve(false)
    })
  })
}
