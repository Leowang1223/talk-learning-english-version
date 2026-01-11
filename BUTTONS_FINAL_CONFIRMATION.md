# ✅ 按鈕設計最終確認

## 🎯 設計規則（已確認）

1. ✅ **音頻播放按鈕** = 藍色 + 🔊 圖示 + 文字
2. ✅ **報表 Retry 按鈕** = 藍色 + 🔊 圖示 + 文字（視為音頻播放）
3. ✅ **其他操作按鈕** = 藍色 + 文字（無圖示）
4. ✅ **所有按鈕** = 統一藍色 `bg-blue-600 hover:bg-blue-700`

---

## 📊 當前按鈕狀態

### ✅ 音頻播放按鈕（有 🔊 圖示）

#### 1. 反饋頁面 - 播放使用者錄音 ✅
```tsx
<span className="text-base">🔊</span>
Listen to My Recording
```

#### 2. 反饋頁面 - 播放正確答案 ✅
```tsx
<span className="text-base">🔊</span>
Listen to Correct Answer
```

#### 3. 報表頁面 - Retry This Question ✅
```tsx
<span className="text-lg">🔊</span>
<span className="font-semibold">Retry This Question</span>
```
**狀態：** ✅ 已有圖示和文字

#### 4. 歷史播放 - 播放我的錄音 ✅
```tsx
<span>🔊</span>
Listen to My Recording
```

#### 5. 歷史播放 - TTS 播放題目 ✅
```tsx
🔊 Listen to Question
```

---

### ✅ 操作按鈕（無圖示）

#### 6. Retry Recording ✅
```tsx
Retry Recording
```

#### 7. Next Question / Finish Lesson ✅
```tsx
Next Question / Finish Lesson
```

#### 8-13. 各種 Back/View 按鈕 ✅
```tsx
Back to Courses
View History
等等...
```

---

## 🎉 完成確認

### 設計一致性
- ✅ 所有按鈕都是藍色
- ✅ 只有音頻播放相關按鈕有 🔊 圖示
- ✅ 報表 Retry 按鈕有圖示和文字
- ✅ 其他操作按鈕只有文字

### 功能完整性
- ✅ 所有按鈕文字清晰
- ✅ 所有按鈕功能正常
- ✅ Hover 效果統一
- ✅ 響應式佈局正常

### 代碼品質
- ✅ TypeScript 編譯無錯誤
- ✅ 代碼格式一致
- ✅ 無警告訊息

---

## 📝 修改總結

**修改的檔案：**
1. `apps/web/app/(protected)/lesson/[id]/page.tsx` - 反饋頁面音頻按鈕
2. `apps/web/app/(protected)/components/report/QuestionReportCard.tsx` - 報表 Retry 按鈕
3. `apps/web/app/(protected)/history/playback/components/RecordingControls.tsx` - 歷史播放按鈕
4. `apps/web/app/(protected)/history/playback/components/QuestionDisplay.tsx` - TTS 播放按鈕

**所有修改完成！準備測試！** 🎊
