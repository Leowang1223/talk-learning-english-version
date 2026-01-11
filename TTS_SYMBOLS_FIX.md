# TTS 符號和引號處理改進 ✅

## 修改內容

### 問題描述
在課程問題中，例如：
```
Question 2: To answer, say '我叫 + your name'. For example: '我叫Tom' = 'My name is Tom'.
```

TTS 會念出：
- ❌ 引號（單引號、雙引號）
- ❌ 加號符號 "+"
- ❌ 等號符號 "="

### 用戶需求
- ✅ 引號不要念
- ✅ "+" 用英文念 "plus"
- ✅ "=" 用英文念 "equals"

## 解決方案

### 1. 更新 `removePunctuation` 函數
移除所有引號（單引號、雙引號、中英文引號）

```typescript
const removePunctuation = (text: string): string => {
  return text
    .replace(/[，,。.！!？?；;：:、「」『』【】《》〈〉（）()]/g, ' ')
    .replace(/["'"'']/g, '') // ✅ 移除所有引號
    .replace(/\s+/g, ' ')
    .trim()
}
```

### 2. 新增 `convertSymbolsToWords` 函數
將數學符號轉換為英文單詞

```typescript
const convertSymbolsToWords = (text: string): string => {
  return text
    .replace(/\+/g, ' plus ')   // + → plus
    .replace(/=/g, ' equals ')  // = → equals
    .replace(/\s+/g, ' ')       // 清理多餘空格
    .trim()
}
```

### 3. 更新處理順序

```typescript
// 處理文本：移除拼音 → 轉換符號 → 移除標點
let cleanText = removePinyin(text)
cleanText = convertSymbolsToWords(cleanText)  // ✅ 新增
cleanText = removePunctuation(cleanText)
```

## 處理流程示例

### 輸入文本：
```
Question 2: To answer, say '我叫 + your name'. For example: '我叫Tom' = 'My name is Tom'.
```

### 處理步驟：

#### 1. `removePinyin()` - 移除拼音
```
Question 2: To answer, say '我叫 + your name'. For example: '我叫Tom' = 'My name is Tom'.
```
（本例中沒有拼音括號，所以不變）

#### 2. `convertSymbolsToWords()` - 符號轉英文
```
Question 2: To answer, say '我叫 plus your name'. For example: '我叫Tom' equals 'My name is Tom'.
```
- `+` → `plus`
- `=` → `equals`

#### 3. `removePunctuation()` - 移除標點和引號
```
Question 2 To answer say 我叫 plus your name For example 我叫Tom equals My name is Tom
```
- 移除 `:` `.` `'` `'`
- 保留空格和文字

#### 4. TTS 播放結果
> "Question 2 To answer say 我叫 plus your name For example 我叫Tom equals My name is Tom"

## 支持的符號轉換

| 符號 | 英文單詞 | 示例 |
|------|---------|------|
| `+` | plus | "A + B" → "A plus B" |
| `=` | equals | "A = B" → "A equals B" |

## 移除的引號類型

| 類型 | 符號 | 說明 |
|------|------|------|
| 英文單引號 | `'` | 例如：'hello' |
| 英文雙引號 | `"` | 例如：\"hello\" |
| 中文單引號 | `'` `'` | 例如：'你好' |
| 中文雙引號 | `"` `"` | 例如："你好" |

## 擴展性

如果將來需要支持更多符號，可以在 `convertSymbolsToWords` 函數中添加：

```typescript
const convertSymbolsToWords = (text: string): string => {
  return text
    .replace(/\+/g, ' plus ')
    .replace(/=/g, ' equals ')
    .replace(/-/g, ' minus ')      // 減號
    .replace(/×/g, ' times ')      // 乘號
    .replace(/÷/g, ' divided by ') // 除號
    .replace(/\*/g, ' times ')     // 星號（乘號）
    .replace(/\//g, ' divided by ')// 斜線（除號）
    .replace(/\s+/g, ' ')
    .trim()
}
```

## 測試步驟

### 1. 準備測試文本
確保課程中有包含以下元素的問題：
- 引號：`'text'` 或 `"text"`
- 加號：`A + B`
- 等號：`A = B`

### 2. 測試 TTS 播放
1. 訪問：http://localhost:3000/lesson/L1
2. 播放包含這些符號的題目
3. 聽取 TTS 朗讀

### 3. 驗證結果
- [ ] 引號不會被念出來
- [ ] "+" 被念成 "plus"
- [ ] "=" 被念成 "equals"
- [ ] 其他文字正常播放
- [ ] 中英文分離播放正常

## 測試案例

### 案例 1：引號測試
**輸入：** `Say 'hello' to the world`  
**期望輸出：** "Say hello to the world"

### 案例 2：加號測試
**輸入：** `我叫 + your name`  
**期望輸出：** "我叫 plus your name"

### 案例 3：等號測試
**輸入：** `A = B means A equals B`  
**期望輸出：** "A equals B means A equals B"

### 案例 4：組合測試
**輸入：** `To say '我叫 + Tom', you say 'My name = Tom'`  
**期望輸出：** "To say 我叫 plus Tom you say My name equals Tom"

## 技術細節

### 為什麼要在符號前後加空格？
```typescript
.replace(/\+/g, ' plus ')  // 前後都有空格
```

**原因：**
1. 避免單詞連在一起
2. 確保 TTS 有自然停頓
3. 例如：`A+B` → `A plus B`（不是 `AplusB`）

### 處理順序很重要

```
正確順序：
removePinyin → convertSymbolsToWords → removePunctuation
```

**為什麼？**
- 先轉換符號，再移除標點
- 如果先移除標點，符號可能會被誤刪
- 例如：`+` 不應該被當作標點移除

### 正則表達式說明

```typescript
.replace(/\+/g, ' plus ')
```

- `/\+/` - 匹配加號（需要轉義）
- `g` - 全局標誌，替換所有匹配項
- `' plus '` - 替換為 "plus"，前後有空格

## 完成時間
2025-10-09

## 狀態
✅ 已完成，等待測試

---

## 🎬 測試說明

1. **刷新頁面**（Ctrl+F5）清除緩存
2. **進入課程**：http://localhost:3000/lesson/L1
3. **聽取 TTS**：
   - 引號不會被念出
   - "+" 會念成 "plus"
   - "=" 會念成 "equals"
4. **確認效果**：文字流暢自然

## 預期 TTS 效果

**原文：**
> Question 2: To answer, say '我叫 + your name'. For example: '我叫Tom' = 'My name is Tom'.

**TTS 朗讀：**
> Question 2 To answer say 我叫 plus your name For example 我叫Tom equals My name is Tom

✨ 自然、流暢、沒有奇怪的符號朗讀！
