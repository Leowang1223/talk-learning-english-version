# 🎬 快速下載 Lesson 1 影片

## 🚀 三種下載方式（選一種即可）

### ⭐ 方法 1: PowerShell 腳本（推薦）

右鍵點擊 `download_videos.ps1` → **使用 PowerShell 執行**

或在 PowerShell 中執行：
```powershell
.\download_videos.ps1
```

如果遇到執行政策錯誤，先執行：
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

### ⭐ 方法 2: 批次檔（最簡單）

直接雙擊 `download_videos.bat` 檔案

---

### ⭐ 方法 3: Python 腳本

```bash
python download_videos.py
```

---

## 📥 影片清單

將下載以下 4 個影片到 `apps/web/public/videos/lessons/L1/`：

1. **step1.mp4** - 你好 (Hello)
2. **step2.mp4** - 我是學生 (I am a student)
3. **step3.mp4** - 造句練習
4. **step4.mp4** - 綜合複習

---

## ✅ 下載完成後

1. 檢查檔案：
```powershell
dir apps\web\public\videos\lessons\L1\
```

2. 測試播放：
   - 訪問 http://localhost:3000/lesson/L1
   - 檢查每個步驟的影片是否正常播放

---

## 📝 需要的工具

**yt-dlp** - YouTube 影片下載工具

腳本會自動安裝，如果失敗請手動執行：
```bash
pip install -U yt-dlp
```

---

**提示**: 如果自動下載失敗，可以手動下載後重新命名放入目錄
