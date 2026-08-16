import React, { useEffect, useRef, useState } from 'react';
import { Boxes, ChevronDown, MoveDiagonal2, Trash2, Type, Waypoints } from 'lucide-react';
import { readJson, writeJson } from '../utils/persistence';

/**
 * Per-chapter system-design board — box, arrow, label. Not pixels.
 *
 * Lands at: src/components/SystemDesignBoard.tsx
 * Storage: 'hld-board-<sectionKey>' (a small Shape[] JSON array, not an image) —
 * registered in utils/backup.ts APP_KEY.
 *
 * A DSA sketch (Whiteboard.tsx, unchanged) draws pointers converging and trees
 * being pruned — organic shapes freehand actually suits. A system-design sketch
 * draws services and the data flow between them, and every real HLD interview —
 * and every mock-interview tool built for one (Excalidraw is the de facto choice
 * candidates reach for) — grades boxes-and-arrows, not brush strokes. Structured
 * primitives also buy a real behavior freehand can't: move a box and its arrows
 * follow, because an arrow stores WHICH boxes it connects, not two fixed points.
 *
 * Deliberately small: box, arrow, label, move, rename, delete. No resize, no
 * z-order, no colors-per-box, no undo — the interview skill this rehearses is
 * "can you sketch the architecture while you talk," not "can you use a tool."
 */

interface BoxShape { id: string; kind: 'box'; x: number; y: number; w: number; h: number; text: string }
interface LabelShape { id: string; kind: 'label'; x: number; y: number; text: string }
interface ArrowShape { id: string; kind: 'arrow'; fromId: string; toId: string }
type Shape = BoxShape | LabelShape | ArrowShape;

const W = 900;
const H = 440;
const BOX_W = 140;
const BOX_H = 54;

const isShape = (v: unknown): v is Shape => {
  if (!v || typeof v !== 'object') return false;
  const s = v as Record<string, unknown>;
  if (typeof s.id !== 'string') return false;
  if (s.kind === 'box') return typeof s.x === 'number' && typeof s.y === 'number' && typeof s.w === 'number' && typeof s.h === 'number' && typeof s.text === 'string';
  if (s.kind === 'label') return typeof s.x === 'number' && typeof s.y === 'number' && typeof s.text === 'string';
  if (s.kind === 'arrow') return typeof s.fromId === 'string' && typeof s.toId === 'string';
  return false;
};
const isShapeArray = (v: unknown): v is Shape[] => Array.isArray(v) && v.every(isShape);

/** Where a ray from a box's center toward (tx, ty) crosses its own border —
 *  arrows are clipped to the box edge, not floated from its center. */
const edgePoint = (b: BoxShape, tx: number, ty: number) => {
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const dx = tx - cx;
  const dy = ty - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const t = Math.min(dx !== 0 ? b.w / 2 / Math.abs(dx) : Infinity, dy !== 0 ? b.h / 2 / Math.abs(dy) : Infinity);
  return { x: cx + dx * t, y: cy + dy * t };
};

interface SystemDesignBoardProps {
  /** Unique per chapter section — CoreHub already keys FigureBlock the same way. */
  sectionKey: string;
}

