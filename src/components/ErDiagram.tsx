import React, { useMemo } from 'react';

/**
 * ER diagram — the question's CREATE TABLE schema drawn as entity boxes and
 * foreign-key arrows.
 *
 * Lands at: src/components/ErDiagram.tsx
 *
 * Join questions live or die on seeing which column ties which table to which —
 * and a DDL string makes the reader reverse-engineer that in their head. This
 * parses the schema (names, columns, PK/FK by the LeetCode `<table>_id` naming
 * convention, plus explicit REFERENCES when present) and draws it. Anything it
 * cannot parse cleanly renders NOTHING: a wrong diagram is worse than no diagram.
 */

interface ErColumn {
  name: string;
  type: string;
  pk: boolean;
  /** Name of the referenced table, when this column is a foreign key. */
  fkTable?: string;
}

interface ErTable {
  name: string;
  columns: ErColumn[];
  layer: number;
}

/** Does `base` (from a `<base>_id` column) name this table? Checked in both
 *  directions with plural variants so `product_id` finds `Products` and
 *  `sale_id` finds `Sales` — stripping suffixes from the table alone missed
 *  words ending in a real 'e' + 's'. */
const nameMatches = (tableName: string, base: string) => {
  const t = tableName.toLowerCase();
  return t === base || t === `${base}s` || t === `${base}es` || (t.endsWith('s') && t.slice(0, -1) === base);
};

/** Split on commas at paren depth 0 only — `ENUM('Y', 'N')` and `varchar(25)`
 *  carry commas/parens that are NOT column separators. */
const splitColumns = (body: string): string[] => {
  const parts: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of body) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  parts.push(cur);
  return parts.map(p => p.trim()).filter(Boolean);
};

