# 報表與 Playback Practice 整合完成

## 🎯 任務目標

將報表系統與 Playback Practice 模組整合，在學習歷史報表和課程完成報表的每一題中添加 "Retry" 按鈕，讓用戶可以快速重新練習單題。

## ✅ 完成內容

### Phase 1: 修改報表組件

#### 1.1 更新 `QuestionReportCard.tsx`

**文件位置**: `apps/web/app/(protected)/components/report/QuestionReportCard.tsx`

**修改內容**:
- ✅ 添加 `'use client'` 指令（使用 useRouter）
- ✅ 引入 `useRouter` from `next/navigation`
- ✅ 新增 props:
  - `lessonId?: string` - 課程 ID
  - `showRetry?: boolean` - 是否顯示 Retry 按鈕
- ✅ 添加 Retry 按鈕組件:
  ```tsx
  {showRetry && lessonId && (
    <button onClick={() => router.push(`/history/playback/${lessonId}/${result.stepId}`)}>
      🔄 Retry This Question
    </button>
  )}
  ```

**視覺效果**:
- 漸層藍紫色按鈕
- 旋轉箭頭圖標
- 懸停時有陰影效果
- 全寬度按鈕，位於每題報表底部

#### 1.2 更新 `LessonReportDisplay.tsx`

**文件位置**: `apps/web/app/(protected)/components/report/LessonReportDisplay.tsx`

**修改內容**:
- ✅ 新增 prop: `showRetry?: boolean = false`
- ✅ 將 `lessonId` 和 `showRetry` 傳遞給 `QuestionReportCard`:
  ```tsx
  <QuestionReportCard
    lessonId={report.lessonId}
    showRetry={showRetry}
  />
  ```

---

### Phase 2: 更新課程完成報表

**文件位置**: `apps/web/app/(protected)/lesson/[id]/page.tsx`

**修改內容**:
- ✅ 在 `LessonReportDisplay` 組件中啟用 `showRetry`:
  ```tsx
  <LessonReportDisplay
    report={lessonReport}
    showTranscript={false}
    showHeader={false}
    showRetry={true}  // 🆕 啟用 Retry 按鈕
  />
  ```

**效果**:
- 課程完成後，用戶可以直接點擊 Retry 重新練習特定題目
- 保持在課程完成頁面的完整報表結構

---

### Phase 3: 更新學習歷史報表

**文件位置**: `apps/web/app/(protected)/history/page.tsx`

**修改內容**:
- ✅ 在 `LessonReportDisplay` 組件中啟用 `showRetry`:
  ```tsx
  <LessonReportDisplay
    report={lessonReport}
    showTranscript={true}
    showHeader={false}
    showRetry={true}  // 🆕 啟用 Retry 按鈕
  />
  ```

**效果**:
- 歷史報表中，每題都有 Retry 按鈕
- 可以快速回到特定題目重新練習
- 查看用戶答案文本（`showTranscript={true}`）

---

### Phase 4: 更新單題練習頁面

**文件位置**: `apps/web/app/(protected)/history/playback/[lessonId]/[stepId]/page.tsx`

**修改內容**:
- ✅ 替換單一 "Back to List" 按鈕為雙按鈕:
  1. **返回報表按鈕**: `router.back()` - 返回上一頁（通常是報表）
  2. **返回首頁按鈕**: `router.push('/dashboard')` - 跳轉到首頁

**視覺效果**:
- 返回報表：白色背景，灰色文字，箭頭圖標
- 返回首頁：藍紫漸層背景，白色文字，房子圖標
- 兩按鈕並排顯示，有間距

---

## 📊 完整用戶流程

### 流程 1: 從課程完成報表重試

```
1. 用戶完成課程
   ↓
2. 查看課程完成報表
   ↓
3. 看到每題都有 "🔄 Retry This Question" 按鈕
   ↓
4. 點擊 Retry 按鈕
   ↓
5. 跳轉到 /history/playback/L1/2
   ↓
6. 進行單題練習（錄音、評分）
   ↓
7. 點擊 "← Back to Report" 返回報表
   或
   點擊 "🏠 Home" 返回首頁
```

