# 槽位檢查單元測試用例

## 測試目標
驗證代詞槽位檢查功能是否正確識別「你/我/他/她」的錯誤使用。

---

## 測試用例 1: 代詞錯誤（你 vs 我）

**場景**: 題目要求說「你」，但用戶說了「我」

**輸入**:
- Expected: `你叫什么名字？`
- Actual: `我叫什么名字？`

**預期結果**:
```typescript
{
  valid: false,
  errors: [
    'Pronoun mismatch at position 0: expected "你" but got "我"'
  ],
  mismatchPositions: [0]
}
```

**評分行為**:
- `slotValid`: ❌ false
- `textSim`: ~88.9% (8/9 字正確)
- `phonemeSim`: ~88.9% (ni3 vs wo3，其他相同)
- `toneAcc`: ~88.9% (tone 3 vs tone 3，但不同字)
- **最終判定**: ❌ FAILED（槽位錯誤）
- **最終分數**: ≤50（強制降分）

**測試步驟**:
1. 進入課程頁面
2. 點擊錄音按鈕
3. 清楚地說：「我叫什麼名字」
4. 停止錄音

**預期 UI 顯示**:
- 紅色大卡片警告：「🚨 Critical Error: Key Word Position Mismatch」
- 錯誤訊息：「Pronoun mismatch at position 0: expected "你" but got "我"」
- Error Position(s): Character 0
- 分數 ≤50
- 狀態：❌ FAILED

---

## 測試用例 2: 聲調錯誤（媽 vs 麻）

**場景**: 字相同但聲調不同

**輸入**:
- Expected: `媽媽` (ma1 ma1)
- Actual: `麻麻` (ma2 ma2)

**預期結果**:
```typescript
{
  valid: true,  // 沒有代詞槽位問題
  errors: [],
  mismatchPositions: []
}
```

**評分行為**:
- `slotValid`: ✅ true（沒有代詞問題）
- `textSim`: 0% (完全不同字)
- `phonemeSim`: ~100% (ma vs ma，聲母韻母相同)
- `toneAcc`: 0% (tone 1 vs tone 2，完全不同)
- **短句門檻**: text≥95%, phoneme≥95%, tone≥95%
- **最終判定**: ❌ FAILED（聲調不達標）
- **最終分數**: 0（toneAcc * 100）

**測試步驟**:
1. 修改課程數據，設置 expected_answer 為「媽媽」
2. 錄音說：「麻麻」（故意用錯聲調）
3. 檢查評分結果

**預期 UI 顯示**:
- ❌ FAILED 狀態
- 聲調準確度：0%
- Character-by-Character Analysis 應該標記聲調錯誤
- 無槽位錯誤警告（因為沒有代詞問題）

---

## 測試用例 3: 短句嚴格門檻（是 vs 四）

**場景**: 短句（1個字）聲調錯誤

**輸入**:
- Expected: `是` (shi4)
- Actual: 用戶說「四」（si4）

**預期結果**:
```typescript
{
  valid: true,  // 無代詞槽位問題
  errors: [],
  mismatchPositions: []
}
```

**評分行為**:
- `slotValid`: ✅ true
- `textSim`: 0% (不同字)
- `phonemeSim`: ~60% (sh vs s，韻母相似)
- `toneAcc`: 100% (都是 tone 4)
- **短句門檻**: ≥95%
- **最終判定**: ❌ FAILED（textSim 和 phonemeSim 不達標）
- **最終分數**: 0

**測試步驟**:
1. 設置 expected_answer 為「是」
2. 錄音說：「四」
3. 檢查是否觸發嚴格門檻

**預期 UI 顯示**:
- ❌ FAILED
- 文字相似度：0%
- 拼音相似度：~60%
- 聲調準確度：100%
- 門檻設定：短句(≤3字) - 文字:95% 拼音:95% 聲調:95%

---

## 測試用例 4: 正確答案與題目相似但不誤殺

**場景**: 答案與題目有部分重疊，但確實是正確答案

**輸入**:
- Question: `你叫什么名字？`
- Expected: `我叫李明` 
- Actual: `我叫李明`

**預期結果**:
```typescript
// 問題相似度檢查
qSim = calculateSimilarity('你叫什么名字？', '我叫李明') // ~50%

// 因為 qSim < 0.98，不會觸發「誤讀題面」擋法
```

