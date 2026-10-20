# -*- coding: utf-8 -*-
"""把 product-evidence 的核心文件打包成一个合并 Markdown + 一个 ZIP。

用法：python tools/pack_evidence.py
输出：
  docs/product-evidence/FreshKeep_证据包_合并.md
  docs/product-evidence/FreshKeep_证据包.zip
"""
import os
import zipfile
from datetime import date

BASE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                    "docs", "product-evidence")

# 顺序即阅读顺序：先总览/审计，再测试，再简历，最后迭代与 CSV 数据
FILES = [
    ("README.md", "md", "证据包说明与文件清单"),
    ("project_audit.md", "md", "项目现状与证据盘点（14 模块）"),
    ("test_plan.md", "md", "测试方案、用例、缺陷清单、回归说明"),
    ("resume_evidence.md", "md", "简历可写证据 + 措辞 + A–H 报告"),
    ("iteration_backlog.md", "md", "需求优先级与迭代计划"),
    ("storage_rule_test_results.csv", "csv", "保鲜/临期规则测试逐例（20/20）"),
    ("recipe_test_results.csv", "csv", "菜谱推荐测试逐例（20/20）"),
]


def read_text(name: str) -> str:
    with open(os.path.join(BASE, name), "r", encoding="utf-8-sig") as f:
        return f.read()


def build_combined() -> str:
    today = date.today().isoformat()
    out = []
    out.append("# FreshKeep / AI 智能冰箱管家 · 项目证据包（合并版）\n")
    out.append(f"> 生成日期：{today} ｜ 用途：提交给 ChatGPT 做项目复盘/简历润色/面试问答\n")
    out.append("> 原则：真实、可追溯、可复现；不虚构任何指标、用户反馈或识别准确率。\n")
    out.append("\n## 文件清单\n\n")
    out.append("| # | 文件 | 类型 | 说明 |\n")
    out.append("|---|------|------|------|\n")
    for i, (name, kind, desc) in enumerate(FILES, 1):
        out.append(f"| {i} | `{name}` | {kind.upper()} | {desc} |\n")
    out.append("\n---\n")

    for name, kind, desc in FILES:
        content = read_text(name)
        out.append(f"\n\n# {name}\n")
        out.append(f"<!-- {desc} -->\n")
        if kind == "md":
            out.append(content.rstrip() + "\n")
        else:
            out.append("```csv\n" + content.rstrip() + "\n```\n")
        out.append("\n---\n")

    out.append("\n## 给 ChatGPT 的上下文提示（可直接粘贴）\n\n")
    out.append("这是一个微信小程序「AI 智能冰箱管家」的项目证据包。请基于以上材料：\n\n")
    out.append("1. 不要编造任何数字，凡标注「未执行 / 暂无数据」的项保持如实；\n")
    out.append("2. 帮我提炼 3 条最能打的简历要点（每条附证据文件名）；\n")
    out.append("3. 指出材料里最容易被面试官追问的薄弱点，并给出诚实回答口径。\n")
    return "".join(out)


def main():
    combined = build_combined()
    md_path = os.path.join(BASE, "FreshKeep_证据包_合并.md")
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(combined)

    zip_path = os.path.join(BASE, "FreshKeep_证据包.zip")
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
        for name, _, _ in FILES:
            z.write(os.path.join(BASE, name), arcname=name)
        # 合并版也放进压缩包，方便解压即读
        z.write(md_path, arcname="FreshKeep_证据包_合并.md")

    print("OK")
    print("MD :", md_path, os.path.getsize(md_path), "bytes")
    print("ZIP:", zip_path, os.path.getsize(zip_path), "bytes")
    print("files in zip:", len(FILES) + 1)


if __name__ == "__main__":
    main()
