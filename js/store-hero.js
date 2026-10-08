// store-hero.js — the "Cinematic" store game page (theme settings → "Store" →
// "Game page"; the author's idea 2026-10-08, the layout follows a key-store
// product page). Only runs when options/store-cinematic.css is on (it sets
// --aika-store-layout: cinematic and hides Steam's top block).
//
// What it builds in front of Steam's page (everything below — editions,
// description, reviews — stays Steam's):
//   1. The hero over the whole window: the store art as a poster at once,
//      then the trailers muted one after another with a crossfade
//      (js/hls-lite.js — Steam only serves HLS now). The game logo instead
//      of the title, a discount badge with Steam's countdown, a reviews badge,
//      the short description, the price, "Buy" (scrolls to the editions),
//      "Media" (scrolls to the gallery), the wishlist heart (drives Steam's own
//      wishlist links) or Steam's "In library" flag.
//   2. A facts strip: Steam's own release date, developer/publisher rows, tags
//      and the Community Hub button — the nodes are moved, not copied, so their
//      links and the tag "+" keep working.
//   3. "Media": trailers and screenshots in a horizontal carousel; a click opens
//      the Aika viewer (images full size, trailers with sound).
//
// Data: the gamehighlight carousel props (trailers, screenshots), the purchase
// blocks, the review summary rows. If anything essential is missing the page
// falls back to Steam's layout (html.aika-cine-off).
// Look — sections/store-cinematic.css.

import { HlsLite } from "./hls-lite.js";

const root = document.documentElement;
const RU = (root.lang || "en").startsWith("ru");
const T = RU
  ? { buy: "Купить", media: "Медиа", trailer: "Трейлер", close: "Закрыть", prev: "Назад", next: "Далее",
      play: "Смотреть", pause: "Пауза", mute: "Выключить звук", unmute: "Включить звук", full: "Во весь экран",
      reel: "Трейлер", seek: "Перемотка" }
  : { buy: "Buy", media: "Media", trailer: "Trailer", close: "Close", prev: "Previous", next: "Next",
      play: "Play", pause: "Pause", mute: "Mute", unmute: "Unmute", full: "Full screen",
      reel: "Trailer", seek: "Seek" };

const FADE_MS = 1200;      // trailer crossfade (matches --aika-cine-fade in tokens.css)
const PRELOAD_S = 8;       // start loading the next trailer this long before the end
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

// ---------------------------------------------------------------------------
// Small DOM helpers
// ---------------------------------------------------------------------------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const el = (tag, cls, attrs = {}, kids = []) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "text") e.textContent = v;
    else if (k === "html") e.innerHTML = v; // only our own static SVG
    else e.setAttribute(k, v === true ? "" : v);
  }
  for (const k of [].concat(kids)) if (k) e.append(k);
  return e;
};

