# -*- coding: utf-8 -*-
import re, sys
sys.stdout.reconfigure(encoding="utf-8")

CSS = r"d:/SGCC Root/供电所值守云平台前端/frontend/dist/assets/index-DwrQiRTX.css"
with open(CSS, encoding="utf-8") as f:
    css = f.read()

# 提取所有 .dialog-overlay 相关规则（含 scoped 哈希可能前缀）
for m in re.finditer(r'([^{}]{0,80}\.dialog-overlay[^{}]*)\{([^}]*)\}', css):
    sel = m.group(1).strip()
    decl = m.group(2).strip()
    print("选择器:", sel)
    print("  声明:", decl[:300])
    print("---")