export const SystemDesignBoard: React.FC<SystemDesignBoardProps> = ({ sectionKey }) => {
  const [open, setOpen] = useState(false);
  const storageKey = `hld-board-${sectionKey}`;
  const [shapes, setShapes] = useState<Shape[]>(() => readJson<Shape[]>(storageKey, [], isShapeArray));
  const [mode, setMode] = useState<'select' | 'connect'>('select');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const nextId = useRef(0);
  const genId = () => `s${nextId.current++}`;

  // CoreHub wraps each section in a plain-index key (`key={idx}`), the same for
  // every subject — switching HLD Blocks -> HLD Cases can reuse this component's
  // fiber across sections instead of remounting it, exactly the scenario
  // Whiteboard.tsx's own questionId effect exists for. Re-read on every
  // sectionKey change (mount included) rather than trusting the lazy useState
  // initializer alone, which only ever runs once per fiber.
  useEffect(() => {
    setOpen(false);
    setShapes(readJson<Shape[]>(storageKey, [], isShapeArray));
    setMode('select');
    setSelectedId(null);
    setConnectFrom(null);
    dragRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionKey]);

  /** Every logical edit (add/delete/rename/connect/clear) goes through here so
   *  storage always matches state — using the FUNCTIONAL setState form, not a
   *  variable closed over from render, is what stops two edits in the same
   *  React batch from each computing off the same stale array and one clobbering
   *  the other (confirmed against a real double-click before this existed). */
  const mutate = (updater: (prev: Shape[]) => Shape[]) => {
    setShapes(prev => {
      const next = updater(prev);
      writeJson(storageKey, next);
      return next;
    });
  };

  const toBoard = (e: { clientX: number; clientY: number }) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: ((e.clientX - rect.left) * W) / rect.width, y: ((e.clientY - rect.top) * H) / rect.height };
  };

  const boxes = shapes.filter((s): s is BoxShape => s.kind === 'box');
  const boxCount = boxes.length;
  const labelCount = shapes.filter(s => s.kind === 'label').length;

  const addBox = () => {
    const shape: BoxShape = { id: genId(), kind: 'box', x: 30, y: 30, w: BOX_W, h: BOX_H, text: 'Service' };
    mutate(prev => {
      const n = prev.filter(s => s.kind === 'box').length;
      shape.x = 30 + (n % 5) * 165;
      shape.y = 30 + Math.floor(n / 5) * 100;
      return [...prev, shape];
    });
    setSelectedId(shape.id);
    setMode('select');
  };

  const addLabel = () => {
    const shape: LabelShape = { id: genId(), kind: 'label', x: 40, y: H - 40, text: 'note' };
    mutate(prev => {
      const n = prev.filter(s => s.kind === 'label').length;
      shape.x = 40 + (n % 6) * 30;
      shape.y = H - 40 - Math.floor(n / 6) * 24;
      return [...prev, shape];
    });
    setSelectedId(shape.id);
    setMode('select');
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    mutate(prev => prev.filter(s => s.id !== selectedId && !(s.kind === 'arrow' && (s.fromId === selectedId || s.toId === selectedId))));
    setSelectedId(null);
  };

  const clearAll = () => {
    if (!window.confirm('Clear this board for good?')) return;
    mutate(() => []);
    setSelectedId(null);
    setConnectFrom(null);
  };

  const renameSelected = (text: string) => {
    mutate(prev => prev.map(s => (s.id === selectedId && s.kind !== 'arrow' ? { ...s, text } : s)));
  };

  const onShapePointerDown = (e: React.PointerEvent, shape: BoxShape | LabelShape) => {
    e.stopPropagation();
    if (mode === 'connect') {
      if (shape.kind !== 'box') return; // arrows connect services, not annotations
      if (!connectFrom) { setConnectFrom(shape.id); return; }
      if (connectFrom === shape.id) { setConnectFrom(null); return; }
      mutate(prev => {
        const already = prev.some(s => s.kind === 'arrow' && s.fromId === connectFrom && s.toId === shape.id);
        return already ? prev : [...prev, { id: genId(), kind: 'arrow', fromId: connectFrom, toId: shape.id }];
      });
      setConnectFrom(null);
      return;
    }
    setSelectedId(shape.id);
    const p = toBoard(e);
    // The drag must start even if capture is refused (e.g. a browser quirk, or a
    // pointerId the capture subsystem doesn't recognize) — capture only keeps the
    // drag smooth if the pointer leaves the SVG, it isn't what makes dragging work.
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* drag still proceeds */ }
    dragRef.current = { id: shape.id, dx: p.x - shape.x, dy: p.y - shape.y };
  };

  const onSvgPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const p = toBoard(e);
    const nx = Math.max(0, Math.min(W - 10, p.x - drag.dx));
    const ny = Math.max(0, Math.min(H - 10, p.y - drag.dy));
    setShapes(prev => prev.map(s => (s.id === drag.id && s.kind !== 'arrow' ? { ...s, x: nx, y: ny } : s)));
  };

  // pointermove above only touches local state (a persist()-per-frame would spam
  // localStorage during a drag); commit once the drag ends, reading the freshest
  // shapes via a ref since this handler closes over render-time state otherwise.
  const shapesRef = useRef(shapes);
  shapesRef.current = shapes;
  const commitDrag = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    writeJson(storageKey, shapesRef.current);
  };

  const selected = shapes.find(s => s.id === selectedId);
  const selectedText = selected && selected.kind !== 'arrow' ? selected.text : '';

  return (
    <div className="glass no-print" style={{ borderRadius: '16px', border: '1px solid hsl(var(--border-color))', overflow: 'hidden', marginTop: '1rem' }}>
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
        <Boxes size={16} color="hsl(var(--secondary))" />
        <span style={{ flex: 1, fontSize: '1rem', fontWeight: 700 }}>
          System-design board
          <span style={{ marginLeft: '0.6rem', fontSize: '0.75rem', fontWeight: 500, color: 'hsl(var(--text-muted))' }}>
            sketch the architecture — boxes and arrows, like the room expects
          </span>
        </span>
        <ChevronDown size={16} color="hsl(var(--text-muted))" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform var(--transition-fast)' }} />
      </button>

      {open && (
        <div className="animate-fade" style={{ padding: '0 1.5rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.72rem' }} onClick={addBox}>
              <Boxes size={12} /><span>+ Box</span>
            </button>
            <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.72rem' }} onClick={addLabel}>
              <Type size={12} /><span>+ Label</span>
            </button>
            <button
              className={`btn ${mode === 'connect' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.72rem' }}
              aria-pressed={mode === 'connect'}
              onClick={() => { setMode(m => (m === 'connect' ? 'select' : 'connect')); setConnectFrom(null); setSelectedId(null); }}
            >
              <Waypoints size={12} /><span>{mode === 'connect' ? (connectFrom ? 'Pick target box…' : 'Pick source box…') : 'Connect'}</span>
            </button>
            <button
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.72rem', color: 'hsl(var(--hard))', marginLeft: 'auto' }}
              onClick={clearAll}
            >
              <Trash2 size={12} /><span>Clear</span>
            </button>
          </div>

          {selected && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                aria-label="Rename selected shape"
                value={selectedText}
                onChange={e => renameSelected(e.target.value)}
                style={{
                  flex: 1, maxWidth: '260px', padding: '0.35rem 0.6rem', fontSize: '0.78rem',
                  borderRadius: '6px', border: '1px solid hsl(var(--border-color))',
                  background: 'hsl(var(--bg-tertiary))', color: 'hsl(var(--text-primary))',
                }}
              />
              <button className="btn btn-secondary" style={{ padding: '0.3rem 0.65rem', fontSize: '0.7rem', color: 'hsl(var(--hard))' }} onClick={deleteSelected}>
                <Trash2 size={11} /><span>Delete</span>
              </button>
              <span style={{ fontSize: '0.68rem', color: 'hsl(var(--text-muted))' }}>Drag to move.</span>
            </div>
          )}

          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={`System design board with ${boxCount} boxes, ${shapes.filter(s => s.kind === 'arrow').length} connections, and ${labelCount} labels.`}
            onPointerMove={onSvgPointerMove}
            onPointerUp={commitDrag}
            onPointerCancel={commitDrag}
            onPointerDown={() => { if (mode === 'select') setSelectedId(null); }}
            style={{
              width: '100%', height: 'auto', display: 'block', touchAction: 'none',
              borderRadius: '10px', background: 'hsl(var(--bg-tertiary))',
              border: '1px solid hsl(var(--border-color))',
              cursor: mode === 'connect' ? 'crosshair' : 'default',
            }}
          >
            <defs>
              <marker id="sdb-arrowhead" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto">
                <path d="M0,0 L8,4 L0,8 Z" fill="hsl(var(--secondary))" />
              </marker>
            </defs>

            {shapes.filter((s): s is ArrowShape => s.kind === 'arrow').map(arrow => {
              const from = boxes.find(b => b.id === arrow.fromId);
              const to = boxes.find(b => b.id === arrow.toId);
              if (!from || !to) return null; // a corrupted/edited blob must degrade, not crash
              const toCenter = { x: to.x + to.w / 2, y: to.y + to.h / 2 };
              const fromCenter = { x: from.x + from.w / 2, y: from.y + from.h / 2 };
              const p1 = edgePoint(from, toCenter.x, toCenter.y);
              const p2 = edgePoint(to, fromCenter.x, fromCenter.y);
              return (
                <line
                  key={arrow.id} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                  stroke="hsl(var(--secondary))" strokeWidth="2" markerEnd="url(#sdb-arrowhead)"
                />
              );
            })}

            {shapes.filter((s): s is BoxShape => s.kind === 'box').map(box => (
              <g key={box.id} onPointerDown={e => onShapePointerDown(e, box)} style={{ cursor: mode === 'connect' ? 'crosshair' : 'grab' }}>
                <rect
                  x={box.x} y={box.y} width={box.w} height={box.h} rx="8"
                  fill={connectFrom === box.id ? 'hsl(var(--secondary) / 0.25)' : 'hsl(var(--bg-secondary))'}
                  stroke={selectedId === box.id || connectFrom === box.id ? 'hsl(var(--secondary))' : 'hsl(var(--border-color))'}
                  strokeWidth={selectedId === box.id || connectFrom === box.id ? 2 : 1.5}
                />
                <text x={box.x + box.w / 2} y={box.y + box.h / 2 + 4} textAnchor="middle" fontSize="12" fontWeight={600} fill="hsl(var(--text-primary))">
                  {box.text.length > 20 ? `${box.text.slice(0, 19)}…` : box.text}
                </text>
              </g>
            ))}

            {shapes.filter((s): s is LabelShape => s.kind === 'label').map(label => (
              <g key={label.id} onPointerDown={e => onShapePointerDown(e, label)} style={{ cursor: 'grab' }}>
                <text
                  x={label.x} y={label.y} fontSize="11" fontStyle="italic"
                  fill={selectedId === label.id ? 'hsl(var(--secondary))' : 'hsl(var(--text-secondary))'}
                >
                  {label.text}
                </text>
              </g>
            ))}

            {shapes.length === 0 && (
              <text x={W / 2} y={H / 2} textAnchor="middle" fontSize="13" fill="hsl(var(--text-muted))">
                + Box to start, Connect to wire two boxes together
              </text>
            )}
          </svg>

          <p style={{ fontSize: '0.68rem', color: 'hsl(var(--text-muted))', lineHeight: 1.5, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <MoveDiagonal2 size={11} /> Move a box and its arrows follow — they're stored as connections, not lines.
            Saves with your progress; this board only, not the JSON backup's image weight.
          </p>
        </div>
      )}
    </div>
  );
};
