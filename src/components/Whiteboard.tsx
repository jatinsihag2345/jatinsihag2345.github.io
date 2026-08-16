import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Eraser, PenLine, Trash2 } from 'lucide-react';
import { readText, removeStoredValue, writeText } from '../utils/persistence';

/**
 * Per-question sketchpad — draw the diagram you would draw on a real whiteboard.
 *
 * Lands at: src/components/Whiteboard.tsx
 * Storage: 'sketch-<questionId>' (PNG data URL) — registered in utils/backup.ts APP_KEY.
 *
 * Interviews are drawn as much as they are spoken: two pointers converging, a
 * tree being pruned, a matrix being swept. Typing notes cannot rehearse that.
 * This is deliberately minimal — pencil, eraser, two colors — because a tool
 * palette is procrastination with extra steps.
 */

// Fixed logical resolution; CSS scales it to the card. Pointer coordinates are
// mapped back through the bounding rect so drawing stays accurate at any width.
const W = 860;
const H = 420;

// Literal HSL (not var()) because canvas strokes are raster pixels, not styled
// DOM — matching the site's cyan/pink so sketches feel native to the page.
const COLORS = [
  { name: 'cyan', css: 'hsl(190, 95%, 44%)' },
  { name: 'pink', css: 'hsl(320, 80%, 60%)' },
];

/** Data-URL byte cap. Past this, saving would chew through the ~5MB origin quota
 *  a few sketches at a time — skip the save and say so instead of failing later. */
const SAVE_CAP = 500_000;

interface WhiteboardProps {
  questionId: string;
}

