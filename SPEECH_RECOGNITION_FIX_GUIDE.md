# 🔴 語音識別問題診斷與修復指南

## 📊 問題分析

### 🔍 根本原因

從用戶截圖和代碼分析，發現問題根源：

1. **Gemini API 配額超限**
   - 錯誤：`[429 Too Many Requests] Quota exceeded`
   - 位置：`apps/backend/src/service/scoringService.ts`
   - 結果：系統自動切換到「模擬評分」模式

2. **模擬評分無法進行真實語音識別**
   - 位置：`apps/backend/src/service/mockScoring.ts` Line 109
   - 問題：`transcript = expectedAnswers[0]`
   - 結果：轉錄結果**直接等於預期答案**
   - 影響：
     - ❌ 無論用戶說什麼，轉錄都是正確答案
     - ❌ 槽位檢查永遠通過（因為 `actual === expected`）
     - ❌ 前端的 `checkKeySlots()` 函數永遠不會觸發錯誤

3. **前端日誌未輸出**
   - 原因：槽位檢查沒有錯誤可報告
   - `checkKeySlots("你叫什麼名字", "你叫什麼名字")` → 完全匹配 → ✅ VALID

---

## 🎯 解決方案

### 方案 A：配置真實的 Gemini API（推薦）

#### 步驟 1：獲取 API Key

1. 訪問 Google AI Studio：https://makersuite.google.com/app/apikey
2. 創建新的 API Key
3. 複製 Key（格式：`AIzaSy...`）

#### 步驟 2：配置環境變數

編輯 `apps/backend/.env` 文件：

```env
# Gemini API Key
GEMINI_API_KEY=AIzaSy...你的完整API_KEY...

# 或使用 GOOGLE_API_KEY
GOOGLE_API_KEY=AIzaSy...你的完整API_KEY...
```

#### 步驟 3：重啟後端

```powershell
# 停止當前服務器（Ctrl+C）
# 重新啟動
cd c:\Users\wls09\Desktop\chiness-interview-main
npm run dev
```

#### 步驟 4：驗證 API 正常工作

查看後端日誌，應該看到：
```
✓ 使用 Gemini API 進行真實評分
🤖 使用 Gemini 2.0 Flash 進行語音評分
✅ Gemini 評分成功
```

而不是：
```
⚠️ Gemini API 評分失敗，使用模擬評分
📊 使用模擬評分（備用方案）
```

---

### 方案 B：處理 Gemini API 配額限制

如果你已經有 API Key 但遇到配額超限（429 錯誤）：

#### 選項 1：升級配額

1. 訪問 Google Cloud Console
2. 前往 APIs & Services → Quotas
3. 搜索 "GenerateContent"
4. 請求增加配額限制

#### 選項 2：切換到不同區域

編輯 `apps/backend/src/service/scoringService.ts`：

```typescript
const model = genAI.getGenerativeModel({ 
  model: 'gemini-2.0-flash-exp'
  // 添加區域配置
});
```

#### 選項 3：使用速率限制

在 `scoreHandler` 中添加延遲：

```typescript
// 添加請求間隔
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 2000; // 2秒

export async function scoreHandler(req: Request, res: Response) {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => 
      setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest)
    );
  }
  
  lastRequestTime = Date.now();
  
  // ... 原有邏輯
}
```

#### 選項 4：降級使用 Gemini 1.5 Pro

```typescript
// 在 scoringService.ts Line 157
const model = genAI.getGenerativeModel({ 
  model: 'gemini-1.5-pro'  // 更改為 1.5 Pro
});
```

---

### 方案 C：使用其他語音識別服務（備選）

如果 Gemini API 不可用，可以考慮：

#### 1. Azure Speech Services

```typescript
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';

async function recognizeSpeech(audioBuffer: Buffer): Promise<string> {
  const speechConfig = sdk.SpeechConfig.fromSubscription(
    process.env.AZURE_SPEECH_KEY!,
    process.env.AZURE_SPEECH_REGION!
  );
  speechConfig.speechRecognitionLanguage = 'zh-CN';
  
  // ... 實現語音識別
}
```

#### 2. Google Cloud Speech-to-Text

```typescript
import speech from '@google-cloud/speech';

async function recognizeSpeech(audioBuffer: Buffer): Promise<string> {
  const client = new speech.SpeechClient();
  
  const [response] = await client.recognize({
    config: {
      encoding: 'WEBM_OPUS',
      sampleRateHertz: 48000,
      languageCode: 'zh-CN',
    },
    audio: { content: audioBuffer.toString('base64') },
  });
  
  return response.results?.[0]?.alternatives?.[0]?.transcript || '';
}
```

---

## 🧪 測試驗證

### 測試 1：確認使用真實 API

**步驟**：
1. 刷新瀏覽器
2. 打開控制台（F12）
3. 錄音任意內容
4. 查看後端日誌

**預期輸出**：
```
✓ 使用 Gemini API 進行真實評分
🤖 使用 Gemini 2.0 Flash 進行語音評分
📊 Gemini 回應解析: {
  有transcript: true,
  有transcript_raw: true,
  ...
}
✅ Gemini 評分成功
```

