import React, { useEffect, useMemo, useState } from 'react';
import { Clock } from 'lucide-react';
import { dsaQuestions } from '../data/dsaQuestions';
import type { Question } from '../data/dsaQuestions';
import { readStudyMeta } from '../utils/persistence';
import { readReviews } from '../utils/review';
import { readFocusLog } from '../utils/focusLog';
import type { FocusEntry } from '../utils/focusLog';
import { ReadinessRadar } from './ReadinessRadar';
import { MasteryDecay } from './MasteryDecay';
import { StudyHeatmap } from './StudyHeatmap';
import { ReviewForecast } from './ReviewForecast';
import { FocusTimer } from './FocusTimer';
import { DailyThree } from './DailyThree';
import { AchievementGallery } from './AchievementGallery';
import { RecordsCard } from './RecordsCard';
import { FriendCompare } from './FriendCompare';
import { CelebrationCard } from './CelebrationCard';
import { StorageMeter } from './StorageMeter';
import { BigOExplorer } from './BigOExplorer';
import { RecurrenceChecker } from './RecurrenceChecker';
import { DailyReminder } from './DailyReminder';
import { CalibrationCard } from './CalibrationPrompt';
import { ErrorJournal } from './ErrorJournal';
import { StoryBank } from './StoryBank';
import { BookmarksHub } from './BookmarksHub';
import { NotesHub } from './NotesHub';
import { WeeklyCard } from './WeeklyCard';
import { TimeOfDay } from './TimeOfDay';
import { InterviewChecklist } from './InterviewChecklist';
import { OfferCalc } from './OfferCalc';

interface StatsProps {
  solvedDsaIds: string[];
  /** Jump to a problem's page — used by the daily three. */
  onOpenQuestion: (q: Question) => void;
  /** True while the Stats tab is on screen. The panel stays mounted (App hides it
   *  with display:none so the focus timer survives navigation), so this flag is
   *  the cue to re-read localStorage-backed data that changed on other tabs. */
  active: boolean;
}

/**
 * The Stats tab — four charts and two habits, all fed by data the app already keeps.
 *
 * None of these numbers exist for their own sake: the radar says where an
 * interviewer would hurt you, the heatmap says whether you actually show up, the
 * forecast says what the review ladder will demand of you, and the focus chart
 * says where your hours really went (which is rarely where you'd guess).
 */

