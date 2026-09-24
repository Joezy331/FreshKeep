/** 日期工具：统一使用 yyyy-MM-dd 字符串，避免 iOS 兼容问题 */

function pad(n: number): string {
  return n < 10 ? '0' + n : '' + n
}

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** 解析 yyyy-MM-dd 为 Date（本地时区 00:00） */
export function parse(dateStr: string): Date {
  if (!dateStr) return new Date()
  const parts = String(dateStr).split('-')
  const y = Number(parts[0]) || new Date().getFullYear()
  const m = Number(parts[1]) || 1
  const d = Number(parts[2]) || 1
  return new Date(y, m - 1, d, 0, 0, 0, 0)
}

export function today(): string {
  return toDateStr(new Date())
}

export function addDays(dateStr: string, days: number): string {
  const d = parse(dateStr)
  d.setDate(d.getDate() + days)
  return toDateStr(d)
}

/** to - from，单位天 */
export function diffDays(from: string, to: string): number {
  const a = parse(from).getTime()
  const b = parse(to).getTime()
  return Math.round((b - a) / 86400000)
}

/** 距离今天的天数：正数=还剩几天，0=今天，负数=已过期 */
export function daysUntil(dateStr: string): number {
  return diffDays(today(), dateStr)
}

/** 2026/09/07 */
export function formatSlash(dateStr: string): string {
  if (!dateStr) return '--'
  const p = dateStr.split('-')
  return `${p[0]}/${p[1]}/${p[2]}`
}

/** 09/07 */
export function formatShort(dateStr: string): string {
  if (!dateStr) return '--'
  const p = dateStr.split('-')
  return `${p[1]}/${p[2]}`
}

/** 剩余时间文案 */
export function daysLeftText(days: number): string {
  if (days < 0) return `已超过 ${Math.abs(days)} 天`
  if (days === 0) return '今天到期'
  if (days === 1) return '还剩 1 天'
  return `还剩 ${days} 天`
}

export function greetingText(): string {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 11) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
}

export function nowStamp(): number {
  return Date.now()
}

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  if (m < 1) return '刚刚'
  if (m < 60) return `${m} 分钟前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} 小时前`
  return `${Math.floor(h / 24)} 天前`
}
