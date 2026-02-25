# 🎬 VidAuth — AI Video Authenticity Detector

> Detect deepfakes and AI-generated videos using frame-level vision AI analysis.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

---

## 🚀 Architecture

```
Single Render Web Service (Free Tier)
┌─────────────────────────────────────────────────┐
│  Docker Container                               │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │  Node.js / Fastify  (public PORT)       │    │
│  │   • Serves React frontend (/)           │    │
│  │   • Serves API routes (/api/v1/*)       │    │
│  └─────────────────────────────────────────┘    │
│                     │ internal HTTP             │
│  ┌─────────────────────────────────────────┐    │
│  │  Python / FastAPI  (localhost:8001)     │    │
│  │   • AI frame analysis (OpenRouter)      │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  + ffmpeg (frame extraction) + yt-dlp (DL)     │
└─────────────────────────────────────────────────┘
```

---

## ☁️ Deploy to Render (1 Free Web Service)

### Step 1 — Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/AI-Video-Authenticity-Detector.git
git push -u origin main
```

### Step 2 — Create Web Service on Render

1. Go to [render.com](https://render.com) → **New** → **Web Service**
2. Connect your GitHub repo
3. Configure:

| Setting | Value |
|---|---|
| **Runtime** | **Docker** |
| **Dockerfile Path** | `Dockerfile` (root level) |
| **Docker Context** | `.` (repo root) |
| **Plan** | Free |

4. Add **Environment Variables** (only one required!):

| Key | Value |
|---|---|
| `OPENROUTER_API_KEY` | `sk-or-...` from [openrouter.ai](https://openrouter.ai) |

5. Click **Create Web Service** — Render builds and deploys everything automatically!

> ✅ That's it! One service, one URL, free tier. No Redis, no separate frontend hosting needed.

> ⚠️ **Free tier note:** Service sleeps after 15 min of inactivity. First request after sleep takes ~30s to wake up.

---

---

### Step 3 — Deploy Backend

1. Go to Render → **New** → **Web Service**
2. Connect your GitHub repo
3. Configure:
   | Setting | Value |
   |---|---|
   | **Root Directory** | `backend` |
   | **Runtime** | **Docker** |
   | **Dockerfile** | `backend/Dockerfile` |
   | **Plan** | Free |
4. Add **Environment Variables**:
   | Key | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `AI_SERVICE_URL` | URL from Step 2 (e.g. `https://vidauth-ai-service.onrender.com`) |
   | `CORS_ORIGIN` | Your frontend URL (fill in after Step 4, or use `*` temporarily) |
   | `FFMPEG_PATH` | `ffmpeg` |
   | `YTDLP_PATH` | `yt-dlp` |
   | `MAX_FRAMES` | `10` |
   | `TEMP_DIR` | `/tmp/vidauth` |
5. Click **Deploy** — copy the URL (e.g. `https://vidauth-backend.onrender.com`)

---

### Step 4 — Deploy Frontend

1. Go to Render → **New** → **Static Site**
2. Connect your GitHub repo
3. Configure:
   | Setting | Value |
   |---|---|
   | **Root Directory** | `frontend` |
   | **Build Command** | `npm install && npm run build` |
   | **Publish Directory** | `dist` |
4. Add **Environment Variables**:
   | Key | Value |
   |---|---|
   | `VITE_API_BASE_URL` | URL from Step 3 (e.g. `https://vidauth-backend.onrender.com`) |
5. Click **Deploy**

---

### Step 5 — Update CORS

Go back to your **Backend** service on Render:
- Update `CORS_ORIGIN` to your frontend URL (e.g. `https://vidauth-frontend.onrender.com`)
- Click **Manual Deploy** → **Deploy latest commit**

---

## 🖥️ Run Locally

### Prerequisites
- Node.js 20+, Python 3.11+
- FFmpeg installed (see below)
- OpenRouter API key

### Install FFmpeg (Windows)
```powershell
# Download standalone binary
Invoke-WebRequest -Uri "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip" -OutFile "$env:TEMP\ffmpeg.zip"
Expand-Archive "$env:TEMP\ffmpeg.zip" -DestinationPath "C:\ffmpeg"
# Then set FFMPEG_PATH=C:\ffmpeg\ffmpeg-master-latest-win64-gpl\bin\ffmpeg.exe in backend/.env
```

### Install FFmpeg (Mac/Linux)
```bash
# Mac
brew install ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg
```

### Start all services

```powershell
# Terminal 1 — AI Service
cd ai-service
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000

# Terminal 2 — Backend
cd backend
npm install
node src/server.js

# Terminal 3 — Frontend
cd frontend
npm install
npm run dev
```

Open → **http://localhost:5173**

---

## ⚙️ Environment Variables

### `backend/.env`
```env
PORT=3001
NODE_ENV=development
AI_SERVICE_URL=http://localhost:8000
CORS_ORIGIN=http://localhost:5173
FFMPEG_PATH=C:\ffmpeg\...\ffmpeg.exe   # Windows path
YTDLP_PATH=C:\ffmpeg\...\yt-dlp.exe   # Windows path
MAX_FRAMES=30
MAX_DURATION_SEC=300
TEMP_DIR=./tmp
```

### `ai-service/.env`
```env
OPENROUTER_API_KEY=sk-or-your-key-here
OPENROUTER_MODEL=google/gemini-2.0-flash-001
HOST=0.0.0.0
PORT=8000
```

### `frontend/.env`
```env
# Leave blank for local dev (Vite proxy handles it)
# Set to backend URL for production
VITE_API_BASE_URL=
```

---

## 📦 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, Tailwind CSS v4 |
| Backend | Node.js, Fastify, BullMQ |
| AI Service | Python, FastAPI, httpx |
| Video | FFmpeg (frame extraction), yt-dlp (platform downloads) |
| AI Model | OpenRouter → Gemini 2.0 Flash Vision |
| Deployment | Render (Docker + Static Site) |

---

## 🌐 Supported Platforms
- ✅ YouTube
- ✅ Instagram
- ✅ TikTok
- ✅ Twitter / X
- ✅ Facebook
- ✅ Reddit
- ✅ Vimeo
- ✅ Direct video links (.mp4, .webm, .mov)
