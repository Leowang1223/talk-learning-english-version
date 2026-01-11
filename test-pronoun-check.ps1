# 🧪 代詞檢測快速測試腳本
# 使用方法: 在瀏覽器控制台 (F12) 中執行

console.log('🧪 開始測試代詞檢測功能...\n')

# 定義代詞集合
$PRONOUNS = @('我', '俺', '咱', '咱們', '咱们', '吾', '你', '您', '妳', '儂', '侬', '汝', '他', '她', '它', '牠', '祂', '伊')

# 測試案例
$testCases = @(
    @{
        Name = '測試 1: 代詞錯誤 "我" vs "你"'
        Expected = '你叫什麼名字'
        Actual = '我叫什麼名字'
        ShouldPass = $false
    },
    @{
        Name = '測試 2: 完全正確'
        Expected = '你叫什麼名字'
        Actual = '你叫什麼名字'
        ShouldPass = $true
    },
    @{
        Name = '測試 3: 缺少代詞'
        Expected = '你好嗎'
        Actual = '好嗎'
        ShouldPass = $false
    }
)

Write-Host "`n執行測試案例...`n" -ForegroundColor Cyan

foreach ($test in $testCases) {
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host "🔍 $($test.Name)" -ForegroundColor Yellow
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host "預期文本: $($test.Expected)" -ForegroundColor Green
    Write-Host "實際文本: $($test.Actual)" -ForegroundColor Cyan
    
    # 清理文本
    $cleanExpected = $test.Expected -replace '[，。！？；：、""''（）《》【】\s]', '' -replace '[,\.!?;:"''\(\)\[\]\s]', ''
    $cleanActual = $test.Actual -replace '[，。！？；：、""''（）《》【】\s]', '' -replace '[,\.!?;:"''\(\)\[\]\s]', ''
    
    Write-Host "清理後預期: $cleanExpected" -ForegroundColor Green
    Write-Host "清理後實際: $cleanActual" -ForegroundColor Cyan
    
    # 檢查第一個字符
    $char0Exp = $cleanExpected[0]
    $char0Act = $cleanActual[0]
    
    $expIsPronoun = $PRONOUNS -contains $char0Exp
    $actIsPronoun = $PRONOUNS -contains $char0Act
    
    Write-Host "`n[位置 0] 代詞檢查:" -ForegroundColor White
    Write-Host "  預期: '$char0Exp' $(if ($expIsPronoun) { '(✓ 是代詞)' } else { '(✗ 非代詞)' })" -ForegroundColor $(if ($expIsPronoun) { 'Green' } else { 'Gray' })
    Write-Host "  實際: '$char0Act' $(if ($actIsPronoun) { '(✓ 是代詞)' } else { '(✗ 非代詞)' })" -ForegroundColor $(if ($actIsPronoun) { 'Cyan' } else { 'Gray' })
    
    # 判定結果
    $hasError = $false
    if ($expIsPronoun -and $actIsPronoun -and $char0Exp -ne $char0Act) {
        Write-Host "`n  ❌❌❌ 致命錯誤: 代詞不匹配！" -ForegroundColor Red
        Write-Host "      → 預期代詞: '$char0Exp'" -ForegroundColor Red
        Write-Host "      → 實際代詞: '$char0Act'" -ForegroundColor Red
        $hasError = $true
    }
    elseif ($expIsPronoun -and -not $actIsPronoun) {
        Write-Host "`n  ❌ 錯誤: 預期代詞但實際不是" -ForegroundColor Red
        $hasError = $true
    }
    elseif (-not $expIsPronoun -and $actIsPronoun) {
        Write-Host "`n  ❌ 錯誤: 不應該有代詞但實際有" -ForegroundColor Red
        $hasError = $true
    }
    elseif ($expIsPronoun -and $actIsPronoun -and $char0Exp -eq $char0Act) {
        Write-Host "`n  ✅ 完美: 代詞完全匹配" -ForegroundColor Green
    }
    
    # 測試結果
    $testPassed = (-not $hasError -and $test.ShouldPass) -or ($hasError -and -not $test.ShouldPass)
    
    Write-Host "`n預期結果: $(if ($test.ShouldPass) { '✅ 應該通過' } else { '❌ 應該失敗' })" -ForegroundColor Gray
    Write-Host "實際結果: $(if ($hasError) { '❌ 檢測到錯誤' } else { '✅ 無錯誤' })" -ForegroundColor Gray
    Write-Host "測試狀態: $(if ($testPassed) { '✅ 通過' } else { '❌ 失敗' })" -ForegroundColor $(if ($testPassed) { 'Green' } else { 'Red' })
    Write-Host ""
}

Write-Host "`n✅ 測試完成！" -ForegroundColor Green
Write-Host "`n📝 現在請執行以下步驟測試實際系統:" -ForegroundColor Yellow
Write-Host "1. 打開 http://localhost:3000" -ForegroundColor White
Write-Host "2. 按 F12 打開開發者工具" -ForegroundColor White
Write-Host "3. 切換到 Console 標籤" -ForegroundColor White
Write-Host "4. 進入 Lesson 1 並錄音" -ForegroundColor White
Write-Host "5. 說 '我叫什麼名字' (故意錯誤)" -ForegroundColor White
Write-Host "6. 查看控制台是否出現 '🚨🚨🚨 checkKeySlots 函數被調用！'" -ForegroundColor White
Write-Host ""