### 流程 2: 從學習歷史報表重試

```
1. 用戶進入學習歷史頁面
   ↓
2. 展開某個課程的詳細報表
   ↓
3. 查看逐題分析，每題都有 Retry 按鈕
   ↓
4. 點擊某題的 Retry 按鈕
   ↓
5. 跳轉到單題練習頁面
   ↓
6. 練習並獲得新的評分
   ↓
7. 返回報表或首頁
```

### 流程 3: 從 Playback Practice 標籤練習（保留）

```
1. 用戶進入學習歷史頁面
   ↓
2. 切換到 "Playback Practice" 標籤
   ↓
3. 查看課程列表 (PlaybackPracticeList)
   ↓
4. 點擊某個題目
   ↓
5. 進入單題練習頁面
   ↓
6. 練習完成，返回
```

---

## 🎨 視覺設計

### Retry 按鈕樣式

```tsx
className="mt-4 w-full px-4 py-3 
  bg-gradient-to-r from-blue-500 to-purple-500 
  text-white rounded-lg 
  hover:from-blue-600 hover:to-purple-600 
  transition-all shadow-md hover:shadow-lg 
  flex items-center justify-center gap-2"
```

**特點**:
- 藍紫漸層背景
- 全寬度適應卡片
- 旋轉箭頭圖標（SVG）
- 懸停時顏色加深 + 陰影增強
- 流暢的過渡動畫

### 練習頁面返回按鈕

**返回報表按鈕**:
```tsx
className="px-4 py-2 bg-white rounded-lg shadow 
  hover:shadow-md transition-all 
  flex items-center gap-2 
  text-gray-700 hover:text-gray-900"
```

**返回首頁按鈕**:
```tsx
className="px-4 py-2 
  bg-gradient-to-r from-blue-500 to-purple-500 
  text-white rounded-lg 
  hover:from-blue-600 hover:to-purple-600 
  transition-all shadow-md hover:shadow-lg 
  flex items-center gap-2"
```

---

## 📁 修改文件清單

| 檔案 | 修改內容 | 行數變化 |
|------|---------|---------|
| `components/report/QuestionReportCard.tsx` | 添加 lessonId, showRetry props + Retry 按鈕 | +25 行 |
| `components/report/LessonReportDisplay.tsx` | 添加 showRetry prop 並傳遞 | +3 行 |
| `lesson/[id]/page.tsx` | 啟用 showRetry | +1 行 |
| `history/page.tsx` | 啟用 showRetry | +1 行 |
| `history/playback/[lessonId]/[stepId]/page.tsx` | 替換為雙按鈕 | +20 行 |

**總計**: 5 個文件，約 +50 行代碼

---

## 🔧 技術細節

### 1. 路由跳轉

使用 Next.js App Router 的 `useRouter`:
```tsx
import { useRouter } from 'next/navigation'

const router = useRouter()

// 跳轉到單題練習
router.push(`/history/playback/${lessonId}/${stepId}`)

// 返回上一頁
router.back()

// 跳轉到首頁
router.push('/dashboard')
```

### 2. 條件渲染

只有在 `showRetry={true}` 且 `lessonId` 存在時才顯示 Retry 按鈕:
```tsx
{showRetry && lessonId && (
  <button onClick={...}>Retry</button>
)}
```

### 3. Props 傳遞鏈

```
LessonReportDisplay (showRetry=true)
  ↓
QuestionReportCard (lessonId, showRetry)
  ↓
router.push(`/history/playback/${lessonId}/${stepId}`)
```

### 4. 保持向下相容

- `showRetry` 預設為 `false`，不影響其他使用 `QuestionReportCard` 的地方
- `lessonId` 為可選參數，沒有 lessonId 時不顯示按鈕
- 所有現有功能保持不變

---

## ✨ 功能特點

### 1. 統一的重試入口
- 課程完成報表 ✅
- 學習歷史報表 ✅
- Playback Practice 列表 ✅（保留）

