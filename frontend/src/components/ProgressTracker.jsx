import { CheckCircle2, Loader2, Clock, AlertCircle } from 'lucide-react';

const STAGES = [
    { key: 'starting', label: 'Initializing', icon: Clock },
    { key: 'downloading', label: 'Downloading Video', icon: Loader2 },
    { key: 'validating', label: 'Validating', icon: Loader2 },
    { key: 'extracting_frames', label: 'Extracting Frames', icon: Loader2 },
    { key: 'analyzing', label: 'AI Analysis', icon: Loader2 },
    { key: 'aggregating', label: 'Computing Results', icon: Loader2 },
    { key: 'complete', label: 'Complete', icon: CheckCircle2 },
];

export default function ProgressTracker({ progress, stage, error }) {
    const currentIndex = STAGES.findIndex(s => s.key === stage);

    return (
        <div className="glass p-8 fade-in" id="progress-tracker">
            {/* Progress bar */}
            <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-white/50">Processing</span>
                <span className="text-sm font-mono text-accent-cyan font-semibold">
                    {Math.round(progress)}%
                </span>
            </div>
            <div className="progress-bar-track mb-8">
                <div
                    className="progress-bar-fill"
                    style={{ width: `${Math.max(progress, 2)}%` }}
                />
            </div>

            {/* Stage timeline */}
            <div className="space-y-3">
                {STAGES.map((s, i) => {
                    const isActive = s.key === stage;
                    const isDone = i < currentIndex;
                    const isFuture = i > currentIndex;
                    const Icon = isDone ? CheckCircle2 : isActive ? Loader2 : s.icon;

                    return (
                        <div
                            key={s.key}
                            className={`flex items-center gap-3 transition-all duration-300 ${isActive ? 'text-white' : isDone ? 'text-accent-cyan' : 'text-white/20'
                                }`}
                        >
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${isDone ? 'bg-accent-cyan/20' : isActive ? 'bg-purple-500/20' : 'bg-white/5'
                                }`}>
                                <Icon className={`w-4 h-4 ${isActive ? 'animate-spin text-purple-400' : ''}`} />
                            </div>
                            <span className={`text-sm ${isActive ? 'font-medium' : ''}`}>
                                {s.label}
                            </span>
                            {isActive && (
                                <div className="pulse-dot bg-purple-400 ml-auto" />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Error state */}
            {error && (
                <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 fade-in">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-red-300 font-medium text-sm">Analysis Failed</p>
                        <p className="text-red-400/70 text-sm mt-1">{error}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
