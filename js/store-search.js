// store-search.js — the store search page (Patch by the search URL in skin.json;
// the look is sections/store-search.css).
//
// 1. Aurora backdrop — reactbits.dev "Aurora" (Backgrounds/Aurora, David Haz,
//    MIT + Commons Clause): its WebGL2 shader ported as is, the React shell
//    replaced. Colors are the theme's (accent, light 2, accent bright — read from
//    the CSS variables, so every preset gets its own aurora), drawn at a reduced
//    resolution (it is soft anyway), paused when the page is hidden, a still frame
//    with reduced motion. A fixed layer behind the page, faded out downwards.
// 2. "All products" folds in letter by letter — reactbits "Fold Text": each letter
//    hinged at its top swings down from -92° out of a crease shadow, 0.65 s,
//    45 ms apart, power3.out (CSS; the letters are wrapped in spans, the text
//    stays Steam's, the heading keeps an aria-label).
// 3. Filter checkboxes — motion.dev "Base checkbox": an SVG tick that draws
//    itself (pathLength, 0.3 s in / 0.1 s out), the box grows a little on hover
//    and presses in (CSS; the script only puts the SVG into Steam's span).
// 4. The price slider — motion.dev "Number slider": a badge above the thumb with
//    the price (Steam's own caption text), its changed characters roll, and the
//    badge swings like a pendulum from the thumb's velocity (a spring following
//    the velocity, stiffness 100 / damping 10 — Motion's useSpring defaults).
// Without the script: Steam's markup with the CSS look (plain checks, a plain
// slider, a static title after a short fallback).

