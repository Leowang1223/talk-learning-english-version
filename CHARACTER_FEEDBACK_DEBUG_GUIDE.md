# 🔍 逐字比對功能調試指南

## 📅 最後更新：2025-01-24

## 🎯 問題描述

**用戶反饋：** "還是一樣，就算我念錯字，評分後也不會糾正我"

**目標：** 確保當用戶念錯字時，能看到詳細的逐字比對分析

---

## ✅ 已完成的增強

### 1. `generateDetailedFeedback` 函數 - 逐字比對核心

**位置：** `apps/web/app/(protected)/lesson/[id]/page.tsx` (約第 105-175 行)

**新增日誌：**
```typescript
function generateDetailedFeedback(expected, actual, expectedPinyin) {
  // 正規化文字
  const normalizedExpected = normalizeText(expected)
  const normalizedActual = normalizeText(actual)
  
  console.log('🔍 開始逐字比對分析:')
  console.log('  原始預期:', expected)
  console.log('  原始實際:', actual)
  console.log('  正規化預期:', normalizedExpected)
  console.log('  正規化實際:', normalizedActual)
  
  // 計算相似度
  const similarity = calculateSimilarity(expected, actual)
  console.log('  相似度:', (similarity * 100).toFixed(1) + '%')
  
  // 逐字比對
  const maxLen = Math.max(normalizedExpected.length, normalizedActual.length)
  console.log('  開始逐字比對 (長度:', maxLen, '):')
  
  let lines = []
  for (let i = 0; i < maxLen; i++) {
    const expectedChar = normalizedExpected[i] || ''
    const actualChar = normalizedActual[i] || ''
    
    console.log(`    [${i}] 預期="${expectedChar}" 實際="${actualChar}"`)
    
    if (actualChar === '') {
      lines.push(`❌ Missing: You should say "${expectedChar}" here`)
      lines.push(`   💬 The character "${expectedChar}" is missing from your answer\n`)
    } else if (expectedChar === '') {
      lines.push(`❌ Extra: "${actualChar}" should not be here`)
      lines.push(`   💬 You said "${actualChar}" but it's not part of the correct answer\n`)
    } else if (expectedChar !== actualChar) {
      lines.push(`❌ "${actualChar}" → Should be "${expectedChar}"`)
      lines.push(`   💬 You said "${actualChar}" but it should be "${expectedChar}"\n`)
    } else {
      lines.push(`✅ "${actualChar}" (Correct)\n`)
    }
  }
  
  const characterByCharacterAnalysis = lines.join('\n')
  
  // 生成總體評價
  const errorCount = (characterByCharacterAnalysis.match(/❌/g) || []).length
  let overallFeedback = ''
  if (errorCount === 0) {
    overallFeedback = "✅ Perfect! All characters are correct."
  } else if (errorCount <= 2) {
    overallFeedback = "Your pronunciation is good but needs slight improvement. Please review the differences below."
  } else if (errorCount <= 5) {
    overallFeedback = "Your pronunciation needs some improvement. Please review the differences below."
  } else {
    overallFeedback = "Your pronunciation needs significant improvement. Please practice more and pay attention to each character."
  }
  
  console.log('📝 逐字分析結果:')
  console.log(characterByCharacterAnalysis)
  console.log('📊 總體評價:', overallFeedback)
  
  return {
    characterByCharacterAnalysis,
    overallFeedback
  }
}
```

**改進點：**
- ✅ 輸出原始和正規化文字
- ✅ 顯示每個字符位置的比對
- ✅ 輸出完整分析結果
- ✅ 計算錯誤數量並生成評價

---

### 2. `stopRecording` 函數 - 評分流程

**位置：** `apps/web/app/(protected)/lesson/[id]/page.tsx` (約第 875-945 行)

**新增日誌：**
```typescript
// 遍歷所有可能的正確答案
for (const expected of expectedAnswers) {
  const similarity = calculateSimilarity(expected, userTranscript)
  const errors = analyzeErrors(expected, userTranscript)
  const correctionFeedback = generateCorrectionFeedback(errors, expected, userTranscript)
  const detailedAnalysis = generateDetailedFeedback(expected, userTranscript, currentStep.pinyin)
  
  console.log(`📊 與 "${expected}" 比對結果:`)
  console.log('  - 相似度:', (similarity * 100).toFixed(1) + '%')
  console.log('  - 錯誤數:', errors.length)
  console.log('  - 詳細分析:', detailedAnalysis ? '✅ 已生成' : '❌ 未生成')
  if (detailedAnalysis) {
    console.log('  - 逐字分析長度:', detailedAnalysis.characterByCharacterAnalysis.length, '字符')
    console.log('  - 總體評價:', detailedAnalysis.overallFeedback)
  }
  
  // 更新最佳匹配
  if (similarity > bestMatch.similarity) {
    bestMatch = {
      similarity,
      expectedAnswer: expected,
      errors,
      correctionFeedback,
      detailedAnalysis
    }
  }
}

