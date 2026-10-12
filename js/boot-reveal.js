// boot-reveal.js — the main window's loading curtain (motion.dev "Loading line
// reveal", sections/boot.css for the look). Imported first by js/main.js.
//
// The window opens empty: Steam builds the interface, then the start page loads
// (the store is a separate browser view, the library is the window's own DOM).
// A curtain covers it all; a slit in its middle grows up and down with the real
// progress, then the curtain splits open to the edges and the beam under it fades.
// Same physics as the Motion example: the slit follows each new progress value on
// a spring (stiffness 500, damping 40), the opening is a spring with a 0.5 s
// visual duration and no bounce. Between the real steps the value creeps on its
// own (the example adds random 0–0.3 every 300 ms), never past the next step.
//
// Progress steps: the script runs → Steam's root is rendered → the top bar →
// the content frame → the start page is ready (the store view finished loading,
// or the library content settled). The store view is a native layer above the
// window's DOM, so it is kept hidden under the curtain and shown once it opens.
// Once per Steam launch (a flag in SharedJSContext — reopening the window from the
// tray doesn't replay it); a hard limit opens it anyway; reduced motion — none.

(() => {
  "use strict";
  const shared = window.opener;
  if (!shared || shared.__aikaBootShown || window.__aikaBoot) return;
  shared.__aikaBootShown = true;
  window.__aikaBoot = true;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const root = document.documentElement;
  const cssNum = (name, fallback) => {
    const v = parseFloat(getComputedStyle(root).getPropertyValue(name));
    return Number.isFinite(v) ? v : fallback;
  };

  const box = document.createElement("div");
  box.className = "aika-boot";
  box.setAttribute("aria-hidden", "true");
  box.innerHTML = '<div class="aika-boot__shade"></div><div class="aika-boot__curtain"></div>';
  const curtain = box.lastChild;
  root.append(box);

  // --- the Steam side: the start page ---------------------------------------
  const manager = () => shared.MainWindowBrowserManager;
  const browserRoute = () => !!document.querySelector(".ContentFrame .BrowserWrapper");
  const hideView = () => { try { manager()?.m_browser?.SetVisible(false); } catch { } };
  const showView = () => { try { if (browserRoute()) manager()?.m_browser?.SetVisible(true); } catch { } };

  let sawLoading = false, frameAt = 0, settledAt = 0, lastCount = 0;
  const pageReady = (now) => {
    if (browserRoute()) {
      const m = manager();
      if (m?.m_bLoading) sawLoading = true;
      // a URL that finished loading; if the load was too quick to see — 1.5 s after the frame
      return !!m?.m_URL && !m.m_bLoading && (sawLoading || now - frameAt > 1500);
    }
    // The library (or any in-window page): its element count stops growing
    const n = document.querySelector(".ContentFrame")?.getElementsByTagName("*").length || 0;
    if (n !== lastCount) { lastCount = n; settledAt = now; }
    return n > 150 && now - settledAt > 400;
  };

  const STEPS = [
    { at: 0.12, done: () => true },
    { at: 0.3, done: () => !!document.querySelector(".FocusNavigationRoot") },
    { at: 0.5, done: () => !!document.querySelector(".SuperNav") },
    { at: 0.7, done: (now) => { const f = !!document.querySelector(".ContentFrame"); if (f && !frameAt) frameAt = now; return f; } },
    { at: 1, done: pageReady },
  ];

  // --- springs -----------------------------------------------------------------
  // Mass 1. Motion's visualDuration d, bounce 0 → stiffness (2π/d)², critical damping.
  const spring = (k, c) => ({ k, c, x: 0, v: 0, to: 0 });
  const openK = (2 * Math.PI / cssNum("--aika-boot-open", 0.5)) ** 2;
  const slit = spring(cssNum("--aika-boot-stiffness", 500), cssNum("--aika-boot-damping", 40));
  const open = spring(openK, 2 * Math.sqrt(openK));
  const stepSpring = (s, dt) => {
    for (let t = 0; t < dt; t += 1 / 240) {
      const h = Math.min(1 / 240, dt - t);
      s.v += (-s.k * (s.x - s.to) - s.c * s.v) * h;
      s.x += s.v * h;
    }
  };
  const resting = (s) => Math.abs(s.x - s.to) < 0.0005 && Math.abs(s.v) < 0.001;

  const half = cssNum("--aika-boot-line", 2);   // px each side of the centre
  const clip = () => {
    const p = Math.min(1, Math.max(0, slit.x)), o = Math.min(1, Math.max(0, open.x));
    const l = `calc(${50 - 50 * o}% - ${half * (1 - o)}px)`, r = `calc(${50 + 50 * o}% + ${half * (1 - o)}px)`;
    const top = `${50 - 50 * p}%`, bottom = `${50 + 50 * p}%`;
    curtain.style.clipPath = `polygon(0% 0%, ${l} 0%, ${l} ${top}, ${l} ${bottom}, ${r} ${bottom}, ${r} ${top}, ${l} ${top}, ${l} 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%)`;
  };
  clip();

  // --- the loop --------------------------------------------------------------------
  const t0 = performance.now();
  const minShow = cssNum("--aika-boot-min", 1200), limit = cssNum("--aika-boot-limit", 12000);
  let reached = 0, progress = 0, nextCreep = 0, opening = false, last = t0;

  const finish = () => {
    opening = true;
    slit.to = 1;
    open.to = 1;
    // the slit springs to full height together with the opening (as in Motion)
    slit.k = open.k; slit.c = open.c;
    box.classList.add("is-open");
  };

  const frame = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!opening) {
      while (reached < STEPS.length && STEPS[reached].done(now)) reached++;
      const floor = reached ? STEPS[reached - 1].at : 0;
      const cap = reached < STEPS.length ? STEPS[reached].at - 0.03 : 1;
      if (now >= nextCreep) {   // the example's random step every 300 ms
        nextCreep = now + 300;
        progress = Math.max(floor, Math.min(cap, progress + Math.random() * 0.06));
      }
      progress = Math.max(progress, floor);
      slit.to = progress;
      if (browserRoute()) hideView();   // Steam may show it again while it mounts
      if ((reached === STEPS.length && now - t0 >= minShow && slit.x > 0.9) || now - t0 > limit) finish();
    }
    stepSpring(slit, dt);
    stepSpring(open, dt);
    clip();
    if (opening && resting(open)) {
      showView();
      box.remove();
      return;
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
})();
