/* ─────────────────────────────────────────────────────────────────────
 * Starfield — site-wide "stars against the void" backdrop.
 *
 * Faithful canvas port of the app's Compose StarField (the chosen
 * STYLE_BLOOM "soft bloom"): core:designsystem/effect/DuskEffect.kt.
 *   • depth-parallax drift — per-star z; nearer stars sweep faster,
 *     wrapping toroidally for an endless field
 *   • power-law sky (z²) — many faint pinpricks, a few bright anchors
 *   • soft-bloom cores + glow halos (no hard edges)
 *   • two-octave scintillation — irregular, atmospheric twinkle
 *   • a rare shooting star
 *
 * One fixed, full-viewport canvas behind every page. Scheme-aware (white
 * on the void, ink on Paper). Honors prefers-reduced-motion / the system
 * "remove animations" setting by freezing to a static sky. Pauses on tab
 * hide. Density scales with viewport area.
 * ───────────────────────────────────────────────────────────────────── */

(function () {
    'use strict';

    // ── Look constants — ported verbatim from DuskEffect.kt ──
    const DRIFT = 0.015;        // field sweep — fraction of viewport / sec
    const DRIFT_Y = 0.35;       // gentle downward bias
    const MIN_A = 0.28, MAX_A = 0.95;    // brightness range (depth-mapped)
    const TW_MIN = 0.6, TW_RANGE = 1.6;  // twinkle frequency (Hz)
    const SOFT_CORE = 1.8;      // soft-core radius = base radius × this
    // STYLE_BLOOM: minR, maxR, glowScale, glowA
    const MIN_R = 0.5, MAX_R = 1.8, GLOW_SCALE = 5.5, GLOW_A = 0.55;
    // Web-tuning: brightness cap (subtle under content) + a size multiplier
    // so the dp-scale stars read on a large desktop canvas. Light mode is
    // capped far lower — black dust on Paper distracts where white stars on
    // the void recede (matches the app's much fainter light-scheme stars).
    const ALPHA_DARK = 0.62, ALPHA_LIGHT = 0.18;
    const SIZE = 1.6;
    // Shooting star
    const M_PERIOD = 20, M_DUR = 1.0, M_CHANCE = 0.6, M_ANGLE = 0.95,
        M_TAIL = 0.16, M_A = 0.7, M_W = 1.6;

    const TWO_PI = Math.PI * 2;
    const wrap01 = (v) => ((v % 1) + 1) % 1;
    const starCount = (w, h) => Math.max(45, Math.min(190, Math.round((w * h) / 13000)));

    function init() {
        let canvas = document.querySelector('canvas.kuira-starfield-bg');
        if (canvas && canvas._kuiraStarfield) return;   // already running
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.className = 'kuira-starfield-bg';
            canvas.setAttribute('aria-hidden', 'true');
            (document.body || document.documentElement).appendChild(canvas);
        }
        canvas._kuiraStarfield = true;

        const ctx = canvas.getContext('2d');
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        let stars = [], raf = null, t = 0, last = 0, W = 0, H = 0;

        // Deterministic PRNG so the field is stable across redraws (matches the
        // Compose Random(42) seeding intent).
        function seed(w, h) {
            stars = [];
            const n = starCount(w, h);
            let s = 0x2f6e2b1 >>> 0;
            const rnd = () => { s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff; return s / 0x7fffffff; };
            for (let i = 0; i < n; i++) {
                const z = rnd();                    // 0 = far, 1 = near
                stars.push({
                    x0: rnd(), y0: rnd(), z,
                    r: MIN_R + z * z * (MAX_R - MIN_R),       // power-law size
                    b: MIN_A + z * z * (MAX_A - MIN_A),       // power-law brightness
                    pa: rnd() * TWO_PI, pb: rnd() * TWO_PI,
                    hz: TW_MIN + rnd() * TW_RANGE,
                });
            }
        }

        function resize() {
            const rect = canvas.getBoundingClientRect();
            W = rect.width; H = rect.height;
            canvas.width = W * dpr; canvas.height = H * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            seed(W, H);
            if (reduced) draw();
        }

        function draw() {
            ctx.clearRect(0, 0, W, H);
            const light = document.body.getAttribute('data-md-color-scheme') === 'default';
            const [r, g, b] = light ? [0, 0, 0] : [255, 255, 255];
            const cap = light ? ALPHA_LIGHT : ALPHA_DARK;
            const field = t * DRIFT;
            for (const st of stars) {
                // Parallax: nearer stars sweep faster; wrap toroidally.
                const cx = wrap01(st.x0 + field * st.z) * W;
                const cy = wrap01(st.y0 + field * st.z * DRIFT_Y) * H;
                // Scintillation: two incommensurate octaves → atmospheric flicker.
                const tw = 0.5 + 0.5 *
                    (0.6 * Math.sin(t * st.hz + st.pa) + 0.4 * Math.sin(t * st.hz * 1.7 + st.pb));
                const a = Math.min(1, st.b * cap * (0.35 + 0.65 * tw));
                const rPx = st.r * (0.9 + 0.2 * tw) * SIZE;
                // Soft glow halo (every star in the bloom style).
                const gr = rPx * GLOW_SCALE;
                let grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, gr);
                grad.addColorStop(0, `rgba(${r},${g},${b},${a * GLOW_A})`);
                grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
                ctx.fillStyle = grad;
                ctx.beginPath(); ctx.arc(cx, cy, gr, 0, TWO_PI); ctx.fill();
                // Soft core — a radial-gradient point, no hard edge.
                const cr = rPx * SOFT_CORE;
                grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr);
                grad.addColorStop(0, `rgba(${r},${g},${b},${a})`);
                grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
                ctx.fillStyle = grad;
                ctx.beginPath(); ctx.arc(cx, cy, cr, 0, TWO_PI); ctx.fill();
            }
            if (!reduced && !light) drawMeteor(r, g, b, cap);
        }

        // A rare shooting star, deterministic per time-window (no spawn state):
        // most windows draw nothing; an active one streaks with a bright head +
        // fading tail, fading in then out.
        function drawMeteor(r, g, b, cap) {
            const win = Math.floor(t / M_PERIOD);
            const local = t - win * M_PERIOD;
            if (local > M_DUR) return;
            let s = (Math.imul(win, 73856093) ^ 19349663) & 0x7fffffff;
            const rnd = () => { s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff; return s / 0x7fffffff; };
            if (rnd() > M_CHANCE) return;
            const prog = local / M_DUR;
            const sx = rnd() * W, sy = rnd() * H * 0.3;
            const dirX = rnd() < 0.5 ? 1 : -1;
            const dist = (W + H) * 0.55;
            const vx = dirX * Math.cos(M_ANGLE) * dist, vy = Math.sin(M_ANGLE) * dist;
            const hx = sx + vx * prog, hy = sy + vy * prog;
            const tx = hx - vx * M_TAIL, ty = hy - vy * M_TAIL;
            const a = cap * M_A * Math.sin(prog * Math.PI);   // fade in → out
            const grad = ctx.createLinearGradient(tx, ty, hx, hy);
            grad.addColorStop(0, `rgba(${r},${g},${b},0)`);
            grad.addColorStop(1, `rgba(${r},${g},${b},${a})`);
            ctx.strokeStyle = grad; ctx.lineWidth = M_W; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
            ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
            ctx.beginPath(); ctx.arc(hx, hy, M_W, 0, TWO_PI); ctx.fill();
        }

        function tick(now) {
            if (last === 0) last = now;
            t += (now - last) / 1000;
            last = now;
            draw();
            raf = requestAnimationFrame(tick);
        }

        function start() {
            resize();
            if (!reduced) { cancelAnimationFrame(raf); last = 0; raf = requestAnimationFrame(tick); }
        }

        let resizeT;
        window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(start, 150); });
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) { cancelAnimationFrame(raf); }
            else if (!reduced) { last = 0; raf = requestAnimationFrame(tick); }
        });
        // Re-tint on scheme toggle.
        new MutationObserver(() => draw()).observe(document.body, {
            attributes: true, attributeFilter: ['data-md-color-scheme'],
        });

        start();
    }

    // Material re-fires document$ on navigation; idempotent init reuses the
    // one persistent canvas without stacking animation loops.
    if (typeof document$ !== 'undefined') {
        document$.subscribe(init);
    } else {
        document.addEventListener('DOMContentLoaded', init);
    }
})();
