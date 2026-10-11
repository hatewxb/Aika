// store-home.js — motion for the store home page
// (skin.json: Patch by URL, store.steampowered.com/ with no path).
// The look itself is CSS (sections/store-home.css); without this script
// every block is visible and styled, the glows shine from the top center.
//
// 1. Spotlight: one passive pointermove handler, at most once per frame,
//    writes the cursor point into --aika-spot-x / --aika-spot-y of every
//    large surface under it (nested ones too: a calendar day inside the
//    calendar). Only blocks that appear a few at a time (DESIGN.md §7.9).
// 2. Magnet: carousel arrows lean toward the cursor (--aika-magnet-x/y,
//    a few px, transform only).
// 3. Reveal: home sections fade up once as they scroll into view
//    (html.aika-reveal + .aika-in); the infinite feed below is watched as
//    Steam appends it. Off with prefers-reduced-motion.

(() => {
  "use strict";
  if (window.__aikaStoreHome) return;
  window.__aikaStoreHome = true;

  const SURFACES = [
    "#home_maincap_v7 .store_main_capsule.focus",           // "Featured & Recommended"
    "#module_discounts_and_events .carousel__inner-slide a", // "Specials & events" tiles
    ".personal_calendar_ctn",                               // the calendar (its dot grid)
    ".personal_calendar_ctn .carousel__inner-slide > div",  // a calendar day
    ".home_discounts_block",                                // wishlist / DLC
    ".community_recommendation_app",                        // "Community recommends"
    ".home_content.single",                                 // the feed's single-game panels
    ".tab_preview.focus",                                   // the tab list preview
  ].join(", ");

  const MAGNETS = ".carousel_container .arrow, .CarouselBtnLeft, .CarouselBtnRight";
  const MAGNET_PULL = 0.12;   // of the cursor offset from the arrow center
  const MAGNET_MAX = 6;       // px, DESIGN.md §1: shifts of 2–6 px

  let frame = 0, lastEvent = null, magnet = null;

  const setMagnet = (el, x, y) => {
    el.style.setProperty("--aika-magnet-x", x + "px");
    el.style.setProperty("--aika-magnet-y", y + "px");
  };

  const update = () => {
    frame = 0;
    const e = lastEvent;
    const t = e && e.target instanceof Element ? e.target : null;
    for (let s = t && t.closest(SURFACES); s; s = s.parentElement && s.parentElement.closest(SURFACES)) {
      const r = s.getBoundingClientRect();
      s.style.setProperty("--aika-spot-x", Math.round(e.clientX - r.left) + "px");
      s.style.setProperty("--aika-spot-y", Math.round(e.clientY - r.top) + "px");
    }
    const m = t && t.closest(MAGNETS);
    if (magnet && magnet !== m) setMagnet(magnet, 0, 0);
    magnet = m;
    if (!m) return;
    // the visible button is centered in the (often much larger) hit area
    const r = m.getBoundingClientRect();
    const clamp = (v) => Math.max(-MAGNET_MAX, Math.min(MAGNET_MAX, Math.round(v * MAGNET_PULL)));
    setMagnet(m, clamp(e.clientX - (r.left + r.width / 2)), clamp(e.clientY - (r.top + r.height / 2)));
  };

  document.addEventListener("pointermove", (e) => {
    lastEvent = e;
    if (!frame) frame = requestAnimationFrame(update);
  }, { passive: true, capture: true });
  document.addEventListener("pointerleave", () => {
    if (magnet) setMagnet(magnet, 0, 0);
    magnet = null;
  });

  // ---------------------------------------------------------------- reveal
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const SECTIONS = ".main_content_ctn > *, #content_more > *";
  const seen = new WeakSet();
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      en.target.classList.add("aika-in");
      io.unobserve(en.target);
    }
  }, { rootMargin: "0px 0px -8% 0px" });

  const watch = () => {
    for (const el of document.querySelectorAll(SECTIONS)) {
      if (seen.has(el)) continue;
      seen.add(el);
      io.observe(el);
    }
  };

  const start = () => {
    watch();
    document.documentElement.classList.add("aika-reveal");
    const more = document.getElementById("content_more");
    if (more) new MutationObserver(watch).observe(more, { childList: true });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