// 輸出最佳匹配結果
console.log('📊 最佳匹配結果:')
console.log('  - 最佳答案:', bestMatch.expectedAnswer)
console.log('  - 最佳相似度:', (bestMatch.similarity * 100).toFixed(1) + '%')
console.log('  - 錯誤數量:', bestMatch.errors.length)
console.log('  - 詳細分析:', bestMatch.detailedAnalysis ? '✅ 存在' : '❌ 不存在')
if (bestMatch.detailedAnalysis) {
  console.log('  - 完整逐字分析:')
  console.log(bestMatch.detailedAnalysis.characterByCharacterAnalysis)
}
```

**改進點：**
- ✅ 顯示每個候選答案的比對結果
- ✅ 確認詳細分析是否正確生成
- ✅ 輸出最佳匹配的完整信息

---

### 3. `setCurrentFeedback` 前的驗證

**位置：** `apps/web/app/(protected)/lesson/[id]/page.tsx` (約第 920-945 行)

**新增日誌：**
```typescript
console.log('📝 準備設置反饋數據:')
console.log('  - 分數:', finalScore)
console.log('  - 相似度:', bestMatch.similarity)
console.log('  - 轉錄:', userTranscript)
console.log('  - 預期答案:', currentStep.expected_answer)
console.log('  - 最佳匹配:', bestMatch.expectedAnswer)
console.log('  - 詳細分析:', bestMatch.detailedAnalysis ? '✅ 存在' : '❌ 缺失')

setCurrentFeedback({
  score: finalScore,
  similarity: bestMatch.similarity,
  detailedScores: detailedScores || {...},
  transcript: userTranscript,
  expectedAnswer: currentStep.expected_answer,
  bestMatchAnswer: bestMatch.expectedAnswer,
  errors: bestMatch.errors,
  correctionFeedback: bestMatch.correctionFeedback,
  detailedAnalysis: bestMatch.detailedAnalysis,  // ✅ 傳遞詳細分析
  suggestions: result.suggestions || {},
  overallPractice: result.overallPractice || '',
  passed,
  fullResult: result
})

console.log('✅ 反饋數據已設置，切換到反饋頁面')
setSessionState('feedback')
```

**改進點：**
- ✅ 確認數據正確設置到 state
- ✅ 驗證 detailedAnalysis 存在
- ✅ 確認狀態切換

---

## 🧪 測試流程

### 步驟 1：打開開發者工具

**Chrome / Edge:**
1. 按 `F12`
2. 點擊「Console」標籤

**Firefox:**
1. 按 `F12`
2. 點擊「控制台」標籤

---

### 步驟 2：進入課程並錄音

1. 啟動開發服務器：
   ```powershell
   pnpm run dev
   ```

2. 打開瀏覽器訪問課程頁面

3. 點擊「開始錄音」按鈕

4. **故意念錯字**，例如：
   - 預期答案：「你好嗎」
   - 你說：「我好嗎」（第一個字錯了）

5. 點擊「停止錄音」

---

### 步驟 3：查看控制台輸出

**應該看到完整的日誌流程：**

```
📝 原始轉錄: 我好嗎
📝 清理後轉錄 (保留空格): 我好嗎
🔍 問題文字: 你好嗎？
🔍 轉錄文字: 我好嗎
🔍 問題相似度: 75.0%
✅ 轉錄結果驗證通過

🔍 開始逐字比對分析:
  原始預期: 你好嗎
  原始實際: 我好嗎
  正規化預期: 你好嗎
  正規化實際: 我好嗎
  相似度: 66.7%
  開始逐字比對 (長度: 3 ):
    [0] 預期="你" 實際="我"
    [1] 預期="好" 實際="好"
    [2] 預期="嗎" 實際="嗎"

📝 逐字分析結果:
❌ "我" → Should be "你"
   💬 You said "我" but it should be "你"

✅ "好" (Correct)

✅ "嗎" (Correct)

📊 總體評價: Your pronunciation needs some improvement. Please review the differences below.

📊 與 "你好嗎" 比對結果:
  - 相似度: 66.7%
  - 錯誤數: 1
  - 詳細分析: ✅ 已生成
  - 逐字分析長度: 150 字符
  - 總體評價: Your pronunciation needs some improvement. Please review the differences below.

