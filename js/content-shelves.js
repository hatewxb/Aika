// content-shelves.js — «Контент» → «Скриншоты» по играм (идея автора, 2026-10-05).
// Подключён Patch'ем к steamcommunity.com/(id|profiles)/<кто>/screenshots
// (skin.json). Вид — sections/content.css («Полки по играм»).
//
// Steam показывает все скриншоты одной «стеной» вперемешку. Вместо неё
// строим полку на каждую игру: иконка + название (ссылка на фильтр по игре),
// ниже — горизонтальная карусель скриншотов.
//
// Откуда данные:
// - список игр — из фильтра «Фильтровать по игре» (#sharedfiles_filterselect_app_…,
//   onclick SelectSharedFilesContentFilter({ 'appid': '…' }));
// - порядок полок — сначала игры со свежих скриншотов на странице
//   (у каждого .profile_media_item есть data-appid), затем остальные по списку;
// - скриншоты игры — та же страница с ?appid=<id>&view=grid (50 штук,
//   тот же сайт и та же сессия). Полка грузится, только когда подъезжает
//   к экрану (IntersectionObserver) — Steam отдаёт скрины небыстро;
// - картинки — уменьшенные копии с CDN Steam (параметры imw/imh, как у самого
//   Steam), <img loading="lazy">;
// - иконка игры — common.icon из appinfo с api.steamcmd.net (как в
//   store-logo.js), кэш в localStorage на 7 дней; нет иконки — плитка
//   с первой буквой названия.
//
// Группируем только «Все игры» своих скриншотов (browsefilter=myfiles, без
// appid). Отфильтровано по игре, «Избранное» или включено «Управление
// скриншотами» (выбор галочками — на стене Steam) — остаётся стена Steam.

