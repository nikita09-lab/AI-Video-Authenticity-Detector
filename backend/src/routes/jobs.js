import { getQueue, isInMemoryMode, getInMemoryJobs } from '../queue/connection.js';

/**
 * Register /api/v1/jobs routes
 */
export default async function jobRoutes(fastify) {

    // GET /api/v1/jobs/:jobId — poll job status
    fastify.get('/api/v1/jobs/:jobId', async (request, reply) => {
        const { jobId } = request.params;

        if (isInMemoryMode()) {
            const job = getInMemoryJobs().get(jobId);
            if (!job) {
                return reply.status(404).send({
                    error: { code: 'JOB_NOT_FOUND', message: `No job found with ID: ${jobId}` }
                });
            }

            return reply.send({
                jobId,
                status: job.status,
                progress: job.progress || 0,
                stage: job.stage || 'processing',
                result: job.result || null,
                error: job.error || null,
            });
        }

        // BullMQ mode
        const queue = getQueue();
        const job = await queue.getJob(jobId);

        if (!job) {
            return reply.status(404).send({
                error: { code: 'JOB_NOT_FOUND', message: `No job found with ID: ${jobId}` }
            });
        }

        const state = await job.getState();
        const progress = job.progress || 0;

        return reply.send({
            jobId,
            status: state,
            progress: typeof progress === 'object' ? progress.percent : progress,
            stage: typeof progress === 'object' ? progress.stage : 'processing',
            result: job.returnvalue || null,
            error: job.failedReason || null,
        });
    });
}
