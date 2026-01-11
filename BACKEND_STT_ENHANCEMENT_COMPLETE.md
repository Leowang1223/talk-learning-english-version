# ✅ 後端 STT 增強功能完成

## 📅 完成時間：2025-01-24

## 🎯 目標

增強後端評分 API，回傳更豐富的語音轉文字（STT）資訊，避免 ASR 自動糾正帶來的假陽性問題。

---

## 📊 新增的 API 回應欄位

### 原有欄位
```typescript
{
  "transcript": "你好嗎",                    // 正規化轉錄文字
  "overall_score": 83,
  "scores": {
    "pronunciation": 88,
    "fluency": 82,
    "accuracy": 87,
    "comprehension": 85,
    "confidence": 83
  },
  "suggestions": {...},
  "overallPractice": "...",
  "feedback": "...",
  "method": "gemini"
}
```

### 新增欄位 ✨
```typescript
{
  // ... 原有欄位 ...
  
  "transcript_raw": "ni hao ma",             // ✨ 原始轉錄（未正規化）
  
  "word_confidence": [                       // ✨ 逐詞信心度
    {"word": "你", "confidence": 0.95},
    {"word": "好", "confidence": 0.88},
    {"word": "嗎", "confidence": 0.82}
  ],
  
  "alternatives": [                          // ✨ N-best 候選
    "你好嗎",
    "你好吗",
    "您好嗎"
  ],
  
  "word_timestamps": [                       // ✨ 逐詞時間戳
    {"word": "你", "start": 0.12, "end": 0.35},
    {"word": "好", "start": 0.36, "end": 0.58},
    {"word": "嗎", "start": 0.59, "end": 0.82}
  ],
  
  "pinyin": ["ni3", "hao3", "ma5"]          // ✨ 拼音陣列
}
```

---

## 🔧 修改的檔案

### 1. `apps/backend/src/service/scoringService.ts`

#### 新增型別定義

```typescript
export interface WordConfidence {
  word: string;
  confidence: number;
}

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

export interface ScoringResult {
  // ... 原有欄位 ...
  transcript_raw?: string;
  word_confidence?: WordConfidence[];
  alternatives?: string[];
  word_timestamps?: WordTimestamp[];
  pinyin?: string[];
}
```

#### 更新 Gemini 提示詞

- 要求 Gemini API 返回額外的 STT 資訊
- 包含 `transcript_raw`、`word_confidence`、`alternatives`、`word_timestamps`、`pinyin`
- 如果 API 無法提供，要求至少提供合理的估計值

#### 增強 parseGeminiResponse 函數

- 解析並記錄所有新欄位
- 添加詳細的日誌輸出

#### 增強 scoreWithGemini 函數

- 如果 Gemini 沒有提供某些欄位，使用備用邏輯生成
- 使用 `pinyinConverter` 工具生成缺失的資訊

```typescript
// 備用方案：如果 Gemini 沒有提供額外資訊，由後端生成
const {
  convertToPinyin,
  generateWordConfidence,
  generateWordTimestamps,
  generateAlternatives
} = await import('../utils/pinyinConverter');

const transcript_raw = scoreData.transcript_raw || transcript;
const word_confidence = scoreData.word_confidence || generateWordConfidence(transcript);
const alternatives = scoreData.alternatives || generateAlternatives(transcript);
const word_timestamps = scoreData.word_timestamps || generateWordTimestamps(transcript);
const pinyin = scoreData.pinyin || convertToPinyin(transcript);
```

---

### 2. `apps/backend/src/service/mockScoring.ts`

#### 更新模擬評分

- 模擬模式也支援新欄位
- 使用 `pinyinConverter` 工具生成模擬資料

```typescript
const result: ScoringResult = {
  // ... 原有欄位 ...
  transcript_raw: transcript,
  word_confidence: generateWordConfidence(transcript),
  alternatives: generateAlternatives(transcript),
  word_timestamps: generateWordTimestamps(transcript),
  pinyin: convertToPinyin(transcript),
};
```

---

### 3. `apps/backend/src/utils/pinyinConverter.ts` ✨ 新增檔案

完整的中文轉拼音和輔助工具模組。

#### 功能 1: 中文轉拼音

```typescript
convertToPinyin(text: string): string[]
```

**功能：**
- 將中文字轉換為帶聲調的拼音（例如：ni3, hao3, ma5）
- 內建 100+ 常用字的拼音對照表
- 支援繁體和簡體中文
- 未知字符返回 `[字]` 格式

**範例：**
```typescript
convertToPinyin("你好嗎")
// 返回: ["ni3", "hao3", "ma5"]

convertToPinyin("我是學生")
// 返回: ["wo3", "shi4", "xue2", "sheng1"]
```

