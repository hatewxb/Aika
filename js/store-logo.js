// store-logo.js — the game logo instead of the text title on the store game page
// (store.steampowered.com/app/<appid>/). The author's idea, 2026-10-04.
//
// The logo is the same as in the client library ("Logo" in the game card):
// common.library_assets_full.library_logo from appinfo. Its file lives
// on the Steam CDN at a path with a hash:
//   shared.fastly.steamstatic.com/store_item_assets/steam/apps/<appid>/<hash>/logo.png
// The store page doesn't know the hash (it's not in the HTML, the store API doesn't return it,
// the client's local cache at steamloopback.host is unreachable from the page), so
// we take appinfo from the public api.steamcmd.net (CORS is open) and cache it
// in localStorage. Fallback — the old hashless address (old games have it).
// No logo — change nothing, the text title stays (CSS fallback).
//
// Look and position — sections/store.css ("Game logo above the trailer").

(() => {
  "use strict";

  const match = location.pathname.match(/^\/app\/(\d+)/);
  if (!match || window.__aikaStoreLogo) return;
  window.__aikaStoreLogo = true;

  const appid = match[1];
  const CDN = "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/" + appid + "/";
  const CACHE_KEY = "aika-logo-v1-" + appid;
  const CACHE_DAYS = 7;
  const LANG = (document.documentElement.lang || "en").startsWith("ru") ? "russian" : "english";

  const cacheGet = () => {
    try {
      const v = JSON.parse(localStorage.getItem(CACHE_KEY));
      if (v && Date.now() - v.t < CACHE_DAYS * 864e5) return v;
    } catch (e) { /* storage unavailable — just no cache */ }
    return null;
  };
  const cacheSet = (file) => {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), file })); } catch (e) { /* no cache */ }
  };

  // Logo file name (with hash) from appinfo; null — no logo
  const fetchLogoFile = async () => {
    const cached = cacheGet();
    if (cached) return cached.file;
    try {
      const r = await fetch("https://api.steamcmd.net/v1/info/" + appid);
      if (!r.ok) return undefined; // network / service — don't cache, try later
      const j = await r.json();
      const logo = j?.data?.[appid]?.common?.library_assets_full?.library_logo;
      const img = logo?.image2x || logo?.image;
      const file = img ? (img[LANG] || img.english || Object.values(img)[0]) : null;
      cacheSet(file);
      return file;
    } catch (e) {
      return undefined;
    }
  };

  const loads = (src) => new Promise((resolve) => {
    const i = new Image();
    i.onload = () => resolve(i.naturalWidth > 0);
    i.onerror = () => resolve(false);
    i.src = src;
  });

  const ready = (fn) =>
    document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", fn, { once: true }) : fn();

  ready(async () => {
    const host = document.querySelector(".highlight_ctn");
    if (!host) return;

    const file = await fetchLogoFile();
    const candidates = [];
    if (file) candidates.push(CDN + file);
    candidates.push(CDN + "logo_2x.png", CDN + "logo.png");

    let src = null;
    for (const c of candidates) {
      if (await loads(c)) { src = c; break; }
    }
    if (!src) return;

    const name = document.querySelector(".apphub_AppName")?.textContent.trim() || "";
    const wrap = document.createElement("div");
    wrap.className = "aika-store-logo";
    const img = document.createElement("img");
    img.src = src;
    img.alt = name;
    img.decoding = "async";
    wrap.append(img);
    host.append(wrap);
    document.documentElement.classList.add("aika-has-logo");
  });
})();
