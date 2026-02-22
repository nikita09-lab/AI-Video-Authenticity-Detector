import { readFile } from 'fs/promises';
import config from '../config/index.js';
import logger from '../utils/logger.js';

/**
 * Send frames to the AI microservice for analysis.
 * Returns an array of per-frame predictions.
 */
export async function analyzeFrames(framePaths) {
    const predictions = [];

    // Send frames in batches of 4 to avoid overwhelming the AI service
    const batchSize = 4;
    for (let i = 0; i < framePaths.length; i += batchSize) {
        const batch = framePaths.slice(i, i + batchSize);

        const batchResults = await Promise.all(
            batch.map(async (framePath) => {
                try {
                    const imageBuffer = await readFile(framePath);
                    const base64Image = imageBuffer.toString('base64');

                    const response = await fetch(`${config.aiService.url}/predict`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            image: base64Image,
                            filename: framePath.split(/[/\\]/).pop(),
                        }),
                        signal: AbortSignal.timeout(config.aiService.timeout),
                    });

                    if (!response.ok) {
                        const errText = await response.text();
                        logger.warn(`AI service error for ${framePath}: ${errText}`);
                        return null;
                    }

                    return await response.json();
                } catch (err) {
                    logger.warn(`Failed to analyze frame ${framePath}: ${err.message}`);
                    return null;
                }
            })
        );

        predictions.push(...batchResults.filter(Boolean));
    }

    logger.info(`Got ${predictions.length}/${framePaths.length} frame predictions`);
    return predictions;
}
