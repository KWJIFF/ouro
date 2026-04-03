'use client';
import { useState, useRef, useCallback } from 'react';
import { Mic, MicOff, Camera, Video, Pencil, Paperclip, Send, Loader2, X, Image } from 'lucide-react';
import { submitSignal, submitSignalBlob } from '@/lib/api-client';
import { useSignalStore } from '@/stores/signal-store';
import { useVoiceRecorder } from '@/hooks/useMediaCapture';
import dynamic from 'next/dynamic';

const SketchPad = dynamic(() => import('./SketchPad'), { ssr: false });

interface Props { onResult?: (result: any) => void; }

export default function SignalComposer({ onResult }: Props) {
  const [text, setText] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [showSketch, setShowSketch] = useState(false);
  const { isProcessing, setProcessing, addSignal, setCurrentExecution } = useSignalStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isRecording, audioBlob, startRecording, stopRecording, clearRecording } = useVoiceRecorder();

  const handleSubmit = useCallback(async () => {
    if (isProcessing) return;
    if (!text.trim() && attachedFiles.length === 0 && !audioBlob) return;
    setProcessing(true);

    try {
      let result;
      if (audioBlob && !text.trim()) {
        // Voice-only signal
        result = await submitSignalBlob('', audioBlob, 'recording.webm');
        clearRecording();
      } else if (attachedFiles.length > 0) {
        result = await submitSignal(text.trim(), attachedFiles);
        setAttachedFiles([]);
      } else {
        result = await submitSignal(text.trim());
      }

      addSignal({ text: text.trim() || '[voice/media signal]', ...result });
      setCurrentExecution(result);
      setText('');
      onResult?.(result);
    } catch (error) {
      console.error('Signal failed:', error);
    } finally {
      setProcessing(false);
    }
  }, [text, attachedFiles, audioBlob, isProcessing]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachedFiles(prev => [...prev, ...files]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setAttachedFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
  };

  const handleSketchCapture = async (blob: Blob) => {
    setShowSketch(false);
    setProcessing(true);
    try {
      const result = await submitSignalBlob(text.trim(), blob, 'sketch.png');
      addSignal({ text: text.trim() || '[sketch]', ...result });
      setCurrentExecution(result);
      setText('');
      onResult?.(result);
    } finally { setProcessing(false); }
  };

  const handleCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      stream.getTracks().forEach(t => t.stop());

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        setProcessing(true);
        try {
          const result = await submitSignalBlob(text.trim(), blob, 'photo.jpg');
          addSignal({ text: text.trim() || '[photo]', ...result });
          setCurrentExecution(result);
          onResult?.(result);
        } finally { setProcessing(false); }
      }, 'image/jpeg', 0.9);
    } catch (err) { console.error('Camera error:', err); }
  };

  const hasInput = text.trim() || attachedFiles.length > 0 || audioBlob;

  return (
    <>
      {showSketch && <SketchPad onCapture={handleSketchCapture} onClose={() => setShowSketch(false)} />}

      <div className="w-full max-w-2xl mx-auto">
        <div
          className={`relative rounded-2xl border transition-all duration-300 ${
            isProcessing ? 'border-ouro-accent animate-pulse-glow' : 'border-ouro-border hover:border-ouro-muted focus-within:border-ouro-accent'
          } bg-ouro-surface`}
          onDrop={handleDrop} onDragOver={e => e.preventDefault()}
        >
          {/* Attached files preview */}
          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 px-4 pt-3">
              {attachedFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-ouro-border/50 text-xs text-ouro-muted">
                  <Image size={12} />
                  <span className="truncate max-w-[120px]">{f.name}</span>
                  <button onClick={() => setAttachedFiles(p => p.filter((_, j) => j !== i))}><X size={12} /></button>
                </div>
              ))}
            </div>
          )}

          {/* Audio recording indicator */}
          {isRecording && (
            <div className="flex items-center gap-2 px-4 pt-3">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs text-red-400">Recording...</span>
            </div>
          )}

          {audioBlob && !isRecording && (
            <div className="flex items-center gap-2 px-4 pt-3">
              <span className="text-xs text-ouro-success">Voice recorded</span>
              <button onClick={clearRecording} className="text-xs text-ouro-muted hover:text-ouro-text">✕ Clear</button>
            </div>
          )}

          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What's on your mind? Type, speak, drop a file, sketch..."
            className="w-full bg-transparent text-ouro-text placeholder-ouro-muted/50 resize-none p-4 pb-2 min-h-[80px] max-h-[300px] text-[15px] leading-relaxed"
            rows={2}
            disabled={isProcessing}
          />

          <div className="flex items-center justify-between px-3 pb-3">
            <div className="flex items-center gap-1">
              <ToolBtn icon={isRecording ? <MicOff size={18} /> : <Mic size={18} />}
                label={isRecording ? 'Stop' : 'Voice'}
                onClick={isRecording ? stopRecording : startRecording}
                active={isRecording} />
              <ToolBtn icon={<Camera size={18} />} label="Photo" onClick={handleCamera} />
              <ToolBtn icon={<Pencil size={18} />} label="Sketch" onClick={() => setShowSketch(true)} />
              <ToolBtn icon={<Paperclip size={18} />} label="File" onClick={() => fileInputRef.current?.click()} />
            </div>

            <button onClick={handleSubmit} disabled={!hasInput || isProcessing}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                hasInput && !isProcessing ? 'bg-ouro-accent text-white hover:bg-ouro-accent/90' : 'bg-ouro-border text-ouro-muted cursor-not-allowed'
              }`}>
              {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {isProcessing ? 'Processing...' : 'Send'}
            </button>
          </div>
        </div>
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFiles} accept="*/*" />
      </div>
    </>
  );
}

function ToolBtn({ icon, label, onClick, active }: { icon: React.ReactNode; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button onClick={onClick} title={label}
      className={`p-2 rounded-lg transition-colors ${active ? 'bg-ouro-accent/20 text-ouro-accent' : 'text-ouro-muted hover:text-ouro-text hover:bg-ouro-border/50'}`}>
      {icon}
    </button>
  );
}
