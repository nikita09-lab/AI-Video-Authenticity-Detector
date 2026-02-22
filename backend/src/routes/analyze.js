import { mkdir, writeFile, stat } from 'fs/promises';
import { join } from 'path';
import { nanoid } from 'nanoid';
import config from '../config/index.js';
import { getQueue, isInMemoryMode, getInMemoryJobs } from '../queue/connection.js';
import { processVideoJob } from '../workers/videoProcessor.js';
import logger from '../utils/logger.js';

/**
 * Register /api/v1/analyze routes
 */
export default async function analyzeRoutes(fastify) {

    // POST /api/v1/analyze/upload — multipart file upload
    fastify.post('/api/v1/analyze/upload', async (request, reply) => {
        const data = await request.file();

        if (!data) {
            return reply.status(400).send({
                error: { code: 'NO_FILE', message: 'No file uploaded. Please attach a video file.' }
            });
        }

        // Validate mime type
        const mime = data.mimetype;
        if (!config.upload.allowedMimeTypes.includes(mime)) {
            return reply.status(400).send({
                error: {
                    code: 'INVALID_FORMAT',
                    message: `Unsupported format: ${mime}. Allowed: mp4, webm, mov, avi.`,
                }
            });
        }

        // Save file to temp directory
        const jobId = nanoid(12);
        const uploadDir = join(config.upload.tempDir, 'uploads');
        await mkdir(uploadDir, { recursive: true });

        const ext = data.filename.split('.').pop() || 'mp4';
        const filePath = join(uploadDir, `${jobId}.${ext}`);

        // Stream file to disk
        const chunks = [];
        for await (const chunk of data.file) {
            chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);

        // Check file size
        if (buffer.length > config.upload.maxFileSize) {
            return reply.status(400).send({
                error: {
                    code: 'FILE_TOO_LARGE',
                    message: `File size ${(buffer.length / 1024 / 1024).toFixed(1)}MB exceeds limit of ${(config.upload.maxFileSize / 1024 / 1024).toFixed(0)}MB.`,
                }
            });
        }

        await writeFile(filePath, buffer);
        logger.info(`Saved upload: ${filePath} (${(buffer.length / 1024 / 1024).toFixed(1)}MB)`);

        // Enqueue job
        const jobData = {
            jobId,
            sourceType: 'upload',
            filePath,
            originalName: data.filename,
            fileSize: buffer.length,
            createdAt: new Date().toISOString(),
        };

        if (isInMemoryMode()) {
            // In-memory processing (no Redis)
            getInMemoryJobs().set(jobId, { status: 'processing', progress: 0, data: jobData });
            // Process async without blocking response
            processVideoJob({
                data: jobData, id: jobId, updateProgress: (p) => {
                    const job = getInMemoryJobs().get(jobId);
                    if (job) job.progress = p;
                }
            }).catch(err => {
                logger.error(`Job ${jobId} failed: ${err.message}`);
                const job = getInMemoryJobs().get(jobId);
                if (job) { job.status = 'failed'; job.error = err.message; }
            });
        } else {
            await getQueue().add('analyze-video', jobData, { jobId });
        }

        return reply.status(202).send({
            jobId,
            status: 'processing',
            message: 'Video uploaded successfully. Processing has started.',
            statusUrl: `/api/v1/jobs/${jobId}`,
            resultUrl: `/api/v1/results/${jobId}`,
        });
    });

    // POST /api/v1/analyze/url — analyze from video URL
    fastify.post('/api/v1/analyze/url', {
        schema: {
            body: {
                type: 'object',
                required: ['url'],
                properties: {
                    url: { type: 'string', format: 'uri' },
                },
            },
        },
    }, async (request, reply) => {
        const { url } = request.body;
        const jobId = nanoid(12);

        const jobData = {
            jobId,
            sourceType: 'url',
            url,
            createdAt: new Date().toISOString(),
        };

        if (isInMemoryMode()) {
            getInMemoryJobs().set(jobId, { status: 'processing', progress: 0, data: jobData });
            processVideoJob({
                data: jobData, id: jobId, updateProgress: (p) => {
                    const job = getInMemoryJobs().get(jobId);
                    if (job) job.progress = p;
                }
            }).catch(err => {
                logger.error(`Job ${jobId} failed: ${err.message}`);
                const job = getInMemoryJobs().get(jobId);
                if (job) { job.status = 'failed'; job.error = err.message; }
            });
        } else {
            await getQueue().add('analyze-video', jobData, { jobId });
        }

        return reply.status(202).send({
            jobId,
            status: 'processing',
            message: 'URL received. Video download and analysis has started.',
            statusUrl: `/api/v1/jobs/${jobId}`,
            resultUrl: `/api/v1/results/${jobId}`,
        });
    });
}
