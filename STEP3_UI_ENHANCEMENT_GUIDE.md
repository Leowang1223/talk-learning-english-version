# 第三步：UI增強與邏輯修復完整指南

**執行時間：** 2025-01-24  
**狀態：** 部分完成（需手動修復部分代碼）

---

## ✅ 已完成的修改

### 1. 新增錯誤狀態（Line ~496）

```typescript
// 反饋狀態 - 作為 session 的一部分
const [sessionState, setSessionState] = useState<'question' | 'feedback'>('question')
const [currentAudioBlob, setCurrentAudioBlob] = useState<Blob | null>(null)
const [currentFeedback, setCurrentFeedback] = useState<CurrentFeedback | null>(null)
const [isPlayingUserAudio, setIsPlayingUserAudio] = useState(false)
const [isPlayingCorrectAudio, setIsPlayingCorrectAudio] = useState(false)

// 新增：錄音錯誤狀態（取代 alert）
const [recordingError, setRecordingError] = useState<string | null>(null)
```

### 2. 修改 stopRecording 初始化（Line ~920）

```typescript
const stopRecording = async () => {
  if (!mediaRecorderRef.current || !lesson) return

  mediaRecorderRef.current.stop()
  setIsRecording(false)
  setRecordingError(null) // 清除之前的錯誤

  mediaRecorderRef.current.onstop = async () => {
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
    
    console.log('錄音完成')
    console.log('音頻大小:', audioBlob.size, 'bytes')
    console.log('音頻類型:', audioBlob.type)
    
    if (audioBlob.size === 0) {
      console.error('音頻檔案為空！')
      setRecordingError('Recording failed: Audio file is empty. Please try again.')
      setIsRetrying(false)
      setNeedsManualPlay(false)
      return
    }
```

### 3. 優化變數命名（Line ~986）

```typescript
// 統一變數：只使用 userTranscript 作為單一數據源
const rawTranscript = result.transcript || ''
let userTranscript = rawTranscript
  .replace(/\[模糊\]/g, '')        // 移除 [模糊] 標記
  .replace(/\[unclear\]/gi, '')    // 移除 [unclear] 標記
  .replace(/\[inaudible\]/gi, '')  // 移除 [inaudible] 標記
  .replace(/\[.*?\]/g, '')         // 移除所有其他 [...] 標記
  .trim()

console.log('原始轉錄:', rawTranscript)
console.log('清理後轉錄:', userTranscript)
```

### 4. 新增檢查邏輯（Line ~998）

```typescript
// 檢查 1：轉錄結果長度
if (!userTranscript || userTranscript.length < 1) {
  console.error('轉錄結果為空或太短')
  setRecordingError('Speech recognition failed: No valid speech detected. Please speak clearly and try again.')
  setIsRetrying(false)
  setNeedsManualPlay(false)
  return
}

// 檢查 2：問題相似度（嚴格門檻 + 信心度）
const qSim = calculateSimilarity(currentStep.teacher, userTranscript)
const wordConfidences = result.word_confidence || []
const lowConfidenceCount = wordConfidences.filter((wc: any) => wc.confidence < 0.6).length
const lowConfidence = wordConfidences.length > 0 
  ? (lowConfidenceCount / wordConfidences.length) > 0.7
  : false

console.log('問題文字:', currentStep.teacher)
console.log('轉錄文字:', userTranscript)
console.log('問題相似度:', (qSim * 100).toFixed(1) + '%')
console.log('低信心度比例:', lowConfidence)

// 只在幾乎完全相同且信心度低時才拒絕
if (qSim >= 0.98 && (lowConfidence || wordConfidences.length === 0)) {
  console.error('可能誤讀題面')
  setRecordingError('Speech recognition anomaly: The system may have confused your answer with the question. Please try recording again.')
  setIsRetrying(false)
  setNeedsManualPlay(false)
  return
}

console.log('轉錄結果驗證通過')
```

---

## ⚠️ 需要手動完成的修改

由於文件中含有特殊字符（emoji），自動替換受限。請手動完成以下修改：

### ❗ 修改 A（必須）：清理舊的日誌語句（Line ~1012-1014）

**這是編譯錯誤，必須立即修復！**

**找到（Line ~1014）：**
```typescript
console.log('� 問題相似度:', (questionSimilarity * 100).toFixed(1) + '%')
```

**完全刪除這1行**（變數 `questionSimilarity` 不存在，應使用 `qSim`）

前後應該是：
```typescript
console.log('問題文字:', currentStep.teacher)
console.log('轉錄文字:', userTranscript)
// 刪除下面這行 ❌
console.log('� 問題相似度:', (questionSimilarity * 100).toFixed(1) + '%')

if (qSim >= 0.98 && (lowConfidence || wordConfidences.length === 0)) {
```

