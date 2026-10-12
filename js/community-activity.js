// community-activity.js — the "Friends Activity" page
// (steamcommunity.com/id|profiles/…/home; a Patch by URL in skin.json; the look
// is sections/community.css, "Friends Activity: motion").
//
// 1. The title "Friends Activity" — reactbits Pro "Domino Lettering" (our own
//    code from its description: the letters start lying on their side and spring
//    upright one after another, fading in, 0.2 s delay, 30 ms apart; a spring
//    with little damping rocks them before they settle; tilted letters are
//    dimmed). Each letter pivots on its bottom-right corner, as dominoes falling
//    to the right would. The spring is sampled into keyframes (WAAPI).
// 2. The friends counter on the right ("7 of 24 online") — reactbits Pro
//    "Speeding Text" (our own code from its description): every number counts up
//    from 0 over 2.2 s; the faster it runs, the stronger a horizontal motion blur
//    (an SVG blur, capped, scaled to the font size) and the slant; both settle to
//    nothing as it lands. The words stay Steam's; only the numbers are wrapped.
// Both wait while the page is hidden; reduced motion — the final state at once.

(() => {
  "use strict";
  if (window.__aikaCommunityActivity) return;
  window.__aikaCommunityActivity = true;

  const root = document.documentElement;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cssNum = (name, fallback) => { const v = parseFloat(getComputedStyle(root).getPropertyValue(name)); return Number.isFinite(v) ? v : fallback; };
  const ready = (fn) => document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", fn, { once: true }) : fn();
  const whenShown = (fn) => {
    if (!document.hidden) return fn();
    const go = () => { if (!document.hidden) { document.removeEventListener("visibilitychange", go); fn(); } };
    document.addEventListener("visibilitychange", go);
  };

  // Spring 0 → 1 sampled over its settling time (mass 1)
  const springSamples = (k, c, n = 48) => {
    let x = 0, v = 0, t = 0;
    const out = [], dt = 1 / 240;
    const step = () => { v += (-k * (x - 1) - c * v) * dt; x += v * dt; t += dt; };
    let settle = 0;
    while (t < 4) { step(); if (Math.abs(x - 1) < 0.002 && Math.abs(v) < 0.01) { settle = t; break; } }
    const dur = settle || 4;
    x = 0; v = 0; t = 0;
    for (let i = 0; i <= n; i++) {
      const target = (i / n) * dur;
      while (t < target) step();
      out.push(x);
    }
    return { dur, out };
  };

  // ------------------------------------------------------------- 1. domino
  const domino = () => {
    const h = document.querySelector("#blotter_page .blotter_page_title h1");
    if (!h || "aikaDomino" in h.dataset) return;
    if (reduced || h.children.length) { h.classList.add("aika-domino-skip"); return; }
    const text = h.textContent.trim();
    h.dataset.aikaDomino = "";
    h.setAttribute("aria-label", text);
    const letters = [];
    const frag = document.createDocumentFragment();
    for (const part of text.split(/(\s+)/)) {
      if (!part) continue;
      if (/^\s+$/.test(part)) { frag.append(" "); continue; }
      const word = document.createElement("span");
      word.className = "aika-domino-word";
      word.setAttribute("aria-hidden", "true");
      for (const ch of part) {
        const c = document.createElement("span");
        c.className = "aika-domino-char";
        c.textContent = ch;
        word.append(c);
        letters.push(c);
      }
      frag.append(word);
    }
    h.replaceChildren(frag);
    h.classList.add("aika-domino");

    const k = cssNum("--aika-domino-stiffness", 160), zeta = cssNum("--aika-domino-damping", 0.32);
    const { dur, out } = springSamples(k, 2 * zeta * Math.sqrt(k));
    const lie = cssNum("--aika-domino-lie", 90), shade = cssNum("--aika-domino-shade", 0.6);
    const frames = out.map((p, i) => {
      const a = lie * (1 - p);
      return {
        offset: i / (out.length - 1),
        transform: `rotate(${a.toFixed(2)}deg)`,
        opacity: Math.min(1, (i / (out.length - 1)) / 0.25),
        filter: `brightness(${(1 - shade * Math.min(1, Math.abs(a) / 90)).toFixed(3)})`,
      };
    });
    const delay = cssNum("--aika-domino-delay", 200), stagger = cssNum("--aika-domino-stagger", 30);
    whenShown(() => letters.forEach((c, i) => c.animate(frames, { duration: dur * 1000, delay: delay + i * stagger, easing: "linear", fill: "backwards" })));
  };

  // -------------------------------------------------------- 2. speeding count
  const speeding = () => {
    const box = document.querySelector("#friendactivity_right_column .profile_link_block_text_friends");
    if (!box || "aikaSpeed" in box.dataset) return;
    box.dataset.aikaSpeed = "";
    if (reduced) { box.classList.add("aika-speed-skip"); return; }
    // Wrap the numbers of the text nodes, keep the words
    const nums = [];
    const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
    const nodes = [];
    for (let n; (n = walker.nextNode());) nodes.push(n);
    for (const n of nodes) {
      const parts = n.data.split(/(\d[\d\s ]*\d|\d)/);
      if (parts.length < 2) continue;
      const frag = document.createDocumentFragment();
      for (const part of parts) {
        if (/^\d/.test(part)) {
          const s = document.createElement("span");
          s.className = "aika-speed-num";
          s.textContent = part;
          s.dataset.to = part.replace(/\D/g, "");
          s.dataset.orig = part;
          frag.append(s);
          nums.push(s);
        } else if (part) frag.append(part);
      }
      n.replaceWith(frag);
    }
    box.classList.add("aika-speed");
    if (!nums.length) return;

    // A horizontal-only blur — an SVG filter per number, its x deviation per frame
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("aria-hidden", "true");
    svg.classList.add("aika-speed-defs");
    const blurs = nums.map((s, i) => {
      const f = document.createElementNS(NS, "filter");
      const id = "aika-speed-blur-" + i;
      f.id = id;
      f.setAttribute("x", "-50%");
      f.setAttribute("width", "200%");
      const g = document.createElementNS(NS, "feGaussianBlur");
      g.setAttribute("stdDeviation", "0 0");
      f.append(g);
      svg.append(f);
      s.style.filter = `url(#${id})`;
      return g;
    });
    document.body.append(svg);

    const dur = cssNum("--aika-speed-dur", 2200), maxBlur = cssNum("--aika-speed-blur", 14), strength = cssNum("--aika-speed-strength", 1);
    const slant = cssNum("--aika-speed-slant", 12);
    // ease-out (quintic): fast start, long landing
    const ease = (p) => 1 - Math.pow(1 - p, 5);
    const speedAt = (p) => 5 * Math.pow(1 - p, 4);   // d(ease)/dp, 5 at the start
    nums.forEach((s) => { s.textContent = "0"; });
    whenShown(() => {
      const t0 = performance.now();
      const fs = parseFloat(getComputedStyle(nums[0]).fontSize) || 16;
      const scale = fs / 96;   // the reference blur is for 96 px type
      const tick = (now) => {
        const p = Math.min(1, (now - t0) / dur);
        const e = ease(p), speed = speedAt(p);
        nums.forEach((s, i) => {
          const to = +s.dataset.to;
          s.textContent = Math.round(to * e).toLocaleString(document.documentElement.lang || undefined);
          // faster numbers (bigger targets) blur more
          const blur = Math.min(maxBlur, speed * strength * Math.min(1, to / 10) * 3) * scale;
          blurs[i].setAttribute("stdDeviation", `${blur.toFixed(2)} 0`);
          s.style.setProperty("--aika-speed-skew", (-slant * Math.min(1, speed / 5)).toFixed(2) + "deg");
        });
        if (p < 1) requestAnimationFrame(tick);
        else nums.forEach((s, i) => { s.textContent = s.dataset.orig; s.style.filter = ""; blurs[i].setAttribute("stdDeviation", "0 0"); });   // lands on Steam's own text
      };
      requestAnimationFrame(tick);
    });
  };

  ready(() => {
    domino();
    speeding();
  });
})();
