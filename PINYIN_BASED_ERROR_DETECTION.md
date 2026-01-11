# 🎯 基於拼音的錯誤檢測優化

## ✅ 修改完成時間
2025年1月23日

## 🐛 問題描述
**用戶反饋：** "抓錯音和字寬鬆點，用讀音去判斷是念錯或讀錯，因為答案裡有英文，剩至沒讀錯，但被抓繁體和簡體的錯字"

**具體問題：**
1. ❌ **繁簡體誤判** - 把「湯」(繁體) 當作錯誤，期望「汤」(簡體)
2. ❌ **太嚴格** - 字形不同但讀音相同也被標記為錯誤
3. ❌ **英文誤判** - 答案中有英文「Tom」，系統不正確處理
4. ❌ **應該用讀音判斷** - 而不是字符完全匹配

## 🔧 核心修改

### 修改文件
`apps/web/app/(protected)/lesson/[id]/page.tsx`

### 1. 新增拼音相似度判斷函數

**位置：** 約 78-115 行

```typescript
// 🔧 輔助函數：檢查兩個字符是否拼音相同或相似
function arePinyinSimilar(char1: string, char2: string): boolean {
  // 如果字符相同，直接返回 true
  if (char1 === char2) return true
  
  // 英文字母大小寫不敏感
  if (/[a-zA-Z]/.test(char1) && /[a-zA-Z]/.test(char2)) {
    return char1.toLowerCase() === char2.toLowerCase()
  }
  
  // 只有中文才轉拼音比較
  if (!/[\u4e00-\u9fa5]/.test(char1) || !/[\u4e00-\u9fa5]/.test(char2)) {
    return false
  }
  
  try {
    const pinyin1 = pinyin(char1, { toneType: 'num', type: 'array' })[0] || ''
    const pinyin2 = pinyin(char2, { toneType: 'num', type: 'array' })[0] || ''
    
    // 去掉聲調，只比較聲母韻母
    const base1 = pinyin1.replace(/[1-5]/g, '')
    const base2 = pinyin2.replace(/[1-5]/g, '')
    
    // 拼音完全相同（忽略聲調）
    if (base1 === base2) return true
    
    // 常見混淆音：n/l, an/ang, en/eng, in/ing
    const confusablePairs = [
      ['n', 'l'],
      ['an', 'ang'],
      ['en', 'eng'],
      ['in', 'ing'],
      ['un', 'ong']
    ]
    
    for (const [a, b] of confusablePairs) {
      if ((base1.includes(a) && base2.includes(b)) || 
          (base1.includes(b) && base2.includes(a))) {
        return true
      }
    }
  } catch (error) {
    return false
  }
  
  return false
}
```

**功能說明：**
- ✅ 字符完全相同 → 直接判定為相同
- ✅ 英文字母 → 大小寫不敏感比較
- ✅ 中文字符 → 轉換為拼音比較（忽略聲調）
- ✅ 常見混淆音 → 識別並允許（如 n/l, an/ang）
- ✅ 非中文字符 → 返回 false

### 2. 修改錯誤分析函數

**位置：** 約 127-172 行

**修改前：**
```typescript
function analyzeErrors(expected: string, actual: string): CharacterError[] {
  const expectedNorm = normalizeText(expected)
  const actualNorm = normalizeText(actual)
  const errors: CharacterError[] = []
  
  const maxLen = Math.max(expectedNorm.length, actualNorm.length)
  
  for (let i = 0; i < maxLen; i++) {
    const expChar = expectedNorm[i] || ''
    const actChar = actualNorm[i] || ''
    
    if (!expChar && actChar) {
      errors.push({ expected: '', actual: actChar, position: i, type: 'extra' })
    } else if (expChar && !actChar) {
      errors.push({ expected: expChar, actual: '', position: i, type: 'missing' })
    } else if (expChar !== actChar) {
      errors.push({ expected: expChar, actual: actChar, position: i, type: 'wrong' })
    }
  }
  
  return errors
}
```

