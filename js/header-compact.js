// header-compact.js — keeps the tabs centered on the window in the compact
// header ("Compact header: Compact", options/header-compact.css).
// Imported by js/main.js.
//
// In the compact header .SuperNavBar fills the space between Steam's menus on
// the left and the account / window buttons on the right; those two sides
// differ in width, so tabs centered inside the bar sit off the window center.
// tabs-center.css centers the tab group between auto margins with a
// counterweight (.SuperNav::after); here its width is set so the group's
// center lands on the window's: with the bar from L to R, the arrows A wide
// and the counterweight X, the group center is (L + A + R − X) / 2 — so
// X = L + A + R − W. When that is negative (the buttons on the right are wider
// than the menus on the left — the usual case) the group has to move right
// instead: the same amount goes after the arrows (--aika-compact-lead).
// Recomputed when the sides change size (a ResizeObserver, it fires rarely);
// without the compact option the variables are removed.
(() => {
  "use strict";
  if (window.__aikaHeaderCompact) return;
  window.__aikaHeaderCompact = true;

  const root = document.documentElement;
  const compact = () => getComputedStyle(root).getPropertyValue("--aika-header-mode").trim() === "compact";

  // A narrow window (author 2026-10-20): when the tab group doesn't fit
  // between the arrows and the account buttons, html.aika-menus-icons turns
  // the View / Friends / Games / Help menus into icons (components/window.css)
  // and tightens the tabs (options/header-compact.css); the labels come back
  // once the room covers what the tight mode saved (+ SLACK, so a window edge
  // near the threshold doesn't flip it back and forth)
  const ICONS = "aika-menus-icons";
  const SLACK = 24;
  const GAP = 24;   // kept between the tabs and the account buttons (split by the auto margins)
  let saved = 0;   // the room the tight mode gave
  const menus = () => document.querySelector(".TopBar .RootMenuBar");
  const iconize = (on) => {
    const bar = menus();
    if (!bar || root.classList.contains(ICONS) === on) return;
    root.classList.toggle(ICONS, on);
    // the label stays as the tooltip and the accessible name
    for (const b of bar.querySelectorAll(".RootMenuButton:not(:has(.SteamButton)) > div")) {
      if (on) { b.title = b.textContent; b.setAttribute("aria-label", b.textContent); }
      else { b.removeAttribute("title"); b.removeAttribute("aria-label"); }
    }
  };

  const balance = () => {
    const bar = document.querySelector(".TopBar > .SuperNavBar");
    if (!bar || !compact()) {
      iconize(false);
      root.style.removeProperty("--aika-compact-balance");
      root.style.removeProperty("--aika-compact-lead");
      return;
    }
    // L and R — the bar edges; A — from L to the last arrow's edge (with the
    // bar's left padding; the lead margin comes after it); R without the right padding
    const nav = bar.querySelector(".SuperNav") || bar;
    const measure = () => {
      const r = nav.getBoundingClientRect();
      const right = r.right - parseFloat(getComputedStyle(nav).paddingRight || 0);
      const last = [...nav.querySelectorAll(":scope > svg")].pop();
      const arrows = last ? last.getBoundingClientRect().right - r.left : 0;
      const tabs = [...nav.querySelectorAll(":scope > .MenuWrapper")];
      const group = tabs.length ? tabs.at(-1).getBoundingClientRect().right - tabs[0].getBoundingClientRect().left : 0;
      // room left for the lead / counterweight once the group is in
      return { r, right, arrows, free: right - r.left - arrows - group - GAP };
    };
    let m = measure();
    if (m.free < 0 && !root.classList.contains(ICONS)) { const before = m.free; iconize(true); m = measure(); saved = m.free - before; }
    else if (root.classList.contains(ICONS) && m.free - saved >= SLACK) {
      const before = m.free;
      iconize(false); m = measure();
      // the labels took more than recorded (a font loaded late, the account name changed)
      if (m.free < 0) { iconize(true); saved = before - m.free; m = measure(); }
    }
    // Tabs on the left ("Top bar: Left" — no tabs-center.css, no counterweight): nothing to center
    if (getComputedStyle(nav, "::after").content === "none") {
      root.style.removeProperty("--aika-compact-balance");
      root.style.removeProperty("--aika-compact-lead");
      return;
    }
    // centered on the window while there is room; otherwise as close as fits —
    // the group never runs into the account buttons
    const free = Math.max(0, Math.floor(m.free));
    const x = Math.round(m.r.left + m.arrows + m.right - root.clientWidth);
    root.style.setProperty("--aika-compact-balance", Math.min(free, Math.max(0, x)) + "px");
    root.style.setProperty("--aika-compact-lead", Math.min(free, Math.max(0, -x)) + "px");
  };

  let frame = 0;
  const queue = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; balance(); }); };
  const ro = new ResizeObserver(queue);
  const watched = new WeakSet();
  const watch = () => {
    for (const el of document.querySelectorAll(".TopBar, .TopBar .RootMenuBar, .TopBar .TitleBarControls, .TopBar .WindowControls")) {
      if (watched.has(el)) continue;
      watched.add(el);
      ro.observe(el);
    }
    queue();
  };
  // The top bar is there from the start; a late mount is caught by a short retry
  watch();
  let tries = 0;
  const retry = setInterval(() => { watch(); if (document.querySelector(".TopBar .TitleBarControls") || ++tries > 20) clearInterval(retry); }, 500);
  addEventListener("resize", queue);
})();
