import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Download, Share2 } from 'lucide-react';
import { dsaQuestions } from '../data/dsaQuestions';
import {
  calculateCurrentStreak,
  readJson,
  readStringArray,
  readStudyMeta,
  writeJson,
  STORAGE_KEYS,
} from '../utils/persistence';
import { readReviews, todayISO } from '../utils/review';
import { readFocusLog } from '../utils/focusLog';

interface WeeklyCardProps {
  /** Bumped by Stats whenever the tab re-activates — cue to re-read storage. */
  refresh: number;
}

/**
 * Lands at: src/components/WeeklyCard.tsx  (Stats grid)
 *
 * The week as one shareable 1200x630 PNG — solves, reviews, focus time, top
 * pattern, streak — drawn in ShareCard's visual language (canvas + live CSS
 * tokens) but answering a different question: ShareCard is "how far am I
 * overall", this is "what did THIS week cost me". Weekly numbers are the ones
 * an accountability partner can actually check you on.
 *
 * Sources, stated honestly:
 *  - reviews + focus minutes come from dated logs (review history / focus-log)
 *    and are exact for the Mon–Sun window;
 *  - solved counts are SETS with no timeline, so "solved this week" is measured
 *    against a baseline stamped under 'weekly-mark' on the first visit of each
 *    week (same trick planEngine uses). Open the app on Wednesday for the first
 *    time and the count starts from Wednesday — it undercounts rather than
 *    invents, and the card's caption says so.
 */

interface WeeklyMark {
  weekStart: string;
  dsa: number;
  sql: number;
}

interface WeekSummary {
  weekStart: string;
  weekEnd: string;
  solves: number;
  reviews: number;
  focusMin: number;
  streak: number;
  /** Busiest pattern by this week's recall grades; null when nothing was graded. */
  topPattern: string | null;
}

const MARK_KEY = 'weekly-mark';
const W = 1200;
const H = 630;
const SITE_NAME = 'Striver SDE Sheet & SQL Top 50';

const isWeeklyMark = (v: unknown): v is WeeklyMark =>
  !!v &&
  typeof v === 'object' &&
  typeof (v as WeeklyMark).weekStart === 'string' &&
  typeof (v as WeeklyMark).dsa === 'number' &&
  typeof (v as WeeklyMark).sql === 'number';

// Monday-anchored week, local time — calendar-component arithmetic so a DST
// switch can't shift the boundary (same reasoning as StudyHeatmap's shiftDays).
const mondayISO = (): string => {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return todayISO(d);
};

const addDaysISO = (iso: string, days: number): string => {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return todayISO(d);
};

const niceDay = (iso: string): string =>
  new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

