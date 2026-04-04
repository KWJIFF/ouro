'use client';
import { useRef, useState, useCallback, useEffect } from 'react';
import { Pencil, Eraser, RotateCcw, Check, X } from 'lucide-react';

interface Props {
  width?: number;
  height?: number;
  onSubmit?: (dataUrl: string) => void;
  onCancel?: () => void;
}

export default function SketchPad({ width = 400, height = 300, onSubmit, onCancel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [penSize, setPenSize] = useState(3);
  const [color, setColor] = useState('#ffffff');
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set up canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getPos = useCallback((e: React.MouseEvent | React.TouchEvent): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const pos = getPos(e);
    lastPointRef.current = pos;
    setIsDrawing(true);
  }, [getPos]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !lastPointRef.current) return;

    const pos = getPos(e);

    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(pos.x, pos.y);

    if (tool === 'eraser') {
      ctx.strokeStyle = '#1a1a2e';
      ctx.lineWidth = penSize * 4;
    } else {
      ctx.strokeStyle = color;
      ctx.lineWidth = penSize;
    }

    ctx.stroke();
    lastPointRef.current = pos;
  }, [isDrawing, tool, penSize, color, getPos]);

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
    lastPointRef.current = null;
  }, []);

  const clearCanvas = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);
  }, [width, height]);

  const handleSubmit = useCallback(() => {
    const dataUrl = canvasRef.current?.toDataURL('image/png');
    if (dataUrl) onSubmit?.(dataUrl);
  }, [onSubmit]);

  const colors = ['#ffffff', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];

  return (
    <div className="bg-ouro-surface border border-ouro-border rounded-xl overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-ouro-border/50">
        <button
          onClick={() => setTool('pen')}
          className={`p-1.5 rounded-lg transition-colors ${tool === 'pen' ? 'bg-ouro-accent/20 text-ouro-accent' : 'text-ouro-muted hover:text-ouro-text'}`}
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={() => setTool('eraser')}
          className={`p-1.5 rounded-lg transition-colors ${tool === 'eraser' ? 'bg-ouro-accent/20 text-ouro-accent' : 'text-ouro-muted hover:text-ouro-text'}`}
        >
          <Eraser size={14} />
        </button>

        <div className="w-px h-4 bg-ouro-border/30 mx-1" />

        {/* Pen size */}
        <input
          type="range" min={1} max={10} value={penSize}
          onChange={(e) => setPenSize(parseInt(e.target.value))}
          className="w-16 h-1 appearance-none bg-ouro-border rounded-full"
        />

        <div className="w-px h-4 bg-ouro-border/30 mx-1" />

        {/* Colors */}
        <div className="flex gap-1">
          {colors.map((c) => (
            <button
              key={c}
              onClick={() => { setColor(c); setTool('pen'); }}
              className={`w-4 h-4 rounded-full border ${color === c && tool === 'pen' ? 'border-ouro-accent scale-125' : 'border-ouro-border/30'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <div className="flex-1" />

        <button onClick={clearCanvas} className="p-1.5 text-ouro-muted hover:text-ouro-text" title="Clear">
          <RotateCcw size={14} />
        </button>
        {onCancel && (
          <button onClick={onCancel} className="p-1.5 text-ouro-muted hover:text-ouro-danger" title="Cancel">
            <X size={14} />
          </button>
        )}
        <button onClick={handleSubmit} className="p-1.5 text-ouro-success hover:text-ouro-success/80" title="Submit sketch">
          <Check size={14} />
        </button>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        className="cursor-crosshair touch-none"
      />
    </div>
  );
}
