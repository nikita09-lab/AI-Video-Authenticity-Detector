import { join } from 'path';
import { mkdir, unlink, stat } from 'fs/promises';
import { spawn } from 'child_process';
import { extractFrames, getVideoDuration, cleanupFrames } from '../utils/ffmpeg.js';
import { analyzeFrames } from '../services/aiService.js';
import { aggregateResults } from '../services/resultService.js';
import { isInMemoryMode, getInMemoryJobs } from '../queue/connection.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';

// Platform patterns that need yt-dlp to extract the actual video
const PLATFORM_PATTERNS = [
    /youtube\.com/i,
    /youtu\.be/i,
    /instagram\.com/i,
    /tiktok\.com/i,
    /twitter\.com/i,
    /x\.com/i,
    /facebook\.com/i,
    /fb\.watch/i,
    /reddit\.com/i,
    /v\.redd\.it/i,
    /vimeo\.com/i,
    /dailymotion\.com/i,
    /twitch\.tv/i,
    /streamable\.com/i,
    /clipchamp\.com/i,
    /loom\.com/i,
];

/**
 * Check if a URL belongs to a known platform that needs yt-dlp.
 */
function isPlatformUrl(url) {
    return PLATFORM_PATTERNS.some(pattern => pattern.test(url));
}

/**
 * Process a video analysis job.
 * This function is called by BullMQ worker or directly in in-memory mode.
 */
export async function processVideoJob(job) {
    const { jobId, sourceType, filePath, url } = job.data;
    const timeline = { startedAt: new Date().toISOString() };

    const updateProgress = async (percent, stage) => {
        if (job.updateProgress) {
            await job.updateProgress({ percent, stage });
        }
        if (isInMemoryMode()) {
            const memJob = getInMemoryJobs().get(jobId);
            if (memJob) {
                memJob.progress = percent;
                memJob.stage = stage;
            }
        }
    };

    try {
        logger.info(`Processing job ${jobId} (source: ${sourceType})`);
        await updateProgress(5, 'starting');

        // Step 1: Get the video file path
        let videoPath = filePath;

        if (sourceType === 'url') {
            await updateProgress(10, 'downloading');
            videoPath = await downloadVideo(url, jobId);
            timeline.downloadedAt = new Date().toISOString();
        }

        await updateProgress(20, 'validating');

        // Step 2: Get video duration
        let duration = 0;
        try {
            duration = await getVideoDuration(videoPath);
            logger.info(`Video duration: ${duration}s`);

            if (duration > config.processing.maxDurationSec) {
                throw new Error(`Video too long: ${Math.round(duration)}s (max: ${config.processing.maxDurationSec}s)`);
            }
        } catch (err) {
            // FFprobe might not be available — continue anyway
            logger.warn(`Could not get duration: ${err.message}`);
        }

        timeline.validatedAt = new Date().toISOString();
        await updateProgress(30, 'extracting_frames');

        // Step 3: Extract frames
        const framesDir = join(config.upload.tempDir, 'frames', jobId);
        await mkdir(framesDir, { recursive: true });

        const framePaths = await extractFrames(videoPath, framesDir);
        timeline.framesExtractedAt = new Date().toISOString();

        if (framePaths.length === 0) {
            throw new Error('No frames could be extracted from the video. The file may be corrupted.');
        }

        await updateProgress(50, 'analyzing');

        // Step 4: Send frames to AI service
        const predictions = await analyzeFrames(framePaths);
        timeline.analyzedAt = new Date().toISOString();

        if (predictions.length === 0) {
            throw new Error('AI service could not analyze any frames. Please ensure the AI service is running.');
        }

        await updateProgress(85, 'aggregating');

        // Step 5: Aggregate results
        timeline.completedAt = new Date().toISOString();
        timeline.durationSec = duration;
        timeline.framesExtracted = framePaths.length;

        const result = aggregateResults(predictions, timeline);

        // Step 6: Clean up
        await cleanupFrames(framesDir);
        if (sourceType === 'url' && videoPath) {
            try { await unlink(videoPath); } catch { /* ok */ }
        }

        await updateProgress(100, 'complete');

        // Store result in in-memory mode
        if (isInMemoryMode()) {
            const memJob = getInMemoryJobs().get(jobId);
            if (memJob) {
                memJob.status = 'completed';
                memJob.result = result;
            }
        }

        logger.info(`Job ${jobId} completed: ${result.verdict} (confidence: ${result.confidence})`);
        return result;

    } catch (err) {
        logger.error(`Job ${jobId} failed: ${err.message}`);

        if (isInMemoryMode()) {
            const memJob = getInMemoryJobs().get(jobId);
            if (memJob) {
                memJob.status = 'failed';
                memJob.error = err.message;
            }
        }

        throw err;
    }
}

