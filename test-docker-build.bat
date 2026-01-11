@echo off
REM ========================================
REM 測試 Docker 構建腳本（用於本地測試）
REM ========================================

echo ========================================
echo 測試 Railway Backend Docker 構建
echo ========================================
echo.

REM 設置變數
set IMAGE_NAME=talk-learning-backend
set TAG=test

echo [1/3] 清理舊的測試映像...
docker rmi %IMAGE_NAME%:%TAG% 2>nul
echo.

echo [2/3] 構建 Docker 映像...
echo 這可能需要幾分鐘...
docker build -f apps/backend/Dockerfile -t %IMAGE_NAME%:%TAG% .

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Docker 構建失敗！
    echo 請查看上方的錯誤訊息。
    pause
    exit /b 1
)

echo.
echo ✅ Docker 映像構建成功！
echo.

echo [3/3] 測試運行容器...
echo 按 Ctrl+C 停止容器
echo.

REM 運行容器並映射端口
docker run --rm -it ^
    -p 8082:8082 ^
    -e PORT=8082 ^
    -e NODE_ENV=production ^
    -e SUPABASE_URL=https://tryfblgkwvtmyvkubqmm.supabase.co ^
    -e SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyeWZibGdrd3Z0bXl2a3VicW1tIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODEwMzE2MCwiZXhwIjoyMDgzNjc5MTYwfQ.d89akfF1krL6N836vQ2TQZnUIeAjcPjFcVJ0IN_8JY0 ^
    -e GEMINI_API_KEY=AIzaSyBCrcMX3-_J56nDk_ML_tV7D535tUhmyOE ^
    %IMAGE_NAME%:%TAG%

echo.
echo 容器已停止
pause
