/**
 * Node ESM 解析钩子：让无扩展名的 import（'../utils/date'）也能解析到 .ts
 * 仅用于本地冒烟测试，不参与小程序编译。
 */
export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context)
  } catch (err) {
    if (specifier.startsWith('.')) {
      for (const suffix of ['.ts', '/index.ts']) {
        try {
          return await next(specifier + suffix, context)
        } catch (_) {
          /* try next */
        }
      }
    }
    throw err
  }
}
