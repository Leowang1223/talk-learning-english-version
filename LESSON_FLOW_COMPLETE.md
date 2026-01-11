# 中文課程互動流程實現完成

## ✅ 已完成的功能

### 1. 課程頁面 (`/lesson/[id]`)
- ✅ 動態路由，支持不同課程 ID
- ✅ 課程數據從後端 API 載入
- ✅ 開始頁面展示課程資訊
- ✅ 進度條顯示學習進度
- ✅ 題目卡片顯示拼音和英文提示

### 2. 語音播放功能
- ✅ 自動播放當前題目的中文語音 (TTS)
- ✅ 使用瀏覽器內建的 Web Speech API
- ✅ 中文語音合成 (zh-CN)
- ✅ 適當的語速和音調設置

### 3. 字幕顯示
- ✅ SubtitleBar 組件顯示當前題目文字
- ✅ 重試狀態時顯示「再來一次！」
- ✅ 通過時顯示鼓勵語
- ✅ 集成到 TutorPane 組件

### 4. 錄音和評分流程
- ✅ 使用 useInterviewFlow hook 管理流程
- ✅ TTSControls 提供錄音按鈕
- ✅ 錄音後自動發送到後端分析
- ✅ 75分通過機制（低於75分重試）
- ✅ 通過後自動進入下一題

### 5. 後端 API
- ✅ `/api/lessons` - 獲取課程列表
- ✅ `/api/lessons/:id` - 獲取單個課程詳情
- ✅ 從 `plugins/chinese-lessons` 目錄讀取課程 JSON
- ✅ Express 路由已註冊到 server.ts

### 6. Dashboard 更新
- ✅ 課程鏈接更新為 `/lesson/[id]`
- ✅ 點擊課程後進入專屬課程頁面

## 📁 文件結構

```
apps/
├── web/
│   ├── app/
│   │   └── (protected)/
│   │       ├── lesson/
│   │       │   └── [id]/
│   │       │       └── page.tsx          ← 新建：課程頁面
│   │       └── dashboard/
│   │           └── page.tsx              ← 更新：鏈接到課程頁面
│   ├── src/
│   │   └── components/
│   │       └── TutorPane/
│   │           ├── index.tsx             ← 已有：包含 SubtitleBar
│   │           ├── SubtitleBar.tsx       ← 已有：字幕顯示
│   │           └── TTSControls.tsx       ← 已有：錄音控制
│   └── restart-dev.bat                   ← 新建：快速重啟腳本
│
└── backend/
    ├── src/
    │   ├── routes/
    │   │   └── lessons.ts                ← 新建：課程 API 路由
    │   └── server.ts                     ← 更新：註冊課程路由
    └── plugins/
        └── chinese-lessons/
            ├── L1.json                   ← 課程數據文件
            ├── L2.json
            └── ...
```

## 🔄 用戶流程

1. **進入 Dashboard** (`/dashboard`)
   - 查看可用課程列表
   - 點擊任意課程

2. **課程介紹頁面** (`/lesson/[id]`)
   - 顯示課程標題、描述
   - 展示課程內容（題目數量、功能）
   - 點擊「開始課程」按鈕

3. **課程互動頁面**
   - 頂部：進度條顯示當前進度
   - 中間：導師圖片 + 字幕欄
   - 下方：題目提示卡片（拼音、英文）
   - 底部：錄音按鈕

4. **單題流程**
   ```
   播放題目 TTS
   ↓
   用戶點擊「開始錄音」
   ↓
   用戶回答
   ↓
   點擊「停止錄音」
   ↓
   後端分析發音
   ↓
   ├─ 分數 ≥ 75 → 顯示鼓勵 → 下一題
   └─ 分數 < 75 → 顯示「再來一次」→ 重試當前題
   ```

5. **完成課程**
   - 所有題目完成後顯示「恭喜完成課程！」
   - 自動跳轉到報告頁面 (`/report?sessionId=xxx`)

## 🚀 啟動服務器

### 方法 1：使用快速重啟腳本（推薦）
```batch
cd apps\web
restart-dev.bat
```

### 方法 2：手動啟動
```powershell
# 終止現有進程
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# 啟動前端（新窗口）
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\wls09\Desktop\chiness-interview-main\apps\web'; npm run dev"

# 啟動後端（新窗口）
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\wls09\Desktop\chiness-interview-main\apps\backend'; npm run dev"
```

### 確認服務器運行
```powershell
netstat -ano | findstr ":3000 "  # 前端
netstat -ano | findstr ":8082 "  # 後端
```

## 🌐 訪問地址

- **前端**: http://localhost:3000
- **後端 API**: http://localhost:8082
- **課程頁面**: http://localhost:3000/lesson/L1 (L1, L2, L3...)

## 🔧 關鍵技術實現

### 1. TTS 播放
```typescript
const playTTS = useCallback((text: string) => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    utterance.rate = 0.85
    utterance.pitch = 1.0
    window.speechSynthesis.speak(utterance)
  }
}, [])
```

### 2. 自動播放當前題目
```typescript
useEffect(() => {
  if (lesson && started && !flow.isRecording && !flow.isRetrying) {
    const currentStep = lesson.steps[flow.currentStepIndex]
    if (currentStep && flow.currentStepIndex >= 0) {
      setTimeout(() => playTTS(currentStep.teacher), 500)
    }
  }
}, [flow.currentStepIndex, lesson, flow.isRecording, flow.isRetrying, playTTS, started])
```

### 3. 完成後跳轉
```typescript
useEffect(() => {
  if (lesson && flow.currentStepIndex >= lesson.steps.length && flow.isFinished) {
    setTimeout(() => {
      router.push(`/report?sessionId=${flow.sessionId}`)
    }, 1000)
  }
}, [flow.currentStepIndex, flow.isFinished, lesson, flow.sessionId, router])
```

## 📝 API 端點

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/lessons` | 獲取所有課程列表 |
| GET | `/api/lessons/:id` | 獲取單個課程詳情 |
| POST | `/api/analyze` | 分析錄音並評分 |
| GET | `/api/sessions` | 獲取學習歷史 |
| GET | `/api/sessions/:sessionId` | 獲取單次學習詳情 |

## ✨ 下一步改進建議

1. **優化語音品質**
   - 考慮使用 Google TTS API 或 Azure Speech Service
   - 提供多種聲音選項（男聲/女聲）

2. **增強用戶體驗**
   - 添加音量控制
   - 支持暫停/繼續課程
   - 添加跳過題目功能

3. **數據持久化**
   - 保存課程進度到後端
   - 支持斷點續學
   - 課程完成證書

4. **更多互動元素**
   - 添加動畫效果
   - 語音波形顯示
   - 實時發音對比

## 🎉 完成！

現在您可以：
1. 訪問 http://localhost:3000
2. 登入後進入 Dashboard
3. 點擊任意中文課程（L1-L10）
4. 享受完整的語音互動學習體驗！
