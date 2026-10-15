// cover-tilt.js — library covers turn toward the cursor in 3D
// (the "3D tilt" value of the "Library covers" setting; idea: reactbits.dev
// "Holo Card" — the 3D inspection only, without the holographic foil).
// Imported by js/main.js; does nothing unless the option file sets
// --aika-covers-mode: tilt on :root (options/covers-tilt.css), so switching the
// setting takes effect right away.
//
// The hovered cover gets --aika-tilt-rx / -ry (degrees, numbers), -s (scale),
// -lx / -ly (where the light falls, %) and -on (0..1); CSS turns them into a
// perspective rotation, a moving glare and a shadow thrown the other way.
// No spring (DESIGN.md §1): every value eases toward its target exponentially,
// so it catches up with the cursor and settles without overshooting; on leave
// the cover eases back flat, then its properties are removed.

(() => {
  "use strict";
  if (window.__aikaCoverTilt) return;
  window.__aikaCoverTilt = true;

  const COVERS = ".Draggable.HoversEnabled .LibraryItemBox";
  const PROPS = ["--aika-tilt-rx", "--aika-tilt-ry", "--aika-tilt-s", "--aika-tilt-lx", "--aika-tilt-ly", "--aika-tilt-on"];
  const root = document.documentElement;
  const enabled = () => getComputedStyle(root).getPropertyValue("--aika-covers-mode").trim() === "tilt";
  // "Performance: Low" (--aika-motion: 0): the handlers go away for good
  // (switching back takes a restart)
  const low = () => getComputedStyle(root).getPropertyValue("--aika-motion").trim() === "0";
  const cssNum = (name, fallback) => {
    const v = parseFloat(getComputedStyle(root).getPropertyValue(name));
    return Number.isFinite(v) ? v : fallback;
  };

  const live = new Map();     // cover → { cur, target }
  let hovered = null, lastEvent = null, moveFrame = 0, loop = 0, lastT = 0;
  let max = 12, lift = 1.04, ease = 90;

  const flat = () => ({ rx: 0, ry: 0, s: 1, lx: 50, ly: 0, on: 0 });

  const aim = () => {
    moveFrame = 0;
    if (low()) {
      document.removeEventListener("pointermove", onMove, { capture: true });
      document.removeEventListener("pointerleave", onLeave);
      live.forEach((_, el) => PROPS.forEach((p) => el.style.removeProperty(p)));
      live.clear();
      hovered = null;
      return;
    }
    const e = lastEvent;
    const t = e && e.target instanceof Element && enabled() ? e.target.closest(COVERS) : null;
    if (hovered && hovered !== t) live.get(hovered).target = flat();   // released: ease back
    if (t && t !== hovered) {
      max = cssNum("--aika-tilt-max", 12);
      lift = cssNum("--aika-tilt-lift", 1.04);
      ease = cssNum("--aika-tilt-ease", 90);
      if (!live.has(t)) live.set(t, { cur: flat(), target: flat() });
    }
    hovered = t;
    if (t) {
      const r = t.getBoundingClientRect();
      const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      const py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      live.get(t).target = { rx: (0.5 - py) * 2 * max, ry: (px - 0.5) * 2 * max, s: lift, lx: px * 100, ly: py * 100, on: 1 };
    }
    if (live.size && !loop) { lastT = performance.now(); loop = requestAnimationFrame(step); }
  };

  const step = (now) => {
    const k = 1 - Math.exp(-(now - lastT) / ease);
    lastT = now;
    for (const [el, st] of live) {
      if (!el.isConnected) { live.delete(el); continue; }
      let settled = true;
      for (const key in st.cur) {
        const d = st.target[key] - st.cur[key];
        st.cur[key] += d * k;
        if (Math.abs(d) > 0.01) settled = false;
      }
      if (settled && el !== hovered) {
        PROPS.forEach((p) => el.style.removeProperty(p));
        live.delete(el);
        continue;
      }
      const c = st.cur;
      el.style.setProperty("--aika-tilt-rx", c.rx.toFixed(2));
      el.style.setProperty("--aika-tilt-ry", c.ry.toFixed(2));
      el.style.setProperty("--aika-tilt-s", c.s.toFixed(4));
      el.style.setProperty("--aika-tilt-lx", c.lx.toFixed(1) + "%");
      el.style.setProperty("--aika-tilt-ly", c.ly.toFixed(1) + "%");
      el.style.setProperty("--aika-tilt-on", c.on.toFixed(3));
    }
    loop = live.size ? requestAnimationFrame(step) : 0;
  };

  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  function onMove(e) {
    lastEvent = e;
    if (!moveFrame) moveFrame = requestAnimationFrame(aim);
  }
  function onLeave() { lastEvent = null; aim(); }
  document.addEventListener("pointermove", onMove, { passive: true, capture: true });
  document.addEventListener("pointerleave", onLeave);
})();
