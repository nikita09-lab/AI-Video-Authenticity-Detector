import { useMemo } from 'react';

/**
 * Animated circular gauge showing confidence as a ring.
 */
export default function ConfidenceGauge({ confidence, verdict }) {
    const percentage = Math.round(confidence * 100);

    const { color, bgColor, label } = useMemo(() => {
        if (verdict === 'AI_GENERATED') {
            return {
                color: '#ef4444',  // red
                bgColor: 'rgba(239, 68, 68, 0.1)',
                label: 'AI Generated',
            };
        }
        if (verdict === 'REAL') {
            return {
                color: '#10b981',  // green
                bgColor: 'rgba(16, 185, 129, 0.1)',
                label: 'Authentic',
            };
        }
        return {
            color: '#f59e0b',  // yellow
            bgColor: 'rgba(245, 158, 11, 0.1)',
            label: 'Inconclusive',
        };
    }, [verdict]);

    // SVG arc calculation
    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div className="flex flex-col items-center" id="confidence-gauge">
            <div className="relative w-52 h-52">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
                    {/* Background ring */}
                    <circle
                        cx="100" cy="100" r={radius}
                        fill="none"
                        stroke="rgba(255,255,255,0.05)"
                        strokeWidth="12"
                    />
                    {/* Progress ring */}
                    <circle
                        cx="100" cy="100" r={radius}
                        fill="none"
                        stroke={color}
                        strokeWidth="12"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        className="gauge-ring"
                        style={{ filter: `drop-shadow(0 0 8px ${color}50)` }}
                    />
                </svg>

                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span
                        className="text-4xl font-bold font-mono"
                        style={{ color }}
                    >
                        {percentage}%
                    </span>
                    <span className="text-white/40 text-sm mt-1">confidence</span>
                </div>
            </div>

            {/* Verdict label */}
            <div
                className="mt-4 px-6 py-2 rounded-full text-sm font-semibold"
                style={{ background: bgColor, color, border: `1px solid ${color}30` }}
            >
                {label}
            </div>
        </div>
    );
}
