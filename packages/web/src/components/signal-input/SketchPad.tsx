'use client';
import { useRef, useState, useEffect, useCallback } from 'react';
import { Eraser, Undo2, Download, X } from 'lucide-react';

interface Props {
  onCapture: (blob: Blob) => void;
  onClose: () => void;
}

export default function SketchPad({ onCapture, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [paths, setPaths] = useState<Array<{ x: number; y: number }[]>>([]);
  const [currentPath, setCurrentPath] = useState<Array<{ x: number; y: number }>>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#161619';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#e8e8e8';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const path of paths) {
      if (path.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
      ctx.stroke();
    }

    if (currentPath.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(currentPath[0].x, currentPath[0].y);
      for (let i = 1; i < currentPath.length; i++) ctx.lineTo(currentPath[i].x, currentPath[i].y);
      ctx.stroke();
    }
  }, [paths, currentPath]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => { setIsDrawing(true); setCurrentPath([getPos(e)]); };
  const draw = (e: React.MouseEvent | React.TouchEvent) => { if (isDrawing) setCurrentPath(p => [...p, getPos(e)]); };
  const endDraw = () => { if (currentPath.length > 0) setPaths(p => [...p, currentPath]); setCurrentPath([]); setIsDrawing(false); };

  const undo = () => setPaths(p => p.slice(0, -1));
  const clear = () => setPaths([]);

  const capture = () => {
    canvasRef.current?.toBlob(blob => { if (blob) onCapture(blob); }, 'image/png');
  };

  return (
    <div className="fixed inset-0 bg-ouro-bg/90 z-50 flex flex-col items-center justify-center p-4">
      <div className="flex items-center gap-3 mb-3">
        <button onClick={undo} className="p-2 rounded-lg bg-ouro-surface text-ouro-muted hover:text-ouro-text"><Undo2 size={18} /></button>
        <button onClick={clear} className="p-2 rounded-lg bg-ouro-surface text-ouro-muted hover:text-ouro-text"><Eraser size={18} /></button>
        <button onClick={capture} className="px-4 py-2 rounded-lg bg-ouro-accent text-white text-sm font-medium">Send Sketch</button>
        <button onClick={onClose} className="p-2 rounded-lg bg-ouro-surface text-ouro-muted hover:text-ouro-text"><X size={18} /></button>
      </div>
      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        className="rounded-xl border border-ouro-border cursor-crosshair touch-none"
        style={{ maxWidth: '100%', maxHeight: '70vh' }}
        onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
        onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
      />
    </div>
  );
}
