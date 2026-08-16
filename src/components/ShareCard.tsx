import React, { useEffect, useMemo, useState } from 'react';
import { Share2, Download, Image } from 'lucide-react';
import { dsaQuestions } from '../data/dsaQuestions';

/**
 * "Share your progress" — a 1200x630 PNG drawn on a canvas, sized like an OG image so it
 * lands cleanly in chats and feeds. A streak someone can show a friend is a streak they
 * keep; the card is accountability disguised as bragging.
 *
 * Drawn, not screenshotted: a canvas render is deterministic, includes exactly what we
 * choose (no stray UI), and needs no permissions. Colors are read from the live CSS
 * tokens so the card always matches the site's palette instead of hardcoding a copy
 * that drifts.
 */

interface ShareCardProps {
  dsaSolvedCount: number;
  dsaTotalCount: number;
  sqlSolvedCount: number;
  sqlTotalCount: number;
  streak: number;
  solvedDsaIds: string[];
}

const W = 1200;
const H = 630;
const SITE_NAME = 'Striver SDE Sheet & SQL Top 50';

/** Resolve a design token ("--easy" → "hsl(142 70% 45%)") at draw time, with an alpha
 *  knob. Falls back to a neutral so a missing token degrades to legible, not black. */
const token = (name: string, alpha?: number): string => {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!v) return alpha !== undefined ? `rgba(148, 163, 184, ${alpha})` : 'rgb(148, 163, 184)';
  return alpha !== undefined ? `hsl(${v} / ${alpha})` : `hsl(${v})`;
};

/** Ellipsize to fit — canvas text does not wrap, it just runs off the card. */
const fitText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string => {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1);
  return t + '…';
};