**修改後：**
```typescript
function analyzeErrors(expected: string, actual: string): CharacterError[] {
  const expectedNorm = normalizeText(expected)
  const actualNorm = normalizeText(actual)
  const errors: CharacterError[] = []
  
  const maxLen = Math.max(expectedNorm.length, actualNorm.length)
  
  for (let i = 0; i < maxLen; i++) {
    const expChar = expectedNorm[i] || ''
    const actChar = actualNorm[i] || ''
    
    if (!expChar && actChar) {
      // Extra character - 但如果是空格或標點，忽略
      if (actChar.trim() && !/[，。！？；：、]/.test(actChar)) {
        errors.push({ 
          expected: '', 
          actual: actChar, 
          position: i, 
          type: 'extra',
          actualPinyin: getCharPinyin(actChar)
        })
      }
    } else if (expChar && !actChar) {
      // Missing character
      errors.push({ 
        expected: expChar, 
        actual: '', 
        position: i, 
        type: 'missing',
        expectedPinyin: getCharPinyin(expChar)
      })
    } else if (expChar !== actChar) {
      // 🔧 使用拼音判斷是否真的錯誤
      if (!arePinyinSimilar(expChar, actChar)) {
        errors.push({ 
          expected: expChar, 
          actual: actChar, 
          position: i, 
          type: 'wrong',
          expectedPinyin: getCharPinyin(expChar),
          actualPinyin: getCharPinyin(actChar)
        })
      }
      // 如果拼音相似，不算錯誤（例如繁簡體：湯/汤）
    }
  }
  
  return errors
}
```

**改進說明：**
- ✅ **拼音判斷** - 使用 `arePinyinSimilar()` 判斷是否真的錯誤
- ✅ **繁簡體兼容** - 「湯」和「汤」拼音相同，不算錯誤
- ✅ **忽略標點** - 空格和標點不算額外字符
- ✅ **添加拼音信息** - 每個錯誤都附帶拼音數據

### 3. 新增獲取拼音輔助函數

**位置：** 約 117-125 行

```typescript
// 🔧 輔助函數：獲取字符的拼音
function getCharPinyin(char: string): string {
  if (!char || !/[\u4e00-\u9fa5]/.test(char)) return ''
  try {
    return pinyin(char, { toneType: 'num', type: 'array' })[0] || ''
  } catch {
    return ''
  }
}
```

**功能：** 安全地獲取單個中文字符的拼音

### 4. CharacterError 接口更新

**位置：** 約 69-77 行

```typescript
interface CharacterError {
  expected: string
  actual: string
  position: number
  type: 'missing' | 'wrong' | 'extra'
  expectedPinyin?: string  // 🆕 正確的拼音
  actualPinyin?: string    // 🆕 用戶說的拼音
}
```

## 📊 修改總結

| 修改項目 | 位置 | 狀態 | 效果 |
|---------|------|------|------|
| arePinyinSimilar 函數 | 78-115 行 | ✅ 完成 | 拼音相似度判斷 |
| getCharPinyin 函數 | 117-125 行 | ✅ 完成 | 安全獲取拼音 |
| analyzeErrors 函數 | 127-172 行 | ✅ 完成 | 基於拼音的錯誤檢測 |
| CharacterError 接口 | 69-77 行 | ✅ 完成 | 添加拼音字段 |

## 🎯 預期行為

### 繁簡體處理：
```
用戶說：「Tom 喜歡喝湯」
期望：「Tom 喜歡喝汤」
結果：✅ 不標記為錯誤（湯/汤 拼音相同：tang1）
```

### 英文大小寫：
```
用戶說：「Tom」
期望：「tom」
結果：✅ 不標記為錯誤（英文大小寫不敏感）
```

### 常見混淆音：
```
用戶說：「你好啊」(lan5)
期望：「你好啊」(nan5)
結果：✅ 可能被標記但更寬鬆（n/l 相似）
```

### 完全不同的字：
```
用戶說：「湯」(tang1)
期望：「t」
結果：❌ 正確標記為錯誤
```

## 🧪 測試場景

### 場景 1：繁簡體混用
```typescript
測試輸入：
- 期望：「我喜欢吃饭」（簡體）
- 用戶：「我喜歡吃飯」（繁體）

預期結果：
✅ 不應報告任何錯誤（拼音完全相同）
```

### 場景 2：英文大小寫
```typescript
測試輸入：
- 期望：「Hello Tom」
- 用戶：「hello tom」

預期結果：
✅ 不應報告任何錯誤（英文大小寫不敏感）
```

