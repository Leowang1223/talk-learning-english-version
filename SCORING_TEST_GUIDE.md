# 🧪 語音評分系統快速測試指南

## ✅ 服務狀態檢查

### 1. 檢查後端是否運行
```bash
curl http://localhost:8082/health
```
應該返回：`{"status":"ok","timestamp":"..."}`

### 2. 檢查前端是否運行
```bash
# PowerShell
Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing
```
應該返回：`StatusCode: 200`

## 🎯 評分測試步驟

### 測試 1: 正確答案（應該通過）

1. 打開：http://localhost:3000/lesson/L1
2. 點擊"開始"按鈕
3. 聽完教學後，點擊麥克風按鈕開始錄音
4. **清楚說出**："你好"
5. 點擊停止錄音
6. **預期結果**：
   - ✅ 分數 >= 90 分
   - ✅ 顯示鼓勵訊息
   - ✅ 自動進入下一題

### 測試 2: 錯誤答案（應該不通過）

1. 在問題 1 重新開始
2. 點擊麥克風按鈕開始錄音
3. **故意說錯**："再見"（或任何不是"你好"的內容）
4. 點擊停止錄音
5. **預期結果**：
   - ❌ 分數 < 70 分
   - ❌ 顯示"再來一次"訊息
   - ❌ 不會自動進入下一題
   - ✅ 需要重新錄音

### 測試 3: 相似但錯誤的答案

1. 問題 2："我是學生"
2. **故意說**："我不是學生"
3. **預期結果**：
   - ❌ 分數 < 70 分（因為內容不符）
   - ❌ 需要重新錄音

## 📊 後端日誌檢查

在後端終端中，你應該看到類似的輸出：

### 正確答案的日誌
```
📝 評分請求: {
  questionId: '1',
  lessonId: 'L1',
  expectedAnswers: [ '你好' ],
  hasAudio: true
}
✅ Gemini 評分成功: {
  transcript: '你好',
  overall_score: 95,
  scores: { ... },
  feedback: "Excellent pronunciation! ..."
}
```

### 錯誤答案的日誌
```
📝 評分請求: {
  questionId: '1',
  lessonId: 'L1',
  expectedAnswers: [ '你好' ],
  hasAudio: true
}
✅ Gemini 評分成功: {
  transcript: '再見',
  overall_score: 35,
  scores: { ... },
  feedback: "The content does not match the expected answer..."
}
```

## ⚠️ 常見問題

### 問題 1: 麥克風無法錄音
**解決方案**：
1. 檢查瀏覽器麥克風權限
2. Chrome: 網址列 → 鎖頭圖標 → 允許麥克風
3. 確認電腦麥克風是否正常工作

### 問題 2: 分數總是隨機（60-100）
**原因**：沒有錄製音頻，使用了模擬評分
**解決方案**：
1. 確保點擊了錄音按鈕
2. 確保說話時麥克風有接收到聲音
3. 檢查後端日誌是否顯示 `hasAudio: true`

### 問題 3: 後端日誌顯示 API 錯誤
**解決方案**：
1. 檢查 `.env` 文件中的 `GEMINI_API_KEY`
2. 確認 API 配額是否用完
3. 如果 API 失敗，系統會自動降級到模擬評分

## 🔧 重啟服務

如果遇到問題，可以重啟服務：

### 停止所有服務
```powershell
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
```

### 啟動後端
```bash
cd apps/backend
npm run dev
```

### 啟動前端（新窗口）
```powershell
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd c:\Users\wls09\Desktop\chiness-interview-main\apps\web ; npm run dev"
```

## 📝 測試清單

- [ ] 後端正常運行（8082 端口）
- [ ] 前端正常運行（3000 端口）
- [ ] 正確答案測試通過（分數 >= 90）
- [ ] 錯誤答案測試失敗（分數 < 70）
- [ ] 後端日誌顯示 Gemini API 成功調用
- [ ] 麥克風權限已允許
- [ ] 錄音功能正常工作

---

**完成所有測試後，評分系統應該能正確區分正確和錯誤的答案！** ✅