如果看不到 emoji，可以搜索字符串 `questionSimilarity` 並刪除包含它的那一行。

---

### 修改 B：刪除舊的驗證日誌（Line ~1034）

**找到並刪除：**
```typescript
console.log('✅ 轉錄結果驗證通過')
```

---

### 修改 C：更新三維比對邏輯（Line ~1048-1085）

**找到：**
```typescript
// 強化評分：計算與預期答案的相似度
let bestMatch = { 
  similarity: 0, 
  expectedAnswer: '', 
  errors: [] as CharacterError[], 
  correctionFeedback: '',
  detailedAnalysis: undefined as DetailedCharacterAnalysis | undefined
}

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
  
  if (similarity > bestMatch.similarity) {
    bestMatch = { similarity, expectedAnswer: expected, errors, correctionFeedback, detailedAnalysis }
  }
}
```

**替換為：**
```typescript
// N-best 備選方案：如果有 alternatives 且主要答案相似度低
let candidateAnswers = [...expectedAnswers]
if (result.alternatives && Array.isArray(result.alternatives)) {
  candidateAnswers = [...candidateAnswers, ...result.alternatives]
}

// 三維比對（文字/拼音/聲調）
let bestMatch = {
  textSim: 0,
  phonemeSim: 0,
  toneAcc: 0,
  combinedScore: 0,
  expectedAnswer: '',
  detailedAnalysis: null as DetailedCharacterAnalysis | null
}

for (const expected of candidateAnswers) {
  const textSim = calculateSimilarity(expected, userTranscript)
  const phonemeSim = phonemeSimilarity(expected, userTranscript)
  const toneAcc = toneAccuracy(expected, userTranscript)
  const combinedScore = (textSim + phonemeSim + toneAcc) / 3
  
  console.log(`與 "${expected}" 的比對:`)
  console.log(`  - 文字: ${(textSim * 100).toFixed(1)}%`)
  console.log(`  - 拼音: ${(phonemeSim * 100).toFixed(1)}%`)
  console.log(`  - 聲調: ${(toneAcc * 100).toFixed(1)}%`)
  console.log(`  - 綜合: ${(combinedScore * 100).toFixed(1)}%`)
  
  if (combinedScore > bestMatch.combinedScore) {
    const detailedAnalysis = generateDetailedFeedback(
      expected,
      userTranscript
    )
    
    bestMatch = {
      textSim,
      phonemeSim,
      toneAcc,
      combinedScore,
      expectedAnswer: expected,
      detailedAnalysis
    }
  }
}

console.log('最佳匹配:', bestMatch.expectedAnswer)
```

---

### 修改 D：更新評分邏輯（Line ~1087-1102）

**找到：**
```typescript
console.log('📊 最佳匹配結果:')
console.log('  - 最佳答案:', bestMatch.expectedAnswer)
console.log('  - 最佳相似度:', (bestMatch.similarity * 100).toFixed(1) + '%')
console.log('  - 錯誤數量:', bestMatch.errors.length)
console.log('  - 詳細分析:', bestMatch.detailedAnalysis ? '✅ 存在' : '❌ 不存在')
if (bestMatch.detailedAnalysis) {
  console.log('  - 完整逐字分析:')
  console.log(bestMatch.detailedAnalysis.characterByCharacterAnalysis)
}

// 嚴格評分：相似度必須 >= 0.78 (78%) 才能通過
const similarityScore = Math.round(bestMatch.similarity * 100)

// 使用相似度分數與後端分數中較低的作為最終分數
let finalScore = backendScore
if (bestMatch.similarity < 0.78) {
  // 相似度太低，強制使用較低的分數
  finalScore = Math.min(backendScore, similarityScore)
  console.warn('⚠️ 相似度低於 78%，調整分數為:', finalScore)
}

// 通過條件：相似度 >= 78% 且 分數 >= 75
const passed = bestMatch.similarity >= 0.78 && finalScore >= 75

console.log(passed ? '✅ 通過 (相似度 >= 78% 且 分數 >= 75)' : '❌ 未通過 (相似度 < 78% 或 分數 < 75)')
```

**替換為：**
```typescript
// 嚴格門檻（短句更嚴）
const len = [...bestMatch.expectedAnswer].length
const isShort = len <= 3

const thresholds = isShort
  ? { text: 0.90, phoneme: 0.92, tone: 0.90 }
  : { text: 0.85, phoneme: 0.88, tone: 0.85 }

const passed = 
  bestMatch.textSim >= thresholds.text &&
  bestMatch.phonemeSim >= thresholds.phoneme &&
  bestMatch.toneAcc >= thresholds.tone

console.log(`門檻: ${isShort ? '短句(≤3字)' : '標準'}`)
console.log(`通過: ${passed}`)

// 分數護欄：三者最小值
const finalScore = Math.min(
  backendScore,
  Math.round(bestMatch.textSim * 100),
  Math.round(bestMatch.phonemeSim * 100),
  Math.round(bestMatch.toneAcc * 100)
)

console.log('最終分數:', finalScore)
```

