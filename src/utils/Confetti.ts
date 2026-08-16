/**
 * Dependency-free canvas confetti.
 *
 * Celebration is the reward half of a habit loop. The site asks for months of
 * daily, honest, often demoralising work; the three moments wired to this burst
 * (a topic fully solved, a drill finished with zero timeouts, the first solve
 * of a day) are exactly the ones worth reinforcing — and ONLY those three, so
 * the burst stays a signal instead of becoming noise.
 *
 * WHY one canvas instead of ~120 animated DOM nodes: the burst lands on top of
 * whatever screen the user is on, mid-React-update, and DOM particles would
 * each cost layout and paint there. A single fixed canvas is one compositor
 * layer that removes itself without leaving a trace in the tree.
 */

const PARTICLES = 120;
const DURATION_MS = 1200;

/** Live design tokens, so a future palette change carries into the confetti
 *  without anyone remembering this file exists. Plain hue triples only — the
 *  -glow variants carry a "/ alpha" suffix this template doesn't expect. */
const TOKEN_HUES = ['--primary', '--secondary', '--accent', '--easy', '--medium'];

export const fireConfetti = (): void => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  // Celebrations are opt-out (Stats → Celebrations card writes 'celebrations').
  // Raw localStorage, not utils/persistence: this module is deliberately
  // dependency-free, and a malformed blob must mean "default on", never a
  // crash mid-celebration.
  try {
    const prefs = JSON.parse(window.localStorage.getItem('celebrations') ?? '{}') as { confetti?: unknown };
    if (prefs && prefs.confetti === false) return;
  } catch { /* unreadable prefs = default on */ }
  // A celebration nobody asked for must never override a motion setting
  // somebody DID ask for: reduced motion means the moment passes quietly.
  // A full no-op, not a toned-down burst.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = window.innerWidth;
  const h = window.innerHeight;
  // DPR capped at 2: sharper confetti is invisible, the fill-rate cost is not.
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);
  // pointer-events:none — a celebration that eats a click teaches people to dread it.
  canvas.style.cssText =
    'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:200;';
  canvas.setAttribute('aria-hidden', 'true'); // purely visual; silence for screen readers
  document.body.appendChild(canvas);

  const tokens = getComputedStyle(document.documentElement);
  const colors = TOKEN_HUES
    .map((t) => tokens.getPropertyValue(t).trim())
    .filter(Boolean)
    .map((v) => `hsl(${v})`);

  interface Particle {
    x: number; y: number;
    vx: number; vy: number;
    rot: number; vr: number;
    size: number;
    color: string;
    /** Rectangles read as paper, discs as sparks — the mix is what sells it. */
    disc: boolean;
  }

  const particles: Particle[] = Array.from({ length: PARTICLES }, () => {
    // Upward fan from just below centre; gravity turns it into falling paper.
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
    const speed = 6 + Math.random() * 9;
    return {
      x: w / 2 + (Math.random() - 0.5) * 80,
      y: h * 0.45,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.4,
      size: 6 + Math.random() * 7,
      // Falls back to the brand purple if the tokens ever go missing (tests, SSR
      // shells) — a broken celebration is worse than none.
      color: colors[Math.floor(Math.random() * colors.length)] ?? '#8b5cf6',
      disc: Math.random() < 0.25,
    };
  });

  const start = performance.now();
  let last = start;

  const tick = (t: number) => {
    // dt measured in 60fps frames and clamped: a background-tab stall must not
    // teleport every particle off screen on the next frame.
    const dt = Math.min((t - last) / (1000 / 60), 3);
    last = t;
    const elapsed = t - start;

    ctx.clearRect(0, 0, w, h);
    // Fade through the back 40% of the run instead of vanishing mid-air.
    ctx.globalAlpha = Math.max(0, Math.min(1, 1 - (elapsed - DURATION_MS * 0.6) / (DURATION_MS * 0.4)));

    for (const p of particles) {
      p.vy += 0.32 * dt;              // gravity
      p.vx *= Math.pow(0.985, dt);    // horizontal drag — paper flutters, it doesn't glide
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.disc) {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      }
      ctx.restore();
    }

    if (elapsed < DURATION_MS) {
      requestAnimationFrame(tick);
    } else {
      // Self-cleaning: no component, no unmount hook, nothing left behind.
      canvas.remove();
    }
  };
  requestAnimationFrame(tick);
};
