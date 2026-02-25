# Backend — Dockerfile
# Uses Node 20 slim + ffmpeg + yt-dlp (Linux binaries, not .exe)

FROM node:20-slim

# Install ffmpeg and Python (for yt-dlp)
RUN apt-get update && \
    apt-get install -y ffmpeg python3 python3-pip --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Install yt-dlp via pip
RUN pip3 install yt-dlp --break-system-packages

WORKDIR /app

# Copy package files and install Node deps (production only)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source code
COPY src ./src

# Create temp directories
RUN mkdir -p tmp/uploads tmp/downloads tmp/frames

# Environment defaults (override via Render env vars)
ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0
ENV FFMPEG_PATH=ffmpeg
ENV YTDLP_PATH=yt-dlp

EXPOSE 3001

CMD ["node", "src/server.js"]
