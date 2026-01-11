@echo off
echo ========================================
echo   自動重啟開發服務器
echo ========================================
echo.

echo [1/4] 檢查並終止佔用端口的進程...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    echo   終止 PID: %%a (端口 3000^)
    taskkill /PID %%a /F >nul 2>&1
)

for /f "tokens=5" %%b in ('netstat -ano ^| findstr :8082 ^| findstr LISTENING') do (
    echo   終止 PID: %%b (端口 8082^)
    taskkill /PID %%b /F >nul 2>&1
)

timeout /t 2 /nobreak >nul

echo [2/4] 清除 Next.js 緩存...
if exist .next (
    rmdir /s /q .next
    echo   緩存已清除
) else (
    echo   無需清除緩存
)

echo [3/4] 清除 TypeScript 緩存...
if exist tsconfig.tsbuildinfo (
    del /q tsconfig.tsbuildinfo
)

echo [4/4] 啟動開發服務器...
echo.
echo ========================================
echo   服務器啟動中，請稍候...
echo ========================================
echo.

npm run dev