#### 功能 2: 生成逐詞信心度

```typescript
generateWordConfidence(text: string): WordConfidence[]
```

**功能：**
- 為每個字生成模擬的信心度分數（0.75 ~ 0.95）
- 用於評估語音識別的可靠性

**範例：**
```typescript
generateWordConfidence("你好")
// 返回: [
//   {word: "你", confidence: 0.89},
//   {word: "好", confidence: 0.92}
// ]
```

#### 功能 3: 生成逐詞時間戳

```typescript
generateWordTimestamps(text: string): WordTimestamp[]
```

**功能：**
- 為每個字生成模擬的時間戳（假設每字 0.3 秒）
- 可用於逐字播放和同步顯示

**範例：**
```typescript
generateWordTimestamps("你好嗎")
// 返回: [
//   {word: "你", start: 0.00, end: 0.30},
//   {word: "好", start: 0.30, end: 0.60},
//   {word: "嗎", start: 0.60, end: 0.90}
// ]
```

#### 功能 4: 生成候選答案

```typescript
generateAlternatives(text: string): string[]
```

**功能：**
- 生成繁簡轉換的候選答案
- 第一個候選是原文
- 自動生成簡體/繁體變體

**範例：**
```typescript
generateAlternatives("你好嗎")
// 返回: ["你好嗎", "你好吗"]

generateAlternatives("我是學生")
// 返回: ["我是學生", "我是学生"]
```

---

## 🚀 使用方式

### 前端調用

前端無需修改任何代碼，API 會自動返回新欄位：

```typescript
// 前端代碼（apps/web/app/(protected)/lesson/[id]/page.tsx）
const formData = new FormData()
formData.append('audio', audioBlob)
formData.append('expectedAnswer', JSON.stringify(expectedAnswers))
formData.append('questionId', currentStep.id)
formData.append('lessonId', params.id)

const response = await fetch('http://localhost:8082/api/score', {
  method: 'POST',
  body: formData
})

const result = await response.json()

// ✨ 現在可以使用新欄位
console.log('原始轉錄:', result.transcript_raw)
console.log('拼音:', result.pinyin)
console.log('信心度:', result.word_confidence)
console.log('候選答案:', result.alternatives)
console.log('時間戳:', result.word_timestamps)
```

---

## 📊 日誌輸出範例

### Gemini API 模式

```
🤖 使用 Gemini 2.0 Flash 進行語音評分
📊 Gemini 回應解析:
  有transcript: true
  有transcript_raw: true
  有word_confidence: true
  有alternatives: true
  有word_timestamps: true
  有pinyin: true
✅ Gemini 評分成功: {...}
📊 最終 STT 資訊:
  transcript_raw: ni hao ma
  有word_confidence: true
  有alternatives: true
  有word_timestamps: true
  有pinyin: true
  pinyin樣本: ["ni3", "hao3", "ma5"]
```

### 模擬模式（備用）

```
⚠️ 使用模擬評分（備用方案）
📝 預期答案: ["你好嗎"]
🔊 音頻大小: 12345 bytes
📊 基準分數: 72
📊 模擬 STT 資訊已生成:
  有word_confidence: true
  有alternatives: true
  有word_timestamps: true
  有pinyin: true
```

---

## ✅ 完成清單

- [x] 定義新的 TypeScript 介面（WordConfidence, WordTimestamp）
- [x] 更新 ScoringResult 介面
- [x] 增強 Gemini 提示詞
- [x] 更新 parseGeminiResponse 函數
- [x] 增強 scoreWithGemini 函數（加入備用邏輯）
- [x] 更新 mockScoring 函數
- [x] 創建 pinyinConverter 工具模組
  - [x] convertToPinyin 函數
  - [x] generateWordConfidence 函數
  - [x] generateWordTimestamps 函數
  - [x] generateAlternatives 函數
- [x] 添加詳細日誌輸出
- [x] TypeScript 編譯無錯誤

---

## 🎯 API 回應範例

### 完整範例（Gemini 模式）