**不應該看到**：
```
⚠️ Gemini API 評分失敗
📊 使用模擬評分（備用方案）
```

---

### 測試 2：驗證槽位檢查工作

**步驟**：
1. 找到問題：「你叫什麼名字」
2. 故意說錯：「**我**叫什麼名字」（把「你」說成「我」）
3. 停止錄音

**預期前端控制台輸出**：
```
🔥🔥🔥 calculateThreeDimensionalScore 開始執行
  預期: 你叫什麼名字
  實際: 我叫什麼名字  ← 注意這裡應該是「我」不是「你」

🚨🚨🚨 checkKeySlots 函數被調用！
[位置 0] 🎯 代詞關鍵位置檢查:
  預期: "你" (✓ 是代詞)
  實際: "我" (✓ 是代詞)
  ❌❌❌ 致命錯誤: 代詞完全錯誤！

🎯🎯🎯 judgeScore 開始執行
  槽位檢查結果: ❌ 失敗
  最終判定: ❌❌❌ FAILED
  最終分數: 50 (或更低)
```

**預期 UI 顯示**：
- ❌ 紅色錯誤卡片
- 分數 ≤ 50
- 顯示「代詞錯誤」提示

---

## 🔧 快速修復腳本

創建 `fix-speech-recognition.ps1`：

```powershell
# 快速診斷並修復語音識別問題

Write-Host "🔍 診斷語音識別配置..." -ForegroundColor Cyan

# 檢查 .env 文件
$envPath = "apps\backend\.env"
if (Test-Path $envPath) {
    Write-Host "✓ 找到 .env 文件" -ForegroundColor Green
    
    $envContent = Get-Content $envPath -Raw
    
    if ($envContent -match "GEMINI_API_KEY=AIza\w+") {
        Write-Host "✓ Gemini API Key 已配置" -ForegroundColor Green
    } elseif ($envContent -match "GOOGLE_API_KEY=AIza\w+") {
        Write-Host "✓ Google API Key 已配置" -ForegroundColor Green
    } else {
        Write-Host "❌ 未找到有效的 API Key" -ForegroundColor Red
        Write-Host "請添加以下內容到 $envPath :" -ForegroundColor Yellow
        Write-Host "GEMINI_API_KEY=你的API_KEY" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "❌ 未找到 .env 文件" -ForegroundColor Red
    Write-Host "請創建 $envPath 並添加 API Key" -ForegroundColor Yellow
    exit 1
}

# 重啟服務器
Write-Host ""
Write-Host "🚀 重啟服務器..." -ForegroundColor Cyan

# 停止舊進程
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# 啟動新進程
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev"

Write-Host "✅ 修復完成！" -ForegroundColor Green
Write-Host "請在瀏覽器中測試錄音功能" -ForegroundColor Cyan
```

使用方法：
```powershell
cd c:\Users\wls09\Desktop\chiness-interview-main
.\fix-speech-recognition.ps1
```

---

## 📊 當前系統狀態

| 組件 | 狀態 | 問題 |
|------|------|------|
| 後端服務器 | ✅ 運行中 | - |
| 前端服務器 | ✅ 運行中 | - |
| Gemini API | ❌ 配額超限 | 429 Too Many Requests |
| 語音識別 | ❌ 使用模擬模式 | 無法識別真實語音 |
| 槽位檢查 | ✅ 代碼正確 | 無法測試（因為 STT 失敗） |
| 模組化評分 | ✅ 完成 | 5 個函數已實現 |

---

## 🎯 行動計劃

### 立即行動（P0 - 最高優先級）

1. **配置 Gemini API Key**
   - 獲取新的 API Key
   - 添加到 `.env` 文件
   - 重啟後端服務器

2. **驗證 API 正常工作**
   - 查看後端日誌
   - 確認看到「使用 Gemini API 進行真實評分」

3. **測試真實語音識別**
   - 錄音任意內容
   - 檢查轉錄結果是否正確
   - 確認不是 `[模擬]` 標記

### 後續測試（P1 - 高優先級）

4. **測試槽位檢查**
   - 故意說錯代詞
   - 驗證前端日誌輸出
   - 確認 UI 顯示紅色錯誤

5. **測試完整流程**
   - 完整課程從頭到尾
   - 多種錯誤類型
   - 記錄所有問題

---

## 💡 重要提醒

### ⚠️ 模擬評分的限制

**絕對不能用於生產環境！**

模擬評分模式的問題：
- ❌ 無法識別真實語音
- ❌ 轉錄結果永遠等於預期答案
- ❌ 槽位檢查永遠通過
- ❌ 無法測試代詞錯誤檢測
- ❌ 無法評估真實發音質量

**模擬評分只是備用方案**，不是長期解決方案！

---

## 📞 需要幫助？

如果按照以上步驟仍然無法解決，請提供：

1. **後端完整日誌**（從啟動到錄音結束）
2. **前端控制台輸出**（F12 → Console 標籤）
3. **環境變數配置**（隱藏 API Key 敏感部分）
4. **錄音時說的內容** vs **顯示的轉錄結果**

---

**最後更新**：2025-10-18  
**狀態**：等待配置 Gemini API Key
