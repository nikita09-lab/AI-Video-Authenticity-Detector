import axios from 'axios';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 120000,
});

/**
 * Upload a video file for analysis.
 * @param {File} file - The video file
 * @param {Function} onProgress - Upload progress callback (0-100)
 * @returns {Promise<{jobId, status, statusUrl, resultUrl}>}
 */
export async function uploadVideo(file, onProgress) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/analyze/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
            if (onProgress && e.total) {
                onProgress(Math.round((e.loaded / e.total) * 100));
            }
        },
    });

    return response.data;
}

/**
 * Submit a video URL for analysis.
 * @param {string} url - Video URL
 * @returns {Promise<{jobId, status, statusUrl, resultUrl}>}
 */
export async function analyzeUrl(url) {
    const response = await api.post('/analyze/url', { url });
    return response.data;
}

/**
 * Poll job status.
 * @param {string} jobId
 * @returns {Promise<{jobId, status, progress, stage, result, error}>}
 */
export async function getJobStatus(jobId) {
    const response = await api.get(`/jobs/${jobId}`);
    return response.data;
}

/**
 * Get analysis result.
 * @param {string} jobId
 * @returns {Promise<Object>}
 */
export async function getResult(jobId) {
    const response = await api.get(`/results/${jobId}`);
    return response.data;
}

/**
 * Check system health.
 * @returns {Promise<{status, services}>}
 */
export async function checkHealth() {
    const response = await api.get('/health');
    return response.data;
}
