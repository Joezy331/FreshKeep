// ESM 钩子注册入口：让 resolver.mjs 的 resolve 钩子生效（为无扩展名 import 补 .ts 后缀）。
// 运行：node --experimental-strip-types --import ./tools/hooks.mjs <测试脚本>
import { register } from 'node:module'
register(new URL('./resolver.mjs', import.meta.url), import.meta.url)
