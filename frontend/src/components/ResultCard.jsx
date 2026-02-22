import { Shield, Clock, Cpu, BarChart3, FileText } from 'lucide-react';
import ConfidenceGauge from './ConfidenceGauge';
import FrameTimeline from './FrameTimeline';

export default function ResultCard({ result }) {
    if (!result) return null;

    const {
        verdict,
        confidence,
        realProbability,
        fakeProbability,
        explanation,
        frameScores,
        timeline,
        framesAnalyzed,
        modelVersion,
    } = result;

    const verdictConfig = {
        AI_GENERATED: { pill: 'fake', icon: '🤖', text: 'AI Generated' },
        REAL: { pill: 'real', icon: '✅', text: 'Authentic Video' },
        INCONCLUSIVE: { pill: 'warn', icon: '⚠️', text: 'Inconclusive' },
    };

    const v = verdictConfig[verdict] || verdictConfig.INCONCLUSIVE;

    return (
        <div className="space-y-6 fade-in" id="result-card">
            {/* Header */}
            <div className="glass p-8">
                <div className="flex flex-col lg:flex-row items-center gap-8">
                    {/* Gauge */}
                    <ConfidenceGauge confidence={confidence} verdict={verdict} />

                    {/* Details */}
                    <div className="flex-1 text-center lg:text-left space-y-4">
                        <div>
                            <span className={`score-pill ${v.pill} text-base`}>
                                {v.icon} {v.text}
                            </span>
                        </div>

                        <p className="text-white/70 text-base leading-relaxed max-w-xl">
                            {explanation}
                        </p>

                        {/* Probability bars */}
                        <div className="space-y-3 mt-4">
                            <ProbBar label="Real" value={realProbability} color="#10b981" />
                            <ProbBar label="AI Generated" value={fakeProbability} color="#ef4444" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Frame Timeline */}
            {frameScores && frameScores.length > 0 && (
                <div className="glass p-6 fade-in-delay-1">
                    <FrameTimeline frameScores={frameScores} />
                </div>
            )}

            {/* Processing Info */}
            <div className="glass p-6 fade-in-delay-2">
                <h3 className="text-white/60 text-sm font-medium mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Processing Details
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <InfoBox
                        icon={<BarChart3 className="w-4 h-4" />}
                        label="Frames"
                        value={framesAnalyzed || frameScores?.length || '—'}
                    />
                    <InfoBox
                        icon={<Shield className="w-4 h-4" />}
                        label="Confidence"
                        value={`${Math.round(confidence * 100)}%`}
                    />
                    <InfoBox
                        icon={<Cpu className="w-4 h-4" />}
                        label="Model"
                        value={modelVersion?.split('-').pop() || 'v1'}
                    />
                    <InfoBox
                        icon={<Clock className="w-4 h-4" />}
                        label="Duration"
                        value={timeline?.durationSec ? `${Math.round(timeline.durationSec)}s` : '—'}
                    />
                </div>
            </div>
        </div>
    );
}

function ProbBar({ label, value, color }) {
    const pct = Math.round(value * 100);
    return (
        <div className="space-y-1">
            <div className="flex justify-between text-sm">
                <span className="text-white/50">{label}</span>
                <span className="font-mono font-semibold" style={{ color }}>
                    {pct}%
                </span>
            </div>
            <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${pct}%`, background: color }}
                />
            </div>
        </div>
    );
}

function InfoBox({ icon, label, value }) {
    return (
        <div className="bg-white/[0.03] rounded-xl p-4 text-center">
            <div className="text-white/30 flex justify-center mb-2">{icon}</div>
            <div className="text-white font-semibold text-lg">{value}</div>
            <div className="text-white/30 text-xs mt-1">{label}</div>
        </div>
    );
}
