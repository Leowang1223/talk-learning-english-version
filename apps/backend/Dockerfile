# ========================================
# Backend Dockerfile for Railway Deployment
# Optimized for Monorepo Structure
# ========================================

FROM node:20-alpine AS builder

# 安裝必要的構建工具
RUN apk add --no-cache python3 make g++

WORKDIR /build

# 複製整個 monorepo（Railway 構建上下文是 repo 根目錄）
COPY . .

# 顯示複製的內容（調試用）
RUN echo "=== Repository structure ===" && \
    ls -la && \
    echo "=== Apps directory ===" && \
    ls -la apps/ && \
    echo "=== Backend directory ===" && \
    ls -la apps/backend/

# 安裝根目錄依賴
RUN npm install --legacy-peer-deps

# 切換到 backend 目錄
WORKDIR /build/apps/backend

# 安裝 backend 依賴
RUN echo "=== Installing backend dependencies ===" && \
    npm install --legacy-peer-deps

# 顯示 backend package.json 的 scripts
RUN echo "=== Package.json scripts ===" && \
    cat package.json | grep -A 5 '"scripts"'

# 構建 TypeScript 代碼
RUN echo "=== Building TypeScript ===" && \
    npm run build && \
    echo "=== Build completed ===" && \
    echo "=== Checking dist directory ===" && \
    ls -laR dist/

# 驗證 server.js 存在
RUN test -f dist/server.js || (echo "ERROR: dist/server.js not found!" && exit 1)

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

# 驗證文件結構
RUN echo "=== Final app structure ===" && \
    ls -laR && \
    echo "=== Verifying dist/server.js ===" && \
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