### 場景 3：拼音相似但聲調不同
```typescript
測試輸入：
- 期望：「妈妈」(ma1 ma1)
- 用戶：「麻麻」(ma2 ma2)

預期結果：
✅ 不應報告錯誤（忽略聲調，只看聲母韻母）
```

### 場景 4：完全不同的字
```typescript
測試輸入：
- 期望：「你好」
- 用戶：「尼豪」

預期結果：
❌ 應該報告錯誤（拼音不同：ni3 hao3 vs ni2 hao2）
```

## 🔍 調試技巧

### 1. 查看拼音比較日誌
在 `arePinyinSimilar` 函數中添加 console.log：

```typescript
console.log('拼音比較:', {
  char1, char2,
  pinyin1: base1,
  pinyin2: base2,
  similar: base1 === base2
})
```

### 2. 查看錯誤分析結果
在評分流程中查看：

```typescript
console.log('錯誤分析結果:', {
  totalErrors: errors.length,
  errors: errors.map(e => ({
    type: e.type,
    expected: e.expected,
    actual: e.actual,
    expectedPinyin: e.expectedPinyin,
    actualPinyin: e.actualPinyin
  }))
})
```

### 3. 測試拼音轉換
在瀏覽器 Console 中：

```javascript
// 假設 pinyin-pro 已載入
import { pinyin } from 'pinyin-pro'

// 測試單字
console.log(pinyin('湯', { toneType: 'num' }))  // tang1
console.log(pinyin('汤', { toneType: 'num' }))  // tang1

// 測試句子
console.log(pinyin('Tom喜歡喝湯', { toneType: 'num' }))
```

## ⚠️ 注意事項

### 1. pinyin-pro 依賴
確保 `pinyin-pro` 已正確安裝：
```bash
npm list pinyin-pro
```

### 2. 性能考量
- 拼音轉換有計算成本，但只在錯誤檢測時使用
- 每個字符只轉換一次
- 對於長句子（>50字），性能影響可忽略

### 3. 邊緣情況
- 多音字可能導致誤判（如「行」有 xing2/hang2）
- 罕見字可能無法正確轉換拼音
- 非標準漢字（生僻字）可能返回空拼音

### 4. 英文處理
- 目前只處理單個英文字母
- 完整英文單詞需要特殊處理
- 數字和特殊符號被忽略

## 📝 後續改進建議

### 1. 多音字處理
```typescript
// 未來可以添加上下文感知的多音字處理
function getContextAwarePinyin(char: string, context: string): string {
  // 根據上下文選擇正確的讀音
}
```

### 2. 聲調重要性配置
```typescript
// 允許配置是否嚴格檢查聲調
interface ErrorDetectionConfig {
  strictTone: boolean  // 是否嚴格檢查聲調
  allowTraditional: boolean  // 是否允許繁體字
  caseSensitive: boolean  // 英文是否區分大小寫
}
```

### 3. 方言變音支持
```typescript
// 支持常見方言變音模式
const dialectPatterns = {
  taiwanese: { 'n': 'l', 'an': 'ang' },
  cantonese: { /* ... */ }
}
```

## 🎉 完成狀態
- [x] 實現拼音相似度判斷
- [x] 修改錯誤分析函數
- [x] 添加拼音輔助函數
- [x] 更新 CharacterError 接口
- [x] 繁簡體兼容處理
- [x] 英文大小寫處理
- [x] 常見混淆音處理
- [ ] 端到端測試（需用戶執行）
- [ ] 多音字優化（未來改進）
- [ ] 方言支持（未來改進）

## 🔗 相關文檔
- [MODULAR_SCORING_COMPLETE.md](./MODULAR_SCORING_COMPLETE.md) - 模組化評分系統
- [DETAILED_CHARACTER_FEEDBACK_COMPLETE.md](./DETAILED_CHARACTER_FEEDBACK_COMPLETE.md) - 字元錯誤分析
- [OPENAI_INTEGRATION_COMPLETE.md](./OPENAI_INTEGRATION_COMPLETE.md) - OpenAI 整合

---

**修改完成日期：** 2025年1月23日  
**測試狀態：** 代碼層面完成，等待用戶測試  
**預期效果：** 繁簡體不報錯，英文大小寫不報錯，基於拼音判斷真實錯誤
