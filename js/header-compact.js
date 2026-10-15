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

  const balance = () => {
    const bar = document.querySelector(".TopBar > .SuperNavBar");
    // Tabs on the left ("Top bar: Left" — no tabs-center.css, no counterweight): nothing to center
    const centered = bar && getComputedStyle(bar.querySelector(".SuperNav") || bar, "::after").content !== "none";
    if (!bar || !compact() || !centered) {
      root.style.removeProperty("--aika-compact-balance");
      root.style.removeProperty("--aika-compact-lead");
      return;
    }
    // L and R — the bar edges; A — from L to the last arrow's edge (with the
    // bar's left padding; the lead margin comes after it); R without the right padding
    const nav = bar.querySelector(".SuperNav") || bar;
    const r = nav.getBoundingClientRect();
    const right = r.right - parseFloat(getComputedStyle(nav).paddingRight || 0);
    const last = [...nav.querySelectorAll(":scope > svg")].pop();
    const arrows = last ? last.getBoundingClientRect().right - r.left : 0;
    const x = Math.round(r.left + arrows + right - root.clientWidth);
    root.style.setProperty("--aika-compact-balance", Math.max(0, x) + "px");
    root.style.setProperty("--aika-compact-lead", Math.max(0, -x) + "px");
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
