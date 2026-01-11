# ========================================
# Backend Dockerfile for Railway Deployment
# ========================================
# 使用 Node.js 20 Alpine 版本
FROM node:20-alpine AS builder

# 安裝必要的構建工具
RUN apk add --no-cache python3 make g++

# 設定工作目錄
WORKDIR /app

# 複製 root package.json 和 lock file
COPY package*.json ./

# 複製 shared 包
COPY apps/shared ./apps/shared

# 複製 backend 包
COPY apps/backend ./apps/backend

# 安裝所有依賴（包括 devDependencies，需要 TypeScript）
WORKDIR /app
RUN npm install

# 構建 shared 包（如果需要）
WORKDIR /app/apps/shared
RUN npm install || true

# 構建 backend
WORKDIR /app/apps/backend
RUN npm install
RUN npm run build

# 檢查構建結果
RUN ls -la dist/

# ========================================
# Production Stage
# ========================================
FROM node:20-alpine

WORKDIR /app/apps/backend

# 複製構建產物
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/package*.json ./
COPY --from=builder /app/apps/backend/node_modules ./node_modules

# 複製課程和場景數據
COPY --from=builder /app/apps/backend/src/plugins ./src/plugins

# 複製 shared 包（運行時依賴）
COPY --from=builder /app/apps/shared /app/apps/shared

# 創建必要的目錄
RUN mkdir -p logs/sessions

# 設置環境變量
ENV NODE_ENV=production

# 暴露端口（Railway 會使用 PORT 環境變量）
EXPOSE 8082

# 健康檢查
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-8082}/health || exit 1

# 啟動應用
CMD ["node", "dist/server.js"]
