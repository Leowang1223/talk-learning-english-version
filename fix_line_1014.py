#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
緊急修復腳本 - 移除 questionSimilarity 錯誤
"""

import re

file_path = r'c:\Users\wls09\Desktop\chiness-interview-main\apps\web\app\(protected)\lesson\[id]\page.tsx'

# 讀取文件
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 刪除包含 questionSimilarity 的行
content = re.sub(r".*questionSimilarity.*\n", "", content)

# 清理重複的日誌（移除帶emoji的舊版本）
content = re.sub(
    r"console\.log\('[\U0001F50D�]+ 問題文字:'.*\n",
    "",
    content
)

# 寫回文件
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ 修復完成！")
print("請執行：cd apps/web && npm run build")
