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
    ? { reload: "Обновить страницу", copy: "Скопировать адрес", copied: "Скопировано" }
    : { reload: "Reload the page", copy: "Copy the address", copied: "Copied" };

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

  const show = () => { if (!text.classList.contains("is-copied")) text.textContent = location.href; };
  reload.addEventListener("click", () => location.reload());

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
    fit();
    // the store menu is React and mounts after the page — look again a few times
    [500, 1500, 3000].forEach((t) => setTimeout(fit, t));
    let frame = 0;
    addEventListener("resize", () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; fit(); }); });
  };
  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });
})();