(() => {
  "use strict";

  if (window.__aikaShelves) return;
  window.__aikaShelves = true;

  const params = new URLSearchParams(location.search);
  if (!/^\/(id|profiles)\/[^/]+\/screenshots\/?$/.test(location.pathname)) return;
  if ((params.get("appid") || "0") !== "0") return;
  if ((params.get("browsefilter") || "myfiles") !== "myfiles") return;

  const ROOT = document.documentElement;
  const CLASS_ON = "aika-shelves";
  const ICON_CDN = "https://shared.fastly.steamstatic.com/community_assets/images/apps/";
  const CACHE_DAYS = 7;
  // Уменьшенная копия: Steam сам так режет UGC-картинки (imw/imh, без полей)
  const THUMB = "?imw=640&imh=360&ima=fit&impolicy=Letterbox&imcolor=%23000000&letterbox=false";
  const RU = (document.documentElement.lang || navigator.language || "").startsWith("ru");
  const L = RU
    ? { prev: "Назад", next: "Вперёд", more: "Все скриншоты игры" }
    : { prev: "Previous", next: "Next", more: "All screenshots of the game" };

  const el = (tag, cls, attrs) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (attrs) for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    return e;
  };

  // Адрес страницы скриншотов с фильтром по игре (как у Steam: сортировка
  // и доступ — текущие)
  const gameUrl = (appid, extra) => {
    const p = new URLSearchParams(location.search);
    p.set("appid", appid);
    p.set("browsefilter", "myfiles");
    if (!p.get("sort")) p.set("sort", "newestfirst");
    for (const [k, v] of Object.entries(extra || {})) p.set(k, v);
    return location.pathname + "?" + p;
  };

  // ---------- иконки игр ----------
  const cacheGet = (key) => {
    try {
      const v = JSON.parse(localStorage.getItem(key));
      if (v && Date.now() - v.t < CACHE_DAYS * 864e5) return v;
    } catch (e) { /* хранилище недоступно — без кэша */ }
    return null;
  };
  const cacheSet = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), value })); } catch (e) { /* без кэша */ }
  };

  // Адрес иконки или null (нет иконки); undefined — сервис недоступен
  const iconUrl = async (appid) => {
    const key = "aika-icon-v1-" + appid;
    const cached = cacheGet(key);
    if (cached) return cached.value;
    try {
      const r = await fetch("https://api.steamcmd.net/v1/info/" + appid);
      if (!r.ok) return undefined;
      const j = await r.json();
      const hash = j?.data?.[appid]?.common?.icon;
      const url = hash ? ICON_CDN + appid + "/" + hash + ".jpg" : null;
      cacheSet(key, url);
      return url;
    } catch (e) {
      return undefined;
    }
  };

  const fillIcon = async (box, appid, name) => {
    const url = await iconUrl(appid);
    if (url) {
      const img = el("img", "aika-shelf-icon-img", { alt: "", decoding: "async" });
      img.onload = () => box.classList.add("is-ready");
      img.onerror = () => img.remove();
      img.src = url;
      box.append(img);
    }
    // буква — под картинкой: видна, пока картинка грузится или если её нет
    box.dataset.letter = (name.trim()[0] || "?").toUpperCase();
  };

  // ---------- скриншоты игры ----------
  const parseShots = (html) => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const shots = [...doc.querySelectorAll(".profile_media_item[data-publishedfileid]")].map((a) => {
      const bg = a.querySelector(".imgWallItem")?.getAttribute("style") || "";
      const src = (bg.match(/url\(['"]?([^'")]+)['"]?\)/) || [])[1];
      return {
        id: a.dataset.publishedfileid,
        href: a.getAttribute("href"),
        aspect: Math.min(Math.max(parseFloat(a.dataset.desiredAspect) || 16 / 9, 1), 2.4),
        src: src ? src.split("?")[0] + THUMB : null,
      };
    }).filter((s) => s.src);
    const hasMore = !!doc.querySelector(".pagingPageLinks a.pagingPageLink");
    return { shots, hasMore };
  };

  // Steam на пачку одновременных запросов отвечает пустыми страницами —
  // грузим не больше двух полок сразу, пустой ответ переспрашиваем
  const MAX_PARALLEL = 2;
  const RETRIES = 2;
  const queue = [];
  let active = 0;
  const enqueue = (shelf) => { queue.push(shelf); pump(); };
  const pump = () => {
    while (active < MAX_PARALLEL && queue.length) {
      active++;
      loadShelf(queue.shift()).finally(() => { active--; pump(); });
    }
  };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const fetchShots = async (appid) => {
    for (let i = 0; ; i++) {
      const r = await fetch(gameUrl(appid, { view: "grid", p: "1" }), { credentials: "include" });
      const res = r.ok ? parseShots(await r.text()) : null;
      if (res && res.shots.length) return res;
      if (i >= RETRIES) { if (res) return res; throw new Error(r.status); }
      await wait(800 * (i + 1));
    }
  };

  const loadShelf = async (shelf) => {
    const { appid } = shelf.dataset;
    const track = shelf.querySelector(".aika-shelf-track");
    try {
      const { shots, hasMore } = await fetchShots(appid);
      track.textContent = "";
      for (const s of shots) {
        const a = el("a", "aika-shot", { href: s.href, "data-publishedfileid": s.id });
        a.style.setProperty("--aika-shot-aspect", s.aspect);
        const img = el("img", "aika-shot-img", { alt: "", loading: "lazy", decoding: "async" });
        img.onload = () => a.classList.add("is-ready");
        img.src = s.src;
        a.append(img);
        track.append(a);
      }
      if (hasMore) {
        const more = el("a", "aika-shot aika-shot-more", { href: gameUrl(appid), "aria-label": L.more, title: L.more });
        more.append(el("span", "aika-shot-more-icon"));
        track.append(more);
      }
      shelf.classList.toggle("is-empty", !shots.length);
    } catch (e) {
      shelf.classList.add("is-error");
    }
    shelf.classList.remove("is-loading");
    updateNav(shelf);
  };

  // ---------- карусель ----------
  const updateNav = (shelf) => {
    const t = shelf.querySelector(".aika-shelf-track");
    const max = t.scrollWidth - t.clientWidth;
    shelf.classList.toggle("can-prev", t.scrollLeft > 2);
    shelf.classList.toggle("can-next", t.scrollLeft < max - 2);
  };

  const scrollShelf = (shelf, dir) => {
    const t = shelf.querySelector(".aika-shelf-track");
    t.scrollBy({ left: dir * t.clientWidth * 0.85, behavior: "smooth" });
  };

  const buildShelf = (game) => {
    const shelf = el("section", "aika-shelf is-loading", { "data-appid": game.appid });

    const head = el("header", "aika-shelf-head");
    const title = el("a", "aika-shelf-title", { href: gameUrl(game.appid) });
    const icon = el("span", "aika-shelf-icon");
    const name = el("span", "aika-shelf-name");
    name.textContent = game.name;
    title.append(icon, name);

    const nav = el("div", "aika-shelf-nav");
    const prev = el("button", "aika-shelf-arrow aika-shelf-prev", { type: "button", "aria-label": L.prev, title: L.prev });
    const next = el("button", "aika-shelf-arrow aika-shelf-next", { type: "button", "aria-label": L.next, title: L.next });
    prev.addEventListener("click", () => scrollShelf(shelf, -1));
    next.addEventListener("click", () => scrollShelf(shelf, 1));
    nav.append(prev, next);
    head.append(title, nav);

    const track = el("div", "aika-shelf-track");
    // заглушки, пока Steam отдаёт страницу игры
    for (let i = 0; i < 4; i++) track.append(el("span", "aika-shot aika-shot-skeleton"));
    let raf = 0;
    track.addEventListener("scroll", () => {
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; updateNav(shelf); });
    }, { passive: true });

    shelf.append(head, track);
    fillIcon(icon, game.appid, game.name);
    return shelf;
  };

  // ---------- сборка ----------
  const ready = (fn) =>
    document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", fn, { once: true }) : fn();

  ready(() => {
    const wall = document.querySelector("#image_wall");
    const controls = document.querySelector("#ScreenshotManagementControlsTop");
    if (!wall || !controls) return;

    const games = [...document.querySelectorAll("#sharedfiles_filterselect_app_filterable .option")]
      .map((o) => ({
        appid: ((o.getAttribute("onclick") || "").match(/'appid'\s*:\s*'(\d+)'/) || [])[1],
        name: o.textContent.trim(),
      }))
      .filter((g) => g.appid && g.appid !== "0");
    if (!games.length) return;

    // Порядок: игры свежих скриншотов (стена — от новых к старым) — первыми
    const recent = [...new Set([...wall.querySelectorAll(".profile_media_item[data-appid]")].map((a) => a.dataset.appid))];
    const rank = (g) => { const i = recent.indexOf(g.appid); return i < 0 ? recent.length : i; };
    games.sort((a, b) => rank(a) - rank(b));

    const list = el("div", "aika-shelves-list");
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        io.unobserve(e.target);
        enqueue(e.target);
      }
    }, { rootMargin: "600px 0px" });

    for (const g of games) {
      const shelf = buildShelf(g);
      list.append(shelf);
      io.observe(shelf);
    }
    controls.after(list);

    // Стена Steam скрыта — её подгрузка при прокрутке не нужна
    const infinite = window.InfiniteScrollingCheckForMoreContent;
    const setOn = (on) => {
      ROOT.classList.toggle(CLASS_ON, on);
      if (typeof infinite !== "function") return;
      if (on) window.removeEventListener("scroll", infinite, false);
      else window.addEventListener("scroll", infinite, false);
    };
    setOn(true);

    // «Управление скриншотами» — выбор галочками на стене Steam: показываем её
    document.querySelector("#ScreenshotManagementToggle")?.addEventListener("click", () => setOn(false));

    addEventListener("resize", () => list.querySelectorAll(".aika-shelf").forEach(updateNav), { passive: true });
  });
})();
