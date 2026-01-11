# Fix Line 1014 Error

$file = "apps\web\app\(protected)\lesson\[id]\page.tsx"

$content = Get-Content $file -Raw -Encoding UTF8
$content = $content -replace ".*questionSimilarity.*`n", ""
$content | Set-Content $file -Encoding UTF8 -NoNewline

Write-Host "Fixed!"
