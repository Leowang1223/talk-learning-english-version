@echo off
echo ============================================================
echo 🎬 YouTube Shorts 影片下載器
echo 📚 Lesson 1 - Self Introduction (4 個影片)
echo ============================================================
echo.

REM 檢查 yt-dlp 是否已安裝
where yt-dlp >nul 2>&1
if %errorlevel% neq 0 (
    echo 📦 正在安裝 yt-dlp...
    pip install -U yt-dlp
    if %errorlevel% neq 0 (
        echo ❌ yt-dlp 安裝失敗
        echo 請手動執行: pip install -U yt-dlp
        pause
        exit /b 1
    )
    echo ✅ yt-dlp 安裝成功！
    echo.
)

REM 建立輸出目錄
set OUTPUT_DIR=apps\web\public\videos\lessons\L1
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"
echo 📁 輸出目錄: %OUTPUT_DIR%
echo.

REM 下載影片 1: 你好
echo ========================================
echo 📥 下載 1/4: step1.mp4 (你好)
echo ========================================
yt-dlp -f "best[ext=mp4]/best" --output "%OUTPUT_DIR%\step1.mp4" --no-playlist https://youtube.com/shorts/LaKpMsKzAlI
if %errorlevel% equ 0 (
    echo ✅ step1.mp4 下載成功！
) else (
    echo ❌ step1.mp4 下載失敗
)
echo.

REM 下載影片 2: 我是學生
echo ========================================
echo 📥 下載 2/4: step2.mp4 (我是學生)
echo ========================================
yt-dlp -f "best[ext=mp4]/best" --output "%OUTPUT_DIR%\step2.mp4" --no-playlist https://youtube.com/shorts/7l51ah8ktKc
if %errorlevel% equ 0 (
    echo ✅ step2.mp4 下載成功！
) else (
    echo ❌ step2.mp4 下載失敗
)
echo.

REM 下載影片 3: 造句練習
echo ========================================
echo 📥 下載 3/4: step3.mp4 (造句練習)
echo ========================================
yt-dlp -f "best[ext=mp4]/best" --output "%OUTPUT_DIR%\step3.mp4" --no-playlist https://youtube.com/shorts/mpZIUhuH3Tc
if %errorlevel% equ 0 (
    echo ✅ step3.mp4 下載成功！
) else (
    echo ❌ step3.mp4 下載失敗
)
echo.

REM 下載影片 4: 綜合複習
echo ========================================
echo 📥 下載 4/4: step4.mp4 (綜合複習)
echo ========================================
yt-dlp -f "best[ext=mp4]/best" --output "%OUTPUT_DIR%\step4.mp4" --no-playlist https://youtube.com/shorts/5Fj8E7EhJxQ
if %errorlevel% equ 0 (
    echo ✅ step4.mp4 下載成功！
) else (
    echo ❌ step4.mp4 下載失敗
)
echo.

echo ============================================================
echo 📊 下載完成！
echo ============================================================
echo.
echo 📂 影片位置: %CD%\%OUTPUT_DIR%
echo.
echo 🎯 下一步:
echo    1. 檢查影片檔案
echo    2. 訪問: http://localhost:3000/lesson/L1
echo    3. 測試影片播放功能
echo.
pause
