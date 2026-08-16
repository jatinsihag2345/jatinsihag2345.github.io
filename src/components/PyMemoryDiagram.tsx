import React, { useState } from 'react';
import { Boxes, SkipBack, SkipForward } from 'lucide-react';

/**
 * Python memory diagrams — names, arrows, objects, stepped one statement at a time.
 *
 * Lands at: src/components/PyMemoryDiagram.tsx
 *
 * Half of every "why did my list change?!" bug is the same misconception: that a
 * Python variable IS a box holding a value. It is a name tag on an object. Four
 * curated scenarios walk the classic traps — aliasing, .copy(), shallow copy of
 * nested lists, string rebinding — with the actual name→object arrows drawn, one
 * honest sentence per step. Curated and hardcoded on purpose: these four cover
 * the misconception; a general-purpose memory tracer would bury it.
 */

interface MemCell {
  text: string;
  /** When set, this cell is a reference slot pointing at another object box. */
  ref?: string;
}

interface MemObj {
  id: string;
  /** Type tag shown above the box, e.g. "list" or "str". */
  label: string;
  cells: MemCell[];
}

interface MemStep {
  code: string;
  sentence: string;
  names: { name: string; ref: string }[];
  objects: MemObj[];
  /** Object ids / names whose state this step changed — drawn hot. */
  changed: string[];
}

interface Scenario {
  id: string;
  title: string;
  steps: MemStep[];
}

