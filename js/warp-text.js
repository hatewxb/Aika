// warp-text.js — a paragraph that gently warps (idea: reactbits.dev "Warp Text";
// our own WebGL2 code, no library). Used by store-hero.js for the game
// description under the logo on the cinematic store page.
//
// The text is drawn into a canvas exactly where the DOM puts each letter
// (Range rects, the same font, color and text-shadow), so the line breaks
// match; the DOM text stays in place — selectable, read by screen readers —
// but transparent (.aika-warp-on). A fragment shader then moves the pixels:
//   ambient — slow fbm noise, the lines breathe by about a pixel;
//   lens    — a soft bulge around the cursor with a faint ripple ring;
//   split   — red and blue a fraction of a pixel apart, more inside the lens.
// Displacements are in pixels (the original works in uv — on a wide, short
// paragraph that stretches everything sideways) and small, set by the
// --aika-warp-* tokens. Runs only while the paragraph is on screen and the page
// is shown; with reduced motion or without WebGL2 the text is left as it is.

const VERT = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec2 uSize;        // canvas size, CSS px
uniform vec2 uPointer;     // CSS px, canvas space (top-left origin)
uniform float uActive;     // 0..1, eased
uniform float uTime;
uniform float uAmbient;    // px
uniform float uScale;      // px per noise cell
uniform float uLens;       // px
uniform float uRadius;     // px
uniform float uRipple;     // px
uniform float uSplit;      // px
in vec2 vUv;
out vec4 outColor;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.02; a *= 0.5; }
  return v;
}
vec4 tex(vec2 px) {
  vec2 uv = px / uSize;
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return vec4(0.0);
  return texture(uTex, uv);   // the canvas is uploaded unflipped: row 0 = top
}
void main() {
  vec2 p = vec2(vUv.x, 1.0 - vUv.y) * uSize;
  vec2 drift = vec2(uTime * 0.055, -uTime * 0.045);
  vec2 q = p / uScale;
  vec2 ambient = (vec2(fbm(q + drift), fbm(q + 19.17 - drift.yx)) - 0.5) * 2.0 * uAmbient;

  vec2 d = p - uPointer;
  float dist = length(d);
  float t = clamp(dist / uRadius, 0.0, 1.0);
  float lens = smoothstep(uRadius, 0.0, dist) * uActive;
  float bulge = t * (1.0 - t) * (1.0 - t) * 6.75 * uActive;
  vec2 dir = dist > 0.001 ? d / dist : vec2(0.0);
  float ring = sin(dist * 0.16 - uTime * 4.2);
  vec2 warp = -dir * bulge * uLens + dir * ring * bulge * uRipple;

  vec2 disp = ambient + warp;
  vec2 src = p + disp;
  float len = length(disp);
  vec2 sdir = len > 0.0001 ? disp / len : vec2(0.7071);
  vec2 split = sdir * uSplit * (0.35 + lens * 1.65);

  vec4 base = tex(src);
  vec4 r = tex(src + split);
  vec4 b = tex(src - split);
  float a = max(max(r.a, base.a), b.a);
  outColor = vec4(r.r, base.g, b.b, a) + vec4(lens * base.a * 0.04);
}`;

const num = (cs, name, fallback) => {
  const v = parseFloat(cs.getPropertyValue(name));
  return Number.isFinite(v) ? v : fallback;
};

// "rgba(0, 0, 0, 0.6) 0px 1px 12px" → the first shadow
const parseShadow = (s) => {
  if (!s || s === "none") return null;
  const color = s.match(/rgba?\([^)]*\)|color\([^)]*\)|#[0-9a-f]+/i)?.[0];
  const n = s.replace(color || "", "").trim().split(/\s+/).map(parseFloat).filter(Number.isFinite);
  return { color: color || "transparent", x: n[0] || 0, y: n[1] || 0, blur: n[2] || 0 };
};

export function warpText(el) {
  if (!el || el.dataset.aikaWarp != null) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const canvas = document.createElement("canvas");
  canvas.className = "aika-warp-canvas";
  canvas.setAttribute("aria-hidden", "true");
  const gl = canvas.getContext("webgl2", { premultipliedAlpha: true, antialias: false });
  if (!gl) return;
  el.dataset.aikaWarp = "";

  const prog = gl.createProgram();
  for (const [type, src] of [[gl.VERTEX_SHADER, VERT], [gl.FRAGMENT_SHADER, FRAG]]) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) { console.warn("[Aika] warp-text:", gl.getShaderInfoLog(sh)); return; }
    gl.attachShader(prog, sh);
  }
  gl.linkProgram(prog);
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {};
  for (const n of ["uTex", "uSize", "uPointer", "uActive", "uTime", "uAmbient", "uScale", "uLens", "uRadius", "uRipple", "uSplit"]) U[n] = gl.getUniformLocation(prog, n);
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.uniform1i(U.uTex, 0);

  el.append(canvas);
  let pad = 0, w = 0, h = 0, cfg = null;
  const text2d = document.createElement("canvas");

  // Draw the paragraph where the DOM has each letter
  const rasterize = () => {
    const cs = getComputedStyle(el);
    cfg = {
      ambient: num(cs, "--aika-warp-ambient", 1.2), scale: num(cs, "--aika-warp-scale", 90),
      lens: num(cs, "--aika-warp-lens", 4), radius: num(cs, "--aika-warp-radius", 120),
      ripple: num(cs, "--aika-warp-ripple", 1), split: num(cs, "--aika-warp-split", 0.5),
      speed: num(cs, "--aika-warp-speed", 0.55),
    };
    pad = num(cs, "--aika-warp-pad", 24);
    const box = el.getBoundingClientRect();
    w = Math.ceil(box.width + 2 * pad);
    h = Math.ceil(box.height + 2 * pad);
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.style.left = canvas.style.top = -pad + "px";
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    canvas.width = text2d.width = Math.round(w * dpr);
    canvas.height = text2d.height = Math.round(h * dpr);

    const ctx = text2d.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    ctx.fillStyle = cs.color;   // the DOM text is hidden by -webkit-text-fill-color, color stays real
    ctx.textBaseline = "alphabetic";
    const shadow = parseShadow(cs.getPropertyValue("--aika-warp-shadow").trim());
    if (shadow) Object.assign(ctx, { shadowColor: shadow.color, shadowOffsetX: shadow.x * dpr, shadowOffsetY: shadow.y * dpr, shadowBlur: shadow.blur * dpr });
    const ascent = ctx.measureText("Hg").fontBoundingBoxAscent;
    const range = document.createRange();
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let node; (node = walker.nextNode());) {
      const s = node.textContent;
      for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (ch.trim() === "") continue;
        range.setStart(node, i);
        range.setEnd(node, i + 1);
        const r = range.getClientRects()[0];
        if (r) ctx.fillText(ch, r.left - box.left + pad, r.top - box.top + pad + ascent);
      }
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, text2d);
    el.classList.add("aika-warp-on");
  };

  // The cursor: in canvas space; the lens fades in near the paragraph
  const pointer = { x: -1e4, y: -1e4, near: false };
  let active = 0;
  addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    pointer.x = e.clientX - r.left;
    pointer.y = e.clientY - r.top;
    pointer.near = pointer.x > -cfg?.radius && pointer.y > -cfg?.radius && pointer.x < w + cfg?.radius && pointer.y < h + cfg?.radius;
  }, { passive: true });

  let raf = 0, onScreen = false;
  const t0 = performance.now();
  const frame = (now) => {
    raf = 0;
    if (!onScreen || document.hidden) return;
    active += ((pointer.near ? 1 : 0) - active) * 0.08;
    gl.uniform2f(U.uSize, w, h);
    gl.uniform2f(U.uPointer, pointer.x, pointer.y);
    gl.uniform1f(U.uActive, active);
    gl.uniform1f(U.uTime, (now - t0) / 1000 * cfg.speed);
    gl.uniform1f(U.uAmbient, cfg.ambient);
    gl.uniform1f(U.uScale, cfg.scale);
    gl.uniform1f(U.uLens, cfg.lens);
    gl.uniform1f(U.uRadius, cfg.radius);
    gl.uniform1f(U.uRipple, cfg.ripple);
    gl.uniform1f(U.uSplit, cfg.split);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    raf = requestAnimationFrame(frame);
  };
  const run = () => { if (!raf && onScreen && !document.hidden) raf = requestAnimationFrame(frame); };

  rasterize();
  new ResizeObserver(() => rasterize()).observe(el);
  document.fonts?.ready.then(rasterize);
  new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; run(); }).observe(el);
  document.addEventListener("visibilitychange", run);
}
