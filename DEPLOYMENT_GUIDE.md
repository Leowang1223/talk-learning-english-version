# Talk Learning - 部署指南 (Production Deployment Guide)

## 📋 部署前檢查清單 (Pre-Deployment Checklist)

- [x] Node.js 版本已更新至 20.0.0+
- [x] 頁面標題已改為 "Talk Learning"
- [x] Supabase 認證已完成整合
- [x] Google OAuth 憑證已準備
- [ ] Supabase 資料庫表格建立
- [ ] Google OAuth 生產環境設定
- [ ] Vercel 前端部署
- [ ] Railway 後端部署
- [ ] 環境變數設定

---

## 🗄️ 步驟 1：Supabase 資料庫設定 (15 分鐘)

### 1.1 執行 SQL Schema

#### 選項 A：全新安裝（推薦）

如果這是第一次設定，或者你遇到 `relation "profiles" already exists` 錯誤：

1. 訪問 Supabase Dashboard：
   ```
   https://supabase.com/dashboard/project/tryfblgkwvtmyvkubqmm
   ```

2. 點擊左側選單 **SQL Editor**

3. 點擊 **New query** 按鈕

4. 複製 **`supabase_tables_clean_install.sql`** 檔案的完整內容並貼上

5. 點擊 **Run** 執行 SQL

   ⚠️ **警告**：這會刪除現有的 profiles、lesson_history、conversation_sessions、flashcard_decks 和 flashcards 表格及其所有資料！

#### 選項 B：檢查現有表格

如果你想先檢查資料庫中已有什麼表格：

1. 在 SQL Editor 中，複製 **`supabase_check_tables.sql`** 的內容並執行

2. 查看結果：
   - 如果看到所需的 5 個表格（profiles、lesson_history、conversation_sessions、flashcard_decks、flashcards）且結構正確，可以跳過 SQL 執行步驟
   - 如果表格不完整或結構不對，使用「選項 A」重新創建

### 1.2 驗證表格建立

在 SQL Editor 執行以下查詢：
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

**預期結果：** 應該看到 5 個表格
- `conversation_sessions`
- `flashcard_decks`
- `flashcards`
- `lesson_history`
- `profiles`

### 1.3 驗證 Row Level Security (RLS)

1. 前往 **Table Editor**
2. 點擊每個表格
3. 確認每個表格右上角有 🔒 鎖頭圖示（表示 RLS 已啟用）

---

## 🔐 步驟 2：Google OAuth 生產環境設定 (10 分鐘)

### 2.1 設定 Supabase Google Provider

1. 前往 Supabase Dashboard：
   ```
   https://supabase.com/dashboard/project/tryfblgkwvtmyvkubqmm/auth/providers
   ```

2. 找到 **Google** 提供商，點擊展開

3. 啟用 **Enable** 開關

4. 填入 Google OAuth 憑證（從你的 Google Cloud Console 取得）：
   - **Client ID**: `<你的 Google OAuth Client ID>.apps.googleusercontent.com`
   - **Client Secret**: `<你的 Google OAuth Client Secret>`

5. 複製顯示的 **Callback URL (Redirect URI)**：
   ```
   https://tryfblgkwvtmyvkubqmm.supabase.co/auth/v1/callback
   ```

6. 點擊 **Save**

### 2.2 設定 Google Cloud Console

1. 訪問 Google Cloud Console：
   ```
   https://console.cloud.google.com/apis/credentials
   ```

2. 找到你的 OAuth 2.0 客戶端 ID 並點擊編輯

3. 在 **已獲授權的重新導向 URI** 區塊，**新增** 以下 URI：
   ```
   https://tryfblgkwvtmyvkubqmm.supabase.co/auth/v1/callback
   https://<你的vercel域名>/auth/callback
   ```

   例如：`https://talk-learning.vercel.app/auth/callback`

4. 點擊 **儲存**

### 2.3 (可選) 開發環境：停用郵箱驗證

如果想讓用戶可以立即登入而不需驗證郵箱：

1. Supabase Dashboard → **Authentication** → **Providers** → **Email**
2. 關閉 **"Confirm email"** 開關
3. 點擊 **Save**

---

## 🚀 步驟 3：Railway 後端部署 (20 分鐘)

### 3.1 準備 Railway 專案

