# ✅ 除錯完成 - 服務已啟動

## 🔧 問題診斷

**錯誤**: ERR_CONNECTION_REFUSED - 無法連接到 localhost

**原因**: 
- 後端和前端服務都沒有運行
- 之前的進程已停止

## ✅ 解決方案

### 1. 後端服務 (端口 8082)
```bash
cd apps/backend
npm run dev
```
**狀態**: ✅ 正常運行
- Server running on port 8082
- Environment: development

### 2. 前端服務 (端口 3000)
```bash
cd apps/web
npm run dev
```
**狀態**: ✅ 正常運行
- Next.js 14.0.0
- Local: http://localhost:3000
- Ready in 3.3s

## 📊 服務驗證

### 後端 API 測試
```powershell
Invoke-WebRequest -Uri "http://localhost:8082/api/lessons/L1" -UseBasicParsing
```
**結果**: ✅ 200 OK - 成功返回 L1 課程數據

### 前端頁面測試
```powershell
# 首頁
Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing
結果: ✅ 200 OK

# L1 課程頁面
Invoke-WebRequest -Uri "http://localhost:3000/lesson/L1" -UseBasicParsing
結果: ✅ 200 OK
```

## 🌐 訪問方式

### 應用首頁
http://localhost:3000

### L1 課程（含 4 個 YouTube 影片）
http://localhost:3000/lesson/L1

## 🎬 L1 課程內容確認

所有 4 個 YouTube Shorts 影片已成功加載：

1. **問題 1 (你好)**: `LaKpMsKzAlI` - 3 段字幕
2. **問題 2 (我是學生)**: `7l51ah8ktKc` - 3 段字幕
3. **問題 3 (靈活造句)**: `mpZIUhuH3Tc` - 3 段字幕
4. **問題 4 (綜合複習)**: `5Fj8E7EhJxQ` - 3 段字幕

## 💡 使用建議

### 啟動服務（推薦方式）

**方法 1: 使用批次檔**
- 後端: 雙擊 `start-backend.bat`
- 前端: 雙擊 `apps/web/start-frontend.bat`

**方法 2: 手動啟動**
```powershell
# 終端 1 - 後端
cd apps/backend
npm run dev

# 終端 2 - 前端 (新的 PowerShell 窗口)
cd apps/web
npm run dev
```

### 停止服務
在終端中按 `Ctrl+C`

## 🎯 下一步

1. 打開瀏覽器訪問: http://localhost:3000/lesson/L1
2. 測試每個問題的影片播放功能
3. 確認字幕顯示正確
4. 測試語音識別和評分功能

---

**除錯完成時間**: 2025-01-14  
**狀態**: ✅ 所有服務正常運行，可以開始測試
