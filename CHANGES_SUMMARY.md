# 中文學習功能修改摘要

## 修改完成 ✅

已成功實現以下功能：

### 1. Dashboard 頁面修改
**文件**：`apps/web/src/app/(protected)/dashboard/page.tsx`

**變更內容**：
- ❌ 刪除「自我介紹」選項
- ✅ 新增「中文學習課程」可展開列表
- ✅ 顯示 L1-L10 共 10 個課程
- ✅ 點擊課程直接進入 `/interview?type=L1`（跳過準備頁）

**UI 特性**：
- 點擊主標題展開/收合課程列表
- 展開後顯示所有課程的卡片式列表
- 每個課程卡片顯示：課程編號、標題、描述
- hover 效果：藍色高亮

### 2. Interview 頁面修改
**文件**：`apps/web/src/app/(protected)/interview/page.tsx`

**變更內容**：
- ✅ 檢測中文課程（type 以 'L' 開頭）
- ✅ 中文課程跳過影片播放邏輯
- ✅ 中文課程跳過倒數計時（5,4,3,2,1）
- ✅ 直接進入文字對話介面
- ✅ 按鈕文字改為「開始學習」（中文課程）vs「開始面試」（其他）
- ✅ 結束畫面顯示「課程結束」（中文課程）vs「面試結束」（其他）

**邏輯流程**：
```
用戶點擊「開始學習」
  ↓
檢測 isChineseLesson (type.startsWith('L'))
  ↓
如果是中文課程：
  - setFirstPlayed(true) // 跳過影片準備
  - flow.startInterview()
  - 500ms 後自動播放第一個問題
  ↓
如果不是中文課程：
  - 正常流程（準備影片/TTS → 倒數 → 播放）
```

## 現在可以測試

### 快速測試步驟：

1. **打開瀏覽器**
   - 訪問：http://localhost:3000/dashboard

2. **點擊「中文學習課程」展開列表**
   - 應該看到 L1-L10 課程

3. **點擊 L1: Self Introduction**
   - 應該跳轉到 `/interview?type=L1`
   - 看到「開始學習」按鈕

4. **點擊「開始學習」**
   - 不會看到影片
   - 不會有倒數計時
   - 直接顯示第一個問題

5. **完成課程**
   - 顯示「課程結束」
   - 可以返回首頁或查看分析

## 文件結構

```
apps/
├── backend/
│   └── src/
│       ├── plugins/
│       │   └── chinese-lessons/
│       │       ├── L1.json  ✅
│       │       ├── L2.json
│       │       ├── ...
│       │       └── L10.json
│       └── routes/
│           └── analyze.ts  ✅ 已改為中文學習邏輯
└── web/
    └── src/
        └── app/
            └── (protected)/
                ├── dashboard/
                │   └── page.tsx  ✅ 已修改
                └── interview/
                    └── page.tsx  ✅ 已修改
```

## 課程數據結構

每個 `L*.json` 文件應包含：
```json
{
  "lesson_id": "L1",
  "title": "課程標題",
  "description": "課程描述",
  "steps": [
    {
      "id": 1,
      "teacher": "老師的問題",
      "expected_answer": "預期答案",
      "pinyin": "拼音",
      "english_hint": "英文提示",
      "encouragement": "鼓勵訊息"
    }
  ]
}
```

## 待完善的課程內容

目前 L2-L10 使用佔位符標題，建議補充：
- L2: Numbers and Counting
- L3: Colors and Objects
- L4: Family Members
- L5: Daily Activities
- L6: Food and Drinks
- L7: Time and Date
- L8: Directions
- L9: Shopping
- L10: Review and Practice

## 技術細節

### 關鍵判斷邏輯
```typescript
const isChineseLesson = type.startsWith('L')
```

### 跳過影片的實現
```typescript
if (isChineseLesson) {
  setFirstPlayed(true)  // 標記已播放，跳過準備階段
  flow.startInterview()
  setTimeout(() => {
    flow.playQuestion(0)  // 直接播放第一題
  }, 500)
}
```

### 條件渲染
```typescript
// 遮罩只在非中文課程或未開始時顯示
{(!started || (!firstPlayed && !isChineseLesson)) && (...)}

// 按鈕文字根據課程類型變化
開始{isChineseLesson ? '學習' : '面試'}
```

## 後端配置

確保後端 `analyze.ts` 已配置：
- ✅ 只接受 L 開頭的 interviewType
- ✅ 只載入中文課程 JSON
- ✅ 使用 Gemini API（如果有金鑰）

## 安全提醒

⚠️ **重要**：您的 Gemini API 金鑰已在聊天中暴露，建議：
1. 立即到 Google AI Studio 旋轉金鑰
2. 更新 `.env` 文件
3. 確保 `.env` 在 `.gitignore` 中
4. 不要將金鑰提交到版本控制

## 下一步

如果需要進一步開發：
1. **語音功能**：集成 STT 檢查發音
2. **進度追蹤**：記錄已完成的課程
3. **評分系統**：實時評分和反饋
4. **課程解鎖**：按順序解鎖課程

## 測試清單

- [x] Dashboard 顯示課程列表
- [x] 課程列表可展開/收合
- [x] 點擊課程進入 interview 頁面
- [x] 中文課程跳過影片
- [x] 中文課程跳過倒數
- [x] 直接顯示文字問題
- [ ] 完整測試 L1 課程流程
- [ ] 測試課程結束畫面
- [ ] 測試分析頁面

## 完成時間

修改完成於：2025-10-08

---

如有任何問題或需要進一步修改，請參考 `TESTING_GUIDE.md` 文件。
