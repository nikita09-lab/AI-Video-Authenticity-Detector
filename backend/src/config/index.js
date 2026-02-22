import 'dotenv/config';

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || '0.0.0.0',

  // Frontend URL for CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  // Redis
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    maxRetriesPerRequest: null,
  },

  // AI Microservice
  aiService: {
    url: process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000',
    timeout: parseInt(process.env.AI_SERVICE_TIMEOUT || '120000', 10),
  },

  // Upload limits
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || String(100 * 1024 * 1024), 10), // 100MB
    allowedMimeTypes: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'],
    tempDir: process.env.TEMP_DIR || './tmp',
  },

  // Processing
  processing: {
    maxFrames: parseInt(process.env.MAX_FRAMES || '30', 10),
    maxDurationSec: parseInt(process.env.MAX_DURATION_SEC || '300', 10), // 5 min
    ffmpegPath: process.env.FFMPEG_PATH || 'ffmpeg',
    ytdlpPath: process.env.YTDLP_PATH || 'yt-dlp',
  },

  // BullMQ
  queue: {
    name: 'video-analysis',
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '1', 10),
    attempts: 3,
    backoffDelay: 5000,
  },
};

export default config;
