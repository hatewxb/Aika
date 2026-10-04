// store-logo.js — логотип игры вместо текстового названия на странице игры
// в магазине (store.steampowered.com/app/<appid>/). Идея автора, 2026-10-04.
//
// Логотип — тот же, что в библиотеке клиента («Логотип» в карточке игры):
// common.library_assets_full.library_logo из appinfo. Его файл лежит
// на CDN Steam по пути с хэшем:
//   shared.fastly.steamstatic.com/store_item_assets/steam/apps/<appid>/<hash>/logo.png
// Хэш страница магазина не знает (в HTML его нет, API магазина его не отдаёт,
// локальный кэш клиента steamloopback.host странице недоступен), поэтому
// берём appinfo с публичного api.steamcmd.net (CORS открыт) и кэшируем
// в localStorage. Запасной путь — старый адрес без хэша (есть у старых игр).
// Нет логотипа — ничего не меняем, остаётся текстовое название (CSS-фолбэк).
//
// Вид и положение — sections/store.css («Логотип игры над трейлером»).

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
    } catch (e) { /* хранилище недоступно — просто без кэша */ }
    return null;
  };
  const cacheSet = (file) => {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), file })); } catch (e) { /* без кэша */ }
  };

  // Имя файла логотипа (с хэшем) из appinfo; null — логотипа нет
  const fetchLogoFile = async () => {
    const cached = cacheGet();
    if (cached) return cached.file;
    try {
      const r = await fetch("https://api.steamcmd.net/v1/info/" + appid);
      if (!r.ok) return undefined; // сеть / сервис — не кэшируем, попробуем позже
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