export const parseSchema = (schema: string): ErTable[] | null => {
  const tables: { name: string; body: string }[] = [];
  const re = /create\s+table\s+(?:if\s+not\s+exists\s+)?[`"]?(\w+)[`"]?\s*\(/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(schema)) !== null) {
    // Balanced-paren scan: the column list itself contains parens (varchar(25)).
    let depth = 1;
    let i = re.lastIndex;
    while (i < schema.length && depth > 0) {
      if (schema[i] === '(') depth++;
      else if (schema[i] === ')') depth--;
      i++;
    }
    if (depth !== 0) return null; // truncated DDL — refuse rather than guess
    tables.push({ name: m[1], body: schema.slice(re.lastIndex, i - 1) });
    re.lastIndex = i;
  }
  // 1–4 tables is the drawable range; more means the layout stops being readable
  // and the DDL text below serves better.
  if (tables.length < 1 || tables.length > 4) return null;

  const parsed: ErTable[] = tables.map(t => {
    const columns: ErColumn[] = [];
    for (const def of splitColumns(t.body)) {
      const upper = def.toUpperCase();
      // Table-level FOREIGN KEY (col) REFERENCES Other(col) — attach to the column.
      const fkc = /^FOREIGN\s+KEY\s*\(\s*(\w+)\s*\)\s*REFERENCES\s+[`"]?(\w+)/i.exec(def);
      if (fkc) {
        const col = columns.find(c => c.name.toLowerCase() === fkc[1].toLowerCase());
        if (col) col.fkTable = fkc[2];
        continue;
      }
      // Table-level PRIMARY KEY (col, ...) — mark each named column.
      const pkc = /^PRIMARY\s+KEY\s*\(([^)]*)\)/i.exec(def);
      if (pkc) {
        pkc[1].split(',').map(s => s.trim().toLowerCase()).forEach(name => {
          const col = columns.find(c => c.name.toLowerCase() === name);
          if (col) col.pk = true;
        });
        continue;
      }
      // Other table-level constraints carry no drawable information.
      if (/^(UNIQUE|CONSTRAINT|KEY|INDEX|CHECK)\b/i.test(upper)) continue;
      const words = def.split(/\s+/);
      if (!/^[`"]?\w+[`"]?$/.test(words[0])) return { name: t.name, columns: [], layer: 0 };
      const colName = words[0].replace(/[`"]/g, '');
      const inlineRef = /REFERENCES\s+[`"]?(\w+)/i.exec(def);
      columns.push({
        name: colName,
        type: words.slice(1).join(' ').replace(/\s*(PRIMARY\s+KEY|NOT\s+NULL|REFERENCES[\s\S]*)$/i, '').trim(),
        pk: /\bPRIMARY\s+KEY\b/i.test(def),
        fkTable: inlineRef ? inlineRef[1] : undefined,
      });
    }
    return { name: t.name, columns, layer: 0 };
  });
  if (parsed.some(t => t.columns.length === 0)) return null;

  // Convention pass: `<t>_id` is that table's PK when t names itself, an FK when
  // t names ANOTHER table in this schema. Plain `id` is a PK.
  for (const t of parsed) {
    for (const c of t.columns) {
      const lower = c.name.toLowerCase();
      if (lower === 'id') c.pk = true;
      if (!lower.endsWith('_id')) continue;
      const base = lower.slice(0, -3);
      if (nameMatches(t.name, base)) c.pk = true;
      if (c.fkTable) continue; // explicit REFERENCES already said it
      const target = parsed.find(o => o !== t && nameMatches(o.name, base));
      if (target) c.fkTable = target.name;
    }
  }

  // Layered layout: referenced-only tables sit left, referencing tables right of
  // everything they point at. The cycle guard caps at table count so a (never
  // expected) self-referential loop cannot spin forever.
  const byName = new Map(parsed.map(t => [t.name.toLowerCase(), t] as const));
  for (let pass = 0; pass < parsed.length; pass++) {
    for (const t of parsed) {
      const targets = t.columns
        .map(c => (c.fkTable ? byName.get(c.fkTable.toLowerCase()) : undefined))
        .filter((x): x is ErTable => !!x && x !== t);
      if (targets.length > 0) t.layer = Math.max(...targets.map(x => x.layer)) + 1;
    }
  }
  return parsed;
};

// Geometry constants (SVG px).
const ROW_H = 20;
const HEAD_H = 26;
const LAYER_GAP = 96;
const BOX_GAP = 26;

interface ErDiagramProps {
  schema: string;
}

export const ErDiagram: React.FC<ErDiagramProps> = ({ schema }) => {
  const model = useMemo(() => {
    const tables = parseSchema(schema || '');
    if (!tables) return null;

    // Box width fits the widest "name  type" line of each table.
    const boxes = tables.map(t => {
      const widest = Math.max(
        t.name.length + 3,
        ...t.columns.map(c => c.name.length + c.type.length + 7),
      );
      return { t, w: Math.min(Math.max(widest * 6.6 + 24, 150), 250), h: HEAD_H + t.columns.length * ROW_H + 8 };
    });

    // Column x per layer, then stack boxes vertically within each layer.
    const layers = [...new Set(boxes.map(b => b.t.layer))].sort((a, b) => a - b);
    const layerX = new Map<number, number>();
    let x = 8;
    for (const layer of layers) {
      layerX.set(layer, x);
      x += Math.max(...boxes.filter(b => b.t.layer === layer).map(b => b.w)) + LAYER_GAP;
    }
    const layerY = new Map<number, number>();
    const placed = boxes.map(b => {
      const y = layerY.get(b.t.layer) ?? 10;
      layerY.set(b.t.layer, y + b.h + BOX_GAP);
      return { ...b, x: layerX.get(b.t.layer) ?? 8, y };
    });

    const width = x - LAYER_GAP + 16;
    const height = Math.max(...placed.map(b => b.y + b.h)) + 12;

    // FK arrows: from the FK column's row (left edge of its box) to the right
    // edge of the target table's header — targets always sit in an earlier layer.
    const arrows: { x1: number; y1: number; x2: number; y2: number; label: string }[] = [];
    for (const b of placed) {
      b.t.columns.forEach((c, ci) => {
        if (!c.fkTable) return;
        const target = placed.find(p => p.t.name.toLowerCase() === c.fkTable!.toLowerCase());
        if (!target || target === b) return;
        arrows.push({
          x1: b.x,
          y1: b.y + HEAD_H + ci * ROW_H + ROW_H / 2,
          x2: target.x + target.w,
          y2: target.y + HEAD_H / 2 + 4,
          label: `${b.t.name}.${c.name} → ${target.t.name}`,
        });
      });
    }
    return { placed, arrows, width, height };
  }, [schema]);

  // Unparseable (or stub) schema: render nothing at all — the DDL text is still
  // on the page, and silence beats a wrong picture.
  if (!model) return null;

  return (
    <div>
      <h4 style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.75rem' }}>
        Schema Map
        <span style={{ marginLeft: '0.6rem', fontSize: '0.68rem', fontWeight: 500, color: 'hsl(var(--text-muted))' }}>
          PK = primary key · arrows follow foreign keys
        </span>
      </h4>
      <div style={{ overflowX: 'auto', border: '1px solid hsl(var(--border-color))', borderRadius: '8px', background: 'hsl(var(--bg-secondary) / 0.3)', padding: '0.5rem' }}>
        <svg
          width={model.width}
          height={model.height}
          role="img"
          aria-label={`Entity diagram: ${model.placed.map(b => b.t.name).join(', ')}${model.arrows.length > 0 ? '. Relations: ' + model.arrows.map(a => a.label).join('; ') : ''}`}
          style={{ display: 'block' }}
        >
          <defs>
            <marker id="er-arrowhead" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <path d="M 0 0 L 7 3.5 L 0 7 Z" fill="hsl(var(--accent))" />
            </marker>
          </defs>
          {/* Arrows under the boxes so line ends tuck cleanly beneath edges */}
          {model.arrows.map((a, i) => (
            <path
              key={i}
              d={`M ${a.x1} ${a.y1} C ${a.x1 - LAYER_GAP / 2} ${a.y1}, ${a.x2 + LAYER_GAP / 2} ${a.y2}, ${a.x2 + 2} ${a.y2}`}
              fill="none"
              stroke="hsl(var(--accent))"
              strokeWidth={1.5}
              markerEnd="url(#er-arrowhead)"
            >
              <title>{a.label}</title>
            </path>
          ))}
          {model.placed.map(b => (
            <g key={b.t.name}>
              <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={8} fill="hsl(var(--bg-tertiary))" stroke="hsl(var(--border-color))" />
              <rect x={b.x} y={b.y} width={b.w} height={HEAD_H} rx={8} fill="hsl(var(--primary-glow))" stroke="hsl(var(--border-color))" />
              {/* Square off the header's bottom corners (rx rounds all four) */}
              <rect x={b.x} y={b.y + HEAD_H - 8} width={b.w} height={8} fill="hsl(var(--primary-glow))" />
              <text x={b.x + 10} y={b.y + HEAD_H / 2 + 4} fontSize="11" fontWeight="700" fill="hsl(var(--text-primary))" fontFamily="var(--font-mono)">
                {b.t.name}
              </text>
              {b.t.columns.map((c, ci) => {
                const rowY = b.y + HEAD_H + ci * ROW_H + ROW_H / 2 + 3.5;
                return (
                  <g key={c.name}>
                    <text
                      x={b.x + 10}
                      y={rowY}
                      fontSize="10"
                      fontFamily="var(--font-mono)"
                      fontWeight={c.pk ? 700 : 400}
                      fill={c.fkTable ? 'hsl(var(--accent))' : c.pk ? 'hsl(var(--secondary))' : 'hsl(var(--text-secondary))'}
                    >
                      {c.name}
                      {c.pk ? ' PK' : ''}
                    </text>
                    <text x={b.x + b.w - 10} y={rowY} fontSize="9" textAnchor="end" fontFamily="var(--font-mono)" fill="hsl(var(--text-muted))">
                      {c.type.length > 14 ? `${c.type.slice(0, 13)}…` : c.type}
                    </text>
                  </g>
                );
              })}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
};