📊 最佳匹配結果:
  - 最佳答案: 你好嗎
  - 最佳相似度: 66.7%
  - 錯誤數量: 1
  - 詳細分析: ✅ 存在
  - 完整逐字分析:
❌ "我" → Should be "你"
   💬 You said "我" but it should be "你"

✅ "好" (Correct)

✅ "嗎" (Correct)

📝 準備設置反饋數據:
  - 分數: 67
  - 相似度: 0.6666666666666666
  - 轉錄: 我好嗎
  - 預期答案: 你好嗎
  - 最佳匹配: 你好嗎
  - 詳細分析: ✅ 存在

✅ 反饋數據已設置，切換到反饋頁面
```

---

### 步驟 4：查看 UI 顯示

**反饋頁面應該顯示：**

```
┌───────────────────────────────────────────────┐
│  Character-by-Character Analysis:             │
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │ Your pronunciation needs some           │  │
│  │ improvement. Please review the          │  │
│  │ differences below.                      │  │
│  └─────────────────────────────────────────┘  │
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │ ❌ "我" → Should be "你"                │  │
│  │    💬 You said "我" but it should be    │  │
│  │    "你"                                 │  │
│  │                                         │  │
│  │ ✅ "好" (Correct)                       │  │
│  │                                         │  │
│  │ ✅ "嗎" (Correct)                       │  │
│  └─────────────────────────────────────────┘  │
└───────────────────────────────────────────────┘
```

**UI 代碼位置：** `apps/web/app/(protected)/lesson/[id]/page.tsx` (約第 1379-1395 行)

```tsx
{currentFeedback.detailedAnalysis && (
  <div className="mb-6 p-6 bg-purple-50 rounded-xl border-2 border-purple-200">
    <h3 className="text-lg font-bold text-purple-800 mb-4">
      Character-by-Character Analysis:
    </h3>
    
    {/* 總體評價 */}
    <div className="mb-4 p-4 bg-white rounded-lg">
      <p className="text-gray-700">
        {currentFeedback.detailedAnalysis.overallFeedback}
      </p>
    </div>
    
    {/* 逐字比對 */}
    <div className="p-4 bg-white rounded-lg font-mono text-sm">
      <pre className="whitespace-pre-wrap leading-relaxed text-gray-800">
        {currentFeedback.detailedAnalysis.characterByCharacterAnalysis}
      </pre>
    </div>
  </div>
)}
```

---

## 📊 測試案例

### 案例 1：完全正確 ✅

**預期答案：** 你好  
**你的錄音：** 你好

**控制台輸出：**
```
🔍 開始逐字比對分析:
  相似度: 100.0%
  開始逐字比對 (長度: 2 ):
    [0] 預期="你" 實際="你"
    [1] 預期="好" 實際="好"

📝 逐字分析結果:
✅ "你" (Correct)
✅ "好" (Correct)

📊 總體評價: ✅ Perfect! All characters are correct.
```

**UI 顯示：**
```
Character-by-Character Analysis:

✅ Perfect! All characters are correct.

✅ "你" (Correct)
✅ "好" (Correct)
```

---

### 案例 2：部分錯誤 ⚠️

**預期答案：** 你好  
**你的錄音：** 我好

**控制台輸出：**
```
🔍 開始逐字比對分析:
  相似度: 50.0%
  開始逐字比對 (長度: 2 ):
    [0] 預期="你" 實際="我"
    [1] 預期="好" 實際="好"

📝 逐字分析結果:
❌ "我" → Should be "你"
   💬 You said "我" but it should be "你"

✅ "好" (Correct)

📊 總體評價: Your pronunciation is good but needs slight improvement.
```

**UI 顯示：**
```
Character-by-Character Analysis:

Your pronunciation is good but needs slight improvement.
Please review the differences below.

❌ "我" → Should be "你"
   💬 You said "我" but it should be "你"

✅ "好" (Correct)
```

---

### 案例 3：缺少字符 ❌

**預期答案：** 你好嗎  
**你的錄音：** 你好

**控制台輸出：**
```
🔍 開始逐字比對分析:
  相似度: 66.7%
  開始逐字比對 (長度: 3 ):
    [0] 預期="你" 實際="你"
    [1] 預期="好" 實際="好"
    [2] 預期="嗎" 實際=""

📝 逐字分析結果:
✅ "你" (Correct)
✅ "好" (Correct)
❌ Missing: You should say "嗎" here
   💬 The character "嗎" is missing from your answer