export const ShareCard: React.FC<ShareCardProps> = ({
  dsaSolvedCount,
  dsaTotalCount,
  sqlSolvedCount,
  sqlTotalCount,
  streak,
  solvedDsaIds,
}) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const solved = dsaSolvedCount + sqlSolvedCount;
  const total = dsaTotalCount + sqlTotalCount;
  const pct = total > 0 ? Math.round((solved / total) * 100) : 0;

  // The card shows the BIGGEST patterns, not the weakest: this image goes to other
  // people, so it answers "how broad is your coverage", not "where are you behind".
  const patterns = useMemo(() => {
    const groups = new Map<string, { total: number; solved: number }>();
    const solvedSet = new Set(solvedDsaIds);
    dsaQuestions.forEach(q =>
      (q.patterns || []).forEach(p => {
        const g = groups.get(p) ?? { total: 0, solved: 0 };
        g.total += 1;
        if (solvedSet.has(q.id)) g.solved += 1;
        groups.set(p, g);
      }),
    );
    return [...groups.entries()]
      .filter(([, g]) => g.total >= 5)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 6)
      .map(([pattern, g]) => ({ pattern, ...g }));
  }, [solvedDsaIds]);

  const draw = (): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    // ---- Background: the site's dark ground plus its two signature glows ----------
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, token('--bg-primary'));
    bg.addColorStop(1, token('--bg-secondary'));
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const glowA = ctx.createRadialGradient(0, 0, 0, 0, 0, 700);
    glowA.addColorStop(0, token('--primary', 0.22));
    glowA.addColorStop(1, token('--primary', 0));
    ctx.fillStyle = glowA;
    ctx.fillRect(0, 0, W, H);

    const glowB = ctx.createRadialGradient(W, H, 0, W, H, 700);
    glowB.addColorStop(0, token('--secondary', 0.18));
    glowB.addColorStop(1, token('--secondary', 0));
    ctx.fillStyle = glowB;
    ctx.fillRect(0, 0, W, H);

    // ---- Top badge ----------------------------------------------------------------
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = token('--secondary');
    ctx.font = '700 24px system-ui, sans-serif';
    ctx.fillText('INTERVIEW PREP PROGRESS', 70, 92);

    // ---- Left: the headline number ------------------------------------------------
    ctx.fillStyle = token('--text-primary');
    ctx.font = '800 190px system-ui, sans-serif';
    ctx.fillText(`${pct}%`, 62, 320);

    ctx.fillStyle = token('--text-secondary');
    ctx.font = '600 30px system-ui, sans-serif';
    ctx.fillText('of the sheet mastered', 70, 372);

    ctx.fillStyle = token('--text-muted');
    ctx.font = '500 25px system-ui, sans-serif';
    ctx.fillText(
      `${solved} / ${total} problems · ${streak}-day streak`,
      70,
      418,
    );

    // ---- Right: pattern coverage mini-bars ----------------------------------------
    const barX = 660;
    const barW = 460;
    let y = 130;
    ctx.fillStyle = token('--text-secondary');
    ctx.font = '700 22px system-ui, sans-serif';
    ctx.fillText('Pattern coverage', barX, y);
    y += 34;

    patterns.forEach(p => {
      const frac = p.total > 0 ? p.solved / p.total : 0;
      const rowPct = Math.round(frac * 100);
      // Same thresholds as the Dashboard's coverage bars, so the card never claims a
      // different story than the site does.
      const hue = rowPct >= 60 ? '--easy' : rowPct >= 25 ? '--medium' : '--hard';

      ctx.fillStyle = token('--text-primary');
      ctx.font = '600 21px system-ui, sans-serif';
      ctx.fillText(fitText(ctx, p.pattern, barW - 110), barX, y);

      ctx.fillStyle = token('--text-muted');
      ctx.font = '500 19px system-ui, sans-serif';
      const count = `${p.solved}/${p.total}`;
      ctx.fillText(count, barX + barW - ctx.measureText(count).width, y);

      ctx.fillStyle = token('--bg-tertiary');
      ctx.beginPath();
      ctx.roundRect(barX, y + 12, barW, 12, 6);
      ctx.fill();

      if (frac > 0) {
        ctx.fillStyle = token(hue);
        ctx.beginPath();
        ctx.roundRect(barX, y + 12, Math.max(barW * frac, 12), 12, 6);
        ctx.fill();
      }
      y += 62;
    });

    // ---- Footer -------------------------------------------------------------------
    ctx.strokeStyle = token('--border-color', 0.9);
    ctx.beginPath();
    ctx.moveTo(70, 540);
    ctx.lineTo(W - 70, 540);
    ctx.stroke();

    ctx.fillStyle = token('--text-primary');
    ctx.font = '700 27px system-ui, sans-serif';
    ctx.fillText(SITE_NAME, 70, 585);

    ctx.fillStyle = token('--text-muted');
    ctx.font = '500 23px system-ui, sans-serif';
    const split = `DSA ${dsaSolvedCount}/${dsaTotalCount} · SQL ${sqlSolvedCount}/${sqlTotalCount}`;
    ctx.fillText(split, W - 70 - ctx.measureText(split).width, 585);

    return canvas;
  };

  // Live preview so the learner sees exactly what will be shared before sharing it.
  // Redraws when the numbers change; a 1200x630 draw is cheap enough to not debounce.
  useEffect(() => {
    setPreview(draw().toDataURL('image/png'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dsaSolvedCount, dsaTotalCount, sqlSolvedCount, sqlTotalCount, streak, solvedDsaIds]);

  // navigator.share with files exists on most mobile browsers and some desktops;
  // everywhere else the same PNG downloads instead. Probe once so the button can say
  // which of the two it will actually do.
  const canShareFiles = useMemo(() => {
    try {
      const probe = new File([new Uint8Array(4)], 'probe.png', { type: 'image/png' });
      return typeof navigator.canShare === 'function' && navigator.canShare({ files: [probe] });
    } catch {
      return false;
    }
  }, []);

  const share = async () => {
    setNote(null);
    const canvas = draw();
    const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/png'));
    if (!blob) {
      setNote('Could not render the card in this browser.');
      return;
    }
    const file = new File([blob], 'striver-progress.png', { type: 'image/png' });
    if (canShareFiles) {
      try {
        await navigator.share({
          files: [file],
          title: 'My interview prep progress',
          text: `${pct}% through ${SITE_NAME} — ${solved}/${total} problems.`,
        });
        return;
      } catch (e) {
        // Closing the share sheet is a decision, not an error; anything else falls
        // through to the download so the card is never simply lost.
        if ((e as DOMException)?.name === 'AbortError') return;
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'striver-progress.png';
    a.click();
    URL.revokeObjectURL(url);
    setNote('Saved striver-progress.png — post it wherever your accountability lives.');
  };

  return (
    <div
      className="glass animate-in"
      style={{
        padding: '1.5rem',
        borderRadius: '16px',
        border: '1px solid hsl(var(--border-color))',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.9rem',
      }}
    >
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem', fontWeight: 700 }}>
        <Image size={18} color="hsl(var(--accent))" />
        Share your progress
      </h3>
      <p style={{ fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.6 }}>
        One image: your overall percentage and pattern coverage. A streak you have told
        someone about is much harder to abandon.
      </p>

      {preview && (
        <img
          src={preview}
          alt={`Progress share card: ${pct}% mastered, ${solved} of ${total} problems solved, ${streak}-day streak`}
          style={{
            width: '100%',
            maxWidth: '520px',
            borderRadius: '12px',
            border: '1px solid hsl(var(--border-color))',
            display: 'block',
          }}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem' }} onClick={share}>
          {canShareFiles ? <Share2 size={14} /> : <Download size={14} />}
          {canShareFiles ? ' Share card' : ' Download PNG'}
        </button>
        {/* Polite live region so the saved/failed outcome reaches screen readers too. */}
        <span aria-live="polite" style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
          {note ?? ''}
        </span>
      </div>
    </div>
  );
};
