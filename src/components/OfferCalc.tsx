import React, { useMemo, useState } from 'react';
import { IndianRupee, Scale } from 'lucide-react';
import { readJson, writeJson } from '../utils/persistence';

/**
 * Offer decoder — what an Indian CTC letter actually pays per month.
 *
 * The interview prep on this site ends in an offer letter, and offer letters here
 * are written in CTC — a number nobody receives. This card walks one (or two) offers
 * from headline CTC to a monthly in-hand ESTIMATE under the new tax regime, and
 * draws where the rest goes: tax, retirals, ESOP paper.
 *
 * Everything is client-side arithmetic over constants declared below — no fetches,
 * nothing leaves the browser. The tax table is deliberately a plain editable
 * constant with the FY stamped on it: Finance Acts change yearly and a future
 * reader should fix ONE block, not an algorithm.
 *
 * It is an estimate and says so on its face. Payroll reality (city professional
 * tax, your actual basic %, flexi components, old regime) will differ by a bit;
 * the assumptions list names every simplification taken.
 */

// ---- The editable tax model (FY 2025-26, NEW regime) --------------------------
// EDIT THIS BLOCK when the Finance Act changes. Sources: FY 2025-26 (AY 2026-27)
// new-regime slabs for resident individuals, salaried standard deduction, §87A
// rebate with marginal relief, 4% health & education cess, surcharge tiers.
// All amounts are annual ₹.

const TAX_SLABS: { upTo: number; rate: number }[] = [
  { upTo: 400_000, rate: 0 },
  { upTo: 800_000, rate: 0.05 },
  { upTo: 1_200_000, rate: 0.1 },
  { upTo: 1_600_000, rate: 0.15 },
  { upTo: 2_000_000, rate: 0.2 },
  { upTo: 2_400_000, rate: 0.25 },
  { upTo: Infinity, rate: 0.3 },
];
/** Salaried standard deduction under the new regime. */
const STANDARD_DEDUCTION = 75_000;
/** §87A: taxable income up to this → zero tax; just above it, marginal relief
 *  caps tax at (taxable − limit) so ₹1 of income never costs ₹60k of tax. */
const REBATE_87A_LIMIT = 1_200_000;
/** Health & education cess on the tax amount. */
const CESS = 0.04;
/** Surcharge tiers (new regime caps at 25%). Marginal relief on surcharge is NOT
 *  modelled — near a threshold this overestimates slightly. */
const SURCHARGE: { over: number; rate: number }[] = [
  { over: 5_000_000, rate: 0.1 },
  { over: 10_000_000, rate: 0.15 },
  { over: 20_000_000, rate: 0.25 },
];
/** Professional tax, annual (₹200/month in most levying states; some charge less). */
const PROF_TAX = 2_400;
/** Payroll convention: basic salary assumed at 50% of fixed pay. */
const BASIC_FRACTION = 0.5;
/** EPF: 12% of basic from the employee AND 12% from the employer (uncapped here;
 *  many employers cap at the ₹15,000/mo statutory basic — a listed assumption). */
const EPF_RATE = 0.12;
/** Gratuity accrual as CTC line item: 15/26ths of a month of basic per year. */
const GRATUITY_RATE = 0.0481;

// ---- Model -------------------------------------------------------------------

interface OfferInputs {
  base: number;      // fixed pay, annual ₹
  bonus: number;     // variable/joining bonus, annual ₹
  esopTotal: number; // total grant value, ₹
  vestYears: number;
  cliffYears: number;
  pf: boolean;       // EPF deducted & matched
  gratuity: boolean; // CTC includes a gratuity line
}

const EMPTY: OfferInputs = {
  base: 0, bonus: 0, esopTotal: 0, vestYears: 4, cliffYears: 1, pf: true, gratuity: false,
};

interface OfferStore { a: OfferInputs; b: OfferInputs }

const isOffer = (v: unknown): v is OfferInputs => {
  if (!v || typeof v !== 'object') return false;
  const o = v as OfferInputs;
  return (
    typeof o.base === 'number' && typeof o.bonus === 'number' && typeof o.esopTotal === 'number' &&
    typeof o.vestYears === 'number' && typeof o.cliffYears === 'number' &&
    typeof o.pf === 'boolean' && typeof o.gratuity === 'boolean'
  );
};

const isStore = (v: unknown): v is OfferStore =>
  !!v && typeof v === 'object' && isOffer((v as OfferStore).a) && isOffer((v as OfferStore).b);

