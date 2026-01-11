# ✅ 音頻按鈕統一設計完成

## 🎯 修改目標

- ✅ 將所有綠色音頻按鈕改為藍色
- ✅ 統一使用音量 emoji 🔊
- ✅ 包含反饋頁面、報表頁面和練習頁面的所有音頻按鈕

---

## 📊 修改總覽

### 1. 反饋頁面音頻按鈕 (Lesson Page)

**檔案：** `apps/web/app/(protected)/lesson/[id]/page.tsx`

#### A. 播放使用者錄音按鈕
**修改前：**
```tsx
<button
  onClick={playUserRecording}
  disabled={!currentAudioBlob || isPlayingUserAudio}
  className={`py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${...}`}
>
  {isPlayingUserAudio ? 'Playing...' : 'Listen to My Recording'}
</button>
```

**修改後：**
```tsx
<button
  onClick={playUserRecording}
  disabled={!currentAudioBlob || isPlayingUserAudio}
  className={`py-2.5 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${...}`}
>
  <span className="text-base">🔊</span>
  {isPlayingUserAudio ? 'Playing...' : 'Listen to My Recording'}
</button>
```

**變更：**
- ✅ 新增音量 emoji 🔊
- ✅ 新增 `flex items-center justify-center gap-2` 讓 emoji 和文字對齊
- ✅ 保持藍色設計 `bg-blue-600 hover:bg-blue-700`

#### B. 播放正確答案按鈕
**修改前：**
```tsx
<button
  onClick={playCorrectAnswer}
  disabled={isPlayingCorrectAudio}
  className={`py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${...}`}
>
  {isPlayingCorrectAudio ? 'Playing...' : 'Listen to Correct Answer'}
</button>
```

**修改後：**
```tsx
<button
  onClick={playCorrectAnswer}
  disabled={isPlayingCorrectAudio}
  className={`py-2.5 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${...}`}
>
  <span className="text-base">🔊</span>
  {isPlayingCorrectAudio ? 'Playing...' : 'Listen to Correct Answer'}
</button>
```

**變更：**
- ✅ 新增音量 emoji 🔊
- ✅ 新增 flex 佈局對齊
- ✅ 保持藍色設計

---

### 2. 報表頁面 Retry 按鈕

**檔案：** `apps/web/app/(protected)/components/report/QuestionReportCard.tsx`

**修改前：**
```tsx
<button
  onClick={() => router.push(`/history/playback/${lessonId}/${result.stepId}`)}
  className="mt-4 w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
>
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
  <span className="font-semibold">🔄 Retry This Question</span>
</button>
```

**修改後：**
```tsx
<button
  onClick={() => router.push(`/history/playback/${lessonId}/${result.stepId}`)}
  className="mt-4 w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
>
  <span className="text-lg">🔊</span>
  <span className="font-semibold">Retry This Question</span>
</button>
```

**變更：**
- ❌ 移除漸層背景 `bg-gradient-to-r from-blue-500 to-purple-500`
- ✅ 改為純藍色 `bg-blue-600 hover:bg-blue-700`
- ❌ 移除 SVG 循環圖標
- ✅ 使用音量 emoji 🔊
- ❌ 移除文字中的 🔄 emoji

---

### 3. 歷史記錄播放頁面

#### A. 播放我的錄音按鈕

**檔案：** `apps/web/app/(protected)/history/playback/components/RecordingControls.tsx`

**修改前：**
```tsx
<button
  onClick={onPlayRecording}
  disabled={isPlaying || isRecording}
  className={`w-full px-6 py-4 rounded-lg text-lg font-semibold transition-all ${
    isPlaying
      ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
      : 'bg-blue-500 text-white hover:bg-blue-600'
  }`}
>
  {isPlaying ? '🎧 Playing...' : '🎧 Listen to My Recording'}
</button>
```

**修改後：**
```tsx
<button
  onClick={onPlayRecording}
  disabled={isPlaying || isRecording}
  className={`w-full px-6 py-4 rounded-lg text-lg font-semibold transition-all flex items-center justify-center gap-2 ${
    isPlaying
      ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
      : 'bg-blue-600 text-white hover:bg-blue-700'
  }`}
>
  <span>🔊</span>
  {isPlaying ? 'Playing...' : 'Listen to My Recording'}
</button>
```

**變更：**
- ❌ 移除 🎧 耳機 emoji
- ✅ 改用 🔊 音量 emoji
- ✅ 顏色從 `bg-blue-500` 升級為 `bg-blue-600`
- ✅ Hover 從 `hover:bg-blue-600` 升級為 `hover:bg-blue-700`
- ✅ 新增 flex 佈局

#### B. TTS 播放題目按鈕

**檔案：** `apps/web/app/(protected)/history/playback/components/QuestionDisplay.tsx`

