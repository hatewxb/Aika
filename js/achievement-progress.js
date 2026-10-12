// achievement-progress.js — the achievement bars fill in when a game page opens
// (idea: animate-ui "Progress", Radix: a full-width indicator slid in by
// translateX(-(100 - value)%) on a spring, stiffness 100 / damping 30).
// Imported by js/main.js.
//
// Two bars on the library game page: "Achievements" in the "Play" bar
// (.MiniAchievements, the "46/64" counter next to it) and the achievements block
// in the right column ("You've unlocked 46 of 64 (71%)"). Steam keeps the fill
// width inline; we never touch it — the fill slides in from the left with a WAAPI
// transform (the track clips it), and the numbers next to the bar count up on the
// same curve, frame by frame. The spring is overdamped (ζ = 1.5): it settles
// without overshooting (DESIGN.md §1 — nothing bounces), so it reads as a long,
// soft expo-out. A bar starts once it is on screen; a new game in a reused
// element (Steam changes the inline width) plays it again from zero.
// Reduced motion or --aika-motion: 0 — no animation.

(() => {
  "use strict";
  if (window.__aikaAchievementProgress) return;
  window.__aikaAchievementProgress = true;

  const BARS = [
    { track: ".MiniAchievements .DetailsProgressContainer", fill: ".DetailsProgressBar",
      labels: (t) => [t.closest(".AchievementProgressRow")?.querySelector(".AchievementCountLabel")] },
    { track: ".AchievementProgressContainer", fill: ".AchievementProgress",
      labels: (t) => {
        const h = t.closest(".Highlight");
        return h ? [h.querySelector(".UnlockedLabel > span:not(.UnlockedLabelPercent)"), h.querySelector(".UnlockedLabelPercent")] : [];
      } },
  ];
  const ANY_TRACK = BARS.map((b) => b.track).join(",");

  const root = document.documentElement;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const cssNum = (name, fallback) => {
    const v = parseFloat(getComputedStyle(root).getPropertyValue(name));
    return Number.isFinite(v) ? v : fallback;
  };
  const off = () => reduced.matches || cssNum("--aika-motion", 1) === 0;

  // Spring progress 0 → 1 (mass 1, starting at rest), the analytic overdamped /
  // critically damped solution; duration — until it is within 0.1 % of the end.
  const spring = (k, d) => {
    const w = Math.sqrt(k), z = Math.max(1, d / (2 * w));
    let x;
    if (z === 1) x = (t) => (1 + w * t) * Math.exp(-w * t);
    else {
      const s = w * Math.sqrt(z * z - 1), r1 = -w * z + s, r2 = -w * z - s;
      x = (t) => (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r2 - r1);
    }
    let dur = 0.1;
    while (x(dur) > 0.001 && dur < 5) dur += 0.01;
    const at = (p) => (p >= 1 ? 1 : 1 - x(p * dur));   // p — share of the duration
    const pts = [];
    for (let i = 0; i <= 40; i++) pts.push(at(i / 40).toFixed(4));
    return { ms: dur * 1000, at, easing: `linear(${pts.join(", ")})` };
  };

  const live = new WeakMap();   // fill → { width, anim, frame, io }

  // The integers inside a label's text nodes become a counter: "46/64" counts
  // the first one (the total stays), "(71%)" — the percent.
  const counters = (labels) => {
    const out = [];
    for (const el of labels) {
      if (!el) continue;
      const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let n; (n = walk.nextNode());) {
        const m = /\d+/.exec(n.data);
        if (!m || +m[0] === 0) continue;
        out.push({ node: n, final: n.data, head: n.data.slice(0, m.index), tail: n.data.slice(m.index + m[0].length), to: +m[0], last: n.data });
        break;
      }
    }
    return out;
  };

  const write = (c, v) => {
    if (c.node.data !== c.last) return false;   // Steam re-rendered it — hands off
    c.last = c.head + v + c.tail;
    c.node.data = c.last;
    return true;
  };

  const stop = (fill) => {
    const st = live.get(fill);
    if (!st) return;
    st.anim?.cancel();
    cancelAnimationFrame(st.frame);
    st.io?.disconnect();
    for (const c of st.counts || []) if (c.node.data === c.last) c.node.data = c.final;
    st.anim = st.io = null;
    st.counts = [];
  };

  const play = (bar, track, fill) => {
    stop(fill);
    const st = live.get(fill);
    st.width = fill.style.width;
    if (off() || !(parseFloat(st.width) > 0)) return;

    const sp = spring(cssNum("--aika-achv-stiffness", 100), cssNum("--aika-achv-damping", 30));
    const delay = cssNum("--aika-achv-delay", 160);
    // Empty right away (backwards fill while paused), so it never flashes full
    st.anim = fill.animate(
      [{ transform: "translateX(-100%)" }, { transform: "translateX(0)" }],
      { duration: sp.ms, delay, easing: sp.easing, fill: "backwards" });
    st.anim.pause();
    st.counts = counters(bar.labels(track));
    for (const c of st.counts) write(c, 0);

    st.io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      st.io.disconnect();
      st.io = null;
      st.anim.play();
      const t0 = performance.now() + delay;
      const tick = (now) => {
        const p = Math.max(0, (now - t0) / sp.ms);
        const v = sp.at(p);
        st.counts = st.counts.filter((c) => write(c, Math.round(c.to * v)));
        if (p < 1 && st.counts.length) st.frame = requestAnimationFrame(tick);
        else for (const c of st.counts) if (c.node.data === c.last) c.node.data = c.final;
      };
      st.frame = requestAnimationFrame(tick);
    });
    st.io.observe(track);
  };

  const attach = (bar, track) => {
    const fill = track.querySelector(bar.fill);
    if (!fill || live.has(fill)) return;
    // A new game in the same element: Steam rewrites the inline width
    const mo = new MutationObserver(() => {
      if (fill.style.width !== live.get(fill).width) play(bar, track, fill);
    });
    mo.observe(fill, { attributes: true, attributeFilter: ["style"] });
    live.set(fill, { width: "", mo, counts: [] });
    play(bar, track, fill);
  };

  let queued = 0;
  const scan = () => {
    queued = 0;
    for (const bar of BARS) for (const t of document.querySelectorAll(bar.track)) attach(bar, t);
  };
  new MutationObserver((records) => {
    if (queued) return;
    for (const r of records) for (const n of r.addedNodes) {
      if (n.nodeType === 1 && (n.matches(ANY_TRACK) || n.querySelector(ANY_TRACK))) {
        queued = requestAnimationFrame(scan);
        return;
      }
    }
  }).observe(document.body, { childList: true, subtree: true });
  scan();
})();
