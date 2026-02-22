/**
 * Horizontal bar chart of per-frame fake probability.
 * Visual timeline of how the AI scored each frame.
 */
export default function FrameTimeline({ frameScores }) {
    if (!frameScores || frameScores.length === 0) return null;

    const maxFake = Math.max(...frameScores.map(f => f.fakeProbability));

    return (
        <div id="frame-timeline">
            <h3 className="text-white/60 text-sm font-medium mb-3">
                Per-Frame Analysis ({frameScores.length} frames)
            </h3>

            <div className="flex items-end gap-1 h-24 px-1">
                {frameScores.map((frame, i) => {
                    const height = Math.max(frame.fakeProbability * 100, 4);
                    const isHighFake = frame.fakeProbability > 0.6;
                    const isMedium = frame.fakeProbability > 0.4 && frame.fakeProbability <= 0.6;

                    const bg = isHighFake
                        ? 'bg-red-500'
                        : isMedium
                            ? 'bg-yellow-500'
                            : 'bg-emerald-500';

                    return (
                        <div
                            key={i}
                            className={`frame-bar ${bg} flex-1`}
                            style={{
                                height: `${height}%`,
                                opacity: 0.4 + (frame.fakeProbability / maxFake) * 0.6,
                            }}
                            title={`Frame ${frame.frameIndex}: ${Math.round(frame.fakeProbability * 100)}% fake`}
                        />
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-between mt-3 text-xs text-white/30">
                <span>Frame 1</span>
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" /> Real
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-yellow-500" /> Uncertain
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-red-500" /> AI Generated
                    </span>
                </div>
                <span>Frame {frameScores.length}</span>
            </div>
        </div>
    );
}
