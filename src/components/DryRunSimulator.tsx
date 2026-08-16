import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, RotateCcw, Plus, Trash2, Save, Info, Check } from 'lucide-react';
import { PythonHighlighter } from './PythonHighlighter';
import { StepPrediction } from './StepPrediction';
import { RecursionTree } from './RecursionTree';
import { readJson, removeStoredValue, writeJson } from '../utils/persistence';

interface DryRunSimulatorProps {
  questionId: string;
  optimalCode: string;
  trace?: any[];
}

// Types for Manual Dry Run
interface ManualTraceRow {
  id: string;
  stepNum: number;
  lineNum: string;
  varValues: Record<string, string>;
  explanation: string;
}

interface ManualTraceData {
  testCase: string;
  variables: string[];
  rows: ManualTraceRow[];
}

export const DryRunSimulator: React.FC<DryRunSimulatorProps> = ({ questionId, optimalCode, trace }) => {
  const [activeTab, setActiveTab] = useState<'guided' | 'manual'>('guided');
  // "Quiz me" swaps passive watching for prediction. Off by default — the first
  // pass through a trace is for understanding; the quiz is for the second visit.
  const [quizMode, setQuizMode] = useState<boolean>(false);

  // GUIDED DRY RUN STATE
  const [guidedStep, setGuidedStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // MANAGE MANUAL DRY RUN STATE
  const [manualTestCase, setManualTestCase] = useState<string>('');
  const [customVarsInput, setCustomVarsInput] = useState<string>('i, j, temp');
  const [variablesList, setVariablesList] = useState<string[]>(['i', 'j', 'temp']);
  const [manualRows, setManualRows] = useState<ManualTraceRow[]>([]);
  const [isSavedNotify, setIsSavedNotify] = useState<boolean>(false);

  // Load manual trace from localStorage
  useEffect(() => {
    const parsed = readJson<ManualTraceData | null>(`manual-trace-${questionId}`, null);

    if (parsed) {
      setManualTestCase(parsed.testCase || '');
      setVariablesList(parsed.variables || ['i', 'j', 'temp']);
      setCustomVarsInput((parsed.variables || ['i', 'j', 'temp']).join(', '));
      setManualRows(parsed.rows || []);
    } else {
      // Default template
      setManualTestCase('nums = [1, 2, 3], target = 4');
      setVariablesList(['i', 'current_sum', 'ans']);
      setCustomVarsInput('i, current_sum, ans');
      setManualRows([
        {
          id: '1',
          stepNum: 1,
          lineNum: '2',
          varValues: { i: '0', current_sum: '1', ans: '[]' },
          explanation: 'Initialized variables. Start loop traversing array.'
        }
      ]);
    }
    setGuidedStep(0);
    setIsPlaying(false);
    setQuizMode(false);
  }, [questionId]);

  // Clean interval on unmount
  useEffect(() => {
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, []);

  // Set up auto play
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        handleGuidedForward();
      }, 2500);
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    }
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, guidedStep]);

  // Guided steps come exclusively from per-question trace data (dsaTraces.json).
  // Step schema: { line, desc, vars, matrix?, list?, array?, pointers?, links?, highlight?, flags? }
  const hasGuidedTrace = !!(trace && trace.length > 0);
  const steps = trace || [];
  const currentGuidedStepData = hasGuidedTrace && steps && steps.length > 0 && guidedStep < steps.length ? steps[guidedStep] : null;

  const handleGuidedForward = () => {
    if (!hasGuidedTrace) return;
    if (guidedStep < steps.length - 1) {
      setGuidedStep(s => s + 1);
    } else {
      setIsPlaying(false);
      setGuidedStep(0); // Loop back
    }
  };

  const handleGuidedBackward = () => {
    if (!hasGuidedTrace) return;
    if (guidedStep > 0) {
      setGuidedStep(s => s - 1);
    }
  };

  const handleGuidedReset = () => {
    setGuidedStep(0);
    setIsPlaying(false);
  };

  // MANUAL DRY RUN HANDLERS
  const handleUpdateVariablesList = () => {
    const list = customVarsInput
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    if (list.length > 0) {
      setVariablesList(list);
      // Adjust rows values
      const updatedRows = manualRows.map(row => {
        const nextVals: Record<string, string> = {};
        list.forEach(v => {
          nextVals[v] = row.varValues[v] || '';
        });
        return { ...row, varValues: nextVals };
      });
      setManualRows(updatedRows);
    }
  };

  const handleAddManualRow = () => {
    const newRowId = Math.random().toString(36).substring(2, 9);
    const nextStepNum = manualRows.length > 0 ? Math.max(...manualRows.map(r => r.stepNum)) + 1 : 1;
    const initialVals: Record<string, string> = {};
    variablesList.forEach(v => {
      initialVals[v] = '';
    });

    const newRow: ManualTraceRow = {
      id: newRowId,
      stepNum: nextStepNum,
      lineNum: '',
      varValues: initialVals,
      explanation: ''
    };
    setManualRows([...manualRows, newRow]);
  };

  const handleUpdateRowField = (id: string, field: 'lineNum' | 'explanation', value: string) => {
    setManualRows(rows =>
      rows.map(r => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const handleUpdateRowVar = (rowId: string, varName: string, value: string) => {
    setManualRows(rows =>
      rows.map(r => {
        if (r.id === rowId) {
          const nextVals = { ...r.varValues, [varName]: value };
          return { ...r, varValues: nextVals };
        }
        return r;
      })
    );
  };

  const handleDeleteRow = (id: string) => {
    setManualRows(rows => {
      const filtered = rows.filter(r => r.id !== id);
      // Re-index step numbers
      return filtered.map((r, idx) => ({ ...r, stepNum: idx + 1 }));
    });
  };

  const handleClearManualTrace = () => {
    if (window.confirm('Are you sure you want to clear your manual trace table?')) {
      setManualRows([]);
      removeStoredValue(`manual-trace-${questionId}`);
    }
  };

  const handleSaveManualTrace = () => {
    const data: ManualTraceData = {
      testCase: manualTestCase,
      variables: variablesList,
      rows: manualRows
    };
    writeJson(`manual-trace-${questionId}`, data);
    setIsSavedNotify(true);
    setTimeout(() => setIsSavedNotify(false), 2500);
  };

  // ---------- Generalized structure renderers for the guided player ----------
  // Any trace step may carry visual state, and several can coexist in one step:
  //   matrix  2D grid                     highlight/flags are [row, col] pairs
  //   array   1D cells with index labels  highlight is [index]
  //   list    linked list of circles      links {fromIdx: toIdx|null} draws → ← ×
  //   tree    LEVEL-ORDER array, children of i at 2i+1 / 2i+2, null = absent node
  //   stack   bottom-to-top column        stackLabel names it ("call stack", "queue")
  //   pointers {label: index|null}        drawn as coloured chips above the cell
  // `highlight` means "the algorithm is looking at this right now"; `flags` means
  // "already processed / marked", so the two read differently at a glance.
  const POINTER_COLORS = [
    { bg: 'hsl(var(--primary))', fg: 'white' },
    { bg: 'hsl(var(--secondary))', fg: 'black' },
    { bg: 'hsl(var(--accent))', fg: 'white' },
    { bg: '#f472b6', fg: 'black' },
    { bg: '#fb923c', fg: 'black' }
  ];

  const posKey = (p: any) => (Array.isArray(p) ? p.join(',') : String(p));

  const pointerChips = (names: string[], allNames: string[]) => (
    <div style={{ display: 'flex', gap: '0.15rem', height: '18px', alignItems: 'flex-end' }}>
      {names.map(p => {
        const c = POINTER_COLORS[allNames.indexOf(p) % POINTER_COLORS.length];
        return (
          <span key={p} style={{ background: c.bg, color: c.fg, padding: '0.05rem 0.25rem', borderRadius: '3px', fontSize: '0.55rem', fontWeight: 700 }}>
            {p}
          </span>
        );
      })}
    </div>
  );

  const renderMatrixView = (step: any) => {
    const matrix: any[][] = step.matrix;
    const cols = Math.max(...matrix.map((r: any[]) => r.length));
    const highlight = new Set<string>((step.highlight || []).map(posKey));
    const flags = new Set<string>((step.flags || []).map(posKey));
    const cellSize = cols > 8 ? 30 : 42;
    return (
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`, gap: '0.35rem' }}>
        {matrix.map((row: any[], rIdx: number) =>
          row.map((cell: any, cIdx: number) => {
            const key = `${rIdx},${cIdx}`;
            const isHi = highlight.has(key);
            const isFlag = flags.has(key);
            return (
              <div
                key={key}
                style={{
                  width: `${cellSize}px`,
                  height: `${cellSize}px`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: cols > 8 ? '0.7rem' : '0.85rem',
                  borderRadius: '4px',
                  fontFamily: 'var(--font-mono)',
                  background: isHi ? 'hsl(var(--hard) / 0.15)' : isFlag ? 'hsl(var(--primary-glow))' : 'hsl(var(--bg-tertiary))',
                  border: isHi ? '2px solid hsl(var(--hard))' : isFlag ? '1px dashed hsl(var(--primary))' : '1px solid hsl(var(--border-color))',
                  transition: 'all 0.2s ease',
                  color: isHi ? 'hsl(var(--hard))' : 'white'
                }}
              >
                {String(cell)}
              </div>
            );
          })
        )}
      </div>
    );
  };

  const renderListView = (step: any) => {
    const list: any[] = step.list;
    const pointers: Record<string, number | null> = step.pointers || {};
    const links: Record<string, number | null | undefined> = step.links || {};
    const pointerNames = Object.keys(pointers);
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', justifyContent: 'center' }}>
        {list.map((nodeVal: any, idx: number) => {
          const here = pointerNames.filter(p => pointers[p] === idx);
          const linkDefined = Object.prototype.hasOwnProperty.call(links, String(idx));
          const linkTarget = links[String(idx)];
          const activeColor = here.length > 0 ? POINTER_COLORS[pointerNames.indexOf(here[0]) % POINTER_COLORS.length].bg : 'hsl(var(--border-color))';
          return (
            <React.Fragment key={idx}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
                {pointerChips(here, pointerNames)}
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    border: '2px solid',
                    borderColor: activeColor,
                    background: here.length > 0 ? 'hsl(var(--secondary-glow))' : 'hsl(var(--bg-tertiary))',
                    color: 'white',
                    fontSize: '0.85rem'
                  }}
                >
                  {String(nodeVal)}
                </div>
              </div>
              {idx < list.length - 1 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '1.1rem',
                    fontWeight: linkDefined ? 800 : 'normal',
                    transition: 'all 0.2s ease',
                    color: linkDefined ? 'hsl(var(--primary))' : 'hsl(var(--text-muted))'
                  }}
                >
                  {linkTarget === null ? '×' : linkDefined ? '←' : '→'}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  const renderArrayView = (step: any) => {
    const arr: any[] = step.array;
    const pointers: Record<string, number | null> = step.pointers || {};
    const pointerNames = Object.keys(pointers);
    const highlight = new Set<string>((step.highlight || []).map(posKey));
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'flex-end', justifyContent: 'center' }}>
        {arr.map((val: any, idx: number) => {
          const here = pointerNames.filter(p => pointers[p] === idx);
          const isHi = highlight.has(String(idx));
          const ptrColor = here.length > 0 ? POINTER_COLORS[pointerNames.indexOf(here[0]) % POINTER_COLORS.length].bg : null;
          return (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
              {pointerChips(here, pointerNames)}
              <div
                style={{
                  minWidth: '34px',
                  height: '34px',
                  padding: '0 0.3rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  borderRadius: '4px',
                  fontFamily: 'var(--font-mono)',
                  background: isHi ? 'hsl(var(--secondary-glow))' : 'hsl(var(--bg-tertiary))',
                  border: isHi ? '2px solid hsl(var(--secondary))' : ptrColor ? `2px solid ${ptrColor}` : '1px solid hsl(var(--border-color))',
                  transition: 'all 0.2s ease',
                  color: 'white'
                }}
              >
                {String(val)}
              </div>
              <span style={{ fontSize: '0.55rem', color: 'hsl(var(--text-muted))', fontFamily: 'var(--font-mono)' }}>{idx}</span>
            </div>
          );
        })}
      </div>
    );
  };

  // Trees arrive as a LeetCode-style LEVEL-ORDER array: index i has children at 2i+1 and 2i+2,
  // and `null` marks an absent node. That keeps authoring identical to the matrix/array views
  // (highlight/flags are plain index lists) while still drawing a real tree on screen.
  const renderTreeView = (step: any) => {
    const nodes: any[] = step.tree;
    const highlight = new Set<string>((step.highlight || []).map(posKey));
    const flags = new Set<string>((step.flags || []).map(posKey));

    const present = nodes.map((v, i) => (v === null || v === undefined ? -1 : i)).filter(i => i >= 0);
    if (present.length === 0) {
      return <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))' }}>Empty tree (None)</span>;
    }

    const depthOf = (i: number) => Math.floor(Math.log2(i + 1));
    const maxDepth = Math.max(...present.map(depthOf));
    // Lay every level out over the full width of its slot count so siblings never collide.
    const slots = Math.pow(2, maxDepth);
    const nodeSize = slots > 8 ? 30 : 38;
    const gap = slots > 8 ? 8 : 14;
    const width = slots * (nodeSize + gap);
    const levelH = nodeSize + 34;
    const height = (maxDepth + 1) * levelH - (levelH - nodeSize);

    const centerOf = (i: number) => {
      const d = depthOf(i);
      const posInLevel = i - (Math.pow(2, d) - 1);
      const span = width / Math.pow(2, d);
      return { x: span * (posInLevel + 0.5), y: d * levelH + nodeSize / 2 };
    };

    return (
      <div style={{ overflowX: 'auto', maxWidth: '100%', padding: '0.25rem 0' }}>
        <div style={{ position: 'relative', width: `${width}px`, height: `${height}px`, margin: '0 auto' }}>
          <svg width={width} height={height} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            {present.map(i => {
              const p = centerOf(i);
              return [2 * i + 1, 2 * i + 2].map(childIdx => {
                if (childIdx >= nodes.length) return null;
                if (nodes[childIdx] === null || nodes[childIdx] === undefined) return null;
                const c = centerOf(childIdx);
                // An edge into the highlighted node is the one the walk just traversed.
                const active = highlight.has(String(childIdx)) || highlight.has(String(i));
                return (
                  <line
                    key={`${i}-${childIdx}`}
                    x1={p.x} y1={p.y} x2={c.x} y2={c.y}
                    stroke={active ? 'hsl(var(--primary))' : 'hsl(var(--border-color))'}
                    strokeWidth={active ? 2.5 : 1.5}
                  />
                );
              });
            })}
          </svg>
          {present.map(i => {
            const { x, y } = centerOf(i);
            const isHi = highlight.has(String(i));
            const isFlag = flags.has(String(i));
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: `${x - nodeSize / 2}px`,
                  top: `${y - nodeSize / 2}px`,
                  width: `${nodeSize}px`,
                  height: `${nodeSize}px`,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  fontSize: slots > 8 ? '0.65rem' : '0.8rem',
                  color: isHi ? 'hsl(var(--hard))' : 'white',
                  background: isHi ? 'hsl(var(--hard) / 0.15)' : isFlag ? 'hsl(var(--primary-glow))' : 'hsl(var(--bg-tertiary))',
                  border: isHi ? '2px solid hsl(var(--hard))' : isFlag ? '2px dashed hsl(var(--primary))' : '1px solid hsl(var(--border-color))',
                  transition: 'all 0.2s ease'
                }}
              >
                {String(nodes[i])}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // A stack/queue grows and shrinks at one end, so it reads far better vertically (top of the
  // stack on top) than as a flat row. `stack` is bottom-to-top; `label` names it (e.g. "call stack").
  const renderStackView = (step: any) => {
    const items: any[] = step.stack;
    const label: string = step.stackLabel || 'stack';
    const highlight = new Set<string>((step.highlight || []).map(posKey));
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
        <span style={{ fontSize: '0.6rem', color: 'hsl(var(--text-muted))', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label} {items.length > 0 ? `· top = ${String(items[items.length - 1])}` : '· empty'}
        </span>
        <div style={{ display: 'flex', flexDirection: 'column-reverse', gap: '0.25rem', minHeight: '34px' }}>
          {items.length === 0 && (
            <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', fontFamily: 'var(--font-mono)', padding: '0.4rem 1rem', border: '1px dashed hsl(var(--border-color))', borderRadius: '4px' }}>
              (empty)
            </div>
          )}
          {items.map((val: any, idx: number) => {
            const isHi = highlight.has(String(idx));
            const isTop = idx === items.length - 1;
            return (
              <div
                key={idx}
                style={{
                  minWidth: '74px',
                  padding: '0.3rem 0.6rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  borderRadius: '4px',
                  color: 'white',
                  background: isHi ? 'hsl(var(--secondary-glow))' : 'hsl(var(--bg-tertiary))',
                  border: isHi
                    ? '2px solid hsl(var(--secondary))'
                    : isTop
                      ? '2px solid hsl(var(--primary))'
                      : '1px solid hsl(var(--border-color))',
                  transition: 'all 0.2s ease'
                }}
              >
                {String(val)}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderVarsView = (step: any) => {
    if (!step || !step.vars) {
      return <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))' }}>No active state data</span>;
    }

    const varEntries = Object.entries(step.vars);
    const arrayVars: { name: string; type: 'array' | 'matrix'; data: any[] }[] = [];
    const scalarVars: { name: string; value: any }[] = [];

    varEntries.forEach(([name, val]) => {
      const valStr = String(val);
      if (valStr.startsWith('[') && valStr.endsWith(']')) {
        try {
          if (valStr.startsWith('[[') && valStr.endsWith(']]')) {
            const parsed = JSON.parse(valStr);
            arrayVars.push({ name, type: 'matrix', data: parsed });
          } else {
            const parsed = JSON.parse(valStr);
            arrayVars.push({ name, type: 'array', data: parsed });
          }
        } catch (e) {
          const stripped = valStr.replace(/^\[|\]$/g, '');
          if (stripped === '') {
            arrayVars.push({ name, type: 'array', data: [] });
          } else {
            const parts = stripped.split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
            arrayVars.push({ name, type: 'array', data: parts });
          }
        }
      } else {
        scalarVars.push({ name, value: val });
      }
    });

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', width: '100%', alignItems: 'center' }}>
        {arrayVars.map((arrVar) => (
          <div
            key={arrVar.name}
            style={{
              background: 'hsl(var(--bg-secondary) / 0.4)',
              padding: '0.65rem 1rem',
              borderRadius: '8px',
              border: '1px solid hsl(var(--border-color))',
              width: '90%',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem'
            }}
          >
            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'hsl(var(--secondary))', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
              {arrVar.name} ({arrVar.type})
            </div>
            {arrVar.type === 'array' ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center' }}>
                {arrVar.data.length === 0 ? (
                  <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', fontFamily: 'var(--font-mono)' }}>[]</span>
                ) : (
                  arrVar.data.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem' }}>
                      <div
                        style={{
                          background: 'hsl(var(--bg-tertiary))',
                          border: '1px solid hsl(var(--border-color))',
                          borderRadius: '4px',
                          padding: '0.3rem 0.55rem',
                          fontSize: '0.8rem',
                          fontFamily: 'var(--font-mono)',
                          minWidth: '28px',
                          textAlign: 'center',
                          color: 'white',
                          fontWeight: 600
                        }}
                      >
                        {String(item)}
                      </div>
                      <span style={{ fontSize: '0.55rem', color: 'hsl(var(--text-muted))', fontFamily: 'var(--font-mono)' }}>{idx}</span>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.2rem' }}>
                {arrVar.data.map((row: any[], rIdx: number) => (
                  <div key={rIdx} style={{ display: 'flex', gap: '0.25rem' }}>
                    {row.map((item: any, cIdx: number) => (
                      <div
                        key={cIdx}
                        style={{
                          background: 'hsl(var(--bg-tertiary))',
                          border: '1px solid hsl(var(--border-color))',
                          borderRadius: '4px',
                          width: '28px',
                          height: '28px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontFamily: 'var(--font-mono)',
                          color: 'white',
                          fontWeight: 600
                        }}
                      >
                        {String(item)}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {scalarVars.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', justifyContent: 'center', width: '90%', marginTop: '0.25rem' }}>
            {scalarVars.map((v) => (
              <div
                key={v.name}
                style={{
                  background: 'hsl(var(--bg-secondary) / 0.2)',
                  border: '1px dashed hsl(var(--border-color))',
                  borderRadius: '6px',
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.75rem',
                  display: 'flex',
                  gap: '0.35rem',
                  alignItems: 'center'
                }}
              >
                <span style={{ color: 'hsl(var(--text-secondary))', fontFamily: 'var(--font-mono)' }}>{v.name}:</span>
                <span style={{ color: 'hsl(var(--accent))', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{String(v.value)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderStructureVisualizer = () => {
    const step: any = currentGuidedStepData;
    if (!step) {
      return <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))' }}>No active state data</span>;
    }
    const hasStructure = step.matrix || step.list || step.array || step.tree || step.stack;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
        {step.tree && renderTreeView(step)}
        {step.matrix && renderMatrixView(step)}
        {step.list && renderListView(step)}
        {step.array && renderArrayView(step)}
        {step.stack && renderStackView(step)}
        {/* Named scalars stay useful alongside a structure: they carry the answer being built
            up (max_depth, count, result) that the drawing itself cannot show. */}
        {hasStructure && step.vars && Object.keys(step.vars).length > 0 && renderVarsView(step)}
        {!hasStructure && renderVarsView(step)}
      </div>
    );
  };

  return (
    <div className="glass" style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid hsl(var(--border-color))' }}>
      {/* Header bar with tabs */}
      <div 
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'hsl(var(--bg-secondary) / 0.5)',
          padding: '0.75rem 1.5rem',
          borderBottom: '1px solid hsl(var(--border-color))',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}
      >
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'hsl(var(--secondary))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Interactive Dry Run Simulator
          </span>
        </div>

        {/* "Quiz me" flips the guided player from watching to predicting — recognising
            a state as it scrolls past is not the same as producing it first. */}
        {activeTab === 'guided' && hasGuidedTrace && (
          <button
            className={`btn ${quizMode ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.35rem 1rem', fontSize: '0.75rem' }}
            aria-pressed={quizMode}
            onClick={() => setQuizMode(v => !v)}
          >
            Quiz me
          </button>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', background: 'hsl(var(--bg-tertiary))', padding: '0.2rem', borderRadius: '6px' }}>
          <button 
            className={`btn ${activeTab === 'guided' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.35rem 1rem', fontSize: '0.75rem', border: 'none', borderRadius: '4px' }}
            onClick={() => setActiveTab('guided')}
          >
            Guided Code Tracer {hasGuidedTrace && '🔥'}
          </button>
          <button 
            className={`btn ${activeTab === 'manual' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.35rem 1rem', fontSize: '0.75rem', border: 'none', borderRadius: '4px' }}
            onClick={() => setActiveTab('manual')}
          >
            Manual Trace Workspace
          </button>
        </div>
      </div>

      {/* TABS CONTAINER */}
      {activeTab === 'guided' ? (
        /* GUIDED DRY RUN TAB */
        !hasGuidedTrace ? (
          /* Guided Not Available Fallback */
          <div style={{ padding: '3rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
            <div style={{ background: 'hsl(var(--primary-glow))', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', fontSize: '1.25rem', justifyContent: 'center' }}>
              🔬
            </div>
            <div>
              <h4 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.25rem' }}>Guided Player Unavailable</h4>
              <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', maxWidth: '480px', margin: '0 auto', lineHeight: '1.5' }}>
                This problem does not have a guided step-by-step simulation yet.
                Use the <strong>Manual Trace Workspace</strong> tab to document and trace your code step-by-step!
              </p>
            </div>
            <button 
              className="btn btn-secondary" 
              style={{ fontSize: '0.75rem', padding: '0.45rem 1rem' }}
              onClick={() => setActiveTab('manual')}
            >
              Open Manual Workspace
            </button>
          </div>
        ) : (
          /* Guided Visualizer Player */
          <>
          {quizMode && <StepPrediction key={questionId} trace={steps} code={optimalCode} />}
          <div 
            style={{ 
              display: 'grid', 
              gridTemplateColumns: '1.2fr 1fr', 
              borderBottom: 'none'
            }}
            className="guided-grid-split"
          >
            {/* Left Column: Code Highlighter with highlighted line */}
            <div style={{ overflow: 'hidden' }}>
              <div 
                style={{ 
                  background: 'hsl(var(--bg-secondary) / 0.3)', 
                  padding: '0.5rem 1.5rem', 
                  fontSize: '0.75rem', 
                  fontWeight: 600, 
                  borderBottom: '1px solid hsl(var(--border-color))',
                  color: 'hsl(var(--text-secondary))'
                }}
              >
                OPTIMAL APPROACH CODE (HIGHLIGHTED EXECUTION)
              </div>
              <div style={{ maxHeight: '460px', overflowY: 'auto' }}>
                <PythonHighlighter 
                  code={optimalCode} 
                  activeLine={currentGuidedStepData?.line} 
                />
              </div>
            </div>

            {/* Right Column: Steps, Variable tables and visual structure */}
            <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '490px' }}>
              {/* Control Deck */}
              <div 
                style={{ 
                  padding: '1rem', 
                  borderBottom: '1px solid hsl(var(--border-color))',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'hsl(var(--bg-secondary) / 0.15)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="badge" style={{ background: 'hsl(var(--secondary) / 0.15)', color: 'hsl(var(--secondary))', fontWeight: 700 }}>
                    Step {guidedStep + 1} of {steps.length}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '0.35rem 0.5rem' }} 
                    disabled={guidedStep === 0} 
                    onClick={handleGuidedBackward}
                    title="Previous Step"
                  >
                    <SkipBack size={12} />
                  </button>

                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '0.35rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }} 
                    onClick={() => setIsPlaying(!isPlaying)}
                    title={isPlaying ? 'Pause Autoplay' : 'Play Autoplay'}
                  >
                    {isPlaying ? <Pause size={12} fill="white" /> : <Play size={12} fill="white" />}
                    <span style={{ fontSize: '0.7rem' }}>{isPlaying ? 'Pause' : 'Auto'}</span>
                  </button>

                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '0.35rem 0.5rem' }} 
                    disabled={guidedStep === steps.length - 1} 
                    onClick={handleGuidedForward}
                    title="Next Step"
                  >
                    <SkipForward size={12} />
                  </button>

                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '0.35rem 0.5rem' }} 
                    onClick={handleGuidedReset}
                    title="Reset Trace"
                  >
                    <RotateCcw size={12} />
                  </button>
                </div>
              </div>

              {/* Step Description */}
              <div 
                style={{ 
                  padding: '1rem 1.25rem', 
                  background: 'hsl(var(--secondary-glow))', 
                  borderBottom: '1px solid hsl(var(--border-color))',
                  minHeight: '80px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem'
                }}
              >
                <Info size={16} style={{ color: 'hsl(var(--secondary))', marginTop: '0.15rem', flexShrink: 0 }} />
                <div style={{ fontSize: '0.85rem', lineHeight: '1.5', color: 'hsl(var(--text-primary))' }}>
                  {currentGuidedStepData?.desc}
                </div>
              </div>

              {/* Middle Section: Variables Table */}
              <div 
                style={{ 
                  padding: '0.75rem 1.25rem', 
                  background: 'hsl(var(--bg-secondary) / 0.1)', 
                  borderBottom: '1px solid hsl(var(--border-color))' 
                }}
              >
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>
                  Active Variable Register
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {currentGuidedStepData && Object.entries(currentGuidedStepData.vars).map(([name, val]) => (
                    <div 
                      key={name}
                      style={{
                        background: 'hsl(var(--bg-tertiary))',
                        border: '1px solid hsl(var(--border-color))',
                        borderRadius: '6px',
                        padding: '0.3rem 0.6rem',
                        fontSize: '0.8rem',
                        fontFamily: 'var(--font-mono)',
                        display: 'flex',
                        gap: '0.4rem',
                        alignItems: 'center'
                      }}
                    >
                      <span style={{ color: 'hsl(var(--text-secondary))' }}>{name}:</span>
                      <span style={{ color: 'hsl(var(--secondary))', fontWeight: 700 }}>{String(val)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Section: Structure Visualizer */}
              <div style={{ flex: 1, padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto' }}>
                {renderStructureVisualizer()}
              </div>
            </div>
          </div>
          <RecursionTree trace={steps} currentStep={guidedStep} />
          </>
        )
      ) : (
        /* MANUAL DRY RUN TAB */
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Deck Configuration */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }} className="guided-grid-split">
            {/* Test Case Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'hsl(var(--text-secondary))' }}>
                1. Define Dry-Run Test Case Input
              </label>
              <input 
                type="text" 
                placeholder="e.g. matrix = [[1, 0], [1, 1]]"
                className="input-search"
                style={{ width: '100%', padding: '0.55rem 1rem' }}
                value={manualTestCase}
                onChange={(e) => setManualTestCase(e.target.value)}
              />
            </div>

            {/* Custom Variables Deck */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'hsl(var(--text-secondary))' }}>
                2. Declare Tracking Variables (comma-separated)
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  placeholder="e.g. i, j, col0, prev"
                  className="input-search"
                  style={{ flex: 1, padding: '0.55rem 1rem' }}
                  value={customVarsInput}
                  onChange={(e) => setCustomVarsInput(e.target.value)}
                />
                <button 
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '0.55rem 1rem' }}
                  onClick={handleUpdateVariablesList}
                >
                  Set Columns
                </button>
              </div>
            </div>
          </div>

          {/* Tracer Table Workspace */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Step-by-Step State Tracer Grid
              </span>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  className="btn btn-secondary"
                  style={{ fontSize: '0.7rem', padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  onClick={handleAddManualRow}
                >
                  <Plus size={10} /> Add Trace Row
                </button>
                <button 
                  className="btn btn-secondary"
                  style={{ fontSize: '0.7rem', padding: '0.35rem 0.75rem', color: 'hsl(var(--hard))', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  onClick={handleClearManualTrace}
                >
                  <Trash2 size={10} /> Clear Grid
                </button>
                <button 
                  className="btn btn-primary"
                  style={{ fontSize: '0.7rem', padding: '0.35rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  onClick={handleSaveManualTrace}
                >
                  {isSavedNotify ? <Check size={10} /> : <Save size={10} />}
                  <span>{isSavedNotify ? 'Saved!' : 'Save Workspace'}</span>
                </button>
              </div>
            </div>

            {/* Grid display */}
            <div 
              style={{ 
                border: '1px solid hsl(var(--border-color))', 
                borderRadius: '8px', 
                overflowX: 'auto',
                background: 'hsl(var(--bg-secondary) / 0.1)'
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'hsl(var(--bg-secondary) / 0.8)', borderBottom: '1px solid hsl(var(--border-color))' }}>
                    <th style={{ padding: '0.5rem 0.75rem', width: '60px' }}>Step</th>
                    <th style={{ padding: '0.5rem 0.75rem', width: '100px' }}>Line #</th>
                    {variablesList.map(v => (
                      <th key={v} style={{ padding: '0.5rem 0.75rem', fontFamily: 'var(--font-mono)', minWidth: '100px' }}>
                        {v}
                      </th>
                    ))}
                    <th style={{ padding: '0.5rem 0.75rem' }}>Explanation / State Change description</th>
                    <th style={{ padding: '0.5rem 0.75rem', width: '60px', textAlign: 'center' }}>Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {manualRows.length === 0 ? (
                    <tr>
                      <td colSpan={3 + variablesList.length} style={{ padding: '2rem', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                        Grid is empty. Click "Add Trace Row" above to start dry-running this question!
                      </td>
                    </tr>
                  ) : (
                    manualRows.map(row => (
                      <tr 
                        key={row.id}
                        style={{ borderBottom: '1px solid hsl(var(--border-color) / 0.5)', transition: 'background 0.2s ease' }}
                        className="tracer-row"
                      >
                        <td style={{ padding: '0.5rem 0.75rem', fontWeight: 'bold', color: 'hsl(var(--text-muted))' }}>
                          {row.stepNum}
                        </td>
                        <td style={{ padding: '0.25rem 0.5rem' }}>
                          <input 
                            type="text"
                            placeholder="e.g. 5"
                            value={row.lineNum}
                            onChange={(e) => handleUpdateRowField(row.id, 'lineNum', e.target.value)}
                            style={{ 
                              width: '100%', 
                              background: 'transparent', 
                              border: 'none', 
                              color: 'white', 
                              outline: 'none',
                              fontFamily: 'var(--font-mono)'
                            }}
                          />
                        </td>
                        {variablesList.map(v => (
                          <td key={v} style={{ padding: '0.25rem 0.5rem' }}>
                            <input 
                              type="text"
                              placeholder="-"
                              value={row.varValues[v] || ''}
                              onChange={(e) => handleUpdateRowVar(row.id, v, e.target.value)}
                              style={{ 
                                width: '100%', 
                                background: 'transparent', 
                                border: 'none', 
                                color: 'hsl(var(--secondary))', 
                                outline: 'none',
                                fontFamily: 'var(--font-mono)'
                              }}
                            />
                          </td>
                        ))}
                        <td style={{ padding: '0.25rem 0.5rem' }}>
                          <input 
                            type="text"
                            placeholder="Describe loop iteration, pointer swaps, condition checks..."
                            value={row.explanation}
                            onChange={(e) => handleUpdateRowField(row.id, 'explanation', e.target.value)}
                            style={{ 
                              width: '100%', 
                              background: 'transparent', 
                              border: 'none', 
                              color: 'white', 
                              outline: 'none'
                            }}
                          />
                        </td>
                        <td style={{ padding: '0.25rem 0.5rem', textAlign: 'center' }}>
                          <button
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--hard) / 0.6)' }}
                            onClick={() => handleDeleteRow(row.id)}
                            onMouseEnter={(e) => e.currentTarget.style.color = 'hsl(var(--hard))'}
                            onMouseLeave={(e) => e.currentTarget.style.color = 'hsl(var(--hard) / 0.6)'}
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
