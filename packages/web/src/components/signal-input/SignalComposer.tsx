'use client';

import { useState, useRef, useCallback } from 'react';
import { Mic, Camera, Video, Pencil, Paperclip, Send, Loader2 } from 'lucide-react';
import { submitSignal } from '@/lib/api-client';
import { useSignalStore } from '@/stores/signal-store';

export default function SignalComposer({ onResult }: { onResult?: (result: any) => void }) {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const { isProcessing, setProcessing, addSignal, setCurrentExecution } = useSignalStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(async () => {
    if (!text.trim() || isProcessing) return;
    setProcessing(true);

    try {
      const result = await submitSignal(text.trim());
      addSignal({ text: text.trim(), ...result });
      setCurrentExecution(result);
      setText('');
      onResult?.(result);
    } catch (error) {
      console.error('Signal submission failed:', error);
    } finally {
      setProcessing(false);
    }
  }, [text, isProcessing]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleVoice = async () => {
    if (!navigator.mediaDevices) return;
    setIsRecording(!isRecording);
    // TODO: Implement MediaRecorder capture and send audio
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      setText(prev => prev + `\n[Attached: ${files.map(f => f.name).join(', ')}]`);
      // TODO: Upload files with signal
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        className={`relative rounded-2xl border transition-all duration-300 ${
          isProcessing
            ? 'border-ouro-accent animate-pulse-glow'
            : 'border-ouro-border hover:border-ouro-muted focus-within:border-ouro-accent'
        } bg-ouro-surface`}
        onDrop={handleFileDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What's on your mind? Type, speak, drop a file..."
          className="w-full bg-transparent text-ouro-text placeholder-ouro-muted/50 resize-none p-4 pb-2 min-h-[80px] max-h-[300px] text-[15px] leading-relaxed"
          rows={2}
          disabled={isProcessing}
        />

        <div className="flex items-center justify-between px-3 pb-3">
          <div className="flex items-center gap-1">
            <ToolButton icon={<Mic size={18} />} label="Voice" onClick={handleVoice} active={isRecording} />
            <ToolButton icon={<Camera size={18} />} label="Photo" onClick={() => {}} />
            <ToolButton icon={<Video size={18} />} label="Video" onClick={() => {}} />
            <ToolButton icon={<Pencil size={18} />} label="Sketch" onClick={() => {}} />
            <ToolButton icon={<Paperclip size={18} />} label="File" onClick={handleFileSelect} />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!text.trim() || isProcessing}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              text.trim() && !isProcessing
                ? 'bg-ouro-accent text-white hover:bg-ouro-accent/90'
                : 'bg-ouro-border text-ouro-muted cursor-not-allowed'
            }`}
          >
            {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {isProcessing ? 'Processing...' : 'Send'}
          </button>
        </div>
      </div>

      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={() => {}} />
    </div>
  );
}

function ToolButton({ icon, label, onClick, active }: {
  icon: React.ReactNode; label: string; onClick: () => void; active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`p-2 rounded-lg transition-colors ${
        active ? 'bg-ouro-accent/20 text-ouro-accent' : 'text-ouro-muted hover:text-ouro-text hover:bg-ouro-border/50'
      }`}
    >
      {icon}
    </button>
  );
}