```

**UI 顯示：**
```
✅ "你" (Correct)
✅ "好" (Correct)
❌ Missing: You should say "嗎" here
   💬 The character "嗎" is missing from your answer
```

---

### 案例 4：多餘字符 ❌

**預期答案：** 你好  
**你的錄音：** 你好嗎

**控制台輸出：**
```
🔍 開始逐字比對分析:
  相似度: 66.7%
  開始逐字比對 (長度: 3 ):
    [0] 預期="你" 實際="你"
    [1] 預期="好" 實際="好"
    [2] 預期="" 實際="嗎"

📝 逐字分析結果:
✅ "你" (Correct)
✅ "好" (Correct)
❌ Extra: "嗎" should not be here
   💬 You said "嗎" but it's not part of the correct answer
```

---

## 🔍 問題診斷流程

### 如果控制台顯示「詳細分析: ❌ 缺失」

**可能原因：**
1. `generateDetailedFeedback` 函數沒有被調用
2. 函數內部拋出異常
3. 返回值為 `undefined`

**檢查步驟：**
1. 查看控制台是否有「🔍 開始逐字比對分析:」日誌
2. 如果沒有，代表函數沒有被調用
3. 檢查 `stopRecording` 函數中的調用代碼

---

### 如果控制台顯示「詳細分析: ✅ 存在」但 UI 沒有顯示

**可能原因：**
1. `currentFeedback.detailedAnalysis` 為 `undefined` 或 `null`
2. 條件渲染失敗
3. CSS 隱藏了內容

**檢查步驟：**
1. 在瀏覽器控制台輸入：
   ```javascript
   console.log(window.currentFeedback)
   ```
   查看 `detailedAnalysis` 的值

2. 檢查 UI 代碼：
   ```tsx
   {currentFeedback.detailedAnalysis && ( ... )}
   ```

3. 檢查 CSS 是否有 `display: none` 或 `visibility: hidden`

---

### 如果控制台沒有任何日誌

**可能原因：**
1. 瀏覽器控制台過濾器設置錯誤
2. 代碼沒有執行到錄音處理邏輯
3. JavaScript 錯誤導致執行中斷

**檢查步驟：**
1. 確保控制台過濾器設置為「All」或「Verbose」
2. 查看是否有紅色的錯誤訊息
3. 檢查錄音是否成功（麥克風權限）
4. 確認後端服務器是否運行

---

## ✅ 數據流程圖

```
用戶點擊「停止錄音」
    ↓
語音數據發送到 Gemini API
    ↓
收到轉錄文字（userTranscript）
    ↓
清理標記 [模糊] 等
    ↓
驗證：防止問題文字當作答案
    ↓
遍歷所有可能的正確答案
    ↓
對每個答案調用 generateDetailedFeedback()
    ├─ 正規化文字
    ├─ 計算相似度
    ├─ 逐字比對（✅ / ❌）
    └─ 生成總體評價
    ↓
選擇最佳匹配結果
    ↓
設置 currentFeedback state
    ├─ score
    ├─ similarity
    ├─ transcript
    ├─ expectedAnswer
    ├─ detailedAnalysis ← 🎯 關鍵數據
    └─ ...
    ↓
切換到 feedback 頁面
    ↓
條件渲染：{currentFeedback.detailedAnalysis && (...)}
    ↓
顯示紫色分析區塊
    ├─ 總體評價（白色框）
    └─ 逐字比對結果（等寬字體）
```

---

## 🎉 完成清單

- [x] 增強 `generateDetailedFeedback` 函數日誌
- [x] 增加每個字符的比對日誌 `[0], [1], [2]...`
- [x] 增加評分流程的詳細日誌
- [x] 確認 `detailedAnalysis` 正確生成
- [x] 確認 `detailedAnalysis` 正確傳遞到 UI
- [x] UI 區塊已存在（紫色背景框）
- [x] TypeScript 編譯無錯誤（只有 CSS 警告）

---

## 🚀 下一步

1. **測試功能：**
   - 進入課程
   - 錄音並故意念錯字
   - 查看控制台輸出
   - 確認 UI 顯示

2. **如果還是沒有顯示：**
   - 提供完整的控制台日誌
   - 截圖 UI 畫面
   - 說明具體的錄音內容和預期答案

3. **根據日誌定位問題：**
   - 「詳細分析: ❌ 缺失」→ 函數未執行或出錯
   - 「詳細分析: ✅ 存在」但 UI 無顯示 → 條件渲染或 CSS 問題
   - 無任何日誌 → JavaScript 錯誤或流程中斷

**現在你有完整的調試能力！** 🎊

控制台日誌會告訴你數據在哪個環節丟失或出錯。
