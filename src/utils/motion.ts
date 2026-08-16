/**
 * The motion engine: one delegated system that animates the whole app without
 * per-component wiring.
 *
 * Award-site motion is orchestration, not volume: things ENTER when they scroll
 * into view (staggered), react to the POINTER (tilt, magnetism, ripple, spotlight),
 * and numbers COUNT rather than appear. Doing that per-component would mean
 * hand-editing forty files (and breaking every in-flight agent's merge anchors) —
 * instead this engine watches the DOM and decorates matching elements as they
 * mount, wherever they come from.
 *
 * Every behaviour dies instantly under prefers-reduced-motion or the in-app
 * data-motion="off" toggle, and adds nothing to print.
 */

const REVEAL_SELECTOR = '.glass, .stat-card, .dashboard-hero, .question-row';
const TILT_SELECTOR = '.stat-card, .dashboard-hero';
const MAGNET_SELECTOR = '.btn-primary';
const SPOTLIGHT_SELECTOR = '.dashboard-hero, .glass';
const COUNTUP_SELECTOR = '.stat-val';

const motionOff = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
  document.documentElement.dataset.motion === 'off';

/* ---------------------------------------------------------------- reveals -- */

let observer: IntersectionObserver | null = null;

const observeReveals = (root: ParentNode) => {
  if (!observer) return;
  root.querySelectorAll?.(REVEAL_SELECTOR).forEach(el => {
    const h = el as HTMLElement;
    if (h.dataset.fxReveal !== undefined) return;
    h.dataset.fxReveal = 'pending';
    // Stagger within the parent so sibling cards cascade instead of popping at once.
    const siblings = h.parentElement ? Array.from(h.parentElement.children) : [h];
    const idx = Math.min(siblings.indexOf(h), 7);
    h.style.setProperty('--fx-stagger', `${idx * 55}ms`);
    observer!.observe(h);
  });
};

/* --------------------------------------------------------------- count-up -- */

