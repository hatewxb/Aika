// page-curtain.js — page changes in the main window behind a curtain
// (motion.dev "Curtains: fade", examples.motion.dev/js/curtains-fade: a
// full-cover curtain fades in, the page is swapped under it, the curtain fades
// out). Imported by js/main.js; the look is components/curtain.css.
//
// The window's pages (library home, a game page, collections, downloads, the
// store / community tab) are routes of Steam's router — its history object lives
// in SharedJSContext (MainWindowBrowserManager.m_history). Its push / go / goBack
// / goForward are wrapped there: the wrapper asks this window's handler first,
// which fades the curtain in over the content area (the top bar stays), then
// lets the navigation through, waits until the new page has rendered and fades
// the curtain out. replace() is left alone (Steam uses it to update the same
// page), as is a push to the page already shown.
//
// The wrapper is created in SharedJSContext's realm and only calls a handler this
// window registers — if the window is closed (to the tray) the handler is gone and
// navigation runs as before; if a handler never lets a navigation through, the
// wrapper does it itself after a timeout.
// The store / community tab is a native view above the window's DOM: going to
// it the curtain fades in, then the view simply appears; leaving it the curtain
// starts covered and only fades out. Reduced motion — no curtain.

(() => {
  "use strict";
  const shared = window.opener;
  const history = shared?.MainWindowBrowserManager?.m_history;
  if (!history || window.__aikaCurtain) return;
  window.__aikaCurtain = true;

  const root = document.documentElement;
  const cssNum = (name, fallback) => {
    const v = parseFloat(getComputedStyle(root).getPropertyValue(name));
    return Number.isFinite(v) ? v : fallback;
  };
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");

  // --- the wrapper, once per Steam process (SharedJSContext realm) -------------
  if (!history.__aikaCurtainWrapped) {
    history.__aikaCurtainWrapped = true;
    const make = new shared.Function("history", "kind", `
      const orig = history[kind];
      return function (...args) {
        const handler = history.__aikaCurtainHandler;
        if (typeof handler !== "function") return orig.apply(this, args);
        let done = false;
        const run = () => { if (!done) { done = true; orig.apply(history, args); } };
        let taken = false;
        try { taken = handler(kind, args, run); } catch (e) { taken = false; }
        if (!taken) return run();
        setTimeout(run, 1500);   // the handler's window died mid-way
      };`);
    for (const kind of ["push", "go", "goBack", "goForward"]) history[kind] = make(history, kind);
  }

  // --- the curtain -------------------------------------------------------------
  const curtain = document.createElement("div");
  curtain.className = "aika-curtain";
  curtain.setAttribute("aria-hidden", "true");
  root.append(curtain);

  const BROWSER = /^\/browser\b/;
  const pathOf = (to) => typeof to === "string" ? to.split(/[?#]/)[0] : to?.pathname;
  let anim = null, busy = false, pending = null;

  const place = () => {
    const f = document.querySelector(".ContentFrame");
    const r = f ? f.getBoundingClientRect() : { top: 0, left: 0, width: innerWidth, height: innerHeight };
    Object.assign(curtain.style, { top: r.top + "px", left: r.left + "px", width: r.width + "px", height: r.height + "px" });
  };

  const fade = (from, to, ms) => {
    anim?.cancel();
    curtain.style.opacity = String(from);
    anim = curtain.animate([{ opacity: from }, { opacity: to }], { duration: ms, easing: getComputedStyle(root).getPropertyValue("--aika-ease").trim() || "ease", fill: "forwards" });
    return anim.finished.then(() => { curtain.style.opacity = String(to); anim?.cancel(); anim = null; }, () => { });
  };

  // The new page has rendered: the content frame stops changing for a moment
  const settled = () => new Promise((resolve) => {
    const frame = document.querySelector(".ContentFrame") || document.body;
    const quiet = cssNum("--aika-curtain-quiet", 90), most = cssNum("--aika-curtain-wait", 500);
    let t = setTimeout(done, quiet);
    const cap = setTimeout(done, most);
    const mo = new MutationObserver(() => { clearTimeout(t); t = setTimeout(done, quiet); });
    mo.observe(frame, { childList: true, subtree: true });
    function done() { mo.disconnect(); clearTimeout(t); clearTimeout(cap); requestAnimationFrame(() => requestAnimationFrame(resolve)); }
  });

  const transition = async (kind, args, run) => {
    busy = true;
    const fromBrowser = BROWSER.test(history.location.pathname);
    place();
    curtain.classList.add("is-on");
    if (fromBrowser) curtain.style.opacity = "1";   // under the native store view: nothing to see fading in
    else await fade(0, 1, cssNum("--aika-curtain-in", 250));
    run();
    await settled();
    place();
    await fade(1, 0, cssNum("--aika-curtain-out", 350));
    curtain.classList.remove("is-on");
    busy = false;
    if (pending) { const p = pending; pending = null; handler(...p); }
  };

  const handler = (kind, args, run) => {
    if (reduced.matches || cssNum("--aika-motion", 1) === 0 || !document.querySelector(".ContentFrame")) return false;
    if (kind === "push" && pathOf(args[0]) === history.location.pathname) return false;
    if (busy) {   // a second click mid-way: it runs once this one is through
      pending?.[2]();
      pending = [kind, args, run];
      return true;
    }
    transition(kind, args, run);
    return true;
  };

  history.__aikaCurtainHandler = handler;
  addEventListener("pagehide", () => {
    if (history.__aikaCurtainHandler === handler) history.__aikaCurtainHandler = null;
  });
})();