**修改前：**
```tsx
<button
  onClick={handlePlayTTS}
  className="px-8 py-4 bg-green-500 text-white rounded-lg hover:bg-green-600 text-lg font-semibold flex items-center gap-2 transition-colors"
>
  🔊 Listen to Question
</button>
```

**修改後：**
```tsx
<button
  onClick={handlePlayTTS}
  className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-lg font-semibold flex items-center gap-2 transition-colors"
>
  🔊 Listen to Question
</button>
```

**變更：**
- ❌ 移除綠色 `bg-green-500 hover:bg-green-600`
- ✅ 改為藍色 `bg-blue-600 hover:bg-blue-700`
- ✅ 保持 🔊 音量 emoji

---

## 🎨 統一設計規範

### 音頻按鈕標準

#### 主要音頻按鈕
```tsx
className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow"
```

**規格：**
- 顏色: `bg-blue-600` → hover: `bg-blue-700`
- Emoji: 🔊 音量圖標
- 佈局: `flex items-center justify-center gap-2`
- 文字: `text-white` + `font-medium` 或 `font-semibold`
- 尺寸: 小按鈕 `text-sm`，大按鈕 `text-lg`
- 陰影: `shadow-sm` → hover: `shadow` 或 `shadow-md` → hover: `shadow-lg`

#### 禁用音頻按鈕
```tsx
className="bg-gray-300 cursor-not-allowed text-gray-500"
```

#### 播放中音頻按鈕
```tsx
className="bg-blue-400 cursor-wait text-white"
```

---

## 📋 修改文件清單

### 修改的文件：
1. ✅ `apps/web/app/(protected)/lesson/[id]/page.tsx`
   - 播放使用者錄音按鈕
   - 播放正確答案按鈕

2. ✅ `apps/web/app/(protected)/components/report/QuestionReportCard.tsx`
   - Retry This Question 按鈕（從漸層改為純藍色，從 🔄 改為 🔊）

3. ✅ `apps/web/app/(protected)/history/playback/components/RecordingControls.tsx`
   - 播放我的錄音按鈕（從 🎧 改為 🔊）

4. ✅ `apps/web/app/(protected)/history/playback/components/QuestionDisplay.tsx`
   - TTS 播放題目按鈕（從綠色改為藍色）

---

## 🎯 Emoji 統一使用

### 音頻相關 Emoji
- ✅ 🔊 音量圖標 - **統一使用於所有音頻播放按鈕**

### 移除的 Emoji
- ❌ 🎧 耳機圖標（改為 🔊）
- ❌ 🔄 循環圖標（改為 🔊）
- ❌ ▶️ 播放圖標（未使用）
- ❌ SVG 圖標（改為 emoji）

---

## 🎨 顏色統一

### 音頻按鈕顏色對比

| 按鈕類型 | 修改前 | 修改後 |
|---------|--------|--------|
| 播放我的錄音 | `bg-blue-600` | `bg-blue-600` ✅ |
| 播放正確答案 | `bg-blue-600` | `bg-blue-600` ✅ |
| Retry 按鈕 | `gradient blue-purple` | `bg-blue-600` ✅ |
| 歷史錄音播放 | `bg-blue-500` | `bg-blue-600` ⬆️ |
| TTS 播放題目 | `bg-green-500` ❌ | `bg-blue-600` ✅ |

**結論：** 所有音頻按鈕現在都使用統一的 `bg-blue-600 hover:bg-blue-700`

---

## ✅ 測試檢查清單

### 視覺測試
- [ ] 反饋頁面：兩個音頻按鈕都有 🔊 emoji
- [ ] 反饋頁面：兩個音頻按鈕都是藍色
- [ ] 報表頁面：Retry 按鈕是藍色且有 🔊 emoji
- [ ] 歷史播放：播放錄音按鈕有 🔊 emoji
- [ ] 歷史播放：TTS 按鈕是藍色

### 功能測試
- [ ] 反饋頁面播放使用者錄音正常
- [ ] 反饋頁面播放正確答案正常
- [ ] 報表頁面 Retry 按鈕導航正常
- [ ] 歷史播放頁面播放功能正常
- [ ] TTS 播放功能正常

### 響應式測試
- [ ] 所有按鈕在桌面版顯示正常
- [ ] 所有按鈕在平板版顯示正常
- [ ] 所有按鈕在手機版顯示正常
- [ ] Emoji 和文字對齊正常

---

## 🎉 完成狀態

- ✅ 所有音頻按鈕改為藍色
- ✅ 統一使用 🔊 音量 emoji
- ✅ 移除漸層設計，使用純色
- ✅ 移除不一致的 emoji（🎧、🔄）
- ✅ TypeScript 編譯無錯誤
- ✅ 統一按鈕設計規範

**音頻按鈕統一設計完成！所有音頻相關按鈕現在都使用藍色背景和 🔊 圖標！** 🎊
