# FreshKeep 项目证据链（Product Evidence）

> 目标：为 AI 产品经理秋招简历/面试/作品集，建立**真实、可追溯、可复现**的项目证据链。
> 原则：严格区分【已有证据 A / 实际测试 B / 待验证假设 C / 暂无数据 D】，**不虚构任何指标、用户反馈或准确率**。

## 文件清单与用途

| 文件 | 用途 | 数据来源 / 限制 |
|------|------|---------------|
| `project_audit.md` | 项目现状与证据盘点表（11 模块，5 状态标签） | 代码审查 + 真实单测 |
| `competitor_analysis.md` | 竞品对比矩阵 + 事实依据 + 差异化机会 | 5 款真实产品，Web 来源可查 |
| `test_plan.md` | 测试方案、用例、缺陷清单(D1–D6)、回归说明 | 含未执行项标记 |
| `recognition_test_results.csv` | 百度识别真实测试记录 | **未执行**（无密钥），仅模板 |
| `storage_rule_test_results.csv` | 保鲜/临期规则测试记录 | **真实执行**：26 例，26 通过（D1/D2 修复；S16/S21/S22 批次独立） |
| `recipe_test_results.csv` | 菜谱推荐测试记录 | **真实执行**：20 例，20 通过（D3 别名归一修复） |
| `reminder_test_results.csv` | 临期提醒逻辑测试记录 | **真实执行**：5 例，5 通过（逻辑层，未接入订阅消息） |
| `analytics_spec.md` | 埋点事件定义 + 8 项指标口径 | 仅规范+本地桩，无真实数据 |
| `mock_analytics_sample.csv` | 模拟看板数据 | ⚠️**模拟数据，仅演示，非真实用户** |
| `user_research_plan.md` | 用户研究方案 + 记录模板 | **未执行**（无真人），方案+模板 |
| `iteration_backlog.md` | 需求优先级 P0/P1/P2 + 验收标准 | 基于测试缺陷与竞品 |
| `resume_evidence.md` | 简历可写证据清单 + 措辞 + A–H 报告 | 全部可追溯 |

## 如何复现真实测试
```bash
cd <项目根>
node --experimental-strip-types --import ./tools/hooks.mjs tools/product-evidence-tests.mjs
# 产出：storage_rule_test_results.csv / recipe_test_results.csv / recognition_test_results.csv
```

## 数据来源与使用限制（务必阅读）
1. **百度识别**：本仓库不含真实密钥（安全红线），端到端识别**未执行**；`recognition_test_results.csv` 仅模板，不得当"已通过"。
2. **真实测试**：保鲜/菜谱 CSV 为 Node 真实执行项目模块的结果，可复现；首轮发现的 4 处失败（D1–D4）已修复并回归至 20/20（见 `test_plan.md` 缺陷清单）。
3. **模拟数据**：`mock_analytics_sample.csv` 明确标注"仅用于演示"，**不代表任何真实用户行为**，严禁写入简历或对外号称真实指标。
4. **用户研究**：当前无真实用户数据（类别 D）；`user_research_plan.md` 仅为方案与模板，不含已完成结果。
5. **诚实边界**：菜谱推荐=规则匹配（非 LLM）；保存建议=28 种食材规则库（非 AI）；临期提醒仅生成数据未接入微信订阅消息；埋点仅本地未上报。

> 任何结论均可在本目录代码/文档/CSV 中复现；如与代码不符，以代码为准。
