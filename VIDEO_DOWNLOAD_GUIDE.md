# 🎬 Lesson 1 影片下載指南

## 📋 需要下載的影片

| 檔案名 | 課程內容 | YouTube URL |
|--------|----------|-------------|
| `step1.mp4` | 你好 (Hello) | https://youtube.com/shorts/LaKpMsKzAlI |
| `step2.mp4` | 我是學生 (I am a student) | https://youtube.com/shorts/7l51ah8ktKc |
| `step3.mp4` | 造句練習 (Sentence practice) | https://youtube.com/shorts/mpZIUhuH3Tc |
| `step4.mp4` | 綜合複習 (Review) | https://youtube.com/shorts/5Fj8E7EhJxQ |

---

## 🚀 快速下載（推薦）

### 方法 1: 使用批次腳本（Windows）

```bash
# 直接雙擊執行
download_videos.bat
```

或在終端機執行：
```powershell
.\download_videos.bat
```

### 方法 2: 使用 Python 腳本

```bash
python download_videos.py
```

---

## 🛠️ 手動下載

如果自動下載失敗，可以手動下載：

### 步驟 1: 安裝 yt-dlp

```bash
pip install -U yt-dlp
```

### 步驟 2: 下載各個影片

```bash
# 下載到正確目錄
cd apps/web/public/videos/lessons/L1

# 下載影片 1
yt-dlp -f "best[ext=mp4]/best" -o step1.mp4 https://youtube.com/shorts/LaKpMsKzAlI

# 下載影片 2
yt-dlp -f "best[ext=mp4]/best" -o step2.mp4 https://youtube.com/shorts/7l51ah8ktKc

# 下載影片 3
yt-dlp -f "best[ext=mp4]/best" -o step3.mp4 https://youtube.com/shorts/mpZIUhuH3Tc

# 下載影片 4
yt-dlp -f "best[ext=mp4]/best" -o step4.mp4 https://youtube.com/shorts/5Fj8E7EhJxQ
```

---

## 🌐 線上下載（備用方案）

如果命令列工具無法使用，可以使用線上工具：

1. 訪問 https://yt1s.com/ 或 https://y2mate.com/
2. 貼上 YouTube URL
3. 選擇 MP4 格式下載
4. 重新命名為對應檔名
5. 移動到 `apps/web/public/videos/lessons/L1/` 目錄

---

## ✅ 驗證下載

下載完成後，檢查目錄結構：

```
apps/web/public/videos/lessons/L1/
├── step1.mp4  ✅
├── step2.mp4  ✅
├── step3.mp4  ✅
└── step4.mp4  ✅
```

檢查檔案大小（通常每個 5-20 MB）：
```powershell
dir apps\web\public\videos\lessons\L1\*.mp4
```

---

## 🧪 測試影片

1. 確保開發伺服器運行中：
```bash
npm run dev
```

2. 訪問課程頁面：
```
http://localhost:3000/lesson/L1
```

3. 檢查每個步驟的影片是否正常播放

---

## 🐛 常見問題

### Q1: yt-dlp 安裝失敗
```bash
# 使用 pip 升級
python -m pip install --upgrade pip
pip install -U yt-dlp
```

### Q2: 影片下載失敗
可能原因：
- 網路連線問題
- YouTube 影片被移除或設為私人
- 地區限制

解決方案：
- 使用 VPN
- 使用線上下載工具
- 尋找替代影片

### Q3: 影片無法播放
檢查：
- 檔案格式是否為 MP4
- 檔案路徑是否正確
- 瀏覽器控制台是否有錯誤訊息

### Q4: 影片有黑邊
已設定 `object-fit: cover`，應該不會有黑邊。
如果仍有問題，可能是影片原始長寬比問題。

---

## 📞 需要幫助？

如果下載遇到問題：
1. 檢查錯誤訊息
2. 確認網路連線
3. 嘗試備用下載方法
4. 使用任何其他 MP4 影片測試功能

---

**建立日期**: 2025-10-16
**影片來源**: YouTube Shorts
**目標格式**: MP4 (H.264)
