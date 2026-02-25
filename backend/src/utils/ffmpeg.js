import { spawn } from 'child_process';
import { mkdir, readdir, unlink } from 'fs/promises';
import { join, dirname } from 'path';
import config from '../config/index.js';
import logger from './logger.js';

/**
 * Get the path to ffprobe based on the configured ffmpeg path.
 * If ffmpegPath is an absolute path like C:\ffmpeg\bin\ffmpeg.exe,
 * ffprobe should be in the same directory.
 */
function getFFprobePath() {
    const ffmpegPath = config.processing.ffmpegPath;
    if (ffmpegPath.includes('/') || ffmpegPath.includes('\\')) {
        // Absolute path — derive ffprobe from same directory, cross-platform
        const dir = dirname(ffmpegPath);
        const ext = process.platform === 'win32' ? '.exe' : '';
        return join(dir, `ffprobe${ext}`);
    }
    // Simple command name (e.g. 'ffmpeg') — assume ffprobe is also in PATH
    return 'ffprobe';
}

/**
 * Extract frames from a video using FFmpeg subprocess.
 * Uses uniform 1fps sampling, capped at maxFrames.
 * Returns an array of frame file paths.
 */
export async function extractFrames(videoPath, outputDir, maxFrames = config.processing.maxFrames) {
    await mkdir(outputDir, { recursive: true });

    // Strategy: uniform 1fps sampling, capped at maxFrames
    const ffmpegArgs = [
        '-i', videoPath,
        '-vf', 'fps=1',
        '-frames:v', String(maxFrames),
        '-q:v', '2',            // high quality JPEG
        '-fps_mode', 'vfr',     // modern replacement for deprecated -vsync vfr
        join(outputDir, 'frame_%04d.jpg'),
    ];

    await runFFmpeg(ffmpegArgs);

    // Read the extracted frame file names
    const files = await readdir(outputDir);
    const framePaths = files
        .filter(f => f.startsWith('frame_') && f.endsWith('.jpg'))
        .sort()
        .map(f => join(outputDir, f));

    logger.info(`Extracted ${framePaths.length} frames from video`);
    return framePaths;
}

/**
 * Get video duration in seconds using FFprobe.
 */
export async function getVideoDuration(videoPath) {
    const ffprobePath = getFFprobePath();

    return new Promise((resolve, reject) => {
        const args = [
            '-v', 'error',
            '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1',
            videoPath,
        ];

        const proc = spawn(ffprobePath, args, { timeout: 30000 });
        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (data) => { stdout += data.toString(); });
        proc.stderr.on('data', (data) => { stderr += data.toString(); });

        proc.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`ffprobe failed (code ${code}): ${stderr}`));
            } else {
                const duration = parseFloat(stdout.trim());
                resolve(isNaN(duration) ? 0 : duration);
            }
        });

        proc.on('error', (err) => {
            reject(new Error(`ffprobe not found. Install FFmpeg: ${err.message}`));
        });
    });
}

/**
 * Run an FFmpeg command as a child process.
 * Provides clear error messages for common failure cases.
 */
function runFFmpeg(args) {
    return new Promise((resolve, reject) => {
        const proc = spawn(config.processing.ffmpegPath, args, { timeout: 120000 });
        let stderr = '';

        proc.stderr.on('data', (data) => { stderr += data.toString(); });

        proc.on('close', (code) => {
            if (code !== 0) {
                // Provide clear error messages for common issues
                if (stderr.includes('moov atom not found') || stderr.includes('Invalid data found')) {
                    reject(new Error('The downloaded file is not a valid video. The URL may point to an HTML page or a redirected download. Please use a direct video link (ending in .mp4, .webm, etc).'));
                } else if (stderr.includes('No such file or directory')) {
                    reject(new Error('Video file not found. It may have been deleted or the download failed.'));
                } else {
                    // Only show last 300 chars of stderr to avoid overwhelming error messages
                    const lastStderr = stderr.slice(-300).trim();
                    reject(new Error(`FFmpeg processing error: ${lastStderr}`));
                }
            } else {
                resolve();
            }
        });

        proc.on('error', (err) => {
            reject(new Error(`FFmpeg not found. Please install FFmpeg: ${err.message}`));
        });
    });
}

/**
 * Clean up frame files after processing.
 */
export async function cleanupFrames(outputDir) {
    try {
        const files = await readdir(outputDir);
        await Promise.all(files.map(f => unlink(join(outputDir, f))));
        logger.debug(`Cleaned up ${files.length} frame files`);
    } catch {
        logger.warn(`Failed to clean up frames in ${outputDir}`);
    }
}