(() => {
  "use strict";
  if (window.__aikaStoreSearch) return;
  window.__aikaStoreSearch = true;

  const root = document.documentElement;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  root.classList.add("aika-search-js");

  const ready = (fn) => document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", fn, { once: true }) : fn();
  const cssVar = (name) => getComputedStyle(root).getPropertyValue(name).trim();
  const cssNum = (name, fallback) => { const v = parseFloat(cssVar(name)); return Number.isFinite(v) ? v : fallback; };

  // ---------------------------------------------------------------- 1. aurora
  const MAX_STOPS = 5, MAX_LAYERS = 3, INTRO_SECONDS = 2.4;
  const VERTEX = `#version 300 es
in vec2 aPosition;
void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }`;
  const FRAGMENT = `#version 300 es
precision highp float;
precision highp int;
uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uStops[${MAX_STOPS}];
uniform int uStopCount;
uniform float uAmplitude;
uniform float uBlend;
uniform float uHeight;
uniform float uScale;
uniform float uGlow;
uniform float uBrightness;
uniform int uLayers;
uniform vec3 uPointer;
uniform float uReveal;
uniform float uOpacity;
out vec4 outColor;
vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
float smootherstep(float e0, float e1, float x) {
  float t = clamp((x - e0) / (e1 - e0), 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}
vec3 oklabToLinear(vec3 c) {
  float l = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;
  float m = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;
  float s = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;
  l = l * l * l; m = m * m * m; s = s * s * s;
  return vec3(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s);
}
vec3 toSrgb(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}
vec3 ramp(float t) {
  float x = clamp(t, 0.0, 1.0) * float(uStopCount - 1);
  int i = int(min(floor(x), float(uStopCount - 2)));
  float f = x - float(i);
  f = f * f * (3.0 - 2.0 * f);
  vec3 lch = mix(uStops[i], uStops[i + 1], f);
  return toSrgb(oklabToLinear(vec3(lch.x, lch.y * cos(lch.z), lch.y * sin(lch.z))));
}
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
void main() {
  vec2 frag = gl_FragCoord.xy;
  float y = 1.0 - frag.y / uResolution.y;
  float u = frag.x / uResolution.x;
  float X = (frag.x - uResolution.x * 0.5) / uResolution.y;
  float t = uTime;
  float reach = uPointer.z * exp(-pow((X - uPointer.x) / 0.38, 2.0));
  vec3 glow = vec3(0.0);
  float cover = 0.0;
  for (int k = 0; k < ${MAX_LAYERS}; k++) {
    if (k >= uLayers) break;
    float layer = float(k);
    float seed = layer * 13.7;
    float pace = t * (1.0 - layer * 0.18);
    float warp = snoise(vec2(X * 0.45 * uScale + pace * 0.02 + seed, pace * 0.05 + seed));
    float wave = snoise(vec2(X * 0.75 * uScale + warp * 0.35 - pace * 0.03 + seed, pace * 0.07 - seed)) * 0.72
      + snoise(vec2(X * 1.6 * uScale + warp * 0.5 + pace * 0.04 - seed, pace * 0.1 + seed * 0.5)) * 0.28;
    float hem = uHeight + layer * 0.07 + wave * 0.15 * uAmplitude;
    hem += reach * 0.08 * (layer < 0.5 ? 1.0 : 0.4);
    hem = mix(-0.25, hem, uReveal);
    float soft = (0.04 + uBlend * 0.16) * (1.0 + layer * 0.9);
    float rise = hem - y;
    float low = -soft - uGlow * 0.14;
    float high = 0.26 + soft * 0.6;
    float body = pow(smootherstep(low, high, rise), 1.5 + uGlow * 0.6);
    float lobes = 0.86 + 0.14 * snoise(vec2(X * 0.9 * uScale - pace * 0.025 + seed, y * 0.3 + pace * 0.04));
    float alpha = body * lobes * (layer < 0.5 ? 1.0 : 0.32 / layer);
    alpha = clamp(alpha * (1.0 + reach * 0.25 * smootherstep(0.9, 0.0, abs(y - hem))), 0.0, 1.0);
    vec3 tint = ramp(u + 0.05 * sin(pace * 0.08 + layer * 2.3) + layer * 0.1 + max(rise, 0.0) * 0.05);
    glow = 1.0 - (1.0 - glow) * (1.0 - tint * alpha);
    cover = 1.0 - (1.0 - cover) * (1.0 - alpha);
  }
  float fade = smootherstep(0.0, 0.7, uReveal) * uOpacity;
  float strength = clamp(uBrightness, 0.0, 2.0);
  glow *= fade * min(strength, 1.0);
  cover *= fade * min(strength, 1.0);
  glow = 1.0 - pow(1.0 - glow, vec3(max(strength, 1.0)));
  float dither = (hash(frag) - 0.5) / 255.0;
  outColor = vec4(glow + dither, clamp(cover + dither, 0.0, 1.0));
}`;

  const toOklch = (rgb) => {
    const [r, g, b] = rgb.map((c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    const lab = [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
      1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
      0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
    return [lab[0], Math.hypot(lab[1], lab[2]), Math.atan2(lab[2], lab[1])];
  };
  const unwrapHues = (stops) => {
    const known = stops.findIndex((s) => s[1] > 0.02);
    let prev = known === -1 ? 0 : stops[known][2];
    return stops.map((s) => {
      let hue = s[1] > 0.02 ? s[2] : prev;
      while (hue - prev > Math.PI) hue -= Math.PI * 2;
      while (hue - prev < -Math.PI) hue += Math.PI * 2;
      prev = hue;
      return [s[0], s[1], hue];
    });
  };

  const aurora = () => {
    const box = document.createElement("div");
    box.className = "aika-aurora";
    box.setAttribute("aria-hidden", "true");
    const canvas = document.createElement("canvas");
    box.append(canvas);
    document.body.prepend(box);
    const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
    if (!gl) { box.remove(); return; }

    const compile = (type, src) => {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null;
    };
    const vs = compile(gl.VERTEX_SHADER, VERTEX), fs = compile(gl.FRAGMENT_SHADER, FRAGMENT);
    if (!vs || !fs) { box.remove(); return; }
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, "aPosition");
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { box.remove(); return; }
    const u = {};
    for (let i = 0, n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS); i < n; i++) {
      const info = gl.getActiveUniform(prog, i);
      u[info.name.replace("[0]", "")] = gl.getUniformLocation(prog, info.name);
    }
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    // Theme colors (any CSS color) → OKLCH stops
    const probe = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    const rgbOf = (value) => {
      probe.clearRect(0, 0, 1, 1);
      probe.fillStyle = "#000";
      probe.fillStyle = value;
      probe.fillRect(0, 0, 1, 1);
      const d = probe.getImageData(0, 0, 1, 1).data;
      return [d[0] / 255, d[1] / 255, d[2] / 255];
    };
    const palette = new Float32Array(MAX_STOPS * 3);
    let stopCount = 2, paletteKey = "";
    const readPalette = () => {
      const names = cssVar("--aika-aurora-stops").split(",").map((s) => s.trim()).filter(Boolean);
      const colors = (names.length ? names : ["--aika-accent", "--aika-light-2"]).slice(0, MAX_STOPS).map((n) => cssVar(n) || "#888");
      const key = colors.join("|");
      if (key === paletteKey) return;
      paletteKey = key;
      const stops = colors.length >= 2 ? colors : [colors[0], colors[0]];
      stopCount = stops.length;
      unwrapHues(stops.map((c) => toOklch(rgbOf(c)))).forEach((s, i) => palette.set(s, i * 3));
    };

    const set = {
      amplitude: cssNum("--aika-aurora-amplitude", 1), blend: cssNum("--aika-aurora-blend", 0.5),
      speed: cssNum("--aika-aurora-speed", 0.6), height: cssNum("--aika-aurora-height", 0.42),
      scale: cssNum("--aika-aurora-scale", 1), glow: cssNum("--aika-aurora-glow", 0.6),
      brightness: cssNum("--aika-aurora-brightness", 0.9), layers: Math.round(cssNum("--aika-aurora-layers", 2)),
      opacity: cssNum("--aika-aurora-opacity", 1), res: cssNum("--aika-aurora-resolution", 0.5),
    };
    const state = { clock: Math.random() * 40, px: 0, py: 0.5, reach: 0, reveal: reduced ? 1 : 0 };
    const pointer = { x: 0, y: 0, inside: false };
    let raf = 0, last = 0, timer = 0, onScreen = true;
    // The Performance setting (options/perf-*.css): --aika-gl-fps caps the frame
    // rate (0 / unset — every frame), --aika-gl-still: 1 stops after the intro.
    // In any mode nothing is drawn while the aurora is off screen (scrolled away).
    const fps = cssNum("--aika-gl-fps", 0), still = cssNum("--aika-gl-still", 0) > 0;
    const next = (now) => {
      if (still && state.reveal >= 1) return;
      if (fps > 0) {
        raf = -1;
        timer = setTimeout(() => { timer = 0; raf = requestAnimationFrame(frame); }, Math.max(0, 1000 / fps - (performance.now() - now)));
      } else raf = requestAnimationFrame(frame);
    };

    const render = () => {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(prog);
      gl.bindVertexArray(vao);
      gl.uniform2f(u.uResolution, canvas.width, canvas.height);
      gl.uniform1f(u.uTime, state.clock);
      gl.uniform3fv(u.uStops, palette);
      gl.uniform1i(u.uStopCount, stopCount);
      gl.uniform1f(u.uAmplitude, set.amplitude);
      gl.uniform1f(u.uBlend, set.blend);
      gl.uniform1f(u.uHeight, set.height);
      gl.uniform1f(u.uScale, set.scale);
      gl.uniform1f(u.uGlow, set.glow);
      gl.uniform1f(u.uBrightness, set.brightness);
      gl.uniform1i(u.uLayers, Math.min(MAX_LAYERS, Math.max(1, set.layers)));
      gl.uniform3f(u.uPointer, state.px, state.py, state.reach);
      gl.uniform1f(u.uReveal, 1 - Math.pow(1 - state.reveal, 3));
      gl.uniform1f(u.uOpacity, set.opacity);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const frame = (now) => {
      raf = 0;
      if (document.hidden || !onScreen) return;
      const dt = last ? Math.min(fps > 0 ? 0.1 : 0.05, Math.max(0.0005, (now - last) / 1000)) : 1 / 60;
      last = now;
      state.clock += dt * set.speed;
      const w = box.clientWidth, h = box.clientHeight;
      const engaged = pointer.inside;
      const follow = 1 - Math.exp(-dt / 0.6);
      if (engaged) {
        state.px += ((pointer.x - w / 2) / h - state.px) * follow;
        state.py += (pointer.y / h - state.py) * follow;
      }
      state.reach += ((engaged ? 1 : 0) - state.reach) * (1 - Math.exp(-dt / (engaged ? 0.9 : 1.4)));
      if (state.reveal < 1) state.reveal = Math.min(1, state.reveal + dt / INTRO_SECONDS);
      render();
      next(now);
    };
    const wake = () => { if (!raf && !document.hidden && onScreen && !reduced && !(still && state.reveal >= 1)) raf = requestAnimationFrame(frame); };
    new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; if (onScreen) { last = 0; wake(); } }).observe(canvas);

    const resize = () => {
      const w = Math.max(1, box.clientWidth), h = Math.max(1, box.clientHeight);
      const ratio = Math.min(devicePixelRatio || 1, 2) * set.res;
      canvas.width = Math.max(1, Math.round(w * ratio));
      canvas.height = Math.max(1, Math.round(h * ratio));
      readPalette();
      render();
      wake();
    };
    new ResizeObserver(resize).observe(box);
    addEventListener("pointermove", (e) => {
      const r = box.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
      pointer.inside = pointer.y >= 0 && pointer.y <= r.height;
    }, { passive: true });
    root.addEventListener("pointerleave", () => { pointer.inside = false; });
    document.addEventListener("visibilitychange", () => { last = 0; readPalette(); wake(); });
    resize();
  };

  // ------------------------------------------------------------ 2. fold title
  const foldTitle = () => {
    const t = document.querySelector("#termsnone .pagesubheader");
    if (!t || "aikaFold" in t.dataset) return;
    if (reduced || t.children.length) { t.classList.add("aika-fold-skip"); return; }
    const text = t.textContent.trim();
    t.dataset.aikaFold = "";
    t.setAttribute("aria-label", text);
    let i = 0;
    const frag = document.createDocumentFragment();
    for (const part of text.split(/(\s+)/)) {
      if (!part) continue;
      if (/^\s+$/.test(part)) { frag.append(" "); continue; }
      const word = document.createElement("span");
      word.className = "aika-fold-word";
      word.setAttribute("aria-hidden", "true");
      for (const ch of part) {
        const seg = document.createElement("span");
        seg.className = "aika-fold-seg";
        const piece = document.createElement("span");
        piece.className = "aika-fold-piece";
        piece.style.setProperty("--aika-fold-i", i++);
        piece.textContent = ch;
        seg.append(piece);
        word.append(seg);
      }
      frag.append(word);
    }
    t.replaceChildren(frag);
    t.classList.add("aika-fold");
    // A hidden page still runs the animation clock (the client loading curtain
    // keeps the store view hidden) — wait until it is shown
    if (document.hidden) {
      t.classList.add("aika-fold-wait");
      const go = () => { if (!document.hidden) { document.removeEventListener("visibilitychange", go); t.classList.remove("aika-fold-wait"); } };
      document.addEventListener("visibilitychange", go);
    }
  };

  // ---------------------------------------------------------- 3. checkboxes
  const SVG_NS = "http://www.w3.org/2000/svg";
  const tick = () => {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.classList.add("aika-check");
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", "M4 12L10 18L20 6");
    path.setAttribute("pathLength", "1");
    svg.append(path);
    return svg;
  };
  const checkboxes = (scope = document) => {
    for (const box of scope.querySelectorAll(".tab_filter_control_checkbox")) {
      if (!box.querySelector(".aika-check")) box.append(tick());
    }
  };

  // ------------------------------------------------------------- 4. slider
  const slider = () => {
    const input = document.getElementById("price_range");
    const display = document.getElementById("price_range_display");
    const host = input?.closest(".range_container_inner");
    if (!input || !display || !host || host.querySelector(".aika-price-badge")) return;

    const badge = document.createElement("span");
    badge.className = "aika-price-badge";
    badge.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.className = "aika-price-badge-label";
    badge.append(label);
    host.append(badge);
    root.classList.add("aika-price-slider");

    // The badge text: Steam's caption; the changed characters roll in from below
    let shown = "";
    const write = (text) => {
      if (text === shown) return;
      const prev = shown;
      shown = text;
      label.replaceChildren(...Array.from(text, (ch, i) => {
        const s = document.createElement("span");
        s.className = "aika-roll";
        s.textContent = ch === " " ? "\u00A0" : ch;
        if (/[\u00A2-\u00A5\u20A0-\u20CF]/.test(ch)) s.classList.add("aika-cur");   // set apart, as in the rows
        if (prev && prev[i] !== ch && !reduced) s.classList.add("is-new");
        return s;
      }));
    };

    // Position over the thumb (the native range keeps the thumb inside the track);
    // near the ends the label slides along so it stays inside the filter block
    const thumb = () => cssNum("--aika-range-thumb", 20);
    const place = () => {
      const min = +input.min || 0, max = +input.max || 100;
      const p = (input.value - min) / ((max - min) || 1);
      const w = input.getBoundingClientRect().width;
      const at = input.offsetLeft + thumb() / 2 + p * (w - thumb());
      badge.style.left = at + "px";
      const half = label.offsetWidth / 2, lo = input.offsetLeft, hi = input.offsetLeft + w;
      badge.style.setProperty("--aika-badge-shift", (Math.max(lo + half, Math.min(hi - half, at)) - at).toFixed(1) + "px");
      host.style.setProperty("--aika-range-pct", (p * 100).toFixed(2) + "%");
      return p * 100;
    };

    // Pendulum: rotate springs toward the value's velocity (×-0.1, in a 0..100 scale)
    let x = place(), lastX = x, lastT = performance.now(), vel = 0, rot = 0, rv = 0, raf = 0, idle = 0;
    const step = (now) => {
      const dt = Math.min(0.05, (now - lastT) / 1000) || 1 / 60;
      lastT = now;
      x = place();
      const v = ((x - lastX) * -0.1) / dt;   // deg/s, like useVelocity(value * -0.1)
      lastX = x;
      vel += (v - vel) * Math.min(1, dt * 30);   // a little smoothing of the frame-by-frame velocity
      for (let t = 0; t < dt; t += 1 / 240) {
        const h = Math.min(1 / 240, dt - t);
        rv += (-100 * (rot - vel) - 10 * rv) * h;
        rot += rv * h;
      }
      badge.style.setProperty("--aika-badge-rot", Math.max(-25, Math.min(25, rot)).toFixed(2) + "deg");
      idle = Math.abs(rot) < 0.05 && Math.abs(rv) < 0.05 && Math.abs(vel) < 0.05 ? idle + 1 : 0;
      raf = idle > 10 ? 0 : requestAnimationFrame(step);
    };
    const kick = () => { if (!raf && !reduced) { lastT = performance.now(); idle = 0; raf = requestAnimationFrame(step); } else if (reduced) place(); };

    write(display.textContent.trim());
    place();
    new MutationObserver(() => { write(display.textContent.trim()); place(); }).observe(display, { childList: true, characterData: true, subtree: true });
    input.addEventListener("input", () => { kick(); write(display.textContent.trim()); });
    input.addEventListener("pointerdown", () => badge.classList.add("is-active"));
    addEventListener("pointerup", () => badge.classList.remove("is-active"));
    addEventListener("resize", place, { passive: true });
  };

  // ----------------------------------------------------- 5. currency signs
  // In small mono figures "₴" reads as a struck "0" ("695,00₴" ≈ "695,000"): the
  // sign (any currency symbol at either end) goes into a span the CSS sets apart —
  // a little space, muted. Zero cents are dropped ("695,00 ₴" → "695 ₴", author's
  // request); other cents stay.
  const CURRENCY = /^([^\d\s.,]*)\s*([\d\s.,\u00A0]+?)\s*([^\d\s.,]*)$/;
  const currency = (scope = document) => {
    for (const el of scope.querySelectorAll(".search_result_row .discount_prices > div:not(.free):not([data-aika-cur])")) {
      const t = el.textContent, m = CURRENCY.exec(t.trim());
      el.dataset.aikaCur = "";
      if (!m || !(m[1] || m[3])) continue;
      const frag = document.createDocumentFragment();
      const sign = (s) => { const span = document.createElement("span"); span.className = "aika-cur"; span.textContent = s; return span; };
      if (m[1]) frag.append(sign(m[1]));
      frag.append(m[2].replace(/[.,]00$/, ""));   // "695,00" → "695": no zero cents (author 2026-10-12)
      if (m[3]) frag.append(sign(m[3]));
      el.replaceChildren(frag);
    }
  };

  // ----------------------------------------------------- 6. the query hint
  // Steam keeps its hint as the field's value (its onfocus clears it, onblur puts
  // it back). The hint text is read from that handler — any client language —
  // and the field is marked while it shows it, so the CSS can mute it.
  const termHint = () => {
    const term = document.getElementById("term");
    const hint = /this\.value\s*==\s*'([^']*)'/.exec(term?.getAttribute("onfocus") || "")?.[1];
    if (!term || !hint) return;
    const sync = () => term.classList.toggle("aika-term-hint", term.value === hint);
    for (const ev of ["focus", "blur", "input", "change"]) term.addEventListener(ev, () => setTimeout(sync));
    sync();
  };

  ready(() => {
    if (!document.body.classList.contains("search_page")) return;
    termHint();
    foldTitle();
    checkboxes();
    slider();
    currency();
    const rows = document.getElementById("search_resultsRows");
    if (rows) new MutationObserver(() => currency(rows)).observe(rows, { childList: true, subtree: true });
    aurora();   // with reduced motion: one still frame
    // Filter blocks expand / tags load later — new checkboxes
    const side = document.querySelector(".rightcol") || document.body;
    new MutationObserver((recs) => { if (recs.some((r) => r.addedNodes.length)) checkboxes(side); }).observe(side, { childList: true, subtree: true });
  });
})();