const ICON = {
  cart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2.2l2.1 10.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 1.9-1.5L20.5 8H6.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="10" cy="19.5" r="1.4" fill="currentColor"/><circle cx="17" cy="19.5" r="1.4" fill="currentColor"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" fill="currentColor"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="5" width="4" height="14" rx="1.2" fill="currentColor"/><rect x="13.5" y="5" width="4" height="14" rx="1.2" fill="currentColor"/></svg>',
  heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.2s-7.6-4.6-9.2-9.4C1.7 7.4 3.9 4.3 7.2 4.3c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.3 0 5.5 3.1 4.4 6.5-1.6 4.8-9.2 9.4-9.2 9.4z" fill="currentColor"/></svg>',
  left: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5.5 8 12l6.5 6.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  right: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 5.5 16 12l-6.5 6.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  sound: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" fill="currentColor"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.8 7.8 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  muted: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  full: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 9V4.5H9M15 4.5h4.5V9M19.5 15v4.5H15M9 19.5H4.5V15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

const icon = (name) => el("span", "aika-cine-icon", { html: ICON[name] });

const fmtTime = (s) => {
  s = Math.max(0, Math.floor(s || 0));
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
};

const videoHeight = () => (innerWidth * devicePixelRatio > 1700 ? 1080 : 720);

// ---------------------------------------------------------------------------
// Steam data
// ---------------------------------------------------------------------------
const readProps = () => {
  try {
    const p = JSON.parse($(".gamehighlight_desktopcarousel")?.dataset.props || "null");
    if (!p) return null;
    const trailers = (p.trailers || []).filter((t) => t.hlsManifest);
    const featured = trailers.filter((t) => t.featured);
    return {
      name: p.appName || $(".apphub_AppName")?.textContent.trim() || "",
      trailers,
      reel: featured.length ? featured : trailers, // the hero plays the featured ones
      shots: p.screenshots || [],
    };
  } catch (e) {
    return null;
  }
};

// The base edition: the first purchase block that isn't a bundle
const basePurchase = () => {
  const wraps = $$("#game_area_purchase .game_area_purchase_game_wrapper");
  return wraps.find((w) => !w.classList.contains("dynamic_bundle_description")) || wraps[0] || null;
};

const posterUrl = (props) =>
  $(".game_page_background_ctn img.gameColor")?.src ||
  props.shots[0]?.full || null;

// ---------------------------------------------------------------------------
// The background reel: trailers one after another, crossfading
// ---------------------------------------------------------------------------
class Reel {
  constructor(stage, trailers, segments) {
    this.trailers = trailers;
    this.segments = segments;
    this.videos = [0, 1].map(() => {
      const v = el("video", "aika-cine-video", { muted: true, playsinline: true, disablepictureinpicture: true, "aria-hidden": "true" });
      v.muted = true;
      stage.append(v);
      return v;
    });
    this.players = [null, null];
    this.active = -1;     // index into videos of the visible one
    this.index = -1;      // current trailer
    this.pending = null;  // { slot, index, player } — the next trailer being loaded
    this.failed = new Set();
    this.allowed = true;  // visible, page shown, viewer closed
    this.raf = 0;
    this.videos.forEach((v, slot) => {
      v.addEventListener("timeupdate", () => slot === this.active && this.onTime());
      v.addEventListener("ended", () => slot === this.active && this.advance());
    });
  }

  start() { this.go(0); }

  // Load trailer i into the idle slot; resolves with the slot when it can play
  load(i) {
    if (this.pending?.index === i) return this.pending.promise;
    if (this.pending) this.drop(this.pending);
    const slot = this.active === 0 ? 1 : 0;
    const v = this.videos[slot];
    this.players[slot]?.destroy();
    const player = new HlsLite(v, this.trailers[i].hlsManifest, { height: videoHeight() });
    this.players[slot] = player;
    v.loop = this.trailers.length === 1;
    const pending = { slot, index: i, player };
    pending.promise = player.ready.then(() => slot);
    this.pending = pending;
    return pending.promise;
  }

  drop(p) {
    if (this.pending === p) this.pending = null;
    if (p.slot !== this.active) { p.player.destroy(); this.players[p.slot] = null; }
  }

  async go(i) {
    if (!this.trailers.length) return;
    i = (i + this.trailers.length) % this.trailers.length;
    if (this.failed.size >= this.trailers.length) return;
    if (this.failed.has(i)) return this.go(i + 1);
    let slot;
    try {
      slot = await this.load(i);
    } catch (e) {
      if (this.pending?.index === i) this.pending = null;
      if (String(e?.message) === "destroyed") return;
      this.failed.add(i);
      return this.go(i + 1);
    }
    if (this.pending?.index !== i) return; // superseded by another go()
    this.pending = null;
    const v = this.videos[slot];
    const prev = this.active;
    this.active = slot;
    this.index = i;
    this.markSegments();
    if (this.allowed) v.play().catch(() => {});
    v.classList.add("is-on");
    if (prev >= 0 && prev !== slot) {
      const old = this.videos[prev];
      old.classList.remove("is-on");
      setTimeout(() => {
        if (this.active !== prev) { this.players[prev]?.destroy(); this.players[prev] = null; }
      }, FADE_MS);
    }
  }

  advance() { this.go(this.index + 1); }

  onTime() {
    if (this.trailers.length < 2) return;
    const v = this.videos[this.active];
    const left = v.duration - v.currentTime;
    if (!isFinite(left)) return;
    const next = (this.index + 1) % this.trailers.length;
    if (left < PRELOAD_S && !this.pending && !this.failed.has(next)) this.load(next).catch(() => {});
    if (left < FADE_MS / 1000 && this.pending?.index === next && !this.switching) {
      this.switching = true;
      this.go(next).finally(() => { this.switching = false; });
    }
  }

  markSegments() {
    this.segments.forEach((s, k) => {
      s.classList.toggle("is-current", k === this.index);
      s.classList.toggle("is-done", k < this.index);
      if (k === this.index) s.setAttribute("aria-current", "true");
      else s.removeAttribute("aria-current");
    });
    this.loop();
  }

  // The current segment fill follows playback (transform only)
  loop() {
    cancelAnimationFrame(this.raf);
    const tick = () => {
      const v = this.videos[this.active];
      const seg = this.segments[this.index];
      if (v && seg && v.duration) seg.style.setProperty("--aika-cine-seg", Math.min(1, v.currentTime / v.duration));
      if (this.allowed) this.raf = requestAnimationFrame(tick);
    };
    tick();
  }

  setAllowed(ok) {
    if (ok === this.allowed) return;
    this.allowed = ok;
    const v = this.videos[this.active];
    if (!v) return;
    if (ok) { v.play().catch(() => {}); this.loop(); }
    else v.pause();
  }
}

// ---------------------------------------------------------------------------
// The hero
// ---------------------------------------------------------------------------
const buildBadges = (base) => {
  const list = el("ul", "aika-cine-badges");

  const pct = base?.querySelector(".discount_block:not(.no_discount) .discount_pct");
  if (pct) {
    const cd = base.querySelector(".game_purchase_discount_countdown");
    const timer = el("span", "aika-cine-badge-timer");
    const sync = () => { timer.textContent = cd ? cd.textContent.replace(/^[^!]*!\s*/, "").trim() : ""; };
    sync();
    if (cd) new MutationObserver(sync).observe(cd, { subtree: true, childList: true, characterData: true });
    list.append(el("li", "aika-cine-badge aika-cine-badge-sale", {}, [
      el("span", "aika-cine-badge-pct", { text: pct.textContent.trim() }),
      cd ? timer : null,
    ]));
  }

  const rows = $$("#userReviews .user_reviews_summary_row");
  const row = rows.find((r) => r.matches("[itemprop=aggregateRating]")) || rows[rows.length - 1];
  const summary = row?.querySelector(".game_review_summary");
  if (summary) {
    const tone = summary.classList.contains("positive") ? "ok"
      : summary.classList.contains("mixed") ? "warn"
      : summary.classList.contains("negative") ? "live" : "neutral";
    const share = (row.getAttribute("data-tooltip-html") || "").match(/(\d+)\s?%/);
    const count = row.querySelector(".responsive_hidden")?.textContent.trim().replace(/[()]/g, "");
    list.append(el("li", "aika-cine-badge aika-cine-badge-reviews", { "data-tone": tone }, [
      el("a", "aika-cine-badge-link", { href: row.getAttribute("href") || "#app_reviews_hash" }, [
        el("span", "aika-cine-badge-dot"),
        el("span", "aika-cine-badge-text", { text: summary.textContent.trim() }),
        share ? el("span", "aika-cine-badge-meta", { text: share[1] + "%" }) : null,
        count ? el("span", "aika-cine-badge-meta", { text: count }) : null,
      ]),
    ]));
  }
  return list.children.length ? list : null;
};

const buildPrice = (base) => {
  if (!base) return null;
  const block = base.querySelector(".discount_block:not(.no_discount)");
  if (block) {
    return el("div", "aika-cine-price", {}, [
      el("span", "aika-cine-price-final", { text: block.querySelector(".discount_final_price")?.textContent.trim() }),
      el("s", "aika-cine-price-orig", { text: block.querySelector(".discount_original_price")?.textContent.trim() }),
    ]);
  }
  const plain = base.querySelector(".discount_block.no_discount .discount_final_price, .game_purchase_price");
  return plain ? el("div", "aika-cine-price", {}, [el("span", "aika-cine-price-final", { text: plain.textContent.trim() })]) : null;
};

// The heart mirrors Steam's wishlist areas: #add_to_wishlist_area (not in the
// wishlist) / #add_to_wishlist_area_success (in it); a click runs their links
const buildWishlist = () => {
  const add = $("#add_to_wishlist_area");
  const added = $("#add_to_wishlist_area_success");
  if (!add || !added) return null;
  const addLink = add.querySelector("a");
  const removeLink = added.querySelector("a.add_to_wishlist, a");
  const btn = el("button", "aika-button aika-button--secondary aika-cine-btn aika-cine-wish", { type: "button" }, [icon("heart")]);
  const isOn = () => getComputedStyle(added).display !== "none";
  const sync = () => {
    const on = isOn();
    btn.setAttribute("aria-pressed", on);
    const label = (on ? removeLink?.getAttribute("data-tooltip-text") : addLink?.textContent.trim()) || "";
    btn.setAttribute("aria-label", label);
    btn.title = label;
  };
  btn.addEventListener("click", () => (isOn() ? removeLink : addLink)?.click());
  const mo = new MutationObserver(sync);
  [add, added].forEach((n) => mo.observe(n, { attributes: true, attributeFilter: ["style", "class"] }));
  sync();
  return btn;
};

const buildOwned = () => {
  const flag = $(".game_area_already_owned .ds_owned_flag");
  if (!flag) return null;
  return el("span", "aika-cine-owned", { text: flag.textContent.replace(/ /g, " ").trim(), title: $(".already_in_library")?.textContent.trim() || null });
};

// Library logos are drawn for the library hero art: some are black (Dying
// Light) and vanish over a dark trailer, many sit on a large transparent canvas
// (1280×720 with the logo in the middle). One small pass over the pixels gives
// both: the mean luminance of the opaque pixels (dark ones are shown as a light
// silhouette, store-cinematic.css) and their bounds (cropped with object-view-box,
// so the logo box hugs the drawing)
const analyzeLogo = (img) => {
  try {
    const c = document.createElement("canvas");
    const w = (c.width = 160), hgt = (c.height = Math.max(1, Math.round(160 * img.naturalHeight / img.naturalWidth)));
    const g = c.getContext("2d", { willReadFrequently: true });
    g.drawImage(img, 0, 0, w, hgt);
    const d = g.getImageData(0, 0, w, hgt).data;
    let sum = 0, n = 0, x0 = w, y0 = hgt, x1 = -1, y1 = -1;
    for (let y = 0; y < hgt; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (d[i + 3] < 24) continue;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
        if (d[i + 3] < 128) continue;
        sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        n++;
      }
    }
    if (x1 < 0) return null;
    const pct = (v, total) => Math.max(0, (v / total) * 100).toFixed(2) + "%";
    return {
      dark: n > 0 && sum / n / 255 < 0.3,
      box: "inset(" + [pct(y0 - 1, hgt), pct(w - x1 - 2, w), pct(hgt - y1 - 2, hgt), pct(x0 - 1, w)].join(" ") + ")",
    };
  } catch (e) {
    return null; // a tainted canvas — leave the logo as is
  }
};

