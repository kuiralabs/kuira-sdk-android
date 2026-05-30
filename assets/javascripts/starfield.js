/* ─────────────────────────────────────────────────────────────────────
 * Starfield — landing page hero backdrop.
 *
 * Direct CSS-port of the "stars against void" motif from
 * core:designsystem/theme/MidnightColors.kt (StarBright / StarDim).
 * Particles drift slowly; opacity twinkles independently per star.
 *
 * Reduced-motion handling: a single static render of the star
 * positions, no animation loop. The data-component="starfield"
 * canvas is also display:none under prefers-reduced-motion via
 * kuira.css; this is a JS-side belt-and-suspenders fallback.
 *
 * Targets a single canvas with [data-component="starfield"] inside
 * .kuira-hero. Bails cleanly if not present (every page except
 * the landing).
 * ───────────────────────────────────────────────────────────────────── */

(function () {
    'use strict';

    const PARTICLE_COUNT = 140;
    const TWINKLE_SPEED = 0.0008;       // per ms — slow

    function init() {
        const canvas = document.querySelector('.kuira-hero canvas[data-component="starfield"]');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        let stars = [];
        let raf = null;
        let lastT = 0;

        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        const colorFor = () => {
            const scheme = document.body.getAttribute('data-md-color-scheme');
            // In light mode the "stars" are subtle dust on white.
            return scheme === 'default' ? [0, 0, 0] : [255, 255, 255];
        };

        function resize() {
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.scale(dpr, dpr);
            seed(rect.width, rect.height);
            if (reduced) draw(0);
        }

        function seed(w, h) {
            stars = [];
            for (let i = 0; i < PARTICLE_COUNT; i++) {
                const isBright = Math.random() < 0.25;
                stars.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    r: isBright
                        ? 1.0 + Math.random() * 0.8
                        : 0.4 + Math.random() * 0.6,
                    baseAlpha: isBright
                        ? 0.55 + Math.random() * 0.25      // StarBright tier
                        : 0.10 + Math.random() * 0.15,     // StarDim tier
                    twinklePhase: Math.random() * Math.PI * 2,
                    twinkleRate: 0.6 + Math.random() * 0.8,
                });
            }
        }

        function draw(t) {
            const rect = canvas.getBoundingClientRect();
            ctx.clearRect(0, 0, rect.width, rect.height);
            const [r, g, b] = colorFor();

            for (const s of stars) {
                const twinkle = reduced
                    ? 1.0
                    : 0.55 + 0.45 * Math.sin(t * TWINKLE_SPEED * s.twinkleRate + s.twinklePhase);
                const alpha = s.baseAlpha * twinkle;

                // Soft radial glow for the brighter tier
                if (s.baseAlpha > 0.4) {
                    const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 4);
                    grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha * 0.35})`);
                    grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(s.x, s.y, s.r * 4, 0, Math.PI * 2);
                    ctx.fill();
                }

                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        function tick(t) {
            if (lastT === 0) lastT = t;
            draw(t);
            raf = requestAnimationFrame(tick);
        }

        function start() {
            resize();
            if (!reduced) {
                cancelAnimationFrame(raf);
                lastT = 0;
                raf = requestAnimationFrame(tick);
            }
        }

        // Resize-aware
        let resizeT;
        window.addEventListener('resize', () => {
            clearTimeout(resizeT);
            resizeT = setTimeout(start, 120);
        });

        // Pause on tab hide; resume on show. Cheap power win.
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                cancelAnimationFrame(raf);
            } else if (!reduced) {
                lastT = 0;
                raf = requestAnimationFrame(tick);
            }
        });

        // Re-seed colors when the user toggles scheme.
        const observer = new MutationObserver(() => draw(performance.now()));
        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['data-md-color-scheme'],
        });

        start();
    }

    // Material's instant-navigation re-fires its subscribe stream on
    // every page change; idempotent init means we re-bind to the new
    // hero canvas without leaking timers.
    if (typeof document$ !== 'undefined') {
        document$.subscribe(init);
    } else {
        document.addEventListener('DOMContentLoaded', init);
    }
})();