/**
 * Download a video from a URL.
 *
 * Handles two categories:
 *   1. Platform URLs (YouTube, Instagram, TikTok, etc) → uses yt-dlp
 *   2. Direct video URLs (.mp4, .webm links)           → uses fetch
 */
async function downloadVideo(url, jobId) {
    // Detect if it's a platform URL that needs yt-dlp
    if (isPlatformUrl(url)) {
        logger.info(`Detected platform URL — using yt-dlp: ${url}`);
        return downloadWithYtDlp(url, jobId);
    }

    // Try direct download first
    logger.info(`Attempting direct download: ${url}`);
    return downloadDirect(url, jobId);
}

/**
 * Download a video from a platform (YouTube, Instagram, TikTok, etc) using yt-dlp.
 * yt-dlp handles all the platform-specific extraction, auth bypass, and format selection.
 */
async function downloadWithYtDlp(url, jobId) {
    const downloadDir = join(config.upload.tempDir, 'downloads');
    await mkdir(downloadDir, { recursive: true });

    const outputTemplate = join(downloadDir, `${jobId}.%(ext)s`);

    return new Promise((resolve, reject) => {
        // Use configured yt-dlp path (standalone .exe recommended)
        const ytdlpBin = config.processing.ytdlpPath || 'yt-dlp';
        const ffmpegDir = config.processing.ffmpegPath.replace(/[/\\]ffmpeg(\.exe)?$/i, '');

        const args = [
            url,
            '-o', outputTemplate,
            // Use a pre-merged format (no A+V merging needed) to keep filename predictable
            '-f', 'worst[ext=mp4]/worst[ext=webm]/worst/best[filesize<100M]/best',
            '--no-playlist',
            '--max-filesize', '100M',
            '--socket-timeout', '30',
            '--retries', '3',
            '--no-check-certificates',
            '--no-warnings',
            // Do NOT use --print or --quiet — they suppress the download itself
            '--ffmpeg-location', ffmpegDir,
        ];

        logger.info(`Running yt-dlp (${ytdlpBin}) for: ${url}`);

        const proc = spawn(ytdlpBin, args, {
            timeout: 180000,  // 3 minute timeout
        });

        let stderr = '';
        proc.stderr.on('data', (data) => { stderr += data.toString(); });
        // stdout is progress output — ignore it
        proc.stdout.on('data', () => { });

        proc.on('close', async (code) => {
            // Find the downloaded file by scanning the download dir
            const { readdir } = await import('fs/promises');
            let downloadedFiles;
            try { downloadedFiles = await readdir(downloadDir); } catch { downloadedFiles = []; }

            const match = downloadedFiles.find(f => f.startsWith(jobId));
            const fullPath = match ? join(downloadDir, match) : null;

            // yt-dlp can exit with code 1 due to Python 3.9 deprecation warnings
            // even when the download succeeded — so check file FIRST
            if (fullPath) {
                logger.info(`yt-dlp succeeded: ${fullPath}`);
                resolve(fullPath);
                return;
            }

            // File not found — it actually failed
            const errMsg = stderr.trim() || 'Unknown yt-dlp error';
            logger.error(`yt-dlp failed (code ${code}): ${errMsg}`);

            if (errMsg.includes('is not a valid URL') || errMsg.includes('Unsupported URL')) {
                reject(new Error('This URL is not supported. Please try YouTube, Instagram, TikTok, Twitter/X, or a direct .mp4 link.'));
            } else if (errMsg.includes('Private video') || errMsg.includes('Sign in') || errMsg.includes('login')) {
                reject(new Error('This video is private or requires login. Please use a publicly accessible video URL.'));
            } else if (errMsg.includes('Video unavailable') || errMsg.includes('removed')) {
                reject(new Error('This video is unavailable or has been removed.'));
            } else if (errMsg.includes('403') || errMsg.includes('Forbidden')) {
                reject(new Error('Access denied by the platform. This video may be restricted.'));
            } else if (errMsg.includes('429') || errMsg.includes('rate limit') || errMsg.includes('Too Many Requests')) {
                reject(new Error('Too many requests to this platform. Please try again in a few minutes.'));
            } else {
                reject(new Error(`Failed to download video: ${errMsg.slice(-300)}`));
            }
        });

        proc.on('error', (err) => {
            if (err.message.includes('ENOENT')) {
                reject(new Error(
                    `yt-dlp not found at: ${ytdlpBin}. Please check YTDLP_PATH in backend/.env`
                ));
            } else {
                reject(new Error(`yt-dlp error: ${err.message}`));
            }
        });
    });
}