const buildTitle = (props) => {
  const h = el("h1", "aika-cine-title", {}, [el("span", "aika-cine-title-text", { text: props.name })]);
  window.__aikaStoreAssets?.then(({ logo }) => {
    if (!logo) return;
    const img = el("img", "aika-cine-logo", { crossorigin: "anonymous", src: logo, alt: props.name, decoding: "async" });
    img.addEventListener("load", () => {
      const info = analyzeLogo(img);
      if (info?.dark) img.classList.add("is-dark");
      if (info) img.style.objectViewBox = info.box;
      h.classList.add("has-logo");
    }, { once: true });
    h.prepend(img);
  });
  return h;
};

const scrollToEl = (target) => target?.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", block: "start" });

const buildHero = (props, mediaSection) => {
  const base = basePurchase();
  const hero = el("section", "aika-cine-hero", { "aria-label": props.name });

  const stage = el("div", "aika-cine-stage", { "aria-hidden": "true" });
  const poster = posterUrl(props);
  if (poster) {
    const img = el("img", "aika-cine-poster", { src: poster, alt: "", decoding: "async", fetchpriority: "high" });
    img.addEventListener("load", () => img.classList.add("is-on"), { once: true });
    img.addEventListener("error", () => {
      // The store art is missing — the library hero, then the first screenshot
      window.__aikaStoreAssets?.then(({ hero: h }) => {
        const next = h && img.src !== h ? h : props.shots[0]?.full;
        if (next && img.src !== next) img.src = next;
      });
    });
    stage.append(img);
  }
  stage.append(el("div", "aika-cine-shade"));

  const crumbs = $(".page_title_area .breadcrumbs");
  const main = el("div", "aika-cine-main", {}, [
    buildBadges(base),
    buildTitle(props),
    el("p", "aika-cine-desc", { text: $(".game_description_snippet")?.textContent.trim() }),
    buildPrice(base),
  ]);

  const actions = el("div", "aika-cine-actions");
  if (base) {
    const buy = el("button", "aika-button aika-button--primary aika-cine-btn", { type: "button" }, [icon("cart"), el("span", "", { text: T.buy })]);
    buy.addEventListener("click", () => scrollToEl($("#game_area_purchase")));
    actions.append(buy);
  }
  if (mediaSection) {
    const media = el("button", "aika-button aika-button--secondary aika-cine-btn", { type: "button" }, [icon("play"), el("span", "", { text: T.media })]);
    media.addEventListener("click", () => scrollToEl(mediaSection));
    actions.append(media);
  }
  const wish = buildOwned() || buildWishlist();
  if (wish) actions.append(wish);
  main.append(actions);

  // Trailer segments (bottom right): which one plays, click to switch
  const segments = props.reel.length > 1
    ? props.reel.map((t, k) => el("button", "aika-cine-seg", { type: "button", "aria-label": T.reel + " " + (k + 1) }, [el("span", "aika-cine-seg-fill")]))
    : [];
  const reelNav = segments.length ? el("div", "aika-cine-reel", { role: "group", "aria-label": T.trailer }, segments) : null;

  hero.append(stage, el("div", "aika-cine-inner", {}, [crumbs, main, reelNav]));

  let reel = null;
  if (props.reel.length && window.MediaSource && !reducedMotion.matches) {
    reel = new Reel(stage, props.reel, segments);
    segments.forEach((s, k) => s.addEventListener("click", () => reel.go(k)));
    reel.start();
  } else if (reelNav) {
    reelNav.remove();
  }
  return { hero, reel };
};

