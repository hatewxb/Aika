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
// The same appinfo gives the library hero art (library_hero) — the poster
// of the "Cinematic" game page (js/store-hero.js). Both are shared through
// window.__aikaStoreAssets: a promise of { logo, hero } (URLs or null).
//
// Look and position — sections/store.css ("Game logo above the trailer").

(() => {
  "use strict";

  const match = location.pathname.match(/^\/app\/(\d+)/);
  if (!match || window.__aikaStoreAssets) return;

  const appid = match[1];
  const CDN = "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/" + appid + "/";
  const CACHE_KEY = "aika-appart-v2-" + appid;
  const CACHE_DAYS = 7;
  const LANG = (document.documentElement.lang || "en").startsWith("ru") ? "russian" : "english";

  const cacheGet = () => {
    try {
      const v = JSON.parse(localStorage.getItem(CACHE_KEY));
      if (v && Date.now() - v.t < CACHE_DAYS * 864e5) return v;
    } catch (e) { /* storage unavailable — just no cache */ }
    return null;
  };
  const cacheSet = (files) => {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), ...files })); } catch (e) { /* no cache */ }
  };

  // A localized file name from a library_assets_full entry; null — no such asset
  const pick = (asset) => {
    const img = asset?.image2x || asset?.image;
    return img ? (img[LANG] || img.english || Object.values(img)[0]) : null;
  };

  // Logo and hero file names (with hash) from appinfo
  const fetchFiles = async () => {
    const cached = cacheGet();
    if (cached) return cached;
    try {
      const r = await fetch("https://api.steamcmd.net/v1/info/" + appid);
      if (!r.ok) return {}; // network / service — don't cache, try later
      const j = await r.json();
      const assets = j?.data?.[appid]?.common?.library_assets_full;
      const files = { file: pick(assets?.library_logo), hero: pick(assets?.library_hero) };
      cacheSet(files);
      return files;
    } catch (e) {
      return {};
    }
  };

  const loads = (src) => new Promise((resolve) => {
    const i = new Image();
    i.onload = () => resolve(i.naturalWidth > 0);
    i.onerror = () => resolve(false);
    i.src = src;
  });

  const firstLoading = async (candidates) => {
    for (const c of candidates) if (await loads(c)) return c;
    return null;
  };

  const ready = (fn) =>
    document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", fn, { once: true }) : fn();

  const files = fetchFiles();

  window.__aikaStoreAssets = (async () => {
    const f = await files;
    const [logo, hero] = await Promise.all([
      firstLoading([f.file && CDN + f.file, CDN + "logo_2x.png", CDN + "logo.png"].filter(Boolean)),
      // The hero is only checked here, the page shows it itself (no double download:
      // the browser caches it)
      f.hero ? Promise.resolve(CDN + f.hero) : firstLoading([CDN + "library_hero.jpg"]),
    ]);
    return { logo, hero };
  })();

  ready(async () => {
    const host = document.querySelector(".highlight_ctn");
    if (!host) return;

    const { logo: src } = await window.__aikaStoreAssets;
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
