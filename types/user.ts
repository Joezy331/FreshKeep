import type { IngredientCategory } from './ingredient'

export interface UserPreferences {
  /** 忌口/偏好标签，如 不吃辣、少油 */
  dislikes: string[]
  /** 常做菜 id */
  favoriteRecipes: string[]
  /** 家庭人数 */
  householdSize: number
}

export interface NotificationSettings {
  /** 临期提醒 */
  expiration: boolean
  /** 提前提醒天数 */
  advanceDays: number
  /** 每日做饭提醒 */
  dailyTip: boolean
  /** 提醒时间 09:00 */
  dailyTipTime: string
}

export interface UserProfile {
  id: string
  nickname: string
  avatar: string
  preferences: UserPreferences
  notificationSettings: NotificationSettings
}

/** 通知中心条目 */
export interface NotificationItem {
  id: string
  type: 'expiration' | 'system'
  title: string
  body: string
  /** 关联食材 id */
  ingredientId?: string
  /** 关联食谱 id */
  recipeId?: string
  level: 'fresh' | 'soon' | 'urgent' | 'expired'
  createdAt: number
  read: boolean
}

/** 埋点事件名 */
export type TrackEvent =
  | 'app_launch'
  | 'photo_recognition_click'
  | 'photo_recognition_success'
  | 'photo_recognition_failed'
  | 'recognition_image_uploaded'
  | 'recognition_started'
  | 'recognition_succeeded'
  | 'recognition_failed'
  | 'recognition_candidate_selected'
  | 'recognition_name_corrected'
  | 'recognition_manual_entry'
  | 'recognition_added_to_inventory'
  | 'ingredient_added'
  | 'ingredient_deleted'
  | 'ingredient_consumed'
  | 'expiration_reminder_clicked'
  | 'recipe_recommendation_view'
  | 'recipe_detail_view'
  | 'recipe_cook_clicked'
  | 'recipe_filter_applied'
  | 'fridge_view'
  | 'tab_switch'