const countUp = (el: HTMLElement) => {
  if (el.dataset.fxCounted) return;
  el.dataset.fxCounted = '1';
  // A JS text animation is invisible to every CSS kill-switch — this is the only
  // place that can honour reduced-motion for it. The flag above is set first so
  // the number is still marked done and never re-animates later.
  if (motionOff()) return;
  const m = /^(\d+)/.exec(el.textContent ?? '');
  if (!m) return;
  const target = Number(m[1]);
  if (!Number.isFinite(target) || target === 0 || target > 100000) return;
  const rest = (el.textContent ?? '').slice(m[1].length);
  const t0 = performance.now();
  const dur = Math.min(900, 300 + target * 8);
  const tick = (t: number) => {
    const p = Math.min(1, (t - t0) / dur);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = `${Math.round(target * eased)}${rest}`;
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

/* ---------------------------------------------------- pointer-driven fx ----- */

/** rAF-throttled shared pointer state — one listener, however many effects. */
let raf = 0;
let px = 0;
let py = 0;

const onPointerMove = (e: PointerEvent) => {
  px = e.clientX;
  py = e.clientY;
  if (raf) return;
  raf = requestAnimationFrame(() => {
    raf = 0;
    // Cleanup runs UNCONDITIONALLY. Guarding the whole body meant flipping Motion
    // off froze the element under the pointer mid-tilt, with no frame left to
    // undo it — the toggle silenced the CSS but stranded the engine's own state.
    const off = motionOff();
    if (off) {
      clearPointerFx();
      return;
    }

    // 3D tilt: rotate toward the pointer, capped tiny — furniture, not a fairground.
    const tiltEl = (document.elementFromPoint(px, py)?.closest(TILT_SELECTOR) ?? null) as HTMLElement | null;
    document.querySelectorAll<HTMLElement>('[data-fx-tilting]').forEach(el => {
      if (el !== tiltEl) {
        el.style.transform = '';
        delete el.dataset.fxTilting;
      }
    });
    if (tiltEl) {
      const r = tiltEl.getBoundingClientRect();
      const dx = (px - r.left) / r.width - 0.5;
      const dy = (py - r.top) / r.height - 0.5;
      tiltEl.dataset.fxTilting = '1';
      tiltEl.style.transform = `perspective(900px) rotateX(${(-dy * 4).toFixed(2)}deg) rotateY(${(dx * 5).toFixed(2)}deg) translateY(-2px)`;
    }

    // Magnetic buttons: lean a few px toward a nearby pointer.
    const magEl = (document.elementFromPoint(px, py)?.closest(MAGNET_SELECTOR) ?? null) as HTMLElement | null;
    document.querySelectorAll<HTMLElement>('[data-fx-magnet]').forEach(el => {
      if (el !== magEl) {
        el.style.translate = '';
        delete el.dataset.fxMagnet;
      }
    });
    if (magEl) {
      const r = magEl.getBoundingClientRect();
      const dx = px - (r.left + r.width / 2);
      const dy = py - (r.top + r.height / 2);
      magEl.dataset.fxMagnet = '1';
      magEl.style.translate = `${(dx * 0.12).toFixed(1)}px ${(dy * 0.18).toFixed(1)}px`;
    }

    // Spotlight: cards learn where the pointer is; CSS paints the halo.
    const spot = (document.elementFromPoint(px, py)?.closest(SPOTLIGHT_SELECTOR) ?? null) as HTMLElement | null;
    if (spot) {
      const r = spot.getBoundingClientRect();
      spot.style.setProperty('--spot-x', `${(((px - r.left) / r.width) * 100).toFixed(1)}%`);
      spot.style.setProperty('--spot-y', `${(((py - r.top) / r.height) * 100).toFixed(1)}%`);
      spot.classList.add('fx-spotlit');
    }
    document.querySelectorAll<HTMLElement>('.fx-spotlit').forEach(el => {
      if (el !== spot) el.classList.remove('fx-spotlit');
    });

  });
};

/** Undo every inline style the pointer effects apply. Exported so the settings
 *  toggle can clear the screen the instant Motion is switched off. */
export const clearPointerFx = () => {
  document.querySelectorAll<HTMLElement>('[data-fx-tilting]').forEach(el => {
    el.style.transform = '';
    delete el.dataset.fxTilting;
  });
  document.querySelectorAll<HTMLElement>('[data-fx-magnet]').forEach(el => {
    el.style.translate = '';
    delete el.dataset.fxMagnet;
  });
  document.querySelectorAll<HTMLElement>('.fx-spotlit').forEach(el => el.classList.remove('fx-spotlit'));
};

/** Click ripple on every .btn — delegated, so buttons born later still ripple. */
const onClick = (e: MouseEvent) => {
  if (motionOff()) return;
  const btn = (e.target as HTMLElement).closest?.('.btn') as HTMLElement | null;
  if (!btn) return;
  const r = btn.getBoundingClientRect();
  const d = Math.max(r.width, r.height) * 2.2;
  const span = document.createElement('span');
  span.className = 'fx-ripple-wave';
  span.style.width = span.style.height = `${d}px`;
  span.style.left = `${e.clientX - r.left - d / 2}px`;
  span.style.top = `${e.clientY - r.top - d / 2}px`;
  btn.appendChild(span);
  span.addEventListener('animationend', () => span.remove(), { once: true });
};

/* ------------------------------------------------------------------ boot ---- */

let booted = false;

export const initMotionSystem = () => {
  if (booted || typeof window === 'undefined') return;
  booted = true;

  observer = new IntersectionObserver(
    entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        const el = en.target as HTMLElement;
        el.dataset.fxReveal = 'in';
        observer!.unobserve(el);
        // The reveal animation uses fill-mode 'both', so a FINISHED animation keeps
        // owning `transform` — which silently beats the tilt effect's inline
        // transform on every card (tilt targets are a subset of reveal targets).
        // Dropping the attribute once it has played hands transform back.
        el.addEventListener('animationend', () => { delete el.dataset.fxReveal; }, { once: true });
        // Numbers inside a freshly revealed card count up once.
        el.querySelectorAll?.(COUNTUP_SELECTOR).forEach(n => countUp(n as HTMLElement));
        if (el.matches(COUNTUP_SELECTOR)) countUp(el);
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
  );

  observeReveals(document);
  // New tabs/cards mount constantly — decorate them as they appear.
  new MutationObserver(muts => {
    for (const m of muts) {
      m.addedNodes.forEach(n => {
        if (n.nodeType === 1) observeReveals(n as ParentNode);
      });
    }
  }).observe(document.body, { childList: true, subtree: true });

  document.addEventListener('pointermove', onPointerMove, { passive: true });
  document.addEventListener('click', onClick, true);

  // Sticky-header depth: any [data-scroll-shadow] container gets .scrolled past 8px.
  document.addEventListener(
    'scroll',
    e => {
      const t = e.target as HTMLElement;
      if (t?.dataset?.scrollShadow !== undefined) t.classList.toggle('scrolled', t.scrollTop > 8);
    },
    { capture: true, passive: true },
  );
};