const SCENARIOS: Scenario[] = [
  {
    id: 'alias',
    title: 'b = a (aliasing)',
    steps: [
      {
        code: 'a = [1, 2, 3]',
        sentence: 'One list object is created; the name a is just a label tied to it.',
        names: [{ name: 'a', ref: 'L1' }],
        objects: [{ id: 'L1', label: 'list', cells: [{ text: '1' }, { text: '2' }, { text: '3' }] }],
        changed: ['a', 'L1'],
      },
      {
        code: 'b = a',
        sentence: 'No copy happened — b is a second label on the SAME object.',
        names: [{ name: 'a', ref: 'L1' }, { name: 'b', ref: 'L1' }],
        objects: [{ id: 'L1', label: 'list', cells: [{ text: '1' }, { text: '2' }, { text: '3' }] }],
        changed: ['b'],
      },
      {
        code: 'b.append(4)',
        sentence: 'Mutating through b changed the one shared list — a sees the 4 too.',
        names: [{ name: 'a', ref: 'L1' }, { name: 'b', ref: 'L1' }],
        objects: [{ id: 'L1', label: 'list', cells: [{ text: '1' }, { text: '2' }, { text: '3' }, { text: '4' }] }],
        changed: ['L1'],
      },
    ],
  },
  {
    id: 'copy',
    title: 'b = a.copy()',
    steps: [
      {
        code: 'a = [1, 2, 3]',
        sentence: 'Same start: one list object, one name pointing at it.',
        names: [{ name: 'a', ref: 'L1' }],
        objects: [{ id: 'L1', label: 'list', cells: [{ text: '1' }, { text: '2' }, { text: '3' }] }],
        changed: ['a', 'L1'],
      },
      {
        code: 'b = a.copy()',
        sentence: 'copy() builds a NEW list object with the same elements — two boxes now.',
        names: [{ name: 'a', ref: 'L1' }, { name: 'b', ref: 'L2' }],
        objects: [
          { id: 'L1', label: 'list', cells: [{ text: '1' }, { text: '2' }, { text: '3' }] },
          { id: 'L2', label: 'list', cells: [{ text: '1' }, { text: '2' }, { text: '3' }] },
        ],
        changed: ['b', 'L2'],
      },
      {
        code: 'b.append(4)',
        sentence: 'Only the copy changed — a’s object was never touched.',
        names: [{ name: 'a', ref: 'L1' }, { name: 'b', ref: 'L2' }],
        objects: [
          { id: 'L1', label: 'list', cells: [{ text: '1' }, { text: '2' }, { text: '3' }] },
          { id: 'L2', label: 'list', cells: [{ text: '1' }, { text: '2' }, { text: '3' }, { text: '4' }] },
        ],
        changed: ['L2'],
      },
    ],
  },
  {
    id: 'shallow',
    title: 'Nested list, shallow copy',
    steps: [
      {
        code: 'a = [[1, 2], [3, 4]]',
        sentence: 'THREE objects exist: the outer list holds references to two inner lists.',
        names: [{ name: 'a', ref: 'O1' }],
        objects: [
          { id: 'O1', label: 'list', cells: [{ text: '•', ref: 'I1' }, { text: '•', ref: 'I2' }] },
          { id: 'I1', label: 'list', cells: [{ text: '1' }, { text: '2' }] },
          { id: 'I2', label: 'list', cells: [{ text: '3' }, { text: '4' }] },
        ],
        changed: ['a', 'O1', 'I1', 'I2'],
      },
      {
        code: 'b = a.copy()',
        sentence: 'The copy is a new OUTER list — but its slots point at the SAME inner lists.',
        names: [{ name: 'a', ref: 'O1' }, { name: 'b', ref: 'O2' }],
        objects: [
          { id: 'O1', label: 'list', cells: [{ text: '•', ref: 'I1' }, { text: '•', ref: 'I2' }] },
          { id: 'O2', label: 'list', cells: [{ text: '•', ref: 'I1' }, { text: '•', ref: 'I2' }] },
          { id: 'I1', label: 'list', cells: [{ text: '1' }, { text: '2' }] },
          { id: 'I2', label: 'list', cells: [{ text: '3' }, { text: '4' }] },
        ],
        changed: ['b', 'O2'],
      },
      {
        code: 'b[0].append(9)',
        sentence: 'b[0] and a[0] are the same inner object, so a sees the 9. That is what "shallow" means.',
        names: [{ name: 'a', ref: 'O1' }, { name: 'b', ref: 'O2' }],
        objects: [
          { id: 'O1', label: 'list', cells: [{ text: '•', ref: 'I1' }, { text: '•', ref: 'I2' }] },
          { id: 'O2', label: 'list', cells: [{ text: '•', ref: 'I1' }, { text: '•', ref: 'I2' }] },
          { id: 'I1', label: 'list', cells: [{ text: '1' }, { text: '2' }, { text: '9' }] },
          { id: 'I2', label: 'list', cells: [{ text: '3' }, { text: '4' }] },
        ],
        changed: ['I1'],
      },
    ],
  },
  {
    id: 'strings',
    title: 'String rebinding',
    steps: [
      {
        code: 's = "hi"',
        sentence: 'One string object; s is bound to it.',
        names: [{ name: 's', ref: 'S1' }],
        objects: [{ id: 'S1', label: 'str', cells: [{ text: '"hi"' }] }],
        changed: ['s', 'S1'],
      },
      {
        code: 't = s',
        sentence: 'Two names, one string object — exactly like the list aliasing case.',
        names: [{ name: 's', ref: 'S1' }, { name: 't', ref: 'S1' }],
        objects: [{ id: 'S1', label: 'str', cells: [{ text: '"hi"' }] }],
        changed: ['t'],
      },
      {
        code: 's = s + "!"',
        sentence: 'Strings are immutable: + built a NEW object and s was REBOUND to it. t still points at "hi" — nothing was mutated.',
        names: [{ name: 's', ref: 'S2' }, { name: 't', ref: 'S1' }],
        objects: [
          { id: 'S1', label: 'str', cells: [{ text: '"hi"' }] },
          { id: 'S2', label: 'str', cells: [{ text: '"hi!"' }] },
        ],
        changed: ['s', 'S2'],
      },
    ],
  },
];

// Layout constants (SVG px).
const NAME_X = 8;
const NAME_W = 56;
const COL1_X = 150;
const COL2_X = 340;
const ROW_H = 74;
const CELL_W = 34;
const CELL_H = 26;
const BOX_PAD = 8;

