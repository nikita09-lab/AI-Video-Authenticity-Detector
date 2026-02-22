import IORedis from 'ioredis';
import config from '../config/index.js';
import logger from '../utils/logger.js';

// In-memory fallback for when Redis is not available (MVP mode)
let queue = null;
let useInMemory = false;
const inMemoryJobs = new Map();

export function getQueue() {
    return queue;
}

export function isInMemoryMode() {
    return useInMemory;
}

export function getInMemoryJobs() {
    return inMemoryJobs;
}

export async function initQueue() {
    // First, test if Redis is reachable
    try {
        const testConn = new IORedis({
            ...config.redis,
            lazyConnect: true,
            connectTimeout: 3000,
            maxRetriesPerRequest: 1,
            retryStrategy: () => null,  // don't retry
        });

        testConn.on('error', () => { }); // suppress errors

        await testConn.connect();
        await testConn.ping();
        await testConn.quit();

        // Redis is available — import and create BullMQ queue
        const { Queue } = await import('bullmq');

        queue = new Queue(config.queue.name, {
            connection: config.redis,
            defaultJobOptions: {
                attempts: config.queue.attempts,
                backoff: { type: 'exponential', delay: config.queue.backoffDelay },
                removeOnComplete: { count: 100 },
                removeOnFail: { count: 50 },
            },
        });

        logger.info('✅ Connected to Redis queue');
        return queue;
    } catch (err) {
        logger.warn(`⚠️  Redis unavailable — using in-memory job processing (${err.message})`);
        logger.warn('   This is fine for development. Install Redis for production.');
        useInMemory = true;
        queue = null;
        return null;
    }
}
