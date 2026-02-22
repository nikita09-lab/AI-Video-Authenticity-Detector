import { useState } from 'react';
import { Link2, ArrowRight } from 'lucide-react';

export default function UrlInput({ onSubmit, disabled }) {
    const [url, setUrl] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        if (!url.trim()) {
            setError('Please enter a video URL.');
            return;
        }

        try {
            new URL(url);
        } catch {
            setError('Please enter a valid URL (e.g., https://youtube.com/watch?v=...).');
            return;
        }

        onSubmit(url.trim());
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30">
                    <Link2 className="w-5 h-5" />
                </div>
                <input
                    type="url"
                    value={url}
                    onChange={(e) => { setUrl(e.target.value); setError(''); }}
                    placeholder="Paste a YouTube, Instagram, TikTok, or direct video URL"
                    className="input-glass pl-12 pr-4"
                    disabled={disabled}
                    id="url-input"
                />
            </div>

            {error && (
                <p className="text-red-400 text-sm pl-1 fade-in">{error}</p>
            )}

            <button
                type="submit"
                className="btn-primary w-full flex items-center justify-center gap-2"
                disabled={disabled || !url.trim()}
                id="analyze-url-btn"
            >
                <span className="flex items-center gap-2">
                    Analyze URL <ArrowRight className="w-4 h-4" />
                </span>
            </button>

            <div className="flex items-center justify-center gap-3 text-white/25 text-xs">
                <span>Supports:</span>
                <span className="px-2 py-0.5 rounded bg-white/[0.04] text-white/40">YouTube</span>
                <span className="px-2 py-0.5 rounded bg-white/[0.04] text-white/40">Instagram</span>
                <span className="px-2 py-0.5 rounded bg-white/[0.04] text-white/40">TikTok</span>
                <span className="px-2 py-0.5 rounded bg-white/[0.04] text-white/40">Twitter/X</span>
                <span className="px-2 py-0.5 rounded bg-white/[0.04] text-white/40">Direct links</span>
            </div>
        </form>
    );
}