---

### 修改 E：更新 setCurrentFeedback（Line ~1105-1120）

**找到：**
```typescript
setCurrentFeedback({
  score: finalScore,
  similarity: bestMatch.similarity,
  detailedScores: detailedScores || {
    pronunciation: finalScore,
    fluency: finalScore,
    accuracy: finalScore,
    comprehension: finalScore,
    confidence: finalScore
  },
  transcript: userTranscript,
  expectedAnswer: currentStep.expected_answer,
  bestMatchAnswer: bestMatch.expectedAnswer,
  errors: bestMatch.errors,
  correctionFeedback: bestMatch.correctionFeedback,
  detailedAnalysis: bestMatch.detailedAnalysis,
  suggestions: result.suggestions || {},
  overallPractice: result.overallPractice || '',
  passed,
  fullResult: result
})
```

**替換為：**
```typescript
setCurrentFeedback({
  score: finalScore,
  similarity: bestMatch.textSim,
  phonemeSimilarity: bestMatch.phonemeSim,    // 新增
  toneAccuracy: bestMatch.toneAcc,            // 新增
  detailedScores: detailedScores || {
    pronunciation: Math.round(bestMatch.phonemeSim * 100),
    fluency: Math.round(bestMatch.textSim * 100),
    accuracy: Math.round(bestMatch.textSim * 100),
    comprehension: finalScore,
    confidence: finalScore
  },
  transcript: userTranscript,
  expectedAnswer: currentStep.expected_answer,
  bestMatchAnswer: bestMatch.expectedAnswer,
  detailedAnalysis: bestMatch.detailedAnalysis || undefined,
  suggestions: result.suggestions || {},
  overallPractice: result.overallPractice || '',
  passed,
  fullResult: result
})
```

---

### 修改 F：更新錯誤處理（Line ~1128）

**找到：**
```typescript
} catch (err) {
  console.error('❌ 評分錯誤:', err)
  const errorMessage = err instanceof Error ? err.message : '未知錯誤'
  alert(`評分失敗：${errorMessage}\n\n請確認：\n1. 後端服務器是否運行在 8082 端口\n2. 麥克風權限是否正常\n3. 錄音時間是否足夠`)
  setIsRetrying(false)
  setNeedsManualPlay(false)
}
```

**替換為：**
```typescript
} catch (err) {
  console.error('評分錯誤:', err)
  const errorMessage = err instanceof Error ? err.message : 'Unknown error'
  setRecordingError(`Scoring failed: ${errorMessage}. Please try again.`)
  setIsRetrying(false)
  setNeedsManualPlay(false)
}
```

---

### 修改 G：在問題頁面添加錯誤提示卡片（Line ~1600 找到 `{sessionState === 'question'`）

**在錄音按鈕前添加：**
```typescript
{/* 錯誤提示卡片 */}
{recordingError && (
  <div className="mb-6 p-4 bg-red-50 border-2 border-red-300 rounded-xl shadow-lg">
    <div className="flex items-start gap-3">
      <span className="text-2xl">⚠️</span>
      <div className="flex-1">
        <h4 className="font-bold text-red-800 mb-2">Recording Error</h4>
        <p className="text-red-700">{recordingError}</p>
        <button
          onClick={() => setRecordingError(null)}
          className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-all"
        >
          Dismiss
        </button>
      </div>
    </div>
  </div>
)}
```

---

### 修改 H：增強反饋頁面 UI（Line ~1540 找到 `{sessionState === 'feedback'`）

**在 "Overall Average Score" 卡片後添加三維評分指標：**
```typescript
{/* 三維評分指標 */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
  <div className="bg-white p-4 rounded-lg shadow">
    <div className="text-sm text-gray-600 mb-1">Text Similarity</div>
    <div className="flex items-center gap-2">
      <div className="text-2xl font-bold text-blue-600">
        {Math.round((currentFeedback.similarity || 0) * 100)}%
      </div>
      {(currentFeedback.similarity || 0) >= 0.85 ? '✅' : '❌'}
    </div>
  </div>
  
  <div className="bg-white p-4 rounded-lg shadow">
    <div className="text-sm text-gray-600 mb-1">Pinyin Accuracy</div>
    <div className="flex items-center gap-2">
      <div className="text-2xl font-bold text-purple-600">
        {Math.round((currentFeedback.phonemeSimilarity || 0) * 100)}%
      </div>
      {(currentFeedback.phonemeSimilarity || 0) >= 0.88 ? '✅' : '❌'}
    </div>
  </div>
  
  <div className="bg-white p-4 rounded-lg shadow">
    <div className="text-sm text-gray-600 mb-1">Tone Accuracy</div>
    <div className="flex items-center gap-2">
      <div className="text-2xl font-bold text-orange-600">
        {Math.round((currentFeedback.toneAccuracy || 0) * 100)}%
      </div>
      {(currentFeedback.toneAccuracy || 0) >= 0.85 ? '✅' : '❌'}
    </div>
  </div>
</div>
```

