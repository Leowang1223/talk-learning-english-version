# 快速診斷並修復語音識別問題

Write-Host "`n🔍 診斷語音識別配置...`n" -ForegroundColor Cyan

# 檢查 .env 文件
$envPath = "apps\backend\.env"
if (Test-Path $envPath) {
    Write-Host "✓ 找到 .env 文件" -ForegroundColor Green
    
    $envContent = Get-Content $envPath -Raw
    
    $hasGeminiKey = $envContent -match "GEMINI_API_KEY=AIza\w+"
    $hasGoogleKey = $envContent -match "GOOGLE_API_KEY=AIza\w+"
    
    if ($hasGeminiKey) {
        Write-Host "✓ Gemini API Key 已配置" -ForegroundColor Green
        $apiKeyConfigured = $true
    } elseif ($hasGoogleKey) {
        Write-Host "✓ Google API Key 已配置" -ForegroundColor Green
        $apiKeyConfigured = $true
    } else {
        Write-Host "❌ 未找到有效的 API Key" -ForegroundColor Red
        Write-Host "`n請添加以下內容到 $envPath :`n" -ForegroundColor Yellow
        Write-Host "GEMINI_API_KEY=你的API_KEY`n" -ForegroundColor Yellow
        Write-Host "獲取 API Key: https://makersuite.google.com/app/apikey" -ForegroundColor Cyan
        $apiKeyConfigured = $false
    }
} else {
    Write-Host "❌ 未找到 .env 文件" -ForegroundColor Red
    Write-Host "`n正在創建 .env 文件...`n" -ForegroundColor Yellow
    
    $envContent = @"
# Gemini API Configuration
GEMINI_API_KEY=你的API_KEY_請替換此處

# 獲取 API Key: https://makersuite.google.com/app/apikey
"@
    
    New-Item -Path $envPath -ItemType File -Value $envContent -Force | Out-Null
    Write-Host "✓ 已創建 $envPath" -ForegroundColor Green
    Write-Host "請編輯文件並添加你的 API Key" -ForegroundColor Yellow
    $apiKeyConfigured = $false
}

Write-Host "`n" + ("=" * 60) + "`n" -ForegroundColor Gray

# 檢查當前運行的進程
Write-Host "🔍 檢查運行中的服務器...`n" -ForegroundColor Cyan

$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "找到 $($nodeProcesses.Count) 個 Node.js 進程" -ForegroundColor Yellow
    
    $response = Read-Host "`n是否要重啟服務器？(Y/N)"
    if ($response -eq 'Y' -or $response -eq 'y') {
        Write-Host "`n正在停止舊進程..." -ForegroundColor Yellow
        $nodeProcesses | Stop-Process -Force
        Start-Sleep -Seconds 2
        Write-Host "✓ 已停止所有 Node.js 進程" -ForegroundColor Green
        
        if ($apiKeyConfigured) {
            Write-Host "`n🚀 正在啟動服務器..." -ForegroundColor Cyan
            Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev"
            Write-Host "✓ 服務器已啟動在新視窗" -ForegroundColor Green
        } else {
            Write-Host "`n⚠️ 請先配置 API Key，然後運行: npm run dev" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "沒有找到運行中的 Node.js 進程" -ForegroundColor Gray
    
    if ($apiKeyConfigured) {
        $response = Read-Host "`n是否要啟動服務器？(Y/N)"
        if ($response -eq 'Y' -or $response -eq 'y') {
            Write-Host "`n🚀 正在啟動服務器..." -ForegroundColor Cyan
            Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev"
            Write-Host "✓ 服務器已啟動在新視窗" -ForegroundColor Green
        }
    } else {
        Write-Host "`n⚠️ 請先配置 API Key" -ForegroundColor Yellow
    }
}

Write-Host "`n" + ("=" * 60) + "`n" -ForegroundColor Gray

# 診斷總結
Write-Host "📊 診斷總結:`n" -ForegroundColor Cyan

if ($apiKeyConfigured) {
    Write-Host "✅ API Key 配置: 已完成" -ForegroundColor Green
    Write-Host "✅ 準備狀態: 可以測試" -ForegroundColor Green
    Write-Host "`n🧪 下一步:" -ForegroundColor Cyan
    Write-Host "1. 打開瀏覽器: http://localhost:3000" -ForegroundColor White
    Write-Host "2. 打開控制台 (F12)" -ForegroundColor White
    Write-Host "3. 錄音並檢查後端日誌" -ForegroundColor White
    Write-Host "4. 確認看到: '使用 Gemini API 進行真實評分'" -ForegroundColor White
} else {
    Write-Host "❌ API Key 配置: 未完成" -ForegroundColor Red
    Write-Host "⚠️ 準備狀態: 需要配置" -ForegroundColor Yellow
    Write-Host "`n🔧 下一步:" -ForegroundColor Cyan
    Write-Host "1. 訪問: https://makersuite.google.com/app/apikey" -ForegroundColor White
    Write-Host "2. 創建新的 API Key" -ForegroundColor White
    Write-Host "3. 編輯 $envPath" -ForegroundColor White
    Write-Host "4. 添加: GEMINI_API_KEY=你的API_KEY" -ForegroundColor White
    Write-Host "5. 重新運行此腳本" -ForegroundColor White
}

Write-Host "`n" + ("=" * 60) + "`n" -ForegroundColor Gray

Write-Host "按任意鍵退出..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