export const Whiteboard: React.FC<WhiteboardProps> = ({ questionId }) => {
  const [open, setOpen] = useState(false); // default closed — sketching is opt-in
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [colorIdx, setColorIdx] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef<{ x: number; y: number } | null>(null);

  const supported = typeof window !== 'undefined' && 'PointerEvent' in window;
  const storageKey = `sketch-${questionId}`;

  // Question swap collapses the pad and resets transient UI — a sketch for Two
  // Sum opening pre-expanded on Word Ladder would just be confusing.
  useEffect(() => {
    setOpen(false);
    setNote(null);
    setTool('pen');
    drawing.current = null;
  }, [questionId]);

  // (Re)load the saved sketch whenever the canvas actually exists — it mounts
  // only while open, so closing and reopening must repaint from storage.
  useEffect(() => {
    if (!open || !supported) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, W, H);
    const saved = readText(storageKey);
    if (!saved.startsWith('data:image/')) return;
    // Stale-load guard: image decoding is async, so if the question changed (or
    // the pad closed) before decode finished, the old sketch must not paint over
    // whatever the canvas now shows.
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (!cancelled && canvasRef.current) {
        canvasRef.current.getContext('2d')?.drawImage(img, 0, 0, W, H);
      }
    };
    img.src = saved;
    return () => { cancelled = true; };
  }, [open, supported, storageKey]);

  const toCanvas = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * W) / rect.width,
      y: ((e.clientY - rect.top) * H) / rect.height,
    };
  };

  const strokeTo = (canvas: HTMLCanvasElement, from: { x: number; y: number }, to: { x: number; y: number }) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Eraser removes pixels to transparency rather than painting background —
    // the pad's tint stays visible underneath, like a real whiteboard wipe.
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = COLORS[colorIdx].css;
    ctx.lineWidth = tool === 'eraser' ? 24 : 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  };

  const persist = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const url = canvas.toDataURL('image/png');
      if (url.length > SAVE_CAP) {
        setNote('This sketch got too detailed to auto-save (500 KB cap) — it stays on screen, but it will not survive leaving the page.');
        return;
      }
      writeText(storageKey, url);
      setNote(null);
    } catch {
      // Quota or serialization failure: the drawing is still on screen; only
      // persistence failed, and the honest move is to say exactly that.
      setNote('Saving the sketch failed (storage may be full) — it stays on screen for now.');
    }
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = toCanvas(e);
    drawing.current = p;
    // A zero-length segment still leaves a dot, so a single tap marks the page.
    strokeTo(e.currentTarget, p, p);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const p = toCanvas(e);
    strokeTo(e.currentTarget, drawing.current, p);
    drawing.current = p;
  };

  const onPointerUp = () => {
    if (!drawing.current) return;
    drawing.current = null;
    persist(); // save per stroke — closing the card mid-thought loses nothing
  };

  const clearAll = () => {
    if (!window.confirm('Wipe this sketch for good?')) return;
    canvasRef.current?.getContext('2d')?.clearRect(0, 0, W, H);
    removeStoredValue(storageKey);
    setNote(null);
  };

  return (
    <div className="glass no-print" style={{ borderRadius: '16px', border: '1px solid hsl(var(--border-color))', overflow: 'hidden' }}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '0.6rem',
          padding: '1rem 1.5rem', background: 'none', border: 'none', cursor: 'pointer',
          color: 'hsl(var(--text-primary))', textAlign: 'left', fontFamily: 'var(--font-sans)',
        }}
      >
        <PenLine size={16} color="hsl(var(--secondary))" />
        <span style={{ flex: 1, fontSize: '1rem', fontWeight: 700 }}>
          Whiteboard
          <span style={{ marginLeft: '0.6rem', fontSize: '0.75rem', fontWeight: 500, color: 'hsl(var(--text-muted))' }}>
            sketch the approach like you would in the room
          </span>
        </span>
        <ChevronDown
          size={16}
          color="hsl(var(--text-muted))"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform var(--transition-fast)' }}
        />
      </button>

      {open && (
        <div className="animate-fade" style={{ padding: '0 1.5rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {!supported ? (
            // Honest fallback: no pointer events means no drawing — say so instead
            // of rendering a canvas that silently ignores every touch.
            <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.6 }}>
              This browser does not support pointer drawing, so the sketchpad is
              unavailable here. Paper works just as well — the point is to draw the
              structure before you code it.
            </p>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  className={`btn ${tool === 'pen' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.72rem' }}
                  aria-pressed={tool === 'pen'}
                  onClick={() => setTool('pen')}
                >
                  <PenLine size={12} /><span>Pencil</span>
                </button>
                <button
                  className={`btn ${tool === 'eraser' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.72rem' }}
                  aria-pressed={tool === 'eraser'}
                  onClick={() => setTool('eraser')}
                >
                  <Eraser size={12} /><span>Eraser</span>
                </button>
                <span style={{ width: '1px', height: '18px', background: 'hsl(var(--border-color))' }} />
                {COLORS.map((c, i) => (
                  <button
                    key={c.name}
                    aria-label={`Draw in ${c.name}`}
                    aria-pressed={colorIdx === i}
                    onClick={() => { setColorIdx(i); setTool('pen'); }}
                    style={{
                      width: '24px', height: '24px', borderRadius: '50%', cursor: 'pointer',
                      background: c.css,
                      border: colorIdx === i && tool === 'pen' ? '2px solid hsl(var(--text-primary))' : '2px solid transparent',
                    }}
                  />
                ))}
                <button
                  className="btn btn-secondary"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.72rem', color: 'hsl(var(--hard))', marginLeft: 'auto' }}
                  onClick={clearAll}
                >
                  <Trash2 size={12} /><span>Clear</span>
                </button>
              </div>

              <canvas
                ref={canvasRef}
                width={W}
                height={H}
                role="img"
                aria-label="Freehand sketch area for this problem. Draw with a mouse, pen or finger."
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                style={{
                  width: '100%', height: 'auto', display: 'block',
                  // touchAction none: without it, a finger drag scrolls the page
                  // instead of drawing on touch devices.
                  touchAction: 'none',
                  borderRadius: '10px',
                  background: 'hsl(var(--bg-tertiary))',
                  border: '1px solid hsl(var(--border-color))',
                  cursor: 'crosshair',
                }}
              />
              {note && (
                <p style={{ fontSize: '0.72rem', color: 'hsl(var(--medium))', lineHeight: 1.5 }}>{note}</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
