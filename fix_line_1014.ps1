# PowerShell 修復腳本 - 移除 questionSimilarity 錯誤

$filePath = "c:\Users\wls09\Desktop\chiness-interview-main\apps\web\app\(protected)\lesson\[id]\page.tsx"

Write-Host "正在修復 $filePath ..." -ForegroundColor Yellow

# 讀取文件
$content = Get-Content $filePath -Raw -Encoding UTF8

# 刪除包含 questionSimilarity 的行
$content = $content -replace ".*questionSimilarity.*`n", ""

# 保存文件
$content | Set-Content $filePath -Encoding UTF8 -NoNewline

Write-Host "✅ 修復完成！" -ForegroundColor Green
Write-Host "請執行: cd apps\web; npm run build" -ForegroundColor Cyan