1. 訪問 [Railway.app](https://railway.app) 並登入

2. 點擊 **New Project**

3. 選擇 **Deploy from GitHub repo**

4. 授權 Railway 存取你的 GitHub 倉庫

5. 選擇你的專案倉庫

### 3.2 設定 Railway 服務

1. Railway 會自動偵測到 monorepo，點擊 **Add Service**

2. 在設定中指定 **Root Directory**：
   ```
   apps/backend
   ```

3. 設定 **Build Command**：
   ```bash
   npm install && npm run build
   ```

4. 設定 **Start Command**：
   ```bash
   npm start
   ```

5. 在 **Settings** 中設定 **Port**：
   ```
   PORT=8082
   ```

### 3.3 設定環境變數

在 Railway 專案的 **Variables** 標籤頁，新增以下環境變數：

```env
# Supabase Configuration
SUPABASE_URL=https://tryfblgkwvtmyvkubqmm.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyeWZibGdrd3Z0bXl2a3VicW1tIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODEwMzE2MCwiZXhwIjoyMDgzNjc5MTYwfQ.d89akfF1krL6N836vQ2TQZnUIeAjcPjFcVJ0IN_8JY0

# Gemini API Key
GEMINI_API_KEY=AIzaSyBCrcMX3-_J56nDk_ML_tV7D535tUhmyOE

# Server Configuration
PORT=8082
NODE_ENV=production
```

### 3.4 部署並取得後端 URL

1. 點擊 **Deploy** 開始部署

2. 等待部署完成（約 3-5 分鐘）

3. 在 **Settings** → **Networking** → **Public Networking** 中，點擊 **Generate Domain**

4. 複製生成的 URL，例如：
   ```
   https://talk-learning-backend-production.up.railway.app
   ```

5. **記下這個 URL**，後面 Vercel 部署會用到

### 3.5 驗證後端部署

訪問以下端點測試：
```
https://<你的railway域名>/health
```

**預期回應：**
```json
{
  "status": "ok",
  "timestamp": "2024-01-11T..."
}
```

---

## 🌐 步驟 4：Vercel 前端部署 (20 分鐘)

### 4.1 準備 Vercel 專案

1. 訪問 [Vercel.com](https://vercel.com) 並登入

2. 點擊 **Add New...** → **Project**

3. 選擇 **Import Git Repository**

4. 選擇你的專案倉庫

### 4.2 設定 Vercel 專案配置

在 Vercel 專案設定頁面：

1. **Framework Preset**: 選擇 **Next.js**

2. **Root Directory**: 設定為 `apps/web`
   - 點擊 **Edit** 按鈕
   - 輸入 `apps/web`
   - 點擊 **Continue**

3. **Build Command**: 保持預設（Vercel 會使用 vercel.json 設定）
   ```bash
   cd ../.. && npm run build:frontend
   ```

4. **Install Command**:
   ```bash
   npm install
   ```

5. **Output Directory**: `.next`

### 4.3 設定環境變數

在 Vercel 專案的 **Settings** → **Environment Variables**，新增以下變數：

```env
# Backend API URL (使用步驟 3.4 取得的 Railway URL)
NEXT_PUBLIC_API_BASE=https://<你的railway域名>

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://tryfblgkwvtmyvkubqmm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyeWZibGdrd3Z0bXl2a3VicW1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMDMxNjAsImV4cCI6MjA4MzY3OTE2MH0.rnU3scL8KK6tpyfZI41RxpFVtICenTddGQsKTaRzlA0
```

**重要提示：**
- `NEXT_PUBLIC_API_BASE` 必須設定為你在步驟 3.4 取得的 Railway 後端 URL
- 所有環境變數都要設定為 **Production**、**Preview** 和 **Development** 環境

### 4.4 部署前端

1. 點擊 **Deploy** 開始部署

2. 等待部署完成（約 5-8 分鐘）

3. 部署成功後，Vercel 會提供一個 URL，例如：
   ```
   https://talk-learning.vercel.app
   ```

4. 你也可以在 **Settings** → **Domains** 中設定自訂網域

### 4.5 更新 Google OAuth 重新導向 URI

回到 Google Cloud Console，新增 Vercel 生產環境的回調 URL：

1. 前往 [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials)

2. 編輯你的 OAuth 2.0 客戶端

3. 在 **已獲授權的重新導向 URI** 中新增：
   ```
   https://<你的vercel域名>/auth/callback
   ```
   例如：`https://talk-learning.vercel.app/auth/callback`

4. 點擊 **儲存**

---

## 🔧 步驟 5：Railway 後端 CORS 設定 (5 分鐘)

### 5.1 更新後端 CORS 設定

後端需要允許來自 Vercel 前端的請求。

在 Railway Variables 中新增或更新：

```env
ALLOWED_ORIGINS=https://<你的vercel域名>,https://<你的vercel域名的其他變體>
```

例如：
```env
ALLOWED_ORIGINS=https://talk-learning.vercel.app,https://talk-learning-*.vercel.app
```

### 5.2 重新部署後端

在 Railway 專案中點擊 **Redeploy** 以應用 CORS 設定變更。

---

## ✅ 步驟 6：部署後驗證測試 (20 分鐘)

### 6.1 基本功能測試

#### 測試 1：網站可訪問性
- [ ] 訪問 Vercel 前端 URL
- [ ] 頁面標題顯示 "Talk Learning"
- [ ] 無明顯錯誤訊息

#### 測試 2：註冊功能
- [ ] 前往 `/register`
- [ ] 使用新郵箱註冊（例如：test@example.com）
- [ ] 填寫姓名、郵箱、密碼
- [ ] 點擊註冊按鈕
- [ ] 成功重定向到 `/dashboard`
- [ ] 在 Supabase Dashboard → Authentication → Users 看到新用戶

#### 測試 3：登出 & 登入功能
- [ ] 點擊側邊欄 **Logout** 按鈕
- [ ] 成功重定向到 `/login`
- [ ] 輸入剛註冊的郵箱和密碼
- [ ] 成功登入並重定向到 `/dashboard`

#### 測試 4：Google OAuth 登入
- [ ] 登出後，前往 `/login`
- [ ] 點擊 **使用 Google 登入** 按鈕
- [ ] 重定向到 Google 同意頁面
- [ ] 授權後成功返回 `/dashboard`
- [ ] 在 Supabase Users 中看到新的 Google 用戶

#### 測試 5：密碼重設
- [ ] 前往 `/login`
- [ ] 點擊 **忘記密碼？**
- [ ] 輸入註冊的郵箱地址
- [ ] 收到密碼重設郵件
- [ ] 點擊郵件中的連結可以重設密碼

#### 測試 6：路由保護
- [ ] 打開無痕/隱私瀏覽視窗
- [ ] 嘗試訪問 `/dashboard`
- [ ] 應該立即重定向到 `/login?next=/dashboard`
- [ ] 登入後自動返回 `/dashboard`

#### 測試 7：後端 API 測試
- [ ] 登入後，打開瀏覽器 DevTools → Network 標籤
- [ ] 訪問 `/history` 或其他需要 API 的頁面
- [ ] 檢查 API 請求（例如 `/api/lessons`）
- [ ] 請求頭應包含 `Authorization: Bearer <token>`
- [ ] 回應狀態應為 200

#### 測試 8：資料隔離（RLS）
- [ ] 建立兩個不同的帳戶 (User A 和 User B)
- [ ] 以 User A 登入，完成一個課程
- [ ] 登出，以 User B 登入
- [ ] 查看歷史記錄頁面
- [ ] User B 應該看不到 User A 的課程歷史

### 6.2 效能檢查

#### 測試 9：頁面載入速度
- [ ] 使用 [PageSpeed Insights](https://pagespeed.web.dev/) 測試前端 URL
- [ ] Performance 分數應 > 70
- [ ] Accessibility 分數應 > 90

#### 測試 10：API 回應時間
- [ ] 使用 Postman 或 curl 測試後端 API：
  ```bash
  curl https://<你的railway域名>/health
  ```
- [ ] 回應時間應 < 500ms

### 6.3 安全性檢查

- [ ] Supabase Dashboard → Table Editor → 檢查所有表格都有 RLS 🔒 圖示
- [ ] 環境變數中不含任何硬編碼的密鑰（特別是 Service Role Key）
- [ ] `.env` 和 `.env.local` 檔案在 `.gitignore` 中
- [ ] 生產環境的 CORS 只允許 Vercel 域名

---

## 📝 環境變數總覽

### Vercel (前端) 環境變數

```env
NEXT_PUBLIC_API_BASE=https://<你的railway域名>
NEXT_PUBLIC_SUPABASE_URL=https://tryfblgkwvtmyvkubqmm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyeWZibGdrd3Z0bXl2a3VicW1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMDMxNjAsImV4cCI6MjA4MzY3OTE2MH0.rnU3scL8KK6tpyfZI41RxpFVtICenTddGQsKTaRzlA0
```

### Railway (後端) 環境變數

```env
SUPABASE_URL=https://tryfblgkwvtmyvkubqmm.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyeWZibGdrd3Z0bXl2a3VicW1tIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODEwMzE2MCwiZXhwIjoyMDgzNjc5MTYwfQ.d89akfF1krL6N836vQ2TQZnUIeAjcPjFcVJ0IN_8JY0
GEMINI_API_KEY=AIzaSyBCrcMX3-_J56nDk_ML_tV7D535tUhmyOE
PORT=8082
NODE_ENV=production
ALLOWED_ORIGINS=https://<你的vercel域名>,https://<你的vercel域名的其他變體>
```

---

## 🔗 重要連結

### Supabase
- **專案主頁**: https://supabase.com/dashboard/project/tryfblgkwvtmyvkubqmm
- **SQL Editor**: https://supabase.com/dashboard/project/tryfblgkwvtmyvkubqmm/sql
- **認證設定**: https://supabase.com/dashboard/project/tryfblgkwvtmyvkubqmm/auth/providers
- **表編輯器**: https://supabase.com/dashboard/project/tryfblgkwvtmyvkubqmm/editor
- **API 日誌**: https://supabase.com/dashboard/project/tryfblgkwvtmyvkubqmm/logs/api-logs

### Google Cloud
- **Credentials**: https://console.cloud.google.com/apis/credentials

### 部署平台
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Railway Dashboard**: https://railway.app/dashboard

---

## ❗ 常見問題排解

### 問題 1：無法取得 Session
**症狀：** Console 錯誤 `Failed to fetch session`

**解決方案：**
1. 檢查 Vercel 環境變數是否正確設定
2. 清除瀏覽器 Cookies 和 localStorage
3. 驗證 Supabase 專案未暫停
4. 重新部署 Vercel 專案

### 問題 2：Google OAuth 重新導向錯誤
**症狀：** Google 登入後顯示錯誤頁面或無限重定向

**解決方案：**
1. 確認 Google Cloud Console 中的重新導向 URI 包含：
   - `https://tryfblgkwvtmyvkubqmm.supabase.co/auth/v1/callback`
   - `https://<你的vercel域名>/auth/callback`
2. 檢查 Supabase Google 提供商已啟用並正確填寫 Client ID 和 Secret
3. 清除 Cookies 後重試

### 問題 3：後端 API 返回 401 Unauthorized
**症狀：** 前端 API 呼叫失敗，返回 401

**解決方案：**
1. 檢查 Railway 環境變數是否包含正確的 `SUPABASE_SERVICE_ROLE_KEY`
2. 驗證用戶已登入（檢查 DevTools → Application → Cookies）
3. 確認前端正確發送 `Authorization: Bearer <token>` header
4. 檢查 Railway 後端日誌

### 問題 4：CORS 錯誤
**症狀：** 瀏覽器 Console 顯示 CORS 策略錯誤

**解決方案：**
1. 確認 Railway 環境變數中有設定 `ALLOWED_ORIGINS`
2. 檢查 `ALLOWED_ORIGINS` 包含你的 Vercel 域名
3. 重新部署 Railway 後端

### 問題 5：資料表不存在
**症狀：** API 返回 `relation "profiles" does not exist`

**解決方案：**
1. 前往 Supabase SQL Editor
2. 重新執行 `supabase_tables.sql` 檔案
3. 驗證表格已建立（使用步驟 1.2 的查詢）

### 問題 6：Build 失敗
**症狀：** Vercel 或 Railway 部署時 Build 失敗

**解決方案：**
1. 檢查 Node.js 版本設定是否為 20.0.0+
2. 確認 Root Directory 設定正確（Vercel: `apps/web`, Railway: `apps/backend`）
3. 檢查 package.json 的 scripts 是否正確
4. 查看 Build Logs 找出具體錯誤訊息

---

## 🎯 部署後的下一步

### 效能優化
- [ ] 設定 CDN（Vercel 自動提供）
- [ ] 啟用 Gzip/Brotli 壓縮
- [ ] 最佳化圖片和媒體檔案

### 監控設定
- [ ] 設定 Vercel Analytics
- [ ] 設定 Railway 監控告警
- [ ] 設定 Supabase 日誌告警

### 安全性強化
- [ ] 生產環境啟用郵箱驗證
- [ ] 設定 Rate Limiting
- [ ] 定期檢查依賴套件更新

### 自訂網域
- [ ] 在 Vercel 設定自訂網域
- [ ] 更新 Google OAuth 重新導向 URI
- [ ] 更新 Railway CORS 設定

---

## 📞 支援資源

- **Next.js 文件**: https://nextjs.org/docs
- **Supabase 文件**: https://supabase.com/docs
- **Vercel 文件**: https://vercel.com/docs
- **Railway 文件**: https://docs.railway.app

---

**部署完成！🎉**

如果遇到任何問題，請參考上方的常見問題排解章節，或查看各平台的部署日誌以找出具體錯誤訊息。