export const PyMemoryDiagram: React.FC = () => {
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);

  const scenario = SCENARIOS[scenarioIdx];
  const step = scenario.steps[Math.min(stepIdx, scenario.steps.length - 1)];
  const changed = new Set(step.changed);

  // Objects referenced by another object's cells render one column to the right,
  // so outer-list → inner-list arrows always flow left to right.
  const innerIds = new Set(step.objects.flatMap(o => o.cells.filter(c => c.ref).map(c => c.ref!)));
  const col1 = step.objects.filter(o => !innerIds.has(o.id));
  const col2 = step.objects.filter(o => innerIds.has(o.id));

  const boxW = (o: MemObj) => o.cells.length * CELL_W + BOX_PAD * 2;
  const place = new Map<string, { x: number; y: number; w: number }>();
  col1.forEach((o, i) => place.set(o.id, { x: COL1_X, y: i * ROW_H + 26, w: boxW(o) }));
  col2.forEach((o, i) => place.set(o.id, { x: COL2_X, y: i * ROW_H + 26, w: boxW(o) }));

  const nameY = (i: number) => i * 46 + 30;
  const height = Math.max(col1.length, col2.length, 1) * ROW_H + 10;
  const width = col2.length > 0 ? COL2_X + Math.max(...col2.map(boxW)) + 12 : COL1_X + Math.max(...col1.map(boxW), 80) + 12;

  const pick = (scn: number) => {
    setScenarioIdx(scn);
    setStepIdx(0); // each scenario restarts from its first statement
  };

  return (
    <div className="glass" style={{ padding: '2rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'hsl(var(--primary))', borderBottom: '1px solid hsl(var(--border-color))', paddingBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Boxes size={20} />
        How Python names really work
      </h3>
      <p style={{ fontSize: '0.88rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.6 }}>
        A variable is a name tag on an object, not a box holding a value. Step
        through the four classic traps and watch where the arrows actually point.
      </p>

      {/* Scenario picker */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {SCENARIOS.map((s, i) => (
          <button
            key={s.id}
            className={`btn ${i === scenarioIdx ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.35rem 0.85rem', fontSize: '0.75rem' }}
            aria-pressed={i === scenarioIdx}
            onClick={() => pick(i)}
          >
            {s.title}
          </button>
        ))}
      </div>

      {/* Current statement */}
      <pre
        style={{
          margin: 0, padding: '0.6rem 1rem', borderRadius: '8px',
          background: 'hsl(var(--bg-secondary) / 0.6)', border: '1px solid hsl(var(--border-color))',
          fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'hsl(var(--secondary))',
          overflowX: 'auto',
        }}
      >
        {step.code}
      </pre>

      <div style={{ overflowX: 'auto', border: '1px solid hsl(var(--border-color))', borderRadius: '10px', background: 'hsl(var(--bg-secondary) / 0.3)', padding: '0.5rem' }}>
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`Memory diagram after "${step.code}": ${step.names.map(n => `${n.name} points to ${n.ref}`).join(', ')}. ${step.sentence}`}
          style={{ display: 'block' }}
        >
          <defs>
            <marker id="pymem-arrowhead" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <path d="M 0 0 L 7 3.5 L 0 7 Z" fill="hsl(var(--text-secondary))" />
            </marker>
            <marker id="pymem-arrowhead-hot" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <path d="M 0 0 L 7 3.5 L 0 7 Z" fill="hsl(var(--accent))" />
            </marker>
          </defs>

          {/* Name → object arrows */}
          {step.names.map((n, i) => {
            const target = place.get(n.ref);
            if (!target) return null;
            const hot = changed.has(n.name);
            const y1 = nameY(i);
            const y2 = target.y + CELL_H / 2 + 12;
            return (
              <path
                key={n.name}
                d={`M ${NAME_X + NAME_W} ${y1} C ${NAME_X + NAME_W + 40} ${y1}, ${target.x - 40} ${y2}, ${target.x - 3} ${y2}`}
                fill="none"
                stroke={hot ? 'hsl(var(--accent))' : 'hsl(var(--text-secondary))'}
                strokeWidth={hot ? 2 : 1.4}
                markerEnd={`url(#pymem-arrowhead${hot ? '-hot' : ''})`}
              />
            );
          })}

          {/* Cell → inner-object arrows */}
          {step.objects.flatMap(o =>
            o.cells.map((c, ci) => {
              if (!c.ref) return null;
              const from = place.get(o.id);
              const to = place.get(c.ref);
              if (!from || !to) return null;
              const x1 = from.x + BOX_PAD + ci * CELL_W + CELL_W / 2;
              const y1 = from.y + 12 + CELL_H / 2;
              const y2 = to.y + CELL_H / 2 + 12;
              return (
                <path
                  key={`${o.id}-${ci}`}
                  d={`M ${x1} ${y1} C ${x1 + 60} ${y1}, ${to.x - 40} ${y2}, ${to.x - 3} ${y2}`}
                  fill="none"
                  stroke="hsl(var(--text-secondary))"
                  strokeWidth={1.4}
                  markerEnd="url(#pymem-arrowhead)"
                />
              );
            }),
          )}

          {/* Name tags */}
          {step.names.map((n, i) => {
            const hot = changed.has(n.name);
            return (
              <g key={n.name}>
                <rect
                  x={NAME_X} y={nameY(i) - 13} width={NAME_W} height={26} rx={6}
                  fill={hot ? 'hsl(var(--accent) / 0.15)' : 'hsl(var(--bg-tertiary))'}
                  stroke={hot ? 'hsl(var(--accent))' : 'hsl(var(--border-color))'}
                  strokeWidth={hot ? 1.8 : 1}
                />
                <text x={NAME_X + NAME_W / 2} y={nameY(i) + 4} fontSize="12" fontWeight="700" textAnchor="middle" fontFamily="var(--font-mono)" fill="hsl(var(--text-primary))">
                  {n.name}
                </text>
              </g>
            );
          })}

          {/* Object boxes */}
          {step.objects.map(o => {
            const p = place.get(o.id)!;
            const hot = changed.has(o.id);
            return (
              <g key={o.id}>
                <text x={p.x} y={p.y + 6} fontSize="9" fontFamily="var(--font-mono)" fill="hsl(var(--text-muted))">
                  {o.label} · {o.id}
                </text>
                <rect
                  x={p.x} y={p.y + 12} width={p.w} height={CELL_H + BOX_PAD} rx={6}
                  fill={hot ? 'hsl(var(--accent) / 0.1)' : 'hsl(var(--bg-tertiary))'}
                  stroke={hot ? 'hsl(var(--accent))' : 'hsl(var(--border-color))'}
                  strokeWidth={hot ? 1.8 : 1}
                />
                {o.cells.map((c, ci) => (
                  <g key={ci}>
                    <rect
                      x={p.x + BOX_PAD + ci * CELL_W + 1.5} y={p.y + 12 + BOX_PAD / 2}
                      width={CELL_W - 3} height={CELL_H - 2} rx={4}
                      fill="hsl(var(--bg-secondary))" stroke="hsl(var(--border-color))"
                    />
                    <text
                      x={p.x + BOX_PAD + ci * CELL_W + CELL_W / 2} y={p.y + 12 + CELL_H / 2 + 6}
                      fontSize="11" textAnchor="middle" fontFamily="var(--font-mono)"
                      fill={c.ref ? 'hsl(var(--text-muted))' : 'hsl(var(--text-primary))'}
                    >
                      {c.text}
                    </text>
                  </g>
                ))}
              </g>
            );
          })}
        </svg>
      </div>

      {/* The one sentence, plus the stepper */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <p style={{ flex: 1, minWidth: '220px', fontSize: '0.88rem', color: 'hsl(var(--text-primary))', lineHeight: 1.6 }}>
          {step.sentence}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button
            className="btn btn-secondary"
            style={{ padding: '0.35rem 0.5rem' }}
            disabled={stepIdx === 0}
            aria-label="Previous step"
            onClick={() => setStepIdx(i => Math.max(i - 1, 0))}
          >
            <SkipBack size={13} />
          </button>
          <span style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
            {Math.min(stepIdx, scenario.steps.length - 1) + 1} / {scenario.steps.length}
          </span>
          <button
            className="btn btn-secondary"
            style={{ padding: '0.35rem 0.5rem' }}
            disabled={stepIdx >= scenario.steps.length - 1}
            aria-label="Next step"
            onClick={() => setStepIdx(i => Math.min(i + 1, scenario.steps.length - 1))}
          >
            <SkipForward size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};
