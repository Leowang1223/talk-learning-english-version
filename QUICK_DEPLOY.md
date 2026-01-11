# 🚀 快速部署指南

**预计时间：10-15 分钟**

---

## ✅ 前置检查

在开始之前，请确保您有：
- ✅ GitHub 账号（已有）
- ✅ 已将代码推送到 GitHub（已完成）
- 📝 **准备好以下 API Keys**：

### 必要的 API Keys
从您的 `.env` 文件中找到这些值：

```bash
# Supabase（从 https://supabase.com/dashboard 获取）
SUPABASE_URL=https://xxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Gemini API（从 https://makersuite.google.com/app/apikey 获取）
GEMINI_API_KEY=AIzaSy...
```

---

## 🚂 步骤 1: 部署 Backend 到 Railway (5 分钟)

### 1. 登入 Railway
1. 打开 https://railway.app
2. 点击 **"Login with GitHub"**
3. 授权 Railway 访问您的 repositories

### 2. 创建新项目
1. 点击 **"New Project"**
2. 选择 **"Deploy from GitHub repo"**
3. 选择 **`Leowang1223/teach4`**（您的 Backend repo）
4. Railway 会自动开始部署

### 3. 配置环境变量
1. 点击您的服务（Service）
2. 进入 **"Variables"** 标签
3. 点击 **"RAW Editor"**
4. 粘贴以下内容（**替换为您的真实值**）：

```bash
SUPABASE_URL=https://您的专案ID.supabase.co
SUPABASE_SERVICE_ROLE_KEY=您的Service_Role_Key
GEMINI_API_KEY=您的Gemini_API_Key
PORT=8082
NODE_ENV=production
```

5. 点击 **"Update Variables"**
6. Railway 会自动重新部署

### 4. 获取 Backend URL
1. 进入 **"Settings"** 标签
2. 点击 **"Generate Domain"**
3. **复制生成的 URL**（例如：`https://teach4-production.up.railway.app`）
4. **保存此 URL**！下一步需要使用

### 5. 验证 Backend
在浏览器访问：`https://您的backend网址.up.railway.app/health`

应该看到：`{"status":"ok"}`

---

## ▲ 步骤 2: 部署 Frontend 到 Vercel (5 分钟)

### 1. 登入 Vercel
1. 打开 https://vercel.com
2. 点击 **"Sign Up"** → **"Continue with GitHub"**
3. 授权 Vercel 访问您的 repositories

### 2. 导入项目
1. 点击 **"Add New..."** → **"Project"**
2. 找到并选择 **`Leowang1223/fix-ui`**
3. 点击 **"Import"**

### 3. 配置项目设置

**Framework Preset:** Next.js（自动检测，不用改）

**Root Directory:**
- 点击 **"Edit"**
- 输入：`apps/web`
- 点击 **"Continue"**

### 4. 设置环境变量
在 **"Environment Variables"** 部分：

点击 **"Add"**，添加以下 3 个变量：

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_API_BASE` | `https://您的railway网址.up.railway.app` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://您的supabase专案ID.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `您的Supabase_Anon_Key` |

**⚠️ 重要：**
- 第一个变量使用您在步骤 1 获取的 Railway URL
- 不要有结尾的斜杠 `/`

### 5. 部署
1. 点击 **"Deploy"**
2. 等待 2-3 分钟
3. 部署完成后，点击 **"Visit"** 查看您的网站

---

## 🔧 步骤 3: 配置 Supabase Redirect (2 分钟)

### 更新 Supabase 设置
1. 前往 https://supabase.com/dashboard
2. 选择您的项目
3. 进入 **Authentication** → **URL Configuration**
4. 设置以下值：

**Site URL:**
```
https://您的vercel网址.vercel.app
```

**Redirect URLs**（点击 Add URL 添加以下两个）:
```
https://您的vercel网址.vercel.app/auth/callback
http://localhost:3000/auth/callback
```

5. 点击 **"Save"**

---

## ✅ 步骤 4: 测试部署 (3 分钟)

### 测试清单

访问您的 Vercel 网站：`https://您的网址.vercel.app`

- [ ] **首页加载正常**
- [ ] **点击 "Get Started" 或 "Login"**
- [ ] **测试注册功能**（输入邮箱和密码）
- [ ] **测试 Google OAuth 登入**
- [ ] **登入后能看到 Dashboard**
- [ ] **点击一个课程，能看到课程内容**
- [ ] **测试录音功能**（允许麦克风权限）

### 如果遇到问题

**Backend 连接失败：**
```bash
# 检查 Railway Logs
在 Railway Dashboard → Deployments → View Logs
确认没有错误
```

**Frontend 报错：**
```bash
# 检查 Vercel Logs
在 Vercel Dashboard → Deployments → 点击最新部署 → Function Logs
```

**Google OAuth 不工作：**
- 确认 Supabase Redirect URLs 已正确添加
- 检查 Google Cloud Console 的授权重定向 URI

---

## 🎉 完成！

您的应用已成功部署！

**您的网址：**
- 🌐 Frontend: `https://您的网址.vercel.app`
- 🔧 Backend: `https://您的backend.up.railway.app`

### 下一步

**自动部署已启用：**
- 每次 push 到 GitHub 都会自动部署
- Vercel 和 Railway 都会自动构建和部署

**监控：**
- Railway Dashboard: 查看 Backend 日志和性能
- Vercel Dashboard: 查看 Frontend 日志和分析

**成本：**
- Vercel: 免费（100GB 流量/月）
- Railway: $5 免费额度/月
- Supabase: 免费（500MB 数据库）

---

## 📞 需要帮助？

**常见错误检查：**

1. **500 Internal Server Error**
   - 检查 Railway 环境变量是否正确设置
   - 查看 Railway Logs

2. **API 连接超时**
   - 确认 `NEXT_PUBLIC_API_BASE` 设置正确
   - 确认 Railway 服务正在运行

3. **认证失败**
   - 确认 Supabase URL 和 Keys 正确
   - 检查 Supabase Redirect URLs

**查看详细指南：**
参考 [DEPLOYMENT.md](./DEPLOYMENT.md) 获取完整的部署文档和故障排除指南。
