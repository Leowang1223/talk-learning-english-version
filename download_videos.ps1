# YouTube Shorts 影片下載腳本 (PowerShell)
# Lesson 1 - Self Introduction

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "🎬 YouTube Shorts 影片下載器" -ForegroundColor Yellow
Write-Host "📚 Lesson 1 - Self Introduction (4 個影片)" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# 定義影片資訊
$videos = @(
    @{Name="step1.mp4"; URL="https://youtube.com/shorts/LaKpMsKzAlI"; Title="你好"},
    @{Name="step2.mp4"; URL="https://youtube.com/shorts/7l51ah8ktKc"; Title="我是學生"},
    @{Name="step3.mp4"; URL="https://youtube.com/shorts/mpZIUhuH3Tc"; Title="造句練習"},
    @{Name="step4.mp4"; URL="https://youtube.com/shorts/5Fj8E7EhJxQ"; Title="綜合複習"}
)

# 輸出目錄
$outputDir = "apps\web\public\videos\lessons\L1"

# 檢查 yt-dlp 是否已安裝
Write-Host "🔍 檢查 yt-dlp..." -ForegroundColor Cyan
$ytdlpExists = Get-Command yt-dlp -ErrorAction SilentlyContinue

if (-not $ytdlpExists) {
    Write-Host "📦 正在安裝 yt-dlp..." -ForegroundColor Yellow
    pip install -U yt-dlp
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ yt-dlp 安裝失敗" -ForegroundColor Red
        Write-Host "請手動執行: pip install -U yt-dlp" -ForegroundColor Yellow
        exit 1
    }
    Write-Host "✅ yt-dlp 安裝成功！" -ForegroundColor Green
    Write-Host ""
}

# 建立輸出目錄
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}
Write-Host "📁 輸出目錄: $outputDir" -ForegroundColor Cyan
Write-Host ""

# 下載計數器
$successCount = 0
$totalCount = $videos.Count

# 下載每個影片
for ($i = 0; $i -lt $videos.Count; $i++) {
    $video = $videos[$i]
    $num = $i + 1
    $outputPath = Join-Path $outputDir $video.Name
    
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "📥 下載 $num/$totalCount : $($video.Name) ($($video.Title))" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Cyan
    
    # 檢查是否已存在
    if (Test-Path $outputPath) {
        Write-Host "⏭️  跳過 (已存在): $($video.Name)" -ForegroundColor Gray
        $successCount++
        Write-Host ""
        continue
    }
    
    # 下載影片
    & yt-dlp -f "best[ext=mp4]/best" --output $outputPath --no-playlist $video.URL
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ $($video.Name) 下載成功！" -ForegroundColor Green
        $successCount++
    } else {
        Write-Host "❌ $($video.Name) 下載失敗" -ForegroundColor Red
    }
    Write-Host ""
}

# 顯示結果
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "📊 下載完成: $successCount/$totalCount 個影片" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

if ($successCount -eq $totalCount) {
    Write-Host "✅ 所有影片下載成功！" -ForegroundColor Green
    Write-Host ""
    Write-Host "📂 影片位置: $(Resolve-Path $outputDir)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🎯 下一步:" -ForegroundColor Yellow
    Write-Host "   1. 檢查影片檔案" -ForegroundColor White
    Write-Host "   2. 訪問: http://localhost:3000/lesson/L1" -ForegroundColor White
    Write-Host "   3. 測試影片播放功能" -ForegroundColor White
} else {
    $failedCount = $totalCount - $successCount
    Write-Host "⚠️  有 $failedCount 個影片下載失敗" -ForegroundColor Red
    Write-Host ""
    Write-Host "可能的原因:" -ForegroundColor Yellow
    Write-Host "   - 網路連線問題" -ForegroundColor White
    Write-Host "   - YouTube 影片已被移除或設為私人" -ForegroundColor White
    Write-Host "   - 地區限制" -ForegroundColor White
}

Write-Host ""
Write-Host "按任意鍵退出..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