/**
 * Direct download a video from a URL using fetch.
 * Used for direct video links (e.g., .mp4 files hosted on CDNs).
 * If the server returns HTML, falls back to yt-dlp automatically.
 */
async function downloadDirect(url, jobId) {
    const downloadDir = join(config.upload.tempDir, 'downloads');
    await mkdir(downloadDir, { recursive: true });

    // Determine file extension from URL or default to .mp4
    const urlObj = new URL(url);
    const pathExt = urlObj.pathname.split('.').pop()?.toLowerCase();
    const ext = ['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(pathExt) ? pathExt : 'mp4';
    const filePath = join(downloadDir, `${jobId}.${ext}`);

    const response = await fetch(url, {
        signal: AbortSignal.timeout(60000),
        headers: { 'User-Agent': 'VidAuth/1.0 VideoDownloader' },
        redirect: 'follow',
    });

    if (!response.ok) {
        throw new Error(`Failed to download video: HTTP ${response.status} ${response.statusText}`);
    }

    // Check content-type — if HTML, try yt-dlp as fallback
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html') || contentType.includes('application/json')) {
        logger.info('Direct download returned HTML — falling back to yt-dlp');
        return downloadWithYtDlp(url, jobId);
    }

    const { writeFile } = await import('fs/promises');
    const buffer = Buffer.from(await response.arrayBuffer());

    if (buffer.length < 1024) {
        // File too small — probably not a video, try yt-dlp
        logger.info('Direct download too small — falling back to yt-dlp');
        return downloadWithYtDlp(url, jobId);
    }

    if (buffer.length > config.upload.maxFileSize) {
        throw new Error(`Downloaded video too large: ${(buffer.length / 1024 / 1024).toFixed(1)}MB`);
    }

    // Validate the file looks like a video by checking magic bytes
    const magicHex = buffer.slice(0, 12).toString('hex');
    const isMP4 = magicHex.includes('66747970');
    const isWebM = magicHex.startsWith('1a45dfa3');
    const isAVI = magicHex.startsWith('52494646');
    const isRealVideo = isMP4 || isWebM || isAVI || contentType.includes('video/');

    if (!isRealVideo) {
        // Not a video — try yt-dlp as last resort
        logger.info('Direct download is not a valid video — falling back to yt-dlp');
        return downloadWithYtDlp(url, jobId);
    }

    await writeFile(filePath, buffer);
    logger.info(`Downloaded video: ${filePath} (${(buffer.length / 1024 / 1024).toFixed(1)}MB)`);

    return filePath;
}

