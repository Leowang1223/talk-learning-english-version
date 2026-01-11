# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 專案概述

這是一個 **AI 驅動的中文學習與面試練習平台**，使用 Monorepo 架構，包含 Next.js 前端和 Express 後端。專案主要功能包括：

- 🎓 **中文語音課程系統**：逐步教學並評分發音
- 🎤 **語音轉文字與評分**：使用 Google Gemini API 進行 STT/TTS 和發音評分
- 📊 **學習進度追蹤**：課程回放、歷史記錄、詳細報告
- 🎯 **模擬面試系統**：完整的對話流程管理

## 常用指令

### 開發環境

```bash
# 同時啟動前後端
npm run dev

# 只啟動前端 (http://localhost:3000)
npm run dev:frontend

# 只啟動後端 (http://localhost:8082)
npm run dev:backend
```

### 建置與部署

```bash
# 建置整個專案
npm run build

# 建置個別應用
npm run build:backend
npm run build:frontend

# 啟動生產環境
npm start
```

### 其他指令

```bash
# Linting
npm run lint

# 測試
npm run test

# 清理建置檔案
npm run clean

# Docker Compose 啟動
docker-compose up -d
```

## 專案架構

### Monorepo 結構

```
apps/
├── backend/          # Express + TypeScript 後端
│   ├── src/
│   │   ├── server.ts           # 主入口
│   │   ├── routes/             # API 路由
│   │   ├── analysis-core/      # 評分與分析引擎
│   │   ├── service/            # 服務層 (語義分析)
│   │   ├── utils/              # 工具函數
│   │   └── plugins/            # 課程外掛系統
│   └── dist/                   # 編譯輸出
│
├── web/              # Next.js 14 前端
│   ├── app/
│   │   ├── (protected)/        # 需驗證的頁面
│   │   │   ├── dashboard/      # 主控台
│   │   │   ├── lesson/[id]/    # 課程頁面
│   │   │   ├── history/        # 歷史記錄與回放
│   │   │   ├── report/         # 成績報告
│   │   │   └── analysis/       # 分析報告
│   │   └── (public)/           # 公開頁面
│   ├── src/lib/                # 前端工具庫
│   │   ├── api.ts              # API 呼叫封裝
│   │   ├── ttsPlayer.ts        # TTS 播放器
│   │   ├── chunkSmoother.ts    # 音訊平滑處理
│   │   ├── strategies/         # 播放策略
│   │   └── media/              # 媒體管理
│   └── public/
│       └── videos/lessons/     # 課程影片資源
│
└── shared/           # 共用型別與工具
```

### 後端關鍵模組

#### API Routes (apps/backend/src/routes/)
- **lessons.ts**: 課程列表與單一課程資料 (`GET /api/lessons`, `GET /api/lessons/:id`)
- **score.ts**: 語音評分 API (`POST /api/score`)
  - 使用 Gemini API 進行語音辨識與發音評分
  - 備用方案：模擬評分（當沒有 API key 時）
- **analyze.ts**: 面試分析 API (`POST /v1/analyze`, `GET /v1/analyze/:sessionId`)
- **qa.ts**: 題庫與 TTS/STT 服務
- **sessions.ts**: 會話管理與歷史記錄

#### 評分引擎 (apps/backend/src/analysis-core/)
- **compute.ts**: 規則評分邏輯（發音準確度、流暢度、完整度、音調等）
- **aggregate.ts**: 分數彙整與統計
- **recommend.ts**: 學習建議生成
- **types.ts**: 分析相關的 TypeScript 型別定義

