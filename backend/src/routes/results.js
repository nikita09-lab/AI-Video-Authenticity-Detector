import { getQueue, isInMemoryMode, getInMemoryJobs } from '../queue/connection.js';

/**
 * Register /api/v1/results routes
 */
export default async function resultRoutes(fastify) {

    // GET /api/v1/results/:jobId — get analysis result
    fastify.get('/api/v1/results/:jobId', async (request, reply) => {
        const { jobId } = request.params;

        if (isInMemoryMode()) {
            const job = getInMemoryJobs().get(jobId);
            if (!job) {
                return reply.status(404).send({
                    error: { code: 'JOB_NOT_FOUND', message: `No job found with ID: ${jobId}` }
                });
            }

            if (job.status !== 'completed') {
                return reply.status(202).send({
                    jobId,
                    status: job.status,
                    message: 'Analysis is still in progress. Please check back shortly.',
                    progress: job.progress || 0,
                });
            }

            return reply.send({ jobId, ...job.result });
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

        if (state !== 'completed') {
            return reply.status(202).send({
                jobId,
                status: state,
                message: 'Analysis is still in progress. Please check back shortly.',
                progress: job.progress || 0,
            });
        }

        return reply.send({ jobId, ...job.returnvalue });
    });
}