// ---------------------------------------------------------------------------
// Facts strip: Steam's own nodes, moved
// ---------------------------------------------------------------------------
const buildFacts = () => {
  const facts = $$(".glance_ctn .release_date, .glance_ctn .dev_row");
  const tags = $(".glance_ctn .glance_tags_ctn");
  const hub = $(".apphub_OtherSiteInfo");
  if (!facts.length && !tags && !hub) return null;
  return el("div", "aika-cine-facts", {}, [
    el("div", "aika-cine-facts-inner", {}, [
      facts.length ? el("div", "aika-cine-facts-list", {}, facts) : null,
      tags,
      hub,
    ]),
  ]);
};

// ---------------------------------------------------------------------------
// Media: a carousel + the viewer
// ---------------------------------------------------------------------------
const mediaItems = (props) => [
  ...props.trailers.map((t) => ({ kind: "video", trailer: t, thumb: t.poster || t.thumbnail })),
  ...props.shots.map((s) => ({ kind: "image", full: s.full, thumb: s.standard || s.thumbnail, alt: s.altText || "" })),
];

const buildMedia = (props, viewer) => {
  const items = mediaItems(props);
  if (!items.length) return null;

  const track = el("div", "aika-cine-track", { role: "list" });
  items.forEach((it, k) => {
    const card = el("button", "aika-cine-card", { type: "button", role: "listitem", "data-kind": it.kind,
      "aria-label": it.kind === "video" ? T.trailer + " " + (k + 1) : it.alt || props.name });
    card.append(el("img", "aika-cine-card-img", { src: it.thumb, alt: "", loading: "lazy", decoding: "async" }));
    if (it.kind === "video") {
      card.append(el("span", "aika-cine-card-play", {}, [icon("play")]));
      hoverPreview(card, it.trailer);
    }
    card.addEventListener("click", () => viewer.open(items, k, card));
    track.append(card);
  });

  const prev = el("button", "aika-cine-arrow aika-cine-arrow-prev", { type: "button", "aria-label": T.prev }, [icon("left")]);
  const next = el("button", "aika-cine-arrow aika-cine-arrow-next", { type: "button", "aria-label": T.next }, [icon("right")]);
  const page = (dir) => track.scrollBy({ left: dir * track.clientWidth * 0.9, behavior: reducedMotion.matches ? "auto" : "smooth" });
  prev.addEventListener("click", () => page(-1));
  next.addEventListener("click", () => page(1));
  const edges = () => {
    prev.disabled = track.scrollLeft < 4;
    next.disabled = track.scrollLeft + track.clientWidth > track.scrollWidth - 4;
  };
  track.addEventListener("scroll", edges, { passive: true });
  new ResizeObserver(edges).observe(track);

  return el("section", "aika-cine-media", { id: "aika-cine-media", "aria-label": T.media }, [
    el("div", "aika-cine-media-inner", {}, [
      el("header", "aika-cine-media-head", {}, [
        el("h2", "aika-cine-media-title", { text: T.media }),
        el("span", "aika-cine-media-count", { text: String(items.length) }),
      ]),
      el("div", "aika-cine-carousel", {}, [track, prev, next]),
    ]),
  ]);
};