const KEY = 'offer-calc';

const slabTax = (taxable: number): number => {
  let tax = 0;
  let prev = 0;
  for (const { upTo, rate } of TAX_SLABS) {
    if (taxable <= prev) break;
    tax += (Math.min(taxable, upTo) - prev) * rate;
    prev = upTo;
  }
  return tax;
};

const incomeTax = (taxable: number): number => {
  if (taxable <= REBATE_87A_LIMIT) return 0; // §87A rebate zeroes it entirely
  // Marginal relief at the rebate cliff: crossing ₹12L by ₹1 costs at most ₹1.
  let tax = Math.min(slabTax(taxable), taxable - REBATE_87A_LIMIT);
  const surcharge = SURCHARGE.filter(s => taxable > s.over).pop();
  if (surcharge) tax = slabTax(taxable) * (1 + surcharge.rate);
  return Math.round(tax * (1 + CESS));
};

const computeOffer = (o: OfferInputs) => {
  const cash = o.base + o.bonus;
  const basic = o.base * BASIC_FRACTION;
  const employeePf = o.pf ? Math.round(basic * EPF_RATE) : 0;
  const employerPf = o.pf ? Math.round(basic * EPF_RATE) : 0;
  const gratuityAmt = o.gratuity ? Math.round(basic * GRATUITY_RATE) : 0;
  // New regime: standard deduction only. The employee's own EPF is NOT deductible
  // (no 80C here) — it reduces take-home, not taxable income.
  const tax = incomeTax(Math.max(0, cash - STANDARD_DEDUCTION));
  const inHandAnnual = Math.max(0, cash - tax - employeePf - PROF_TAX);
  const esopPerYear = o.esopTotal > 0 && o.vestYears > 0 ? Math.round(o.esopTotal / o.vestYears) : 0;
  // The recruiter's headline: cash + employer-side retirals + averaged ESOP.
  const ctc = cash + employerPf + gratuityAmt + esopPerYear;
  return {
    cash, tax, employeePf, employerPf, gratuityAmt, esopPerYear, ctc,
    inHandAnnual,
    inHandMonthly: Math.round(inHandAnnual / 12),
    retirals: employeePf + employerPf + gratuityAmt,
  };
};

const fmtINR = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

// ---- CTC composition bar ------------------------------------------------------
// Stacked horizontal bar; segments sum to the CTC exactly (the in-hand/tax/PF
// split of cash, plus employer retirals, plus ESOP paper). Identity is never
// color-alone: fixed segment order, a labelled legend with values, 2px gaps,
// and native title tooltips per segment.

const SEGMENTS: { key: 'inhand' | 'tax' | 'retirals' | 'esop'; label: string; hue: string }[] = [
  { key: 'inhand',   label: 'In hand',            hue: 'easy' },
  { key: 'tax',      label: 'Tax + prof. tax',    hue: 'hard' },
  { key: 'retirals', label: 'PF + gratuity',      hue: 'medium' },
  { key: 'esop',     label: 'ESOP (paper)',       hue: 'secondary' },
];