### 2. 靈活的導航
- 從報表進入 → 可返回報表
- 從任何地方 → 可返回首頁
- 使用 `router.back()` 保持導航歷史

### 3. 一致的用戶體驗
- 相同的按鈕樣式
- 相同的交互邏輯
- 相同的練習頁面

### 4. 資料保留
- `lessonHistory` ✅ 保留（學習歷史）
- `playbackPractice` ✅ 保留（練習記錄）
- 兩者獨立運作，互不干擾

---

## 🧪 測試建議

### Test Case 1: 課程完成報表 Retry

1. 完成一個課程（例如 L1）
2. 查看課程完成報表
3. 確認每題都有 "🔄 Retry This Question" 按鈕
4. 點擊第 2 題的 Retry 按鈕
5. 確認跳轉到 `/history/playback/L1/2`
6. 進行錄音並評分
7. 點擊 "← Back to Report"
8. 確認返回課程完成報表

### Test Case 2: 學習歷史報表 Retry

1. 進入學習歷史頁面 (`/history`)
2. 展開某個課程的詳細報表
3. 確認每題都有 Retry 按鈕
4. 點擊某題的 Retry 按鈕
5. 進入練習頁面
6. 點擊 "🏠 Home"
7. 確認返回首頁/Dashboard

### Test Case 3: 雙按鈕功能

1. 從任一報表點擊 Retry 進入練習頁面
2. 確認頂部有兩個按鈕:
   - "← Back to Report"
   - "🏠 Home"
3. 測試兩個按鈕功能正常

### Test Case 4: Playback Practice 列表（保留功能）

1. 進入學習歷史頁面
2. 切換到 "Playback Practice" 標籤
3. 確認課程列表正常顯示
4. 點擊某題目
5. 確認進入練習頁面
6. 確認返回按鈕正常

---

## 📝 後續建議

### 短期優化

1. **添加 Loading 狀態**
   - Retry 按鈕點擊後顯示載入動畫
   - 避免用戶重複點擊

2. **添加確認對話框**
   - 從練習頁面返回時確認是否放棄當前錄音
   - 避免意外丟失資料

3. **添加快捷鍵**
   - ESC: 返回報表
   - R: 重新錄音
   - Space: 播放/停止

### 中期優化

1. **練習進度追蹤**
   - 在報表中顯示重試次數
   - 顯示最高分和最新分

2. **智能推薦**
   - 自動推薦分數較低的題目
   - 突出顯示需要練習的題目

3. **批量重試**
   - 添加 "Retry All Failed Questions" 按鈕
   - 自動進入連續練習模式

### 長期優化

1. **學習分析**
   - 統計每題的重試次數
   - 分析學習進步曲線

2. **社交功能**
   - 分享練習成果
   - 查看朋友的進度

3. **遊戲化**
   - 連續練習獎勵
   - 完美分數成就

---

## 🎉 總結

### 完成的功能

✅ **報表整合**: 課程完成報表和學習歷史報表都有 Retry 功能  
✅ **統一入口**: 所有報表使用相同的 Retry 按鈕  
✅ **靈活導航**: 練習頁面可返回報表或首頁  
✅ **保持相容**: Playback Practice 標籤和資料完全保留  
✅ **視覺一致**: 統一的設計語言和交互模式

### 技術優勢

- 🎯 **模組化**: 報表組件可重用
- 🔧 **可配置**: `showRetry` 參數控制顯示
- 🚀 **可擴展**: 易於添加新功能
- 🛡️ **類型安全**: 完整的 TypeScript 支援

### 用戶體驗提升

- ⚡ **快速重試**: 一鍵進入練習
- 🎯 **精準定位**: 直接練習特定題目
- 🔄 **靈活返回**: 多種返回選項
- 📊 **完整記錄**: 保留所有練習歷史

---

**完成時間**: 2025-01-26  
**修改文件**: 5 個  
**新增代碼**: ~50 行  
**影響功能**: 報表系統、練習系統、導航系統  
**向下相容**: ✅ 完全相容  
**破壞性變更**: ❌ 無