const fmtMinutes = (m: number) =>
  m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m` : `${m}m`;

// ---- Time per topic (SVG bar list) --------------------------------------------

const ROW_H = 30;
const BAR_H = 12;
const TT_W = 480;
const LABEL_W = 150;
const BAR_MAX = 250; // bars end at LABEL_W + BAR_MAX; the value rides after the tip

// Rounded only at the data end; the label side is the baseline and stays square.
const roundedRightBar = (x: number, yTop: number, w: number, h: number) => {
  const r = Math.min(4, w, h / 2);
  return `M ${x} ${yTop} L ${x + w - r} ${yTop} Q ${x + w} ${yTop} ${x + w} ${yTop + r} L ${x + w} ${yTop + h - r} Q ${x + w} ${yTop + h} ${x + w - r} ${yTop + h} L ${x} ${yTop + h} Z`;
};

const TopicTimeChart: React.FC<{ log: FocusEntry[] }> = ({ log }) => {
  const rows = useMemo(() => {
    const byId = new Map(dsaQuestions.map((q) => [q.id, q]));
    const perTopic = new Map<string, number>();
    log.forEach((e) => {
      // Minutes with no problem open still count — they were spent — but under an
      // honest label instead of being smeared over a topic they didn't touch.
      const topic = e.questionId ? byId.get(e.questionId)?.topic ?? 'No problem open' : 'No problem open';
      perTopic.set(topic, (perTopic.get(topic) ?? 0) + e.minutes);
    });
    const sorted = [...perTopic.entries()]
      .map(([label, minutes]) => ({ label, minutes }))
      .sort((a, b) => b.minutes - a.minutes);
    // Fold the tail past 8 into "Other" rather than growing an unreadable list.
    const head = sorted.slice(0, 8);
    const tail = sorted.slice(8);
    if (tail.length > 0) {
      head.push({ label: 'Other', minutes: tail.reduce((s, r) => s + r.minutes, 0) });
    }
    return head;
  }, [log]);

  const max = Math.max(...rows.map((r) => r.minutes), 1);
  const height = rows.length * ROW_H + 6;

  if (rows.length === 0) {
    return (
      <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.6 }}>
        Run a focus block with a problem open and its topic starts earning minutes here.
        Where the time went is the one stat you can't feel from the inside.
      </p>
    );
  }

  return (
    <div style={{ overflowX: 'auto', paddingBottom: '0.25rem' }}>
      <svg
        width={TT_W}
        height={height}
        role="img"
        aria-label={`Focused minutes by topic: ${rows.map((r) => `${r.label} ${r.minutes} minutes`).join(', ')}`}
      >
        {rows.map((r, i) => {
          const yTop = i * ROW_H + (ROW_H - BAR_H) / 2;
          const w = Math.max((r.minutes / max) * BAR_MAX, 2);
          return (
            <g key={r.label}>
              <text
                x={LABEL_W - 8}
                y={yTop + BAR_H - 2}
                fontSize="11"
                textAnchor="end"
                fill="hsl(var(--text-secondary))"
              >
                {r.label.length > 20 ? `${r.label.slice(0, 19)}…` : r.label}
                <title>{`${r.label} — ${fmtMinutes(r.minutes)}`}</title>
              </text>
              {/* Track first, then the fill — the empty remainder keeps rows comparable. */}
              <rect x={LABEL_W} y={yTop} width={BAR_MAX} height={BAR_H} rx={4} fill="hsl(var(--bg-tertiary))" />
              <path d={roundedRightBar(LABEL_W, yTop, w, BAR_H)} fill="hsl(var(--accent))" />
              <text
                x={LABEL_W + BAR_MAX + 8}
                y={yTop + BAR_H - 2}
                fontSize="11"
                fontWeight="700"
                fill="hsl(var(--text-primary))"
              >
                {fmtMinutes(r.minutes)}
              </text>
              <rect x={0} y={i * ROW_H} width={TT_W} height={ROW_H} fill="transparent">
                <title>{`${r.label} — ${fmtMinutes(r.minutes)}`}</title>
              </rect>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// ---- The tab ------------------------------------------------------------------

export const Stats: React.FC<StatsProps> = ({ solvedDsaIds, onOpenQuestion, active }) => {
  // Reviews, study days and the focus log are written by OTHER screens while this
  // one sits hidden. Re-read on every activation instead of subscribing — Stats is
  // a report, not a live feed, and a re-read on open is always fresh enough.
  const [dataVersion, setDataVersion] = useState(0);
  useEffect(() => {
    if (active) setDataVersion((v) => v + 1);
  }, [active]);

  const reviews = useMemo(() => readReviews(), [dataVersion]); // eslint-disable-line react-hooks/exhaustive-deps
  const studyDays = useMemo(() => readStudyMeta().studyDays, [dataVersion]); // eslint-disable-line react-hooks/exhaustive-deps
  const focusLog = useMemo(() => readFocusLog(), [dataVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="animate-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.25rem' }}>
          Your <span className="gradient-text">Momentum</span>
        </h1>
        <p style={{ color: 'hsl(var(--text-secondary))' }}>
          Where you're ready, where you're thin, and what tomorrow-you already owes.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(360px, 100%), 1fr))',
          gap: '1.5rem',
          alignItems: 'start',
        }}
      >
        <DailyThree solvedDsaIds={solvedDsaIds} onOpenQuestion={onOpenQuestion} />
        <FocusTimer onLogged={() => setDataVersion((v) => v + 1)} />
        <ReadinessRadar solvedDsaIds={solvedDsaIds} reviews={reviews} />
        <MasteryDecay reviews={reviews} />
        <ReviewForecast reviews={reviews} />
        <StudyHeatmap studyDays={studyDays} reviews={reviews} />
        {/* Gamification row — badges, personal bests, a friend mirror and the
            celebration switch, all read-only over data the app already keeps.
            dataVersion re-reads them whenever the tab re-activates. NOTE: the
            AchievementGallery is also the app-wide achievement watcher — Stats
            staying mounted (display:none) is what keeps its listener alive. */}
        <AchievementGallery refresh={dataVersion} />
        <RecordsCard refresh={dataVersion} />
        <FriendCompare refresh={dataVersion} />
        {/* Content-access row: everything you bookmarked and everything you wrote,
            each one list, each jumping back to the problem via onOpenQuestion.
            dataVersion re-reads them whenever the tab re-activates. */}
        <BookmarksHub onOpenQuestion={onOpenQuestion} refresh={dataVersion} />
        <NotesHub onOpenQuestion={onOpenQuestion} refresh={dataVersion} />
        <CelebrationCard />
        {/* Measurement + honesty only — the meter migrates and deletes nothing. */}
        <StorageMeter active={active} />
        {/* Mounted inside the kept-alive Stats tree on purpose: the reminder's
            setTimeout chain survives tab switches along with the focus timer. */}
        <DailyReminder />
        <div
          className="glass animate-in"
          style={{
            padding: '1.5rem', borderRadius: '16px',
            border: '1px solid hsl(var(--border-color))',
            display: 'flex', flexDirection: 'column', gap: '0.9rem',
          }}
        >
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem', fontWeight: 700 }}>
            <Clock size={18} color="hsl(var(--accent))" />
            Where the minutes went
          </h3>
          <TopicTimeChart log={focusLog} />
        </div>
        {/* [learnsci] Calibration + error journal. BOTH double as app-wide
            listeners (scoring predictions, appending failures) — Stats staying
            mounted behind display:none is what keeps them hearing
            dsa:tests-passed / dsa:tests-failed from any problem page. */}
        <CalibrationCard refresh={dataVersion} />
        <ErrorJournal refresh={dataVersion} onOpenQuestion={onOpenQuestion} />
        <BigOExplorer />
        <RecurrenceChecker />
        <StoryBank />
        {/* Progress-intelligence row: the week rendered as a shareable image, and
            the clock-face view of when work actually happens. Both re-read storage
            via dataVersion, same contract as the gamification cards above. */}
        <WeeklyCard refresh={dataVersion} />
        <TimeOfDay refresh={dataVersion} />
        <InterviewChecklist />
        <OfferCalc />
      </div>
    </div>
  );
};