// A muted low-res preview of a trailer card on hover
const hoverPreview = (card, trailer) => {
  let player = null, video = null, timer = 0;
  card.addEventListener("pointerenter", () => {
    if (reducedMotion.matches || !window.MediaSource) return;
    timer = setTimeout(() => {
      video = el("video", "aika-cine-card-video", { muted: true, playsinline: true, loop: true, "aria-hidden": "true" });
      video.muted = true;
      card.append(video);
      player = new HlsLite(video, trailer.hlsManifest, { height: 360 });
      player.ready.then(() => video.play()).then(() => video.classList.add("is-on")).catch(() => {});
    }, 250);
  });
  card.addEventListener("pointerleave", () => {
    clearTimeout(timer);
    player?.destroy();
    video?.remove();
    player = video = null;
  });
};

class Viewer {
  constructor(onToggle) {
    this.onToggle = onToggle;
    this.items = [];
    this.i = 0;
    this.player = null;

    this.frame = el("div", "aika-cine-viewer-frame");
    this.counter = el("span", "aika-cine-viewer-count");
    this.closeBtn = el("button", "aika-cine-viewer-btn aika-cine-viewer-close", { type: "button", "aria-label": T.close }, [icon("close")]);
    this.prevBtn = el("button", "aika-cine-viewer-btn aika-cine-viewer-prev", { type: "button", "aria-label": T.prev }, [icon("left")]);
    this.nextBtn = el("button", "aika-cine-viewer-btn aika-cine-viewer-next", { type: "button", "aria-label": T.next }, [icon("right")]);
    this.node = el("div", "aika-cine-viewer", { role: "dialog", "aria-modal": "true", hidden: true }, [
      this.frame, this.closeBtn, this.prevBtn, this.nextBtn, this.counter,
    ]);
    this.closeBtn.addEventListener("click", () => this.close());
    this.prevBtn.addEventListener("click", () => this.show(this.i - 1));
    this.nextBtn.addEventListener("click", () => this.show(this.i + 1));
    this.node.addEventListener("click", (e) => { if (e.target === this.node) this.close(); });
    this.onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); this.close(); }
      else if (e.key === "ArrowLeft" && !e.target.closest?.(".aika-cine-scrub")) this.show(this.i - 1);
      else if (e.key === "ArrowRight" && !e.target.closest?.(".aika-cine-scrub")) this.show(this.i + 1);
      else if (e.key === " " && this.video && !e.target.closest?.("button")) { e.preventDefault(); this.toggle(); }
      else if (e.key === "Tab") this.trap(e);
    };
    document.body.append(this.node);
  }

  open(items, i, from) {
    this.items = items;
    this.from = from;
    this.node.hidden = false;
    requestAnimationFrame(() => this.node.classList.add("is-open"));
    document.addEventListener("keydown", this.onKey, true);
    root.classList.add("aika-cine-locked");
    this.onToggle(true);
    this.show(i);
    this.closeBtn.focus({ preventScroll: true });
  }

  close() {
    if (this.node.hidden) return;
    this.clear();
    this.node.classList.remove("is-open");
    this.node.hidden = true;
    document.removeEventListener("keydown", this.onKey, true);
    root.classList.remove("aika-cine-locked");
    this.onToggle(false);
    this.from?.focus({ preventScroll: true });
  }

  trap(e) {
    const f = $$("button:not([disabled]), [tabindex='0']", this.node).filter((n) => n.offsetParent);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  clear() {
    this.player?.destroy();
    this.player = null;
    this.video = null;
    this.frame.replaceChildren();
  }

  show(i) {
    const n = this.items.length;
    this.i = (i + n) % n;
    const it = this.items[this.i];
    this.clear();
    this.counter.textContent = this.i + 1 + " / " + n;
    this.prevBtn.hidden = this.nextBtn.hidden = n < 2;
    if (it.kind === "image") {
      const img = el("img", "aika-cine-viewer-media", { src: it.full, alt: it.alt, decoding: "async" });
      img.addEventListener("load", () => img.classList.add("is-on"), { once: true });
      this.frame.append(img);
    } else {
      this.frame.append(this.buildPlayer(it.trailer));
    }
  }

  toggle() {
    const v = this.video;
    if (v) v.paused ? v.play().catch(() => {}) : v.pause();
  }

  // The trailer with sound and an Aika capsule (the store player look, DESIGN.md §11)
  buildPlayer(trailer) {
    const v = this.video = el("video", "aika-cine-viewer-media", { playsinline: true, poster: trailer.poster || null });
    const wrap = el("div", "aika-cine-player", {}, [v]);
    const playBtn = el("button", "aika-cine-player-btn", { type: "button", "aria-label": T.pause }, [icon("pause")]);
    const fill = el("span", "aika-cine-scrub-fill");
    const buf = el("span", "aika-cine-scrub-buf");
    const scrub = el("div", "aika-cine-scrub", { role: "slider", tabindex: "0", "aria-label": T.seek, "aria-valuemin": "0" }, [buf, fill]);
    const time = el("span", "aika-cine-player-time", { text: "0:00 / 0:00" });
    const muteBtn = el("button", "aika-cine-player-btn", { type: "button", "aria-label": T.mute }, [icon("sound")]);
    const fullBtn = el("button", "aika-cine-player-btn", { type: "button", "aria-label": T.full }, [icon("full")]);
    wrap.append(el("div", "aika-cine-capsule", {}, [playBtn, scrub, time, muteBtn, fullBtn]));

    const setIcon = (btn, name, label) => { btn.replaceChildren(icon(name)); btn.setAttribute("aria-label", label); };
    const update = () => {
      const d = v.duration || 0;
      fill.style.setProperty("--aika-cine-seg", d ? v.currentTime / d : 0);
      const b = v.buffered;
      buf.style.setProperty("--aika-cine-seg", d && b.length ? b.end(b.length - 1) / d : 0);
      time.textContent = fmtTime(v.currentTime) + " / " + fmtTime(d);
      scrub.setAttribute("aria-valuemax", Math.floor(d));
      scrub.setAttribute("aria-valuenow", Math.floor(v.currentTime));
      scrub.setAttribute("aria-valuetext", fmtTime(v.currentTime));
    };
    v.addEventListener("timeupdate", update);
    v.addEventListener("progress", update);
    v.addEventListener("durationchange", update);
    v.addEventListener("play", () => { setIcon(playBtn, "pause", T.pause); wrap.classList.remove("is-paused"); });
    v.addEventListener("pause", () => { setIcon(playBtn, "play", T.play); wrap.classList.add("is-paused"); });
    v.addEventListener("volumechange", () => setIcon(muteBtn, v.muted ? "muted" : "sound", v.muted ? T.unmute : T.mute));
    v.addEventListener("click", () => this.toggle());
    playBtn.addEventListener("click", () => this.toggle());
    muteBtn.addEventListener("click", () => { v.muted = !v.muted; });
    fullBtn.addEventListener("click", () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else wrap.requestFullscreen?.().catch(() => {});
    });

    const seekAt = (x) => {
      const r = scrub.getBoundingClientRect();
      if (v.duration) v.currentTime = Math.min(1, Math.max(0, (x - r.left) / r.width)) * v.duration;
    };
    scrub.addEventListener("pointerdown", (e) => {
      scrub.setPointerCapture(e.pointerId);
      seekAt(e.clientX);
      const move = (m) => seekAt(m.clientX);
      scrub.addEventListener("pointermove", move);
      scrub.addEventListener("pointerup", () => scrub.removeEventListener("pointermove", move), { once: true });
    });
    scrub.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + (e.key === "ArrowLeft" ? -5 : 5)));
      }
    });

    this.player = new HlsLite(v, trailer.hlsManifest, { height: 1080, audio: true });
    this.player.ready.then(() => v.play()).catch(() => {});
    return wrap;
  }
}