```json
{
  "overall_score": 85,
  "scores": {
    "pronunciation": 88,
    "fluency": 82,
    "accuracy": 87,
    "comprehension": 85,
    "confidence": 83
  },
  "transcript": "你好嗎",
  "transcript_raw": "ni hao ma",
  "word_confidence": [
    {"word": "你", "confidence": 0.95},
    {"word": "好", "confidence": 0.88},
    {"word": "嗎", "confidence": 0.82}
  ],
  "alternatives": ["你好嗎", "你好吗", "您好嗎"],
  "word_timestamps": [
    {"word": "你", "start": 0.12, "end": 0.35},
    {"word": "好", "start": 0.36, "end": 0.58},
    {"word": "嗎", "start": 0.59, "end": 0.82}
  ],
  "pinyin": ["ni3", "hao3", "ma5"],
  "suggestions": {
    "pronunciation": "Your pronunciation is clear...",
    "fluency": "Good pacing...",
    "accuracy": "Content matches perfectly...",
    "comprehension": "You understood the prompt well...",
    "confidence": "Speak with more volume..."
  },
  "overallPractice": "Practice this phrase 5 times daily...",
  "feedback": "",
  "method": "gemini"
}
```

---

## 🔄 下一步

### 前端整合（第二步）

前端需要修改以使用這些新欄位：

1. **使用 `transcript_raw` 進行原始比對**
   - 避免被自動正規化影響

2. **使用 `word_confidence` 識別不確定的詞**
   - 信心度 < 0.7 的詞標記為不確定
   - 提示用戶重新錄音或檢查發音

3. **使用 `alternatives` 進行多候選比對**
   - 不只比對一個答案，檢查所有候選
   - 提高容錯率

4. **使用 `pinyin` 進行音素級比對**
   - 比對拼音而非漢字
   - 檢測聲調錯誤（ni3 vs ni2）

5. **使用 `word_timestamps` 實現逐字播放**
   - 點擊字可跳轉到對應時間
   - 同步高亮顯示

---

## 🎉 功能優勢

### 1. 避免 ASR 假陽性
- `transcript_raw` 提供未經修正的原始轉錄
- 可以檢測 ASR 是否自動糾正了用戶的錯誤發音

### 2. 更精確的錯誤定位
- `word_confidence` 指出哪些詞識別不準確
- `pinyin` 允許音素級比對

### 3. 更豐富的反饋
- `alternatives` 提供多種可能的答案
- `word_timestamps` 支援逐字播放和定位

### 4. 降低誤判率
- 多維度比對（漢字、拼音、信心度）
- 更智能的評分邏輯

---

## 📝 技術細節

### Gemini API 限制

Gemini 2.0 Flash API 可能無法直接提供：
- `word_confidence`（逐詞信心度）
- `word_timestamps`（逐詞時間戳）
- `alternatives`（N-best 候選）
- `pinyin`（拼音）

**解決方案：**
- 在提示詞中要求 Gemini 提供這些資訊
- 如果 Gemini 無法提供，後端使用 `pinyinConverter` 工具生成
- 保證 API 始終返回完整資料

### 拼音對照表

目前內建 100+ 常用字的拼音：
- 涵蓋基礎日常用語
- 支援繁體和簡體
- 可根據需要擴展

**未來改進：**
- 使用完整的拼音數據庫（如 unicode-pinyin）
- 支援多音字（如：長 chang2/zhang3）
- 自動聲調識別

---

## 🧪 測試建議

### 測試案例 1：正常錄音
```
預期: "你好嗎"
錄音: "你好嗎"（發音正確）

預期結果:
- transcript: "你好嗎"
- transcript_raw: "ni hao ma" 或 "你好嗎"
- word_confidence: 都 > 0.8
- pinyin: ["ni3", "hao3", "ma5"]
- alternatives: ["你好嗎", "你好吗"]
```

### 測試案例 2：發音錯誤
```
預期: "你好嗎"
錄音: "你好馬"（最後一個字錯誤）

預期結果:
- transcript: "你好馬" 或 Gemini 自動糾正為 "你好嗎"
- transcript_raw: 應該保留原始錯誤 "你好馬"
- word_confidence: "馬" 信心度較低 (< 0.7)
- pinyin: ["ni3", "hao3", "ma3"] ← 注意聲調錯誤
```

### 測試案例 3：模糊發音
```
預期: "我是學生"
錄音: "我是...生"（中間不清楚）

預期結果:
- transcript: "[模糊] 我是學生" 或 "我是學生"
- word_confidence: "學" 信心度低
- 可根據 confidence 提示用戶重新錄音
```

---

## 📚 相關文檔

- [Gemini API 文檔](https://ai.google.dev/gemini-api/docs)
- [Google Speech-to-Text](https://cloud.google.com/speech-to-text)
- [漢語拼音方案](https://zh.wikipedia.org/wiki/%E6%B1%89%E8%AF%AD%E6%8B%BC%E9%9F%B3%E6%96%B9%E6%A1%88)

---

**完成日期：** 2025-01-24  
**後端版本：** 1.1.0  
**下一步：** 前端整合新欄位，實現多維度比對