#### 外掛系統 (apps/backend/src/plugins/)
- **chinese-lessons/**: 課程定義 JSON 檔案
  - L1.json ~ L10.json: 十個中文課程
  - 每個課程包含多個 steps，每個 step 有：
    - `teacher`: 教師提示
    - `expected_answer`: 預期答案
    - `pinyin`: 拼音
    - `english_hint`: 英文提示
    - `encouragement`: 鼓勵語

### 前端關鍵模組

#### 頁面結構 (apps/web/app/)
- **(protected)/dashboard/**: 課程地圖與學習路徑
- **(protected)/lesson/[id]/**: 課程學習頁面
  - 逐步引導式學習
  - 即時語音評分與回饋
  - 支援影片播放與 TTS
- **(protected)/history/**: 學習歷史與回放功能
- **(protected)/report/**: 詳細學習報告（雷達圖、逐題分析、PDF 匯出）

#### 核心函式庫 (apps/web/src/lib/)
- **api.ts**: REST API 封裝
  - 支援 `localStorage.api_base` 覆寫 API 基礎網址
  - 主要端點：`/api/lessons`, `/api/score`, `/v1/analyze`
- **ttsPlayer.ts**: TTS 音訊播放器
  - 音訊解碼、重採樣
  - 佇列管理與邊界平滑
- **chunkSmoother.ts**: 音訊片段接合與平滑處理
- **media/MediaSessionProvider.tsx**: 統一媒體流管理
  - 管理 MediaStream、audio/video/speaker 狀態
- **strategies/**: 播放策略模式
  - TTSStrategy.ts: 文字轉語音播放
  - VideoStrategy.ts: 影片播放

## 關鍵技術決策

### 語音評分流程
1. 前端錄製音訊 (WebM 格式)
2. 透過 `POST /api/score` 上傳音訊與預期答案
3. 後端使用 Gemini 2.0 Flash 進行語音辨識與評分
4. 評分維度：
   - **pronunciation** (發音準確度)
   - **fluency** (流暢度)
   - **accuracy** (答案準確性)
   - **comprehension** (理解度)
   - **confidence** (信心度)
5. 回傳總分 (overall_score) 與各項分數及回饋

### 課程系統設計
- 課程資料以 JSON 格式儲存於 `apps/backend/src/plugins/chinese-lessons/`
- 每個課程包含多個 steps，支援：
  - 單一答案或多個答案 (array)
  - 拼音與英文提示
  - 鼓勵語與回饋
- 前端透過 `GET /api/lessons/:id` 載入課程資料
- 支援影片教學：影片檔案放在 `apps/web/public/videos/lessons/`

### API 整合
- 後端 API 預設執行於 port 8082
- 前端透過 `NEXT_PUBLIC_API_BASE` 環境變數或 `localStorage.api_base` 設定 API 位址
- 所有 API 回應包含錯誤碼 (`code`) 與訊息 (`message`)

### 環境變數
後端需要的環境變數 (apps/backend/.env):
```
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_API_KEY=your_google_api_key  # 備用
PORT=8082
NODE_ENV=development
```

## 開發注意事項

### 新增課程
1. 在 `apps/backend/src/plugins/chinese-lessons/` 新增 `LX.json` 檔案
2. 依照 L1.json 格式定義課程結構
3. （可選）準備對應的影片檔案並放入 `apps/web/public/videos/lessons/LX/`
4. 前端會自動從 API 載入新課程

### 修改評分邏輯
- 主要邏輯在 [apps/backend/src/routes/score.ts](apps/backend/src/routes/score.ts)
- Gemini prompt 定義評分標準（第 60-91 行）
- 模擬評分備用邏輯（第 138-170 行）

### 前端媒體處理
- 使用 `MediaSessionProvider` 統一管理 MediaStream
- 錄音使用 MediaRecorder API (WebM 格式)
- TTS 播放使用 Web Audio API 進行音訊處理
- 影片播放支援 MP4 格式

### Docker 部署
```bash
docker-compose up -d
```
- Backend: http://localhost:8081
- Frontend: http://localhost:3000
- 健康檢查端點: http://localhost:8081/health

## 常見問題索引

- **想改評分邏輯**: 請看 [apps/backend/src/routes/score.ts](apps/backend/src/routes/score.ts) 和 [apps/backend/src/analysis-core/compute.ts](apps/backend/src/analysis-core/compute.ts)
- **想加/換課程**: 新增 `apps/backend/src/plugins/chinese-lessons/<id>.json`，前端以 `/lesson/<id>` 存取
- **以 sessionId 直接出報告**: 前端造訪 `/analysis?sessionId=<id>` → 觸發 `GET /v1/analyze/:sessionId`
- **改 STT/TTS 供應商**: 替換 [apps/backend/src/geminiService.ts](apps/backend/src/geminiService.ts) 內部實作
- **影片無法播放**: 檢查 `apps/web/public/videos/lessons/` 目錄與檔案權限

## 技術棧

### 前端
- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- Chart.js (圖表)
- html2canvas + jsPDF (PDF 匯出)
- pinyin-pro (拼音處理)

### 後端
- Node.js >= 18
- Express
- TypeScript
- Google Generative AI (Gemini API)
- Multer (檔案上傳)

### 開發工具
- ts-node (TypeScript 執行)
- concurrently (並行執行)
- ESLint (程式碼檢查)
