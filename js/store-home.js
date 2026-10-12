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
// 3. Staggered title: "Featured & Recommended" comes in letter by letter when
//    the page opens — each letter drops in from above out of a blur (idea:
//    reactbits Pro "Staggered Text"; the motion is Aika's expo-out). The
//    letters are only wrapped in spans, the text stays Steam's; the heading
//    gets an aria-label so screen readers read it whole. Opened hidden (under the
//    client loading curtain) — the letters wait until the page is shown.
// The pop-up of cards on scroll is CSS (scroll-driven animations); the script
// only keeps view timelines on the cards near the window (see the end).

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

  // ------------------------------------------------------- staggered title
  const splitTitle = () => {
    const t = document.getElementById("home_featured_and_recommended");
    if (!t || "aikaSplit" in t.dataset) return;
    // Not splitting: show Steam's title right away (CSS holds it hidden until then)
    if (t.children.length || matchMedia("(prefers-reduced-motion: reduce)").matches) { t.classList.add("aika-split-skip"); return; }
    const text = t.textContent.trim();
    t.dataset.aikaSplit = "";
    t.setAttribute("aria-label", text);
    let i = 0;
    const frag = document.createDocumentFragment();
    for (const part of text.split(/(\s+)/)) {
      if (!part) continue;
      if (/^\s+$/.test(part)) { frag.append(" "); continue; }
      const word = document.createElement("span");
      word.className = "aika-split-word";
      word.setAttribute("aria-hidden", "true");
      for (const ch of part) {
        const c = document.createElement("span");
        c.className = "aika-split-char";
        c.style.setProperty("--aika-split-i", i++);
        c.textContent = ch;
        word.append(c);
      }
      frag.append(word);
    }
    t.replaceChildren(frag);
    t.classList.add("aika-split");
    // A hidden page (the client keeps the store view hidden under the loading
    // curtain, js/boot-reveal.js) still advances the animation clock — the letters
    // would be done before anyone sees them. Hold them until the page is shown.
    if (document.hidden) {
      t.classList.add("aika-split-wait");
      const go = () => {
        if (document.hidden) return;
        document.removeEventListener("visibilitychange", go);
        t.classList.remove("aika-split-wait");
      };
      document.addEventListener("visibilitychange", go);
    }
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", splitTitle, { once: true });
  else splitTitle();

  // ------------------------------------------------------------- pop-up
  // The pop-up on scroll is CSS (a view timeline per card, sections/store-home.css).
  // A long page carried ~100 of them, and every time Steam mounted content while
  // you scrolled, all of them were re-resolved — ~70 ms frames (author
  // 2026-10-13: the page stuttered). Here only the cards within a screen of the
  // window get .aika-pop-near (and so a timeline); an IntersectionObserver with
  // a one-screen margin adds / removes it. The motion itself is unchanged.
  if (CSS.supports("animation-timeline: view()")) {
    const POP = [
      ".title_grid", ".home_tabs_row_ctn", "#content_more .home_content > h2",
      ".main_content_ctn .Panel:has(> .WidgetHeaderCtn)",
      ".paging_capsules .carousel_items > .focus > *", ".carousel__slide--visible",
      ".home_discount_games_ctn > *", "a.tab_row_item",
      "div.home_content_items > .home_content_item",
      ".gp_contiguous_singles > .home_content_single_ctn",
    ].map((s) => "body.v6 " + s).join(",");
    const seen = new WeakSet();
    const near = new IntersectionObserver((entries) => {
      for (const e of entries) e.target.classList.toggle("aika-pop-near", e.isIntersecting);
    }, { rootMargin: "100% 0px 100% 0px" });
    const scan = () => {
      for (const el of document.querySelectorAll(POP)) {
        if (seen.has(el)) continue;
        seen.add(el);
        near.observe(el);
      }
    };
    let queued = 0;
    const start = () => {
      document.documentElement.classList.add("aika-pop-js");
      scan();
      new MutationObserver(() => { if (!queued) queued = requestAnimationFrame(() => { queued = 0; scan(); }); })
        .observe(document.body, { childList: true, subtree: true });
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
    else start();
  }
})();
