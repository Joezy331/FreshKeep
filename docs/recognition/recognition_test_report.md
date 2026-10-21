# 识别能力测试报告（FreshKeep）

> 测试入口：`tools/recognition-tests.mjs`（识别核心单测）、`scripts/fetch_recognition_images.mjs`（图片测试集）
> 数据：`data/recognition_samples.csv` + `data/recognition_images/manifest.json`
> 生成日期：2026-10-21

---

## 1. 识别核心单元测试（真实执行）

`tools/recognition-tests.mjs` 对 `services/ai/recognition-core.ts` 与 `data/food-database.ts` 的纯函数做真实断言：

- **结果：通过 17 / 失败 0 / 共 17**（全绿，见 `docs/recognition/recognition_test_results.csv`）
- 覆盖：`normalizeFoodName`（已知/未知/空白/大小写）、`buildCandidatesFromBaidu`（去重/空值）、`clampConfidence`（NaN/负/百分制/上限）、`normalizeCandidates`（知识库分类为单一事实来源）、9 类真实分类命中。

> **真实 API 行明确标记「未执行」**：因当前环境无可用百度/视觉密钥且网络被屏蔽，未发起任何真实识别调用，不冒充真实模型测试。

---

## 2. 图片测试集（30 张 ground-truth）

`data/recognition_samples.csv` 共 30 行，覆盖全部 9 个有食材的分类（round-robin 均匀抽样），ground-truth 标准名全部来自真实知识库 `data/food-database.ts`。

| 项目 | 状态 |
|---|---|
| ground-truth 标准标签 | ✅ 来自知识库，真实 |
| 真实图片文件 | ⚠️ **未执行**（网络屏蔽，无法下载；`data/recognition_images/` 仅放 manifest，未写出任何伪造二进制） |
| 真实 API 识别 | ⚠️ **未执行**（无密钥 + 网络屏蔽；`real_api_status=未执行`） |
| 测试模板 | ✅ `scripts/fetch_recognition_images.mjs` 支持在线环境真实拉取与回写 |

复跑图片集（联网环境）：
```bash
node --experimental-strip-types --import ./tools/hooks.mjs scripts/fetch_recognition_images.mjs
# 默认尝试下载；当前应加 --no-download 跳过（网络不可用）
```

---

## 3. 诚实缺口汇总

| 缺口 | 原因 | 处理 |
|---|---|---|
| 30 张真实食材照片 | 网络屏蔽 | CSV + manifest 占位，`未执行`，不伪造图片 |
| 百度/视觉真实识别 | 无密钥 + 网络屏蔽 | `real_api_status=未执行` |
| 真实识别准确率 | 无真实 API 执行 | 不声称准确率提升 |
| 识别→真实业务效果 | 无真实用户 | 仅交付可复跑测试框架与合成数据 |

---

## 4. 结论

识别链路已完成**架构与可测试性**升级（双通道、候选数组、集中式归一化、8 个 `ingredient_*` 埋点），并通过 17 条真实单测。
**真实识别准确率需联网 + 密钥后在真实图片集上复跑方可得出**，本轮如实标记未执行。
