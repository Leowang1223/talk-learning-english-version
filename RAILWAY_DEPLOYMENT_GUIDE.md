# Railway 後端部署指南

## 🚀 快速部署步驟

### 1. 準備工作

確保你已經：
- ✅ 將代碼推送到 GitHub: https://github.com/Leowang1223/talk-learning-english-version
- ✅ 有 Railway 帳號（使用 GitHub 登入）

### 2. 創建 Railway 專案

1. 訪問 [Railway.app](https://railway.app) 並登入

2. 點擊 **New Project**

3. 選擇 **Deploy from GitHub repo**

4. 選擇你的倉庫：`Leowang1223/talk-learning-english-version`

5. Railway 會自動偵測到 Dockerfile

### 3. 配置 Railway 專案

#### 3.1 基本設置

Railway 會自動使用根目錄的 `railway.toml` 配置文件，該文件已經配置為：
- 使用 `apps/backend/Dockerfile` 構建
- 正確的啟動命令
- 健康檢查路徑

**不需要手動配置 Root Directory 或 Build Command**

#### 3.2 環境變數設定

在 Railway 專案的 **Variables** 標籤頁，新增以下環境變數：

```bash
# Supabase Configuration
SUPABASE_URL=https://tryfblgkwvtmyvkubqmm.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyeWZibGdrd3Z0bXl2a3VicW1tIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODEwMzE2MCwiZXhwIjoyMDgzNjc5MTYwfQ.d89akfF1krL6N836vQ2TQZnUIeAjcPjFcVJ0IN_8JY0

# Gemini API Key (你的 AI 功能 API Key)
GEMINI_API_KEY=AIzaSyBCrcMX3-_J56nDk_ML_tV7D535tUhmyOE

# Server Configuration
NODE_ENV=production
```

**重要提示：**
- Railway 會自動設定 `PORT` 環境變數
- 不需要手動設定 `PORT`

### 4. 部署

1. 點擊 **Deploy** 開始部署

2. 等待構建完成（約 3-5 分鐘）

3. 查看 **Deployments** 標籤的構建日誌

4. 構建成功後，Railway 會自動啟動服務

### 5. 獲取後端 URL

1. 在 Railway 專案中，點擊 **Settings** 標籤

2. 找到 **Networking** 區塊

3. 點擊 **Generate Domain**

4. 複製生成的 URL，例如：
   ```
   https://talk-learning-backend-production.up.railway.app
   ```

5. **記下這個 URL**，在 Vercel 前端部署時會用到

### 6. 驗證部署

訪問以下端點測試後端是否正常運行：

```
https://<你的railway域名>/health
```

**預期回應：**
```json
{
  "status": "ok",
  "timestamp": "2026-01-11T..."
}
```

---

## 🔧 故障排除

### 問題 1：構建失敗 - Cannot find module

**症狀：**
```
Error: Cannot find module '/app/apps/backend/dist/server.js'
```

**解決方案：**
這表示 TypeScript 沒有正確編譯。確保：
1. `railway.toml` 使用正確的 `dockerfilePath = "apps/backend/Dockerfile"`
2. Dockerfile 包含 `RUN npm run build` 步驟
3. 重新部署專案

### 問題 2：健康檢查失敗

**症狀：**
Railway 顯示 "Unhealthy" 或 "Crashed"

**解決方案：**
1. 檢查 **Logs** 標籤查看錯誤訊息
2. 確認環境變數已正確設置
3. 確認 `GEMINI_API_KEY` 是有效的

### 問題 3：CORS 錯誤

**症狀：**
前端無法連接到後端，瀏覽器 Console 顯示 CORS 錯誤

**解決方案：**
1. 前往 Railway Variables 標籤
2. 新增環境變數：
   ```
   ALLOWED_ORIGINS=https://<你的vercel域名>,https://<你的vercel域名>-*.vercel.app
   ```
3. 點擊 **Redeploy** 重新部署

### 問題 4：Port 衝突

**症狀：**
```
Error: listen EADDRINUSE: address already in use :::8082
```

**解決方案：**
後端應該使用 Railway 提供的 `PORT` 環境變數，而不是硬編碼的 8082。確認 `apps/backend/src/server.ts` 使用：
```typescript
const PORT = process.env.PORT || 8082;
```

---

## 📝 構建日誌檢查

如果部署失敗，查看 Railway 的 **Deployments** → **Build Logs**：

**成功的構建日誌應該包含：**
```
✓ Building Docker image...
✓ Step 1/20 : FROM node:20-alpine AS builder
✓ Step 2/20 : RUN apk add --no-cache python3 make g++
...
✓ Step 16/20 : RUN npm run build
✓ Step 17/20 : RUN ls -la dist/
total XXX
-rw-r--r--  1 root root XXXX server.js
...
✓ Successfully built and tagged image
```

如果在 `RUN npm run build` 步驟失敗，這表示 TypeScript 編譯有問題。

---

## 🔄 重新部署

如果需要重新部署：

1. **從 GitHub 推送新代碼**：
   ```bash
   git add .
   git commit -m "Update backend"
   git push
   ```
   Railway 會自動觸發新的部署

2. **手動觸發重新部署**：
   - 前往 Railway 專案
   - 點擊 **Deployments** 標籤
   - 點擊 **Redeploy**

---

## 📊 監控與日誌

### 查看即時日誌
1. 前往 Railway 專案
2. 點擊 **Logs** 標籤
3. 查看應用程序的即時輸出

### 查看部署歷史
1. 前往 **Deployments** 標籤
2. 查看所有部署記錄
3. 點擊任何部署查看詳細日誌

### 資源使用
1. 前往 **Metrics** 標籤
2. 查看 CPU、記憶體和網路使用情況

---

## 🎯 下一步

後端部署成功後，繼續進行：
1. ✅ 獲取 Railway 後端 URL
2. 📝 在 Vercel 前端環境變數中設置 `NEXT_PUBLIC_API_BASE`
3. 🚀 部署 Vercel 前端

參考：[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) 的步驟 4

---

## 🔗 有用連結

- **Railway Dashboard**: https://railway.app/dashboard
- **Railway 文件**: https://docs.railway.app
- **GitHub 倉庫**: https://github.com/Leowang1223/talk-learning-english-version
- **Supabase Dashboard**: https://supabase.com/dashboard/project/tryfblgkwvtmyvkubqmm
