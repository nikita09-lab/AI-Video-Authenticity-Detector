<<<<<<< HEAD
# AI-Video-Authenticity-Detector
=======
# AI Video Authenticity Detector

> Detect whether a video is AI-generated or real using advanced visual forensics.

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.9+
- FFmpeg installed and in PATH ([download here](https://ffmpeg.org/download.html))
- (Optional) Redis for job queuing

### 1. Start the AI Service
```powershell
# PowerShell (Windows)
cd ai-service
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

### 2. Start the Backend (new terminal)
```powershell
# PowerShell (Windows)
cd backend
npm install
npm run dev
```

### 3. Start the Frontend (new terminal)
```powershell
# PowerShell (Windows)
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

> **Note:** PowerShell does NOT support `&&` to chain commands. Use separate lines or `;` instead.
> Example: `cd ai-service; python -m uvicorn app.main:app --reload --port 8000`

## Architecture
```
Frontend (React + Vite + Tailwind)  :5173
    ↓ API calls (proxied by Vite)
Backend (Fastify + BullMQ)          :3001
    ↓ HTTP
AI Service (FastAPI + OpenRouter)   :8000
```

## Tech Stack
| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS v4 |
| Backend | Node.js, Fastify 5, BullMQ |
| AI Service | Python, FastAPI, OpenRouter API |
| Queue | Redis + BullMQ (optional for MVP) |

## Environment Variables

### Backend (`backend/.env`)
| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | API server port |
| `AI_SERVICE_URL` | `http://127.0.0.1:8000` | AI microservice URL |
| `REDIS_HOST` | `127.0.0.1` | Redis host (optional) |

### AI Service (`ai-service/.env`)
| Variable | Default | Description |
|---|---|---|
| `OPENROUTER_API_KEY` | *(required)* | Your OpenRouter API key |
| `OPENROUTER_MODEL` | `google/gemini-2.0-flash-001` | Vision model to use |
| `PORT` | `8000` | AI service port |
>>>>>>> fa46da8 (inital commit)