**在詳細分析卡片中，添加"即使通過也顯示建議"：**

在 `{currentFeedback.detailedAnalysis && (` 區塊內的最後，添加：

```typescript
{/* 即使通過也顯示細節建議 */}
{currentFeedback.passed && 
 ((currentFeedback.toneAccuracy || 1) < 0.95 || 
  (currentFeedback.phonemeSimilarity || 1) < 0.95) && (
  <div className="mt-4 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
    <h4 className="font-bold text-yellow-800 mb-2 flex items-center gap-2">
      <span>💡</span>
      <span>Room for Improvement</span>
    </h4>
    <ul className="list-disc list-inside space-y-1 text-gray-700">
      {(currentFeedback.toneAccuracy || 1) < 0.95 && (
        <li>Pay attention to tones - some tones need refinement</li>
      )}
      {(currentFeedback.phonemeSimilarity || 1) < 0.95 && (
        <li>Some pronunciation could be clearer - practice the syllables marked above</li>
      )}
    </ul>
  </div>
)}
```

---

## 📝 測試案例

完成上述修改後，請測試以下場景：

### 案例 1：字錯測試 ❌
```
預期："你好嗎"
實際："我好嗎"（第1字錯）

期望結果：
- textSim < 85%
- phSim < 85%
- toneAcc < 85%
- 未通過
- 顯示："第1個字錯誤：預期'你(ni3)'，實際'我(wo3)'"
```

### 案例 2：聲調錯測試 ⚠️
```
預期："媽媽"
實際："麻麻"（聲調全錯）

期望結果：
- textSim ≈ 100% (字相同)
- phSim ≈ 75% (音素相同)
- toneAcc < 50% (聲調全錯)
- 未通過
- 顯示："聲調錯誤：第1字應為1聲，實際2聲"
```

### 案例 3：短句嚴格測試 🔍
```
預期："是"
實際："四"（si4 vs shi4）

期望結果：
- 短句（≤3字）使用高門檻
- textSim = 0%
- phSim ≈ 70%
- toneAcc = 100%
- 未通過
- 顯示：韻母錯誤
```

### 案例 4：誤殺防護測試 ✅
```
預期："你好嗎"
題目："你叫什麼名字"
實際：用戶正確回答"你好嗎"

期望結果：
- qSim 與題目 < 0.98
- word_confidence 正常
- 不被誤判為"讀到題面"
- 正常評分
```

### 案例 5：通過但有改進空間 ⚠️
```
預期："你好嗎"
實際："你好嗎"（發音基本正確，但有1個聲調偏）

期望結果：
- textSim >= 90%
- phSim >= 92%
- toneAcc = 93%
- 通過 ✅
- 但顯示黃色卡片："Room for Improvement - Pay attention to tones"
```

---

## 🏁 完成檢查清單

- [x] 1. 新增 `recordingError` 狀態
- [x] 2. 修改 `stopRecording` 清空錯誤
- [x] 3. 優化變數命名（userTranscript）
- [x] 4. 新增長度檢查
- [x] 5. 新增信心度檢查
- [ ] 6. 刪除舊日誌語句（手動）
- [ ] 7. 更新三維比對邏輯（手動）
- [ ] 8. 更新評分門檻邏輯（手動）
- [ ] 9. 更新 setCurrentFeedback（手動）
- [ ] 10. 修改錯誤處理（手動）
- [ ] 11. 添加錯誤提示卡片（手動）
- [ ] 12. 增強反饋頁面 UI（手動）
- [ ] 13. 測試所有案例

---

## 🚀 執行步驟

1. **完成上述手動修改（A-H）**
2. **編譯檢查：**
   ```bash
   cd apps/web
   npm run build
   ```
3. **啟動測試：**
   ```bash
   npm run dev
   ```
4. **測試所有案例（1-5）**
5. **檢查控制台日誌**，確保沒有錯誤
6. **確認 UI 正確顯示**：
   - 錯誤卡片（紅色）
   - 三維指標卡片
   - 改進建議卡片（黃色）

---

**完成後，請將此文件重命名為 `STEP3_UI_ENHANCEMENT_COMPLETE.md`**
