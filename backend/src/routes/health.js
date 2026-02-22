import config from '../config/index.js';

/**
 * Register /api/v1/health routes
 */
export default async function healthRoutes(fastify) {

    fastify.get('/api/v1/health', async (request, reply) => {
        // Check AI service health
        let aiServiceStatus = 'unknown';
        try {
            const res = await fetch(`${config.aiService.url}/health`, {
                signal: AbortSignal.timeout(5000),
            });
            aiServiceStatus = res.ok ? 'healthy' : 'unhealthy';
        } catch {
            aiServiceStatus = 'unreachable';
        }

        const status = aiServiceStatus === 'healthy' ? 'healthy' : 'degraded';

        return reply.status(status === 'healthy' ? 200 : 503).send({
            status,
            timestamp: new Date().toISOString(),
            services: {
                api: 'healthy',
                aiService: aiServiceStatus,
            },
        });
    });
}
