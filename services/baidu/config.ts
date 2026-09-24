import { get, set, KEYS } from '../../utils/storage'

/**
 * 百度智能云「菜品识别」凭证（安全加载层）
 * ---------------------------------------------------------------
 * ⚠️ 安全红线：百度 API Key / Secret Key 仅存在于小程序本地存储，
 *    由管理员在「我的」页（长按页脚进入管理员模式）填写，**绝不写死在前端代码**。
 *    微信小程序前端代码可被反编译，Secret Key 一旦下发到客户端即视为已泄露，
 *    生产环境务必改为「自有后端代理」调用百度接口（密钥只留服务端）。
 *
 * 这里只负责从本地存储读取/写入，默认空值；未配置时识别功能会提示先配置。
 */

export interface BaiduCreds {
  apiKey: string
  secretKey: string
}

const EMPTY: BaiduCreds = { apiKey: '', secretKey: '' }

/** 读取当前百度凭证（可能为空） */
export function getBaiduCreds(): BaiduCreds {
  return get<BaiduCreds>(KEYS.BAIDU, EMPTY)
}

/** 保存（合并）百度凭证到本地存储 */
export function saveBaiduCreds(patch: Partial<BaiduCreds>): BaiduCreds {
  const next = { ...getBaiduCreds(), ...patch }
  set(KEYS.BAIDU, next)
  return next
}
