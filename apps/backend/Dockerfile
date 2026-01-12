# ========================================
# Talk Learning Backend - Railway Deployment
# Optimized for Monorepo with Complete Debugging
# ========================================

# ========================================
# Stage 1: Builder
# ========================================
FROM node:20-alpine AS builder

# 安裝構建工具
RUN apk add --no-cache python3 make g++

# 設置工作目錄
WORKDIR /workspace

# 複製整個 monorepo
COPY . .

# 驗證複製成功
RUN echo "=== Workspace structure ===" && \
    ls -la && \
    echo "" && \
    echo "=== Verifying backend exists ===" && \
    test -d apps/backend && echo "✓ apps/backend exists" || (echo "✗ apps/backend missing!" && exit 1)

# 安裝根依賴
RUN echo "=== Installing root dependencies ===" && \
    npm install --legacy-peer-deps && \
    echo "✓ Root dependencies installed"

# 進入 backend 目錄
WORKDIR /workspace/apps/backend

# 驗證關鍵文件存在
RUN echo "=== Verifying backend files ===" && \
    test -f package.json && echo "✓ package.json exists" || exit 1 && \
    test -f tsconfig.json && echo "✓ tsconfig.json exists" || exit 1 && \
    test -d src && echo "✓ src/ directory exists" || exit 1 && \
    test -f src/server.ts && echo "✓ src/server.ts exists" || exit 1

# 顯示配置文件
RUN echo "" && \
    echo "=== tsconfig.json ===" && \
    cat tsconfig.json

# 安裝 backend 依賴
RUN echo "" && \
    echo "=== Installing backend dependencies ===" && \
    npm install --legacy-peer-deps && \
    echo "" && \
    echo "✓ Backend dependencies installed" && \
    echo "" && \
    echo "=== Verifying TypeScript ===" && \
    npx tsc --version

# 構建 TypeScript
RUN echo "" && \
    echo "=== Building TypeScript ===" && \
    npm run build && \
    echo "" && \
    echo "✓ TypeScript build completed"

# 驗證構建輸出
RUN echo "" && \
    echo "=== Verifying build output ===" && \
    test -d dist && echo "✓ dist/ directory created" || (echo "✗ dist/ directory missing!" && exit 1) && \
    test -f dist/server.js && echo "✓ dist/server.js exists" || (echo "✗ dist/server.js missing!" && exit 1) && \
    echo "" && \
    echo "=== Build artifacts ===" && \
    ls -lh dist/ && \
    echo "" && \
    echo "File count: $(find dist -type f | wc -l)" && \
    echo "Total size: $(du -sh dist/ | cut -f1)"

# ========================================
# Stage 2: Production
# ========================================
FROM node:20-alpine AS production

# 安裝運行時依賴
RUN apk add --no-cache wget

WORKDIR /app

# 複製 package files
COPY --from=builder /workspace/apps/backend/package*.json ./

# 安裝生產依賴（不包含 devDependencies）
RUN echo "=== Installing production dependencies ===" && \
    npm ci --only=production --legacy-peer-deps && \
    echo "✓ Production dependencies installed"

# 複製構建產物
COPY --from=builder /workspace/apps/backend/dist ./dist

# 複製課程數據
COPY --from=builder /workspace/apps/backend/src/plugins ./src/plugins

# 複製 shared 包（運行時可能需要）
COPY --from=builder /workspace/apps/shared ../shared

# 創建日誌目錄
RUN mkdir -p logs/sessions

# 最終驗證
RUN echo "=== Final verification ===" && \
    echo "Working directory: $(pwd)" && \
    echo "" && \
    test -f dist/server.js && echo "✓ dist/server.js exists" || (echo "✗ dist/server.js missing!" && exit 1) && \
    test -d node_modules && echo "✓ node_modules exists" || (echo "✗ node_modules missing!" && exit 1) && \
    test -d src/plugins && echo "✓ src/plugins exists" || (echo "✗ src/plugins missing!" && exit 1) && \
    echo "" && \
    echo "=== Final structure ===" && \
    ls -lh && \
    echo "" && \
    echo "=== dist/ contents ===" && \
    ls -lh dist/ | head -10 && \
    echo "" && \
    echo "✓ All verifications passed!"

# 設置環境變量
ENV NODE_ENV=production

# 暴露端口（Railway 會通過 PORT 環境變量注入實際端口）
EXPOSE 8082

# 健康檢查
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-8082}/health || exit 1

# 啟動應用
CMD ["node", "dist/server.js"]
