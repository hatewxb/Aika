// Steam window audit: which visible elements still use Steam colors and which
// "plates" have no rounding. Colors are compared with the theme palette (all
// --aika-* on :root, converted to rgb), with a tolerance.
//   node tools/audit.js [window|ws://…] [colors|radius|all] [scope selector]
// Output is grouped: "path of readable classes → property → value × count".
const target = require("./target");
const args = process.argv.slice(2);
const scope = args.length >= 3 ? args.pop() : "body";
const mode = args.length >= 2 ? args.pop() : "all";
const win = args[0];
const fs = require("fs"), path = require("path");
const names = [...new Set(["colors.css", "root-colors.css"].flatMap(f =>
  [...fs.readFileSync(path.join(__dirname, "..", f), "utf8").matchAll(/(--aika-[\w-]+)\s*:/g)].map(m => m[1])))];

const expr = `(() => {
  const MODE = ${JSON.stringify(mode)}, SCOPE = ${JSON.stringify(scope)}, NAMES = ${JSON.stringify(names)};
  // A hidden window (another client section) doesn't run CSS transitions —
  // colors freeze at the start. Finish the transitions.
  for (const a of document.getAnimations()) if (a instanceof CSSTransition) a.finish();
  const cv = document.createElement("canvas"); cv.width = cv.height = 1;
  const cx = cv.getContext("2d", { willReadFrequently: true });
  const probe = document.createElement("div"); document.body.append(probe);
  // Any CSS color → [r,g,b,a]
  const rgba = c => {
    probe.style.color = ""; probe.style.color = c;
    const cc = getComputedStyle(probe).color;
    const m = cc.match(/^rgba?\\(([^)]+)\\)/);
    if (m) { const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p[3] ?? 1]; }
    cx.clearRect(0, 0, 1, 1); cx.fillStyle = cc; cx.fillRect(0, 0, 1, 1);
    const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255];
  };
  // Theme palette: token names from colors.css / root-colors.css (passed from Node —
  // our stylesheets are on another domain, their rules can't be read from the window)
  const root = getComputedStyle(document.documentElement);
  const pal = NAMES.map(n => [n, rgba(root.getPropertyValue(n).trim())]);
  const near = (a, b) => Math.abs(a[0]-b[0]) + Math.abs(a[1]-b[1]) + Math.abs(a[2]-b[2]) < 18 && Math.abs(a[3]-b[3]) < 0.06;
  const ours = c => c[3] === 0 || pal.some(([, p]) => near(c, p))
    || (c[0] > 245 && c[1] > 240 && c[2] > 235 && c[3] === 1); // warm white text on accent
  const label = el => { const parts = []; let e = el;
    for (let i = 0; i < 4 && e && e !== document.body; i++, e = e.parentElement) {
      const r = [...(e.classList || [])].filter(c => !/^_|[0-9]{2}/.test(c) && !/^(Focusable|Panel)$/.test(c)).slice(0, 2).join(".");
      parts.unshift(e.tagName.toLowerCase() + (r ? "." + r : "")); }
    return parts.join(" > "); };
  const out = {};
  const add = (k, v) => { out[k] = out[k] || {}; out[k][v] = (out[k][v] || 0) + 1; };
  const root2 = document.querySelector(SCOPE) || document.body;
  for (const el of root2.querySelectorAll("*")) {
    if (el === probe) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
    const s = getComputedStyle(el);
    if (s.visibility === "hidden" || s.opacity === "0") continue;
    const hasText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (MODE !== "radius") {
      const bg = rgba(s.backgroundColor);
      if (!ours(bg)) add(label(el), "bg " + s.backgroundColor);
      if (s.backgroundImage !== "none" && /gradient/.test(s.backgroundImage)) {
        const cols = s.backgroundImage.match(/(rgba?|oklch|color)\\([^()]*(\\([^()]*\\))?[^()]*\\)|#[0-9a-f]{3,8}/gi) || [];
        if (cols.some(c => !ours(rgba(c)))) add(label(el), "gradient " + s.backgroundImage.slice(0, 70));
      }
      if (hasText && !ours(rgba(s.color))) add(label(el), "color " + s.color);
      if (el instanceof SVGElement && s.fill !== "none" && /^rgb/.test(s.fill) && !ours(rgba(s.fill))) add(label(el), "fill " + s.fill);
      for (const side of ["Top", "Right", "Bottom", "Left"]) {
        if (parseFloat(s["border" + side + "Width"]) > 0 && s["border" + side + "Style"] !== "none" && !ours(rgba(s["border" + side + "Color"])))
          { add(label(el), "border " + s["border" + side + "Color"]); break; }
      }
      if (s.boxShadow !== "none") {
        // Shadow parts; zero ones (0 0 0 0) draw nothing — skip
        const partsSh = s.boxShadow.split(/,(?![^()]*\\))/).filter(p => !/^\\s*\\S+\\([^)]*\\)\\s+0px 0px 0px 0px/.test(p) && !/^\\s*\\S+\\([^)]*\\)\\s+0px 0px( 0px)?\\s*(inset)?\\s*$/.test(p));
        const cols = partsSh.join(",").match(/(rgba?|oklch|color)\\([^()]*\\)/g) || [];
        if (cols.some(c => !ours(rgba(c)))) add(label(el), "shadow " + partsSh.join(",").slice(0, 60)); }
      // Pseudo-elements: Steam paints fills with them (e.g. "on" of a toggle —
      // .ToggleRail::before), the element's own computed style doesn't show them
      // pseudo-elements aren't drawn on <img> (except broken images) — skip
      if (!(el instanceof HTMLImageElement)) for (const ps of ["::before", "::after"]) {
        const p = getComputedStyle(el, ps);
        if (p.content === "none" || p.content === "normal" || p.display === "none" || p.opacity === "0") continue;
        const pb = rgba(p.backgroundColor);
        if (!ours(pb)) add(label(el) + ps, "bg " + p.backgroundColor);
        if (p.backgroundImage !== "none" && /gradient/.test(p.backgroundImage)) {
          const cols = p.backgroundImage.match(/(rgba?|oklch|color)\\([^()]*(\\([^()]*\\))?[^()]*\\)|#[0-9a-f]{3,8}/gi) || [];
          if (cols.some(c => !ours(rgba(c)))) add(label(el) + ps, "gradient " + p.backgroundImage.slice(0, 70));
        }
      }
    }
    if (MODE !== "colors") {
      const visible = rgba(s.backgroundColor)[3] > 0.02
        || s.backgroundImage !== "none" && !/^url/.test(s.backgroundImage) && s.backgroundClip !== "text"
        || (parseFloat(s.borderTopWidth) > 0 && s.borderTopStyle !== "none" && rgba(s.borderTopColor)[3] > 0.02)
        || s.boxShadow !== "none";
      const radius = parseFloat(s.borderTopLeftRadius) + parseFloat(s.borderBottomRightRadius);
      // Clipped by a rounded parent (overflow + radius) — the corners are round anyway
      let clipped = false;
      for (let p = el.parentElement, i = 0; p && i < 6 && !clipped; p = p.parentElement, i++) {
        const ps = getComputedStyle(p);
        clipped = ps.overflow !== "visible" && parseFloat(ps.borderTopLeftRadius) >= 2;
      }
      const fullHeight = r.height > innerHeight * 0.8; // full-height panels sit flush against the edges
      if (visible && !clipped && !fullHeight && radius < 2 && r.width > 16 && r.height > 12 && r.width < innerWidth * 0.9 && !(el instanceof SVGElement))
        add(label(el), "no rounding " + Math.round(r.width) + "x" + Math.round(r.height));
    }
  }
  probe.remove();
  return Object.entries(out).map(([k, v]) => k + "\\n    " + Object.entries(v).map(([a, n]) => a + (n > 1 ? " ×" + n : "")).join("\\n    ")).join("\\n");
})()`;

(async () => {
  const ws = new WebSocket(await target(win));
  ws.onopen = () => ws.send(JSON.stringify({ id: 1, method: "Runtime.evaluate", params: { expression: expr, returnByValue: true } }));
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id === 1) { const v = m.result.result.value; console.log(v ?? JSON.stringify(m.result).slice(0, 2000)); process.exit(0); } };
  setTimeout(() => { console.log("timeout"); process.exit(1); }, 20000);
})();
