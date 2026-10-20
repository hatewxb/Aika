// url-capsule.js — the page address over store and community pages, in both
// header modes (author 2026-10-16). Attached by a Patch to store and community
// pages (skin.json); the look is components/url-capsule.css.
//
// The theme hides the client's address strip (sections/store.css, part 1).
// That strip is in the window's DOM, and these pages are a native layer above
// it, so nothing there can float over them — the address is drawn here,
// inside the page: top left, beside the store menu capsule. "URL visibility:
// no" hides it (options/hide-url.css).
//   reload — location.reload(); the address — a click copies it.
// The address shows up to 8 characters after ".com/" ("…" after them; the
// full one is in the tooltip), so the capsule is as wide as that.
// Loading: when the page starts leaving (reload, a link — beforeunload) the
// capsule turns .is-loading and the reload icon becomes "Heart Pulse"; while
// the next page loads, components/url-capsule.css shows a round placeholder
// with the pulse until this script marks <html> .aika-url-ready.
// The address follows in-page navigation (history.pushState / replaceState,
// popstate). The capsule takes the room left of the store menu and hides when
// there is too little (a narrow window).
(() => {
  "use strict";
  if (window.__aikaUrlCapsule || window.top !== window) return;
  window.__aikaUrlCapsule = true;

  const root = document.documentElement;
  const css = () => getComputedStyle(root);

  const ru = /^ru/i.test(root.lang || navigator.language);
  const T = ru
    ? { reload: "Обновить страницу", copy: "Скопировать адрес", copied: "Скопировано", extensions: "Расширения" }
    : { reload: "Reload the page", copy: "Copy the address", copied: "Copied", extensions: "Extensions" };

  const box = document.createElement("div");
  box.className = "aika-url-capsule";
  const reload = document.createElement("button");
  reload.type = "button";
  reload.className = "aika-url-reload";
  reload.title = T.reload;
  reload.setAttribute("aria-label", T.reload);
  const lock = document.createElement("span");
  lock.className = "aika-url-lock";
  lock.setAttribute("aria-hidden", "true");
  const text = document.createElement("button");
  text.type = "button";
  text.className = "aika-url-text";
  text.title = T.copy;
  box.append(reload, lock, text);

  // Extendium's button (when the plugin is installed — its page script registers
  // in PLUGIN_LIST, possibly after us): a click marks the address with
  // #aika-extensions for a moment; js/extendium-bridge.js in the main window
  // sees it in Steam's hidden address bar and presses Extendium's own button
  const EXT_MARK = "#aika-extensions";
  const addExtendium = () => {
    if (!window.PLUGIN_LIST?.extendium || box.querySelector(".aika-url-ext")) return;
    const ext = document.createElement("button");
    ext.type = "button";
    ext.className = "aika-url-ext";
    ext.title = T.extensions;
    ext.setAttribute("aria-label", T.extensions);
    ext.addEventListener("click", () => {
      const back = location.href;
      history.replaceState(history.state, "", back.split("#")[0] + EXT_MARK);
      setTimeout(() => history.replaceState(history.state, "", back), 400);
    });
    reload.after(ext);
  };
  addExtendium();
  [1000, 3000].forEach((t) => setTimeout(addExtendium, t));

  const TAIL = 8;   // characters shown after ".com/"
  const short = (href) => {
    const m = href.match(/^(.*?\.com\/)(.*)$/);
    if (!m) return href;
    return m[1] + (m[2].length > TAIL ? m[2].slice(0, TAIL) + "…" : m[2]);
  };
  const show = () => {
    text.title = T.copy + "\n" + location.href;
    if (!text.classList.contains("is-copied")) text.textContent = short(location.href);
  };

  // Leaving: the pulse in the reload button; back to normal if the navigation
  // never happens (a download, a steam:// link)
  let loadingTimer = 0;
  const loading = () => {
    box.classList.add("is-loading");
    clearTimeout(loadingTimer);
    loadingTimer = setTimeout(() => box.classList.remove("is-loading"), 10000);
  };
  addEventListener("beforeunload", loading);
  addEventListener("pageshow", (e) => { if (e.persisted) box.classList.remove("is-loading"); });
  reload.addEventListener("click", () => { loading(); location.reload(); });

  let copiedTimer = 0;
  text.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(location.href);
    } catch {
      const area = document.createElement("textarea");
      area.value = location.href;
      area.style.cssText = "position:fixed;opacity:0";
      document.body.append(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    text.classList.add("is-copied");
    text.textContent = T.copied;
    clearTimeout(copiedTimer);
    copiedTimer = setTimeout(() => { text.classList.remove("is-copied"); show(); }, 1200);
  });

  // In-page navigation
  for (const name of ["pushState", "replaceState"]) {
    const original = history[name];
    history[name] = function (...args) { const r = original.apply(this, args); show(); return r; };
  }
  addEventListener("popstate", show);
  addEventListener("hashchange", show);

  // The room left of the store menu capsule (the store home and app pages,
  // the new engine pages); no menu (community) — the full width
  const MENU = '[data-featuretarget="store-menu-v7"] [role="navigation"], #StoreTemplate [role="navigation"]';
  const fit = () => {
    const menus = [...document.querySelectorAll(MENU)].map((m) => m.getBoundingClientRect()).filter((r) => r.width > 0 && r.top < 120);
    const c = css();
    const left = parseFloat(c.getPropertyValue("--aika-url-capsule-left")) || 12;
    const gap = parseFloat(c.getPropertyValue("--aika-space-3")) || 12;
    const min = parseFloat(c.getPropertyValue("--aika-url-capsule-min")) || 180;
    if (!menus.length) { box.style.removeProperty("--aika-url-room"); box.hidden = false; return; }
    // the capsule around the menu reaches a little past it
    const pad = parseFloat(c.getPropertyValue("--aika-space-4")) || 16;
    const room = Math.min(...menus.map((r) => r.left)) - pad - gap - left;
    box.hidden = room < min;
    box.style.setProperty("--aika-url-room", Math.round(room) + "px");
  };

  const start = () => {
    show();
    document.body.append(box);
    root.classList.add("aika-url-ready");
    fit();
    // the store menu is React and mounts after the page — look again a few times
    [500, 1500, 3000].forEach((t) => setTimeout(fit, t));
    let frame = 0;
    addEventListener("resize", () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; fit(); }); });
  };
  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });
})();
