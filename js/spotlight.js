// spotlight.js — cursor glow on large client surfaces
// (DESIGN.md §1 "Spotlight under the cursor", §4 Cards). Attached by a Patch
// to the main window (skin.json, "^Steam$").
//
// One passive pointermove handler on the document, at most once per frame:
// finds the nearest surface from SURFACES and writes the cursor coordinates
// into its --aika-spot-x / --aika-spot-y. The glow itself is CSS
// (components/card.css, "Spotlight on Steam surfaces"); without the script
// it shines from the top center (the default token values).
//
// Only large blocks that appear a few at a time (not lists and not covers
// in a grid — DESIGN.md §7, performance).

(() => {
  "use strict";
  if (window.__aikaSpotlight) return;
  window.__aikaSpotlight = true;

  const SURFACES = [
    ".AppDetailsSection",                               // game page panels
    ".PartnerEventRowCapsule_Container.HoversEnabled",   // "What's New" cards
    ".CSSGrid.Grid .Collection",                         // collection tiles
  ].join(", ");

  let frame = 0;
  let lastEvent = null;
  let lastTarget = null;

  const update = () => {
    frame = 0;
    const e = lastEvent;
    const t = e && e.target instanceof Element ? e.target.closest(SURFACES) : null;
    if (!t) { lastTarget = null; return; }
    const r = t.getBoundingClientRect();
    t.style.setProperty("--aika-spot-x", Math.round(e.clientX - r.left) + "px");
    t.style.setProperty("--aika-spot-y", Math.round(e.clientY - r.top) + "px");
    lastTarget = t;
  };

  document.addEventListener("pointermove", (e) => {
    lastEvent = e;
    if (!frame) frame = requestAnimationFrame(update);
  }, { passive: true, capture: true });
})();
