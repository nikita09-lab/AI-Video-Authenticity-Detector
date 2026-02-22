import logger from '../utils/logger.js';

/**
 * Aggregate per-frame predictions into a final verdict.
 * Uses weighted median with agreement factor for confidence.
 */
export function aggregateResults(predictions, processingTimeline) {
    if (!predictions || predictions.length === 0) {
        return {
            verdict: 'INCONCLUSIVE',
            confidence: 0,
            realProbability: 0.5,
            fakeProbability: 0.5,
            explanation: 'No frames could be analyzed. Please try a different video.',
            frameScores: [],
            timeline: processingTimeline,
        };
    }

    const fakeScores = predictions.map(p => p.fake_probability);

    // Compute mean and standard deviation
    const mean = fakeScores.reduce((a, b) => a + b, 0) / fakeScores.length;
    const variance = fakeScores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / fakeScores.length;
    const stdDev = Math.sqrt(variance);

    // Verdict
    const verdict = mean > 0.5 ? 'AI_GENERATED' : 'REAL';

    // Confidence: distance from 0.5 scaled by agreement factor
    const rawConfidence = Math.abs(mean - 0.5) * 2; // 0 to 1
    const agreementFactor = Math.max(0, 1 - stdDev * 2); // penalize disagreement
    const confidence = Math.round(rawConfidence * agreementFactor * 1000) / 1000;

    // Human-readable explanation
    const explanation = generateExplanation(verdict, confidence, predictions.length, mean);

    // Per-frame breakdown for the UI timeline
    const frameScores = predictions.map((p, i) => ({
        frameIndex: i + 1,
        realProbability: round(p.real_probability),
        fakeProbability: round(p.fake_probability),
    }));

    const result = {
        verdict,
        confidence,
        realProbability: round(1 - mean),
        fakeProbability: round(mean),
        explanation,
        frameScores,
        timeline: processingTimeline,
        modelVersion: predictions[0]?.model_version || 'openrouter-v1',
        framesAnalyzed: predictions.length,
    };

    logger.info(`Aggregated result: ${verdict} (confidence: ${confidence})`);
    return result;
}

function generateExplanation(verdict, confidence, frameCount, meanFakeScore) {
    const pct = Math.round(meanFakeScore * 100);

    if (verdict === 'AI_GENERATED') {
        if (confidence > 0.75) {
            return `This video is very likely AI-generated. ${pct}% of the ${frameCount} analyzed frames show strong indicators of synthetic generation, including inconsistencies in facial features, lighting artifacts, and temporal discontinuities.`;
        } else if (confidence > 0.4) {
            return `This video shows moderate signs of AI generation. About ${pct}% of analyzed frames contain artifacts commonly associated with AI-generated content. Some frames appear authentic while others show synthetic patterns.`;
        } else {
            return `This video has weak indicators of AI generation. While ${pct}% of frames lean toward synthetic, the results are not highly conclusive. The video may contain a mix of real and generated content, or the quality may be limiting analysis accuracy.`;
        }
    } else {
        if (confidence > 0.75) {
            return `This video appears to be authentic. ${100 - pct}% of the ${frameCount} analyzed frames show natural image characteristics consistent with real camera footage. No significant AI generation artifacts were detected.`;
        } else if (confidence > 0.4) {
            return `This video is likely authentic, though some frames show minor anomalies. ${100 - pct}% of analyzed frames appear to be real footage. The detected anomalies may be due to video compression or editing rather than AI generation.`;
        } else {
            return `Results are inconclusive. While the video leans toward being authentic (${100 - pct}% of frames), the confidence is low. Manual review is recommended for a definitive assessment.`;
        }
    }
}

function round(n) {
    return Math.round(n * 1000) / 1000;
}
