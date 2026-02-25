#!/bin/bash
# ─────────────────────────────────────────────────────────────
# VidAuth — Single-container startup script
# Launches Python AI service (internal :8001) + Node backend (:PORT)
# ─────────────────────────────────────────────────────────────
set -e

echo "=== VidAuth Starting ==="
echo "Node: $(node --version)"
echo "Python: $(python3 --version)"
echo "FFmpeg: $(ffmpeg -version 2>&1 | head -1)"
echo "yt-dlp: $(yt-dlp --version 2>&1 | head -1)"

# Create temp directories
mkdir -p /tmp/vidauth/uploads /tmp/vidauth/downloads /tmp/vidauth/frames

# ── 1. Start Python AI service on internal port 8001 ──
echo "Starting AI service on :8001..."
cd /app/ai-service
python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --workers 1 &
AI_PID=$!
echo "AI service PID: $AI_PID"

# Wait for AI service to be ready (up to 30s)
echo "Waiting for AI service..."
for i in $(seq 1 30); do
    if curl -sf http://127.0.0.1:8001/health > /dev/null 2>&1; then
        echo "AI service is ready!"
        break
    fi
    sleep 1
done

# ── 2. Start Node.js backend (serves API + static frontend) ──
echo "Starting Node.js backend on :${PORT:-3001}..."
cd /app/backend
exec node src/server.js
