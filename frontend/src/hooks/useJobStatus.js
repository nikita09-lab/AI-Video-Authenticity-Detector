import { useState, useEffect, useRef, useCallback } from 'react';
import { getJobStatus, getResult } from '../services/api';

/**
 * Hook to poll a job's status and auto-fetch results when complete.
 * @param {string|null} jobId - The job ID to track
 * @returns {{ status, progress, stage, result, error, isProcessing, isComplete }}
 */
export function useJobStatus(jobId) {
    const [status, setStatus] = useState(null);
    const [progress, setProgress] = useState(0);
    const [stage, setStage] = useState('');
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const intervalRef = useRef(null);

    const isProcessing = status === 'processing' || status === 'active' || status === 'waiting';
    const isComplete = status === 'completed';
    const isFailed = status === 'failed';

    const stopPolling = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (!jobId) return;

        // Reset state
        setStatus('processing');
        setProgress(0);
        setStage('starting');
        setResult(null);
        setError(null);

        const poll = async () => {
            try {
                const data = await getJobStatus(jobId);
                setStatus(data.status);
                setProgress(data.progress || 0);
                setStage(data.stage || '');

                if (data.status === 'completed') {
                    stopPolling();
                    // Fetch full result
                    try {
                        const resultData = await getResult(jobId);
                        setResult(resultData);
                    } catch {
                        setResult(data.result);
                    }
                } else if (data.status === 'failed') {
                    stopPolling();
                    setError(data.error || 'Job failed unexpectedly.');
                }
            } catch (err) {
                // Don't stop polling on transient errors
                console.warn('Polling error:', err.message);
            }
        };

        // First poll immediately
        poll();
        // Then poll every 2 seconds
        intervalRef.current = setInterval(poll, 2000);

        return stopPolling;
    }, [jobId, stopPolling]);

    return { status, progress, stage, result, error, isProcessing, isComplete, isFailed };
}
