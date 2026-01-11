# 緊急修復腳本

## 問題
Line 1014 包含未定義的變數 `questionSimilarity`

## 手動修復步驟

### 步驟 1：打開文件
在 VS Code 中打開：
```
apps/web/app/(protected)/lesson/[id]/page.tsx
```

### 步驟 2：定位錯誤行
- 按 `Ctrl + G`（Windows）或 `Cmd + G`（Mac）
- 輸入 `1014` 跳轉到該行

### 步驟 3：查找並刪除
- 按 `Ctrl + F`（Windows）或 `Cmd + F`（Mac）
- 搜索：`questionSimilarity`
- 你會看到類似這樣的行：
  ```typescript
  console.log('� 問題相似度:', (questionSimilarity * 100).toFixed(1) + '%')
  ```

### 步驟 4：刪除整行
- 將光標移動到該行
- 按 `Ctrl + Shift + K`（Windows）或 `Cmd + Shift + K`（Mac）刪除整行

### 步驟 5：檢查重複日誌
在附近（Line 1012-1018）應該只有以下日誌，刪除任何重複的：
```typescript
console.log('問題文字:', currentStep.teacher)
console.log('轉錄文字:', userTranscript)
console.log('問題相似度:', (qSim * 100).toFixed(1) + '%')
console.log('低信心度比例:', lowConfidence)
```

### 步驟 6：確認修復
保存文件後，執行：
```bash
cd apps/web
npm run build
```

應該看到編譯成功！

---

## 或者：使用查找替換

### 方法 A：精確替換
1. 按 `Ctrl + H`（查找並替換）
2. **查找：** `console.log('� 問題相似度:', (questionSimilarity * 100).toFixed(1) + '%')`
3. **替換為：** (留空)
4. 點擊「全部替換」

### 方法 B：搜索變數名
1. 按 `Ctrl + F`
2. 搜索：`questionSimilarity`
3. 手動刪除包含該變數的整行

---

## 完成後測試

```bash
# 終端 1：後端
cd apps/backend
npm run dev

# 終端 2：前端
cd apps/web
npm run dev
```

成功後應該看到：
```
✓ Ready in 3.2s
```

---

**預計修復時間：** 1分鐘
