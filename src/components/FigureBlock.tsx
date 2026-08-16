import React from 'react';
import figures from '../data/figures.json';

interface FigureBlockProps {
  /** Lookup key: "<subjectId>:<section title>:<index>" or "dsa:<Topic>:<index>". */
  figKey: string;
}

/**
 * Inline SVG figures for the concepts prose struggles with — drawn in-house
 * instead of hotlinking GeeksforGeeks/StackOverflow images, because embedded
 * copies of other people's diagrams rot when URLs die, vanish offline (this is
 * a PWA), and aren't ours to ship. These are: theme-aware (they use CSS tokens),
 * printable, and validated at build time (parseable, scriptless, no external
 * references) by validate_figures.py before they ever reach this component.
 */
const TOKEN_STYLE: React.CSSProperties = {
  // The figure palette maps to the app's own tokens, so one SVG reads correctly
  // in dark, light, and high-contrast themes alike.
  ['--fig-primary' as string]: 'hsl(var(--primary))',
  ['--fig-secondary' as string]: 'hsl(var(--secondary))',
  ['--fig-muted' as string]: 'hsl(var(--text-muted))',
  ['--fig-surface' as string]: 'hsl(var(--bg-tertiary))',
  color: 'hsl(var(--text-secondary))', // currentColor inside the SVG
};

/** Runtime backstop behind the build-time validator: cheap, decisive checks only. */
const safe = (svg: string) =>
  svg.startsWith('<svg') &&
  !/<script|foreignObject|javascript:|\son[a-z]+=/i.test(svg) &&
  !/https?:\/\/(?!www\.w3\.org)/i.test(svg);

export const FigureBlock: React.FC<FigureBlockProps> = ({ figKey }) => {
  const fig = (figures as Record<string, { title: string; caption: string; svg: string }>)[figKey];
  if (!fig || !safe(fig.svg)) return null;
  return (
    <figure
      className="glass"
      style={{
        margin: '1rem 0 0',
        padding: '1.25rem',
        borderRadius: '12px',
        border: '1px solid hsl(var(--border-color))',
        ...TOKEN_STYLE,
      }}
    >
      <figcaption
        style={{
          fontSize: '0.78rem',
          fontWeight: 700,
          marginBottom: '0.75rem',
          color: 'hsl(var(--text-primary))',
        }}
      >
        {fig.title}
      </figcaption>
      <div
        role="img"
        aria-label={fig.caption}
        style={{ maxWidth: '100%', overflowX: 'auto' }}
        dangerouslySetInnerHTML={{ __html: fig.svg }}
      />
      <figcaption style={{ fontSize: '0.72rem', marginTop: '0.6rem', color: 'hsl(var(--text-muted))', lineHeight: 1.5 }}>
        {fig.caption}
      </figcaption>
    </figure>
  );
};
