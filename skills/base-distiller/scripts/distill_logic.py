import json
import os
import re
from pathlib import Path
from collections import defaultdict

# Path configuration
BASE_DIR = Path.home() / ".gemini" / "antigravity"
SKILLS_REGISTRY = BASE_DIR / "skills" / "skills_registry.json"
KB_INDEX = BASE_DIR / "knowledge-base" / "_index.json"
EXP_INDEX = BASE_DIR / "experience" / "_index.json"

def load_json(path):
    if not path.exists():
        return None
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def check_file_exists(relative_path):
    # Handle ~/ prefix
    if relative_path.startswith("~"):
        full_path = Path(os.path.expanduser(relative_path.replace("~", "C:/Users/USER")))
    else:
        full_path = Path(relative_path)
    
    # Check if absolute or relative to BASE_DIR
    if not full_path.exists():
        # Try relative to BASE_DIR
        full_path = BASE_DIR / relative_path
    
    return full_path.exists(), str(full_path)

def normalize_tag(tag):
    t = tag.lower().strip()
    t = re.sub(r'ing$', '', t)  # naive stemming
    t = re.sub(r's$', '', t)    # naive plural removal
    return t

def run_distill():
    report = []
    report.append("# 注册表精炼提议报告 (Registry Distillation Proposal)")
    report.append(f"日期: 2026-04-18\n")

    # 1. Skills Registry Analysis
    skills = load_json(SKILLS_REGISTRY)
    if skills:
        report.append("## 1. 職能註冊表分析 (Skills Registry)")
        missing_files = []
        all_tags = defaultdict(list)
        
        for item in skills:
            exists, actual_path = check_file_exists(item['filepath'])
            if not exists:
                missing_files.append(f"- `{item['skill_id']}`: {item['filepath']}")
            
            for tag in item.get('tags', []):
                norm = normalize_tag(tag)
                all_tags[norm].append(tag)
        
        if missing_files:
            report.append("### ⚠️ 缺失檔案 (Missing Files)")
            report.extend(missing_files)
        else:
            report.append("- ✅ 所有登記技能路徑皆有效。")
            
        # Tag Analysis
        duplicate_tags = {k: list(set(v)) for k, v in all_tags.items() if len(set(v)) > 1}
        if duplicate_tags:
            report.append("### 💡 建議標籤合併 (Suggested Tag Merges)")
            for norm, variants in duplicate_tags.items():
                report.append(f"- `{norm}`: 建議將 `{', '.join(variants)}` 統一為 `{norm}`")
    
    # 2. Knowledge Base Analysis
    kb = load_json(KB_INDEX)
    if kb:
        report.append("\n## 2. 知識庫分析 (Knowledge Base)")
        categories = kb.get('categories', [])
        
        # Overlap Check
        overlaps = []
        for i in range(len(categories)):
            for j in range(i + 1, len(categories)):
                c1 = categories[i]
                c2 = categories[j]
                s1 = set(c1['keywords'])
                s2 = set(c2['keywords'])
                intersect = s1.intersection(s2)
                if intersect:
                    overlap_pct = (len(intersect) * 2) / (len(s1) + len(s2))
                    if overlap_pct > 0.3: # Threshold 30% for highlighting
                        overlaps.append(f"- `{c1['name']}` & `{c2['name']}`: 重疊關鍵詞 `{', '.join(intersect)}` (重疊度 {overlap_pct:.0%})")
        
        if overlaps:
            report.append("### 🔍 語義重疊警告 (Category Overlaps)")
            report.append("> 以下分類具有高重疊度，建議評估是否合併：")
            report.extend(overlaps)
        else:
            report.append("- ✅ 知識庫分類語義清晰，無顯著重疊。")

    # 3. Experience Analysis
    exp = load_json(EXP_INDEX)
    if exp:
        report.append("\n## 3. 經驗索引分析 (Experience)")
        items = exp.get('skills', [])
        report.append(f"- 當前記錄了 `{len(items)}` 個技能的實戰經驗。")
        for item in items:
            count = len(item.get('entries', []))
            if count > 5:
                report.append(f"- 💡 `{item['id']}` 已累積 `{count}` 條記錄，建議進行更高階的 Logic Distillation。")

    report.append("\n---")
    report.append("**請檢查以上提議。若您核准特定合併項，請在回覆中說明，我將執行更新。**")
    
    return "\n".join(report)

if __name__ == "__main__":
    report_content = run_distill()
    proposal_path = BASE_DIR / "skills" / "base-distiller" / "distillation_proposal.md"
    with open(proposal_path, 'w', encoding='utf-8') as f:
        f.write(report_content)
    print(f"Report generated successfully at {proposal_path}")