**評分行為**:
- `qSim`: ~50%（遠低於 0.98）
- ✅ 通過問題相似度檢查
- `slotValid`: ✅ true
- `textSim`: 100%
- `phonemeSim`: 100%
- `toneAcc`: 100%
- **最終判定**: ✅ PASSED
- **最終分數**: 100

**測試步驟**:
1. 設置題目和預期答案如上
2. 正確回答
3. 確認不會被誤判為「識別失敗」

**預期 UI 顯示**:
- ✅ PASSED
- 所有指標：100%
- 無任何錯誤警告

---

## 控制台日誌檢查清單

在每個測試中，控制台應該輸出以下日誌：

### 槽位檢查日誌
```
🔍 關鍵槽位檢查:
  預期: 你叫什么名字？ → 你叫什么名字
  實際: 我叫什么名字？ → 我叫什么名字
  🚨 代詞錯誤 [位置0]: 預期"你" 實際"我"
  結果: ❌ 失敗 (1個槽位錯誤)
```

### 三維評分日誌
```
📊 與 "你叫什么名字？" 的完整比對:
  - 文字相似度: 88.9%
  - 拼音相似度: 88.9%
  - 聲調準確度: 88.9%
  - 綜合得分: 88.9%
  - 槽位檢查: ❌ 失敗
  - 槽位錯誤: ['Pronoun mismatch at position 0: expected "你" but got "我"']
  - 錯誤位置: [0]
```

### 門檻檢查日誌
```
📏 門檻設定: 短句(≤3字) - 文字:95% 拼音:95% 聲調:95%
🎯 評分結果:
  - 槽位檢查: ❌ 失敗
  - 文字達標: ❌ 失敗
  - 拼音達標: ❌ 失敗
  - 聲調達標: ❌ 失敗
  - 最終判定: ❌ FAILED
⚠️ 槽位錯誤，強制降分至: 44
🏆 最終分數: 44
```

---

## 自動化測試腳本（可選）

```typescript
// test-slot-check.ts
import { checkKeySlots, calculateSimilarity, phonemeSimilarity, toneAccuracy } from './page'

describe('Slot Check Tests', () => {
  test('Case 1: Pronoun mismatch 你 vs 我', () => {
    const result = checkKeySlots('你叫什么名字？', '我叫什么名字？')
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Pronoun mismatch at position 0: expected "你" but got "我"')
    expect(result.mismatchPositions).toContain(0)
  })

  test('Case 2: Tone error 媽 vs 麻', () => {
    const result = checkKeySlots('媽媽', '麻麻')
    expect(result.valid).toBe(true) // 無槽位問題
    
    const toneAcc = toneAccuracy('媽媽', '麻麻')
    expect(toneAcc).toBeLessThan(0.5) // 聲調不合
  })

  test('Case 3: Short sentence strict threshold', () => {
    const textSim = calculateSimilarity('是', '四')
    const phonemeSim = phonemeSimilarity('是', '四')
    const toneAcc = toneAccuracy('是', '四')
    
    expect(textSim).toBeLessThan(0.95)
    expect(phonemeSim).toBeLessThan(0.95)
    // 即使 tone 正確，其他指標不達標也應該失敗
  })

  test('Case 4: Correct answer similar to question', () => {
    const qSim = calculateSimilarity('你叫什么名字？', '我叫李明')
    expect(qSim).toBeLessThan(0.98) // 不會觸發誤殺
  })
})
```

---

## 驗收標準

✅ **必須全部通過以下檢查**:

1. 測試用例 1：代詞「你」vs「我」必須被識別為錯誤，強制失敗
2. 測試用例 2：聲調錯誤必須導致 toneAccuracy < 50%，失敗
3. 測試用例 3：短句門檻必須設為 95%，嚴格執行
4. 測試用例 4：正確答案不會被誤判為「識別失敗」
5. UI 必須顯示紅色槽位錯誤卡片（當有槽位錯誤時）
6. 控制台日誌必須清晰顯示所有檢查步驟
7. Your Answer 必須顯示原始轉錄（rawTranscript），不是清理後版本

---

## 測試執行時間

預計每個測試用例 2-3 分鐘，總共 8-12 分鐘完成所有測試。

**測試人員**: ___________  
**測試日期**: ___________  
**測試結果**: ⬜ PASS / ⬜ FAIL  
**備註**: ___________________________________________
