import React, { useState, useEffect } from 'react';
import { SkipForward, RotateCcw, AlertCircle } from 'lucide-react';

interface VisualizerProps {
  problemId: string; // 'dsa-1' (Matrix) or 'dsa-2' (Linked List)
}

export const Visualizer: React.FC<VisualizerProps> = ({ problemId }) => {
  const [step, setStep] = useState<number>(0);
  
  // Matrix Visualizer State (dsa-1)
  const initialMatrix = [
    [1, 1, 1, 1],
    [1, 0, 1, 1],
    [1, 1, 1, 0]
  ];
  const [matrix, setMatrix] = useState<number[][]>(initialMatrix);
  const [matrixState, setMatrixState] = useState<string>('Initial Matrix');

  // Linked List Visualizer State (dsa-2)
  interface ListNode {
    val: number;
    next: number | null;
  }
  const initialNodes: ListNode[] = [
    { val: 1, next: 1 },
    { val: 2, next: 2 },
    { val: 3, next: 3 },
    { val: 4, next: 4 },
    { val: 5, next: null }
  ];
  const [nodes, setNodes] = useState<ListNode[]>(initialNodes);
  const [pointers, setPointers] = useState<{ prev: number | null; curr: number | null; nextTemp: number | null }>({
    prev: null,
    curr: 0,
    nextTemp: null
  });
  const [listState, setListState] = useState<string>('Start: prev=NULL, curr=Node 1');

  // Reset visualizer on problem change
  useEffect(() => {
    resetVisualizer();
  }, [problemId]);

  const resetVisualizer = () => {
    setStep(0);
    if (problemId === 'dsa-1') {
      setMatrix(JSON.parse(JSON.stringify(initialMatrix)));
      setMatrixState('Initial Matrix');
    } else if (problemId === 'dsa-2') {
      const resetList = JSON.parse(JSON.stringify(initialNodes));
      setNodes(resetList);
      setPointers({ prev: null, curr: 0, nextTemp: null });
      setListState('Start: prev=NULL, curr=Node 1');
    }
  };

  const handleNextStep = () => {
    if (problemId === 'dsa-1') {
      // Step-by-step set matrix zeroes (Optimal)
      if (step === 0) {
        setMatrixState('Step 1: Check row 0 and col 0 flags. Set markers in first row/col.');
        const nextMat = [...matrix];
        // Set flags
        nextMat[0][1] = 0; // matrix[0][3] is already 0
        nextMat[1][0] = 0; // row 1 has 0
        nextMat[2][0] = 0; // row 2 has 0
        setMatrix(nextMat);
        setStep(1);
      } else if (step === 1) {
        setMatrixState('Step 2: Update inner cells (index > 0) using first row/col markers.');
        const nextMat = [
          [1, 1, 1, 1],
          [0, 0, 1, 0], // row 1 col 1 set, row 1 col 3 set
          [0, 1, 1, 0]  // row 2 col 0 marker zeroed it
        ];
        setMatrix(nextMat);
        setStep(2);
      } else if (step === 2) {
        setMatrixState('Step 3: Update first row and first column using markers.');
        const nextMat = [
          [1, 0, 1, 0],
          [0, 0, 1, 0],
          [0, 0, 0, 0]
        ];
        setMatrix(nextMat);
        setStep(3);
      }
    } else if (problemId === 'dsa-2') {
      // Step-by-step reverse linked list (Optimal pointer swap)
      const currentIdx = pointers.curr;
      if (currentIdx === null) return;

      const nextTempIdx = nodes[currentIdx].next;

      if (step % 4 === 0) {
        // Step A: Save next
        setPointers(p => ({ ...p, nextTemp: nextTempIdx }));
        setListState(`Step ${Math.floor(step/4) + 1}.A: Save next reference. nextTemp = Node ${nextTempIdx !== null ? nextTempIdx + 1 : 'NULL'}`);
        setStep(s => s + 1);
      } else if (step % 4 === 1) {
        // Step B: Reverse link
        const updatedNodes = [...nodes];
        updatedNodes[currentIdx].next = pointers.prev;
        setNodes(updatedNodes);
        setListState(`Step ${Math.floor(step/4) + 1}.B: Reverse current node link. Node ${currentIdx + 1}.next = Node ${pointers.prev !== null ? pointers.prev + 1 : 'NULL'}`);
        setStep(s => s + 1);
      } else if (step % 4 === 2) {
        // Step C: Shift prev forward
        setPointers(p => ({ ...p, prev: currentIdx }));
        setListState(`Step ${Math.floor(step/4) + 1}.C: Move prev pointer forward. prev = Node ${currentIdx + 1}`);
        setStep(s => s + 1);
      } else if (step % 4 === 3) {
        // Step D: Shift curr forward
        setPointers(p => ({ ...p, curr: p.nextTemp, nextTemp: null }));
        setListState(`Step ${Math.floor(step/4) + 1}.D: Move curr pointer forward. curr = Node ${nextTempIdx !== null ? nextTempIdx + 1 : 'NULL'}`);
        setStep(s => s + 1);
      }
    }
  };

  return (
    <div className="visualizer-box glass" style={{ width: '100%' }}>
      <div 
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid hsl(var(--border-color))',
          paddingBottom: '0.75rem',
          marginBottom: '1rem'
        }}
      >
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'hsl(var(--secondary))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Interactive Algorithm Visualizer
        </span>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className="btn btn-secondary" 
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
            onClick={handleNextStep}
            disabled={problemId === 'dsa-1' ? step >= 3 : pointers.curr === null && step % 4 === 0}
          >
            <SkipForward size={12} /> Next Step
          </button>
          <button 
            className="btn btn-secondary" 
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
            onClick={resetVisualizer}
          >
            <RotateCcw size={12} /> Reset
          </button>
        </div>
      </div>

      {problemId === 'dsa-1' ? (
        /* Matrix Visualizer View */
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '100%' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 50px)', gap: '0.5rem' }}>
            {matrix.map((row, rIdx) => 
              row.map((cell, cIdx) => {
                const isFlagCell = rIdx === 0 || cIdx === 0;
                return (
                  <div
                    key={`${rIdx}-${cIdx}`}
                    style={{
                      width: '50px',
                      height: '50px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      borderRadius: '6px',
                      background: cell === 0 
                        ? 'hsl(var(--hard) / 0.2)' 
                        : isFlagCell 
                          ? 'hsl(var(--primary-glow))' 
                          : 'hsl(var(--bg-tertiary))',
                      border: cell === 0 
                        ? '2px solid hsl(var(--hard))' 
                        : isFlagCell 
                          ? '1px dashed hsl(var(--primary))' 
                          : '1px solid hsl(var(--border-color))',
                      transition: 'all var(--transition-smooth)'
                    }}
                  >
                    {cell}
                  </div>
                );
              })
            )}
          </div>
          <div 
            style={{
              fontSize: '0.85rem',
              color: 'hsl(var(--text-secondary))',
              background: 'hsl(var(--bg-secondary))',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              textAlign: 'center',
              border: '1px solid hsl(var(--border-color))',
              width: '100%'
            }}
          >
            {matrixState}
          </div>
        </div>
      ) : problemId === 'dsa-2' ? (
        /* Linked List Visualizer View */
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', width: '100%' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'center' }}>
            {nodes.map((node, idx) => {
              const isCurr = pointers.curr === idx;
              const isPrev = pointers.prev === idx;
              const isNextTemp = pointers.nextTemp === idx;

              return (
                <React.Fragment key={idx}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    {/* Pointer tags */}
                    <div style={{ display: 'flex', gap: '0.25rem', height: '20px', alignItems: 'flex-end' }}>
                      {isPrev && <span style={{ background: 'hsl(var(--primary))', color: 'white', padding: '0.1rem 0.35rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 600 }}>prev</span>}
                      {isCurr && <span style={{ background: 'hsl(var(--secondary))', color: 'black', padding: '0.1rem 0.35rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 600 }}>curr</span>}
                      {isNextTemp && <span style={{ background: 'hsl(var(--accent))', color: 'white', padding: '0.1rem 0.35rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 600 }}>next</span>}
                    </div>

                    <div 
                      className={`node ${isCurr ? 'active' : ''}`}
                      style={{
                        borderColor: isPrev 
                          ? 'hsl(var(--primary))' 
                          : isNextTemp 
                            ? 'hsl(var(--accent))' 
                            : 'hsl(var(--border-color))'
                      }}
                    >
                      {node.val}
                    </div>
                  </div>

                  {idx < nodes.length - 1 && (
                    <div 
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: '1.25rem',
                        color: 'hsl(var(--text-muted))',
                        transform: node.next === null ? 'rotate(180deg)' : 'none',
                        transition: 'transform var(--transition-smooth)'
                      }}
                    >
                      →
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          <div 
            style={{
              fontSize: '0.85rem',
              color: 'hsl(var(--text-secondary))',
              background: 'hsl(var(--bg-secondary))',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              textAlign: 'center',
              border: '1px solid hsl(var(--border-color))',
              width: '100%'
            }}
          >
            {listState}
          </div>
        </div>
      ) : (
        <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>
          <AlertCircle size={16} /> Select a problem (Set Matrix Zeroes or Reverse Linked List) to launch the step-by-step simulation.
        </div>
      )}
    </div>
  );
};
