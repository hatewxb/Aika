// page-loading.js — the "Heart Pulse" loader in the top bar while a store or
// community page loads (author 2026-10-16). Imported by js/main.js; the look
// is components/loader.css.
//
// The theme hides Steam's address bar (sections/store.css, part 1), and with
// it Steam's loading indicator: while a web page loads, Steam swaps the reload
// button for a .Spinner inside .URLBar (captured 2026-10-16: from ~0.4 s after
// the press until the page is done). The bar stays in the DOM, hidden — this
// script watches it and shows the dot matrix right after ← → in the top bar,
// the one place of the window that the native page layer doesn't cover.
// The page's own address capsule (js/url-capsule.js) can't show it: the page
// is gone while it reloads.
(() => {
  "use strict";
  if (window.__aikaPageLoading) return;
  window.__aikaPageLoading = true;

  const GRID = 7;
  const loader = document.createElement("div");
  loader.className = "aika-loader";
  loader.setAttribute("role", "progressbar");
  loader.setAttribute("aria-label", /^ru/i.test(document.documentElement.lang) ? "Загрузка страницы" : "Loading the page");
  const c = (GRID - 1) / 2;
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const d = Math.hypot(x - c, y - c);
      const dot = document.createElement("i");
      if (d > c + 0.25) dot.className = "is-out";
      else dot.style.setProperty("--r", Math.round(d));
      loader.append(dot);
    }
  }

  // Right after the last history arrow, centered on it vertically
  const place = () => {
    const last = [...document.querySelectorAll(".SuperNav > svg")].pop();
    if (!last) return false;
    const r = last.getBoundingClientRect();
    const size = loader.getBoundingClientRect();
    loader.style.left = Math.round(r.right + 6) + "px";
    loader.style.top = Math.round(r.top + (r.height - size.height) / 2) + "px";
    return true;
  };

  let bar = null, on = false;
  const update = () => {
    const shown = !!bar && bar.isConnected && !!bar.closest(".BrowserWrapper")?.getClientRects().length;
    const loading = shown && !!bar.querySelector(".Spinner");
    if (loading === on) return;
    on = loading;
    if (on && !loader.isConnected) document.body.append(loader);
    loader.classList.toggle("is-on", on);
    if (on) place();
  };

  let frame = 0;
  const queue = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; update(); }); };
  const observer = new MutationObserver(queue);
  // The address bar mounts with the first web page and may remount later
  const find = () => {
    const next = document.querySelector(".BrowserWrapper > .URLBar");
    if (next && next !== bar) {
      bar = next;
      observer.disconnect();
      observer.observe(bar, { childList: true, subtree: true });
    }
    update();
  };
  find();
  setInterval(find, 2000);
  addEventListener("resize", () => { if (on) place(); });
})();
