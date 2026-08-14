import React from 'react';

interface PythonHighlighterProps {
  code: string;
  activeLine?: number;
}

export const PythonHighlighter: React.FC<PythonHighlighterProps> = ({ code, activeLine }) => {
  const highlightLine = (line: string): React.ReactNode[] => {
    // Regex matching:
    // 1. Comments: (#.*)
    // 2. Strings: ("[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*')
    // 3. Keywords: \b(def|class|return|if|else|elif|for|while|in|import|from|as|and|or|not|is|lambda|try|except|finally|pass|raise|with)\b
    // 4. Builtins/Self: \b(self|None|True|False|int|str|list|dict|set|tuple|len|print|max|min|range|append|reverseList|ListNode|Optional)\b
    // 5. Numbers: \b(\d+)\b
    const tokenRegex = /(#.*)|("[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*')|(\b(?:def|class|return|if|else|elif|for|while|in|import|from|as|and|or|not|is|lambda|try|except|finally|pass|raise|with)\b)|(\b(?:self|None|True|False|int|str|list|dict|set|tuple|len|print|max|min|range|append|reverseList|ListNode|Optional)\b)|(\b\d+\b)/g;

    const nodes: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = tokenRegex.exec(line)) !== null) {
      const matchIndex = match.index;
      const matchText = match[0];

      // Add unmatched preceding text
      if (matchIndex > lastIndex) {
        nodes.push(line.substring(lastIndex, matchIndex));
      }

      // Identify token type and add styled node
      if (match[1]) {
        // Comment -> Green!
        nodes.push(
          <span key={matchIndex} style={{ color: '#10b981', fontWeight: 500, fontStyle: 'italic' }}>
            {matchText}
          </span>
        );
      } else if (match[2]) {
        // String -> Amber
        nodes.push(
          <span key={matchIndex} style={{ color: '#fb923c' }}>
            {matchText}
          </span>
        );
      } else if (match[3]) {
        // Keyword -> Violet/Indigo
        nodes.push(
          <span key={matchIndex} style={{ color: '#818cf8', fontWeight: 600 }}>
            {matchText}
          </span>
        );
      } else if (match[4]) {
        // Builtins / Self -> Cyan
        nodes.push(
          <span key={matchIndex} style={{ color: '#22d3ee', fontWeight: 500 }}>
            {matchText}
          </span>
        );
      } else if (match[5]) {
        // Number -> Pink
        nodes.push(
          <span key={matchIndex} style={{ color: '#f472b6' }}>
            {matchText}
          </span>
        );
      }

      lastIndex = tokenRegex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < line.length) {
      nodes.push(line.substring(lastIndex));
    }

    return nodes;
  };

  const lines = code.split('\n');

  return (
    <pre 
      style={{ 
        margin: 0, 
        padding: '1.5rem', 
        overflow: 'auto', 
        fontFamily: 'var(--font-mono)', 
        fontSize: '0.85rem', 
        lineHeight: '1.6',
        color: '#f8fafc',
        background: '#090d16'
      }}
    >
      <code>
        {lines.map((line, idx) => {
          const isHighlighted = activeLine !== undefined && (idx + 1) === activeLine;
          return (
            <div 
              key={idx} 
              style={{ 
                minHeight: '1.25rem',
                background: isHighlighted ? 'rgba(34, 211, 238, 0.15)' : 'transparent',
                borderLeft: isHighlighted ? '3px solid hsl(var(--secondary))' : '3px solid transparent',
                paddingLeft: '0.5rem',
                marginLeft: '-0.5rem',
                transition: 'all 0.2s ease'
              }}
            >
              {highlightLine(line)}
            </div>
          );
        })}
      </code>
    </pre>
  );
};
