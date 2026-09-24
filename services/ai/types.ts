import type { IngredientCategory, StorageArea, StorageMethod } from '../../types/ingredient'

/** 视觉模型识别出的单个食材 */
export interface RecognizedItem {
  name: string
  /** 置信度 0~1 */
  confidence: number
  category: IngredientCategory
  /** 推荐保存方式 */
  storageMethod: StorageMethod
  /** 推荐冰箱分区 */
  storageArea: StorageArea
  /** 推荐保存天数（参考值） */
  recommendedDays: number
  emoji: string
  tips: string
}

export interface RecognitionResult {
  success: boolean
  items: RecognizedItem[]
  /** 错误信息 */
  error?: string
  /** 原始返回，便于调试 / 替换真实模型时对齐 */
  raw?: any
  /** 耗时 ms */
  cost?: number
  /** 使用的模型名 */
  provider?: string
  /** 真实模型失败、已降级为 Mock 时为 true */
  fallback?: boolean
}

/**
 * AI 识别层统一接口
 * ---------------------------------------------------------------
 * 业务层只依赖这个接口，替换真实视觉模型时只需实现新 Provider，
 * 在 services/ai/index.ts 中注册即可，业务代码零改动。
 */
export interface VisionProvider {
  name: string
  recognize(filePath: string): Promise<RecognitionResult>
}
