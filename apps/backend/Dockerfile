# ========================================
# Backend Dockerfile for Railway Deployment
# Optimized for Monorepo Structure
# ========================================

FROM node:20-alpine AS builder

# 安裝必要的構建工具
RUN apk add --no-cache python3 make g++

WORKDIR /build

# 複製整個 monorepo
COPY . .

# 顯示複製的內容
RUN echo "=== Repository structure ===" && \
    ls -la && \
    echo "" && \
    echo "=== Apps directory ===" && \
    ls -la apps/ && \
    echo "" && \
    echo "=== Backend directory ===" && \
    ls -la apps/backend/ && \
    echo "" && \
    echo "=== Backend src directory ===" && \
    ls -la apps/backend/src/

# 安裝根目錄依賴
RUN echo "=== Installing root dependencies ===" && \
    npm install --legacy-peer-deps

# 切換到 backend 目錄
WORKDIR /build/apps/backend

# 顯示 package.json 內容
RUN echo "=== Backend package.json ===" && \
    cat package.json

# 顯示 tsconfig.json 內容
RUN echo "" && \
    echo "=== Backend tsconfig.json ===" && \
    cat tsconfig.json

# 安裝 backend 依賴
RUN echo "" && \
    echo "=== Installing backend dependencies ===" && \
    npm install --legacy-peer-deps && \
    echo "" && \
    echo "=== Checking node_modules ===" && \
    ls -la node_modules/ | head -20 && \
    echo "" && \
    echo "=== Checking TypeScript installation ===" && \
    npx tsc --version

# 清理舊的 dist 目錄（如果存在）
RUN rm -rf dist/

# 構建 TypeScript 代碼（詳細輸出）
RUN echo "" && \
    echo "=== Building TypeScript (詳細模式) ===" && \
    npm run build --verbose 2>&1 | tee build.log && \
    echo "" && \
    echo "=== Build command completed (exit code: $?) ===" && \
    echo "" && \
    echo "=== Checking current directory ===" && \
    pwd && \
    echo "" && \
    echo "=== Current directory contents ===" && \
    ls -la && \
    echo "" && \
    echo "=== Checking if dist directory exists ===" && \
    if [ -d "dist" ]; then \
        echo "✓ dist directory exists"; \
        echo "" && \
        echo "=== dist directory contents (full recursive) ==="; \
        ls -laR dist/ && \
        echo "" && \
        echo "=== Counting files in dist ==="; \
        find dist -type f | wc -l && \
        find dist -type f; \
    else \
        echo "✗ dist directory NOT found!"; \
        echo "" && \
        echo "=== Searching for compiled .js files ==="; \
        find . -name "*.js" -not -path "*/node_modules/*" -not -path "*/.npm/*" | head -20; \
        exit 1; \
    fi

# 驗證 server.js 存在
RUN echo "" && \
    echo "=== Verifying server.js ===" && \
    if [ -f "dist/server.js" ]; then \
        echo "✓ dist/server.js exists"; \
        echo "File size: $(wc -c < dist/server.js) bytes"; \
        echo "First 10 lines:"; \
        head -10 dist/server.js; \
    else \
        echo "✗ dist/server.js NOT found!"; \
        echo "=== Build log contents ==="; \
        cat build.log || echo "No build log found"; \
        echo "=== TypeScript compiler output ==="; \
        npx tsc --listFiles || echo "tsc failed"; \
        exit 1; \
    fi

# ========================================
# Production Stage
# ========================================
FROM node:20-alpine

WORKDIR /app

# 複製構建產物
COPY --from=builder /build/apps/backend/dist ./dist
COPY --from=builder /build/apps/backend/package*.json ./
COPY --from=builder /build/apps/backend/node_modules ./node_modules

# 複製課程和場景數據
COPY --from=builder /build/apps/backend/src/plugins ./src/plugins

# 複製 shared 包（如果運行時需要）
COPY --from=builder /build/apps/shared ../shared

# 創建必要的目錄
RUN mkdir -p logs/sessions

# 最終驗證
RUN echo "=== Final verification ===" && \
    echo "Current directory: $(pwd)" && \
    echo "" && \
    echo "Directory structure:" && \
    ls -laR && \
    echo "" && \
    echo "Verifying dist/server.js:" && \
    test -f dist/server.js && echo "✓ dist/server.js exists" || (echo "✗ dist/server.js missing!" && exit 1)

# 設置環境變量
ENV NODE_ENV=production

# 暴露端口
EXPOSE 8082

# 健康檢查
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-8082}/health || exit 1

# 啟動應用
CMD ["node", "dist/server.js"]