// ---------------------------------------------------------------------------
// Steam's own carousel is hidden — keep its trailer from playing unseen
// ---------------------------------------------------------------------------
const silenceSteamPlayer = () => {
  const box = $("#game_highlights");
  if (!box) return;
  const stop = (e) => { if (e.target instanceof HTMLVideoElement) { e.target.pause(); e.target.muted = true; } };
  box.addEventListener("play", stop, true);
  box.addEventListener("playing", stop, true);
  $$("video", box).forEach((v) => { v.pause(); v.muted = true; });
};

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------
const enabled = () => getComputedStyle(root).getPropertyValue("--aika-store-layout").trim() === "cinematic";

const build = () => {
  const top = $(".game_page_background.game .page_top_area");
  const props = readProps();
  if (!top || !props) {
    root.classList.add("aika-cine-off");
    return;
  }

  let reel = null;
  const viewer = new Viewer((open) => reel?.setAllowed(!open && visible && !document.hidden));
  const media = buildMedia(props, viewer);
  const built = buildHero(props, media);
  reel = built.reel;
  const facts = buildFacts();
  top.before(...[built.hero, facts, media].filter(Boolean));
  root.classList.add("aika-cine");
  silenceSteamPlayer();

  // The hero fills the window below the store menu
  const fit = () => built.hero.style.setProperty("--aika-cine-top", built.hero.getBoundingClientRect().top + scrollY + "px");
  fit();
  addEventListener("resize", fit, { passive: true });

  // Play only while the hero is on screen, the page is shown and the viewer is closed
  let visible = true;
  const allow = () => reel?.setAllowed(visible && !document.hidden && viewer.node.hidden);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; allow(); }, { threshold: 0.15 }).observe(built.hero);
  document.addEventListener("visibilitychange", allow);
};

const init = () => {
  if (enabled()) return build();
  // The option stylesheet may still be loading — look once more after load
  if (document.readyState !== "complete") addEventListener("load", () => enabled() && build(), { once: true });
};

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
else init();
