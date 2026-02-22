import { useState } from 'react';
import { Shield, Upload, Link2, Sparkles, Github, Zap, Brain, Layers } from 'lucide-react';
import VideoUploader from './components/VideoUploader';
import UrlInput from './components/UrlInput';
import ProgressTracker from './components/ProgressTracker';
import ResultCard from './components/ResultCard';
import { useJobStatus } from './hooks/useJobStatus';
import { uploadVideo, analyzeUrl } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'url'
  const [jobId, setJobId] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { status, progress, stage, result, error: jobError, isProcessing, isComplete, isFailed } = useJobStatus(jobId);

  const handleUpload = async (file) => {
    setError(null);
    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      const data = await uploadVideo(file, setUploadProgress);
      setJobId(data.jobId);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Upload failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUrlSubmit = async (url) => {
    setError(null);
    setIsSubmitting(true);

    try {
      const data = await analyzeUrl(url);
      setJobId(data.jobId);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Analysis failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setJobId(null);
    setError(null);
    setUploadProgress(0);
    setIsSubmitting(false);
  };

  const showInput = !jobId;
  const showProgress = jobId && isProcessing;
  const showResult = jobId && isComplete && result;
  const showError = error || (jobId && isFailed);

  return (
    <div className="min-h-screen relative">
      {/* Background Orbs */}
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />
      <div className="bg-orb bg-orb-3" />

      {/* Navigation */}
      <nav className="relative z-10 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                VidAuth
              </h1>
              <p className="text-white/30 text-xs -mt-0.5">AI Video Detector</p>
            </div>
          </div>

          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/30 hover:text-white/60 transition-colors"
          >
            <Github className="w-5 h-5" />
          </a>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 max-w-3xl mx-auto px-6 py-12">
        {/* Hero */}
        {showInput && (
          <div className="text-center mb-12 fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs text-white/50 mb-6">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              Powered by AI Visual Forensics
            </div>
            <h2
              className="text-4xl md:text-5xl font-bold tracking-tight mb-4"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Is this video{' '}
              <span className="gradient-text">real</span>{' '}
              or{' '}
              <span className="gradient-text-warm">AI-generated</span>?
            </h2>
            <p className="text-white/40 text-lg max-w-lg mx-auto leading-relaxed">
              Upload a video or paste a link. Our AI analyzes individual frames for deepfake artifacts
              and returns a confidence-scored verdict in seconds.
            </p>
          </div>
        )}

        {/* Input Section */}
        {showInput && (
          <div className="fade-in-delay-1 fade-in">
            {/* Tab Switcher */}
            <div className="flex items-center gap-2 mb-6 p-1 rounded-2xl bg-white/[0.04] border border-white/[0.06] w-fit mx-auto">
              <button
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === 'upload'
                  ? 'bg-white/10 text-white shadow-lg'
                  : 'text-white/40 hover:text-white/60'
                  }`}
                onClick={() => setActiveTab('upload')}
                id="tab-upload"
              >
                <Upload className="w-4 h-4" /> Upload Video
              </button>
              <button
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === 'url'
                  ? 'bg-white/10 text-white shadow-lg'
                  : 'text-white/40 hover:text-white/60'
                  }`}
                onClick={() => setActiveTab('url')}
                id="tab-url"
              >
                <Link2 className="w-4 h-4" /> Paste URL
              </button>
            </div>

            {/* Upload or URL input */}
            <div className="glass p-6">
              {activeTab === 'upload' ? (
                <VideoUploader onUpload={handleUpload} disabled={isSubmitting} />
              ) : (
                <UrlInput onSubmit={handleUrlSubmit} disabled={isSubmitting} />
              )}
            </div>

            {/* Upload progress */}
            {isSubmitting && uploadProgress > 0 && activeTab === 'upload' && (
              <div className="mt-4 glass p-4 fade-in">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-white/50">Uploading...</span>
                  <span className="font-mono text-accent-cyan">{uploadProgress}%</span>
                </div>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm fade-in">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Processing State */}
        {showProgress && (
          <div className="mt-4">
            <div className="text-center mb-6 fade-in">
              <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
                Analyzing your video...
              </h2>
              <p className="text-white/40 text-sm mt-2">
                This usually takes 15-60 seconds depending on video length.
              </p>
            </div>
            <ProgressTracker progress={progress} stage={stage} error={jobError} />
          </div>
        )}

        {/* Error from job */}
        {showError && !showProgress && jobError && (
          <div className="mt-4 space-y-4 fade-in">
            <div className="p-6 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
              <p className="text-red-300 font-medium text-lg mb-2">Analysis Failed</p>
              <p className="text-red-400/70 text-sm">{jobError}</p>
            </div>
            <button className="btn-secondary w-full" onClick={handleReset}>
              ← Try Another Video
            </button>
          </div>
        )}

        {/* Result */}
        {showResult && (
          <div className="space-y-6">
            <ResultCard result={result} />
            <button
              className="btn-secondary w-full"
              onClick={handleReset}
              id="analyze-another-btn"
            >
              ← Analyze Another Video
            </button>
          </div>
        )}

        {/* Features Grid */}
        {showInput && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-16 fade-in-delay-2 fade-in">
            <FeatureCard
              icon={<Zap className="w-5 h-5 text-yellow-400" />}
              title="Fast Analysis"
              description="Smart frame sampling analyzes key moments, not every frame."
            />
            <FeatureCard
              icon={<Brain className="w-5 h-5 text-purple-400" />}
              title="AI-Powered"
              description="Advanced vision models detect deepfake artifacts invisible to the human eye."
            />
            <FeatureCard
              icon={<Layers className="w-5 h-5 text-cyan-400" />}
              title="Detailed Results"
              description="Per-frame breakdown with confidence scores and explanations."
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 mt-20">
        <div className="max-w-6xl mx-auto px-6 py-6 text-center text-white/20 text-sm">
          Built with ❤️ by Nikita • AI Video Authenticity Detector
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="glass glass-hover p-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-3">
        {icon}
      </div>
      <h3 className="text-white font-semibold text-sm mb-1">{title}</h3>
      <p className="text-white/30 text-xs leading-relaxed">{description}</p>
    </div>
  );
}
