/** 本地持久化封装：所有读写都做兜底，任何异常都不能让页面崩溃 */

const PREFIX = 'fk:'

export const KEYS = {
  INGREDIENTS: 'ingredients',
  USER: 'user',
  SETTINGS: 'settings',
  NOTIFICATIONS: 'notifications',
  EVENTS: 'events',
  PENDING: 'pending_recognition',
  AI: 'ai_config',
  SEEDED: 'seeded',
  STATS: 'stats',
  /** 管理员模式开关：开启后「我的」页才显示 AI 引擎 / 数据埋点 / 开发演示等内部选项 */
  ADMIN: 'admin_mode',
  /** 百度智能云菜品识别凭证（仅存于本地，绝不进仓库） */
  BAIDU: 'baidu_creds'
}

export function get<T>(key: string, fallback: T): T {
  try {
    const v = wx.getStorageSync(PREFIX + key)
    if (v === '' || v === null || v === undefined) return fallback
    return v as T
  } catch (e) {
    console.error('[storage] read failed', key, e)
    return fallback
  }
}

export function set(key: string, value: any): boolean {
  try {
    wx.setStorageSync(PREFIX + key, value)
    return true
  } catch (e) {
    console.error('[storage] write failed', key, e)
    wx.showToast({ title: '本地存储写入失败', icon: 'none' })
    return false
  }
}

export function remove(key: string): void {
  try {
    wx.removeStorageSync(PREFIX + key)
  } catch (e) {
    console.error('[storage] remove failed', key, e)
  }
}

export function clearAll(): void {
  Object.keys(KEYS).forEach((k) => remove((KEYS as any)[k]))
}

export function genId(prefix = 'i'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e4).toString(36)}`
}
