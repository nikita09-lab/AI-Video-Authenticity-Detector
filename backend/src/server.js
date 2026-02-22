import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';

import config from './config/index.js';
import logger from './utils/logger.js';
import { initQueue } from './queue/connection.js';

import analyzeRoutes from './routes/analyze.js';
import jobRoutes from './routes/jobs.js';
import resultRoutes from './routes/results.js';
import healthRoutes from './routes/health.js';
import path from "path";

app.use(require("express").static(path.join(process.cwd(), "public")));

app.get("*", (req, res) => {
  res.sendFile(path.join(process.cwd(), "public/index.html"));
});
async function buildServer() {
    const fastify = Fastify({
        logger: false, // We use our own pino logger
        bodyLimit: 1024 * 1024, // 1MB for JSON bodies
    });

    // --- Plugins ---
    await fastify.register(cors, {
        origin: config.corsOrigin,
        methods: ['GET', 'POST'],
    });

    await fastify.register(multipart, {
        limits: {
            fileSize: config.upload.maxFileSize,
        },
    });

    await fastify.register(rateLimit, {
        max: 100,
        timeWindow: '1 minute',
    });

    // --- Global error handler ---
    fastify.setErrorHandler((error, request, reply) => {
        logger.error({ err: error, url: request.url }, 'Request error');

        if (error.validation) {
            return reply.status(400).send({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: error.message,
                    details: error.validation,
                },
            });
        }

        if (error.statusCode === 429) {
            return reply.status(429).send({
                error: {
                    code: 'RATE_LIMITED',
                    message: 'Too many requests. Please slow down.',
                },
            });
        }

        return reply.status(error.statusCode || 500).send({
            error: {
                code: 'INTERNAL_ERROR',
                message: config.env === 'production'
                    ? 'An unexpected error occurred.'
                    : error.message,
            },
        });
    });

    // --- Routes ---
    await fastify.register(analyzeRoutes);
    await fastify.register(jobRoutes);
    await fastify.register(resultRoutes);
    await fastify.register(healthRoutes);

    // Root route
    fastify.get('/', async () => ({
        name: 'AI Video Authenticity Detector API',
        version: '1.0.0',
        docs: '/api/v1/health',
    }));

    return fastify;
}

async function start() {
    try {
        // Initialize the job queue (falls back to in-memory if Redis unavailable)
        await initQueue();

        const server = await buildServer();

        await server.listen({ port: config.port, host: config.host });

        logger.info(`
╔══════════════════════════════════════════════════╗
║   🎬 AI Video Authenticity Detector API          ║
║──────────────────────────────────────────────────║
║   Server:    http://localhost:${config.port}               ║
║   Mode:      ${config.env.padEnd(35)}║
║   AI Service: ${config.aiService.url.padEnd(34)}║
╚══════════════════════════════════════════════════╝
    `);
    } catch (err) {
        logger.error(err, 'Failed to start server');
        process.exit(1);
    }
}

start();