const CompBar: React.FC<{ c: ReturnType<typeof computeOffer> }> = ({ c }) => {
  const values: Record<string, number> = {
    inhand: c.inHandAnnual,
    tax: c.tax + PROF_TAX,
    retirals: c.retirals,
    esop: c.esopPerYear,
  };
  const total = SEGMENTS.reduce((s, seg) => s + values[seg.key], 0);
  if (total <= 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
      <div
        role="img"
        aria-label={`Yearly CTC split: ${SEGMENTS.filter(s => values[s.key] > 0)
          .map(s => `${s.label} ${fmtINR(values[s.key])}`)
          .join(', ')}`}
        style={{
          display: 'flex', height: '12px', borderRadius: '6px', overflow: 'hidden',
          gap: '2px', background: 'hsl(var(--bg-tertiary))',
        }}
      >
        {SEGMENTS.filter(s => values[s.key] > 0).map(s => (
          <div
            key={s.key}
            title={`${s.label}: ${fmtINR(values[s.key])} (${Math.round((values[s.key] / total) * 100)}%)`}
            style={{ width: `${(values[s.key] / total) * 100}%`, background: `hsl(var(--${s.hue}))` }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
        {SEGMENTS.filter(s => values[s.key] > 0).map(s => (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.72rem' }}>
            <span
              aria-hidden="true"
              style={{ width: '10px', height: '10px', borderRadius: '3px', background: `hsl(var(--${s.hue}))`, flexShrink: 0 }}
            />
            <span style={{ color: 'hsl(var(--text-secondary))' }}>{s.label}</span>
            <span style={{ marginLeft: 'auto', color: 'hsl(var(--text-primary))', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              {fmtINR(values[s.key])}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ---- Inputs -------------------------------------------------------------------

const NumField: React.FC<{
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
}> = ({ label, value, onChange, step }) => (
  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', flex: '1 1 120px' }}>
    <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'hsl(var(--text-muted))' }}>{label}</span>
    <input
      type="number"
      min={0}
      step={step ?? 10_000}
      value={value === 0 ? '' : value}
      placeholder="0"
      onChange={e => {
        const n = Number(e.target.value);
        onChange(Number.isFinite(n) && n >= 0 ? n : 0);
      }}
      style={{
        width: '100%', fontFamily: 'var(--font-sans)', fontSize: '0.85rem',
        padding: '0.5rem 0.65rem', borderRadius: '8px',
        background: 'hsl(var(--bg-tertiary))', color: 'hsl(var(--text-primary))',
        border: '1px solid hsl(var(--border-color))', outline: 'none',
      }}
    />
  </label>
);

const ToggleField: React.FC<{ label: string; checked: boolean; onChange: (b: boolean) => void }> = ({
  label, checked, onChange,
}) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', cursor: 'pointer' }}>
    <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
    {label}
  </label>
);

const OfferColumn: React.FC<{
  name: string;
  offer: OfferInputs;
  onChange: (o: OfferInputs) => void;
}> = ({ name, offer, onChange }) => {
  const set = (patch: Partial<OfferInputs>) => onChange({ ...offer, ...patch });
  const c = useMemo(() => computeOffer(offer), [offer]);
  const filled = offer.base > 0;
  return (
    <div
      style={{
        flex: '1 1 240px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.7rem',
        border: '1px solid hsl(var(--border-color))', borderRadius: '12px', padding: '0.9rem',
        background: 'hsl(var(--bg-secondary) / 0.5)',
      }}
    >
      <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{name}</span>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <NumField label="Fixed base (₹/yr)" value={offer.base} onChange={n => set({ base: n })} />
        <NumField label="Bonus / variable (₹/yr)" value={offer.bonus} onChange={n => set({ bonus: n })} />
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <NumField label="ESOP grant (₹ total)" value={offer.esopTotal} onChange={n => set({ esopTotal: n })} />
        <NumField label="Vesting (years)" value={offer.vestYears} onChange={n => set({ vestYears: n })} step={1} />
        <NumField label="Cliff (years)" value={offer.cliffYears} onChange={n => set({ cliffYears: n })} step={1} />
      </div>
      <div style={{ display: 'flex', gap: '0.9rem', flexWrap: 'wrap' }}>
        <ToggleField label="EPF deducted & matched" checked={offer.pf} onChange={b => set({ pf: b })} />
        <ToggleField label="CTC includes gratuity" checked={offer.gratuity} onChange={b => set({ gratuity: b })} />
      </div>

      {filled ? (
        <>
          {/* The one number the letter never states, biggest thing on the card */}
          <div style={{ borderTop: '1px solid hsl(var(--border-color))', paddingTop: '0.7rem' }}>
            <div style={{ fontSize: '1.55rem', fontWeight: 800, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
              {fmtINR(c.inHandMonthly)}
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'hsl(var(--text-muted))' }}> /month in hand (est.)</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'hsl(var(--text-secondary))', marginTop: '0.25rem' }}>
              Headline CTC {fmtINR(c.ctc)} · take-home {c.ctc > 0 ? Math.round((c.inHandAnnual / c.ctc) * 100) : 0}% of it
            </div>
            {c.esopPerYear > 0 && (
              <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', marginTop: '0.2rem' }}>
                ESOP averages {fmtINR(c.esopPerYear)}/yr on paper — nothing vests before the
                year-{Math.max(1, Math.round(offer.cliffYears))} cliff, and it is not cash until liquidity.
              </div>
            )}
          </div>
          <CompBar c={c} />
        </>
      ) : (
        <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', lineHeight: 1.5 }}>
          Enter the fixed base to decode this offer.
        </p>
      )}
    </div>
  );
};

// ---- The card -----------------------------------------------------------------

export const OfferCalc: React.FC = () => {
  const [store, setStore] = useState<OfferStore>(() =>
    readJson<OfferStore>(KEY, { a: { ...EMPTY }, b: { ...EMPTY } }, isStore),
  );
  const save = (next: OfferStore) => {
    setStore(next);
    writeJson(KEY, next);
  };

  const ca = useMemo(() => computeOffer(store.a), [store.a]);
  const cb = useMemo(() => computeOffer(store.b), [store.b]);
  const bothFilled = store.a.base > 0 && store.b.base > 0;
  const monthlyDelta = cb.inHandMonthly - ca.inHandMonthly;
  const effectiveDelta = cb.inHandAnnual + cb.esopPerYear - (ca.inHandAnnual + ca.esopPerYear);

  return (
    <div
      className="glass animate-in"
      style={{
        padding: '1.5rem', borderRadius: '16px',
        border: '1px solid hsl(var(--border-color))',
        display: 'flex', flexDirection: 'column', gap: '1rem',
      }}
    >
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem', fontWeight: 700 }}>
        <IndianRupee size={18} color="hsl(var(--easy))" />
        Offer decoder — CTC to in-hand
      </h3>
      <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.55 }}>
        An <strong>estimate</strong> under the FY 2025-26 <em>new</em> tax regime — CTC is a
        number nobody receives. Fill in the letter's parts and see the month.
        Nothing leaves this browser.
      </p>

      <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
        <OfferColumn name="Offer A" offer={store.a} onChange={o => save({ ...store, a: o })} />
        <OfferColumn name="Offer B (optional)" offer={store.b} onChange={o => save({ ...store, b: o })} />
      </div>

      {bothFilled && (
        <div
          className="animate-fade"
          style={{
            display: 'flex', alignItems: 'center', gap: '0.6rem',
            border: '1px solid hsl(var(--border-color))', borderRadius: '10px',
            padding: '0.7rem 0.9rem', fontSize: '0.8rem', lineHeight: 1.5,
            color: 'hsl(var(--text-secondary))',
          }}
        >
          <Scale size={15} color="hsl(var(--secondary))" style={{ flexShrink: 0 }} aria-hidden="true" />
          <span>
            {monthlyDelta === 0 ? (
              <>Both offers land the same monthly in-hand.</>
            ) : (
              <>
                Offer {monthlyDelta > 0 ? 'B' : 'A'} pays{' '}
                <strong style={{ color: 'hsl(var(--text-primary))' }}>{fmtINR(Math.abs(monthlyDelta))}</strong>{' '}
                more per month in hand
              </>
            )}
            {effectiveDelta !== 0 && (
              <>
                {'; '}counting averaged ESOP, offer {effectiveDelta > 0 ? 'B' : 'A'} is{' '}
                <strong style={{ color: 'hsl(var(--text-primary))' }}>{fmtINR(Math.abs(effectiveDelta))}</strong>/yr
                ahead on paper
              </>
            )}
            . Paper vests on a schedule; rent is monthly.
          </span>
        </div>
      )}

      {/* Native disclosure: the honesty fine print without burying the card in it */}
      <details>
        <summary style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', cursor: 'pointer' }}>
          Assumptions in this estimate (read before deciding anything)
        </summary>
        <ul style={{ paddingLeft: '1.1rem', marginTop: '0.4rem', fontSize: '0.72rem', color: 'hsl(var(--text-muted))', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          <li>New regime, FY 2025-26 slabs; ₹{STANDARD_DEDUCTION.toLocaleString('en-IN')} standard deduction; §87A rebate to ₹12L with marginal relief; 4% cess; surcharge above ₹50L without its marginal relief. Old regime not modelled.</li>
          <li>Basic assumed {BASIC_FRACTION * 100}% of fixed. EPF 12% + 12% on full basic (statutory ₹15k/mo cap ignored — many employers waive it). Gratuity at 4.81% of basic when toggled.</li>
          <li>Professional tax ₹{PROF_TAX.toLocaleString('en-IN')}/yr (state-dependent). Bonus treated as paid evenly — an annual payout means leaner months than shown.</li>
          <li>ESOP shown at grant value, excluded from in-hand: it is taxed at vesting/exercise and is not cash until a liquidity event. Startup paper ≠ listed RSUs.</li>
          <li>The whole tax model is one commented constant block at the top of <code>OfferCalc.tsx</code> — edit it when the Finance Act changes.</li>
        </ul>
      </details>
    </div>
  );
};
