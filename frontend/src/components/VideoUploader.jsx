import { useState, useRef } from 'react';
import { Upload, Film, X } from 'lucide-react';

export default function VideoUploader({ onUpload, disabled }) {
    const [dragOver, setDragOver] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const inputRef = useRef(null);

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('video/')) {
            selectFile(file);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) selectFile(file);
    };

    const selectFile = (file) => {
        setSelectedFile(file);
        // Create a thumbnail preview
        const url = URL.createObjectURL(file);
        setPreview(url);
    };

    const clearFile = () => {
        setSelectedFile(null);
        setPreview(null);
        if (inputRef.current) inputRef.current.value = '';
    };

    const handleSubmit = () => {
        if (selectedFile) onUpload(selectedFile);
    };

    return (
        <div className="space-y-4">
            {/* Dropzone */}
            <div
                className={`dropzone p-10 text-center cursor-pointer ${dragOver ? 'drag-over' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => !selectedFile && inputRef.current?.click()}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
                    className="hidden"
                    onChange={handleFileChange}
                    id="video-upload-input"
                />

                {selectedFile ? (
                    <div className="relative z-10 fade-in">
                        <div className="flex items-center justify-center gap-4 mb-4">
                            {preview ? (
                                <video
                                    src={preview}
                                    className="w-48 h-28 object-cover rounded-xl border border-white/10"
                                    muted
                                />
                            ) : (
                                <div className="w-48 h-28 rounded-xl bg-white/5 flex items-center justify-center">
                                    <Film className="w-10 h-10 text-white/30" />
                                </div>
                            )}
                        </div>
                        <p className="text-white font-medium text-lg">{selectedFile.name}</p>
                        <p className="text-white/40 text-sm mt-1">
                            {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                        </p>
                        <button
                            className="mt-3 text-white/40 hover:text-white/80 transition-colors inline-flex items-center gap-1 text-sm"
                            onClick={(e) => { e.stopPropagation(); clearFile(); }}
                        >
                            <X className="w-4 h-4" /> Remove
                        </button>
                    </div>
                ) : (
                    <div className="relative z-10">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center mx-auto mb-4">
                            <Upload className="w-8 h-8 text-purple-400" />
                        </div>
                        <p className="text-white/80 text-lg font-medium">
                            Drop your video here
                        </p>
                        <p className="text-white/30 text-sm mt-2">
                            or <span className="text-purple-400 hover:text-purple-300 underline underline-offset-2">browse files</span>
                        </p>
                        <p className="text-white/20 text-xs mt-3">
                            Supports MP4, WebM, MOV • Max 100 MB
                        </p>
                    </div>
                )}
            </div>

            {/* Analyze button */}
            {selectedFile && (
                <button
                    className="btn-primary w-full fade-in"
                    onClick={handleSubmit}
                    disabled={disabled}
                    id="analyze-upload-btn"
                >
                    <span>🔍 Analyze Video</span>
                </button>
            )}
        </div>
    );
}
