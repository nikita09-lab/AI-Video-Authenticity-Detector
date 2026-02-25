# ─────────────────────────────────────────────────────────────
# VidAuth — Single Render Web Service
# All 3 services (Frontend static + Backend API + AI Service)
# run in ONE container on ONE Render free-tier web service.
#
# How it works:
#   • React frontend is built into static files
#   • Fastify (Node.js) serves static files + /api/* routes
#   • Python AI service runs as an internal subprocess on :8001
#   • Only one public port (PORT) is exposed
# ─────────────────────────────────────────────────────────────

FROM node:20-slim

# ── System dependencies ──
RUN apt-get update && apt-get install -y \
    python3 python3-pip ffmpeg curl \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Install yt-dlp (Python tool)
RUN pip3 install yt-dlp --break-system-packages

# ── Build React frontend ──
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .

# Build static files — VITE_API_BASE_URL is empty so /api/* goes to same server
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build

# ── Install Python AI Service deps ──
WORKDIR /app/ai-service
COPY ai-service/requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt --break-system-packages
COPY ai-service/ .

# ── Install Node.js Backend deps ──
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/ .

# Copy frontend build output into backend/public to be served by Fastify
RUN cp -r /app/frontend/dist /app/backend/public

# ── Copy startup script ──
WORKDIR /app
COPY start.sh .
RUN chmod +x start.sh

# ── Environment defaults (override in Render dashboard) ──
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV FFMPEG_PATH=ffmpeg
ENV YTDLP_PATH=yt-dlp
ENV TEMP_DIR=/tmp/vidauth
# AI service runs internally — do not change this
ENV AI_SERVICE_URL=http://127.0.0.1:8001
ENV MAX_FRAMES=10
ENV MAX_DURATION_SEC=120

EXPOSE 3001

CMD ["/app/start.sh"]