const fmtMinutes = (m: number): string =>
  m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m` : `${m}m`;

/** Resolve a design token at draw time (ShareCard's approach, duplicated on
 *  purpose — ShareCard keeps its helper private, and a two-line copy beats a
 *  cross-component export for something this small). */
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

/** Read every source, stamp the weekly baseline if this is the week's first
 *  visit, and return the numbers. Called from an effect — it can write. */
const computeWeek = (): WeekSummary => {
  const weekStart = mondayISO();
  const weekEnd = addDaysISO(weekStart, 6);

  const dsa = readStringArray(STORAGE_KEYS.solvedDsaIds).length;
  const sql = readStringArray(STORAGE_KEYS.solvedSqlIds).length;
  let mark = readJson<WeeklyMark | null>(MARK_KEY, null, isWeeklyMark);
  if (!mark || mark.weekStart !== weekStart) {
    // New week (or first ever visit): today's totals become the floor that
    // this week's solves are measured from.
    mark = { weekStart, dsa, sql };
    writeJson(MARK_KEY, mark);
  }
  const solves = Math.max(0, dsa - mark.dsa) + Math.max(0, sql - mark.sql);

  const reviews = readReviews();
  const byId = new Map(dsaQuestions.map((q) => [q.id, q]));
  let reviewCount = 0;
  const patternCounts = new Map<string, number>();
  Object.entries(reviews).forEach(([id, r]) => {
    (r?.history ?? []).forEach((h) => {
      if (!h || h.on < weekStart || h.on > weekEnd) return;
      reviewCount += 1;
      // Primary pattern, topic as fallback — same labeling stance as the digest.
      const label = byId.get(id)?.patterns?.[0] ?? byId.get(id)?.topic;
      if (label) patternCounts.set(label, (patternCounts.get(label) ?? 0) + 1);
    });
  });
  const topPattern =
    [...patternCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const focusMin = Math.round(
    readFocusLog()
      .filter((e) => e.on >= weekStart && e.on <= weekEnd)
      .reduce((sum, e) => sum + e.minutes, 0),
  );

  return {
    weekStart,
    weekEnd,
    solves,
    reviews: reviewCount,
    focusMin,
    streak: calculateCurrentStreak(readStudyMeta().studyDays),
    topPattern,
  };
};

const draw = (s: WeekSummary): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // ---- Background: same ground + glows as ShareCard, so the two cards read
  // as one family wherever they end up posted side by side. -------------------
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

  // ---- Top badge + week range ------------------------------------------------
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = token('--secondary');
  ctx.font = '700 24px system-ui, sans-serif';
  ctx.fillText('WEEKLY TRAINING REPORT', 70, 92);

  ctx.fillStyle = token('--text-muted');
  ctx.font = '600 24px system-ui, sans-serif';
  const range = `${niceDay(s.weekStart)} – ${niceDay(s.weekEnd)}`;
  ctx.fillText(range, W - 70 - ctx.measureText(range).width, 92);

  // ---- Left: the headline number --------------------------------------------
  ctx.fillStyle = token('--text-primary');
  ctx.font = '800 190px system-ui, sans-serif';
  ctx.fillText(`${s.solves}`, 62, 320);

  ctx.fillStyle = token('--text-secondary');
  ctx.font = '600 30px system-ui, sans-serif';
  ctx.fillText(`problem${s.solves === 1 ? '' : 's'} solved this week`, 70, 372);

  ctx.fillStyle = token('--text-muted');
  ctx.font = '500 25px system-ui, sans-serif';
  ctx.fillText(`${s.reviews} reviews · ${fmtMinutes(s.focusMin)} focused`, 70, 418);

  // ---- Right: the week's vitals, one labeled row each ------------------------
  const colX = 700;
  const colW = 420;
  const rows: [string, string][] = [
    ['Reviews cleared', `${s.reviews}`],
    ['Focused time', fmtMinutes(s.focusMin)],
    ['Current streak', `${s.streak} day${s.streak === 1 ? '' : 's'}`],
    ['Busiest pattern', s.topPattern ?? '—'],
  ];
  let y = 150;
  rows.forEach(([label, value]) => {
    ctx.fillStyle = token('--text-muted');
    ctx.font = '600 21px system-ui, sans-serif';
    ctx.fillText(label.toUpperCase(), colX, y);

    ctx.fillStyle = token('--text-primary');
    ctx.font = '700 38px system-ui, sans-serif';
    ctx.fillText(fitText(ctx, value, colW), colX, y + 44);

    // Hairline under each row — structure without chrome.
    ctx.strokeStyle = token('--border-color', 0.8);
    ctx.beginPath();
    ctx.moveTo(colX, y + 62);
    ctx.lineTo(colX + colW, y + 62);
    ctx.stroke();
    y += 96;
  });

  // ---- Footer ----------------------------------------------------------------
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
  const tag = 'one week, honestly counted';
  ctx.fillText(tag, W - 70 - ctx.measureText(tag).width, 585);

  return canvas;
};

export const WeeklyCard: React.FC<WeeklyCardProps> = ({ refresh }) => {
  const [summary, setSummary] = useState<WeekSummary | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  // Compute + draw in an effect, not render: computeWeek may stamp the weekly
  // baseline (a storage write), and writes during render are how React apps rot.
  useEffect(() => {
    const s = computeWeek();
    setSummary(s);
    setPreview(draw(s).toDataURL('image/png'));
  }, [refresh]);

  // Same share-or-download probe as ShareCard: files-capable navigator.share on
  // most mobile browsers, a plain PNG download everywhere else — and the button
  // says which one it will do before it is pressed.
  const canShareFiles = useMemo(() => {
    try {
      const probe = new File([new Uint8Array(4)], 'probe.png', { type: 'image/png' });
      return typeof navigator.canShare === 'function' && navigator.canShare({ files: [probe] });
    } catch {
      return false;
    }
  }, []);

  const share = async () => {
    if (!summary) return;
    setNote(null);
    const canvas = draw(summary);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
    if (!blob) {
      setNote('Could not render the card in this browser.');
      return;
    }
    const file = new File([blob], 'striver-weekly.png', { type: 'image/png' });
    if (canShareFiles) {
      try {
        await navigator.share({
          files: [file],
          title: 'My week of interview prep',
          text: `This week: ${summary.solves} solved, ${summary.reviews} reviews, ${fmtMinutes(summary.focusMin)} focused.`,
        });
        return;
      } catch (e) {
        // Closing the share sheet is a decision, not an error; anything else
        // falls through to the download so the card is never simply lost.
        if ((e as DOMException)?.name === 'AbortError') return;
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'striver-weekly.png';
    a.click();
    URL.revokeObjectURL(url);
    setNote('Saved striver-weekly.png — the week, in one image.');
  };

  return (
    <div
      className="glass animate-in"
      style={{
        padding: '1.5rem', borderRadius: '16px',
        border: '1px solid hsl(var(--border-color))',
        display: 'flex', flexDirection: 'column', gap: '0.9rem',
      }}
    >
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem', fontWeight: 700 }}>
        <CalendarDays size={18} color="hsl(var(--primary))" />
        This week, as an image
      </h3>

      {preview && summary && (
        <img
          src={preview}
          alt={`Weekly summary card: ${summary.solves} solved, ${summary.reviews} reviews, ${fmtMinutes(summary.focusMin)} focused, ${summary.streak}-day streak${summary.topPattern ? `, busiest pattern ${summary.topPattern}` : ''}`}
          style={{
            width: '100%', maxWidth: '520px', borderRadius: '12px',
            border: '1px solid hsl(var(--border-color))', display: 'block',
          }}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button
          className="btn btn-primary"
          style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem' }}
          onClick={share}
        >
          {canShareFiles ? <Share2 size={14} /> : <Download size={14} />}
          {canShareFiles ? ' Share week' : ' Download PNG'}
        </button>
        {/* Polite live region so the saved/failed outcome reaches screen readers too. */}
        <span aria-live="polite" style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
          {note ?? ''}
        </span>
      </div>

      <p style={{ fontSize: '0.68rem', color: 'hsl(var(--text-muted))', lineHeight: 1.5 }}>
        Reviews and focus time are exact (dated logs). Solves are counted from your first
        visit each week — solved ids carry no dates, so a week you started on Wednesday is
        undercounted, never invented. Week runs Mon–Sun.
      </p>
    </div>
  );
};
