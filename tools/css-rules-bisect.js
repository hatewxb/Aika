// Narrows tools/css-bisect.js down to rules: inlines the theme, splits one
// file into its top-level rules and keeps halving the set whose removal makes
// style recalcs cheap, printing the culprits (selectors) it lands on.
//   node tools/css-rules-bisect.js "<window>" <file> [threshold ms/s = 60]
const target = require("./target");
const [win, file, thrArg] = process.argv.slice(2);
const THRESHOLD = +(thrArg || 60);   // "cheap" = saved at least this much
const sec = 2;
const BASE = "https://millennium.host/v1/themes/Aika/";

(async () => {
  const ws = new WebSocket(await target(win));
  await new Promise((r) => (ws.onopen = r));
  let id = 0;
  const send = (method, params) => new Promise((r) => {
    const i = ++id;
    const h = (e) => { const m = JSON.parse(e.data); if (m.id === i) { ws.removeEventListener("message", h); r(m.result || {}); } };
    ws.addEventListener("message", h);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
  const ev = async (expression) => (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result.value;
  const metrics = async () => Object.fromEntries((await send("Performance.getMetrics", {})).metrics.map((m) => [m.name, m.value]));
  const measure = async () => {
    await new Promise((r) => setTimeout(r, 500));
    const a = await metrics();
    await new Promise((r) => setTimeout(r, sec * 1000));
    const b = await metrics();
    return (b.RecalcStyleDuration - a.RecalcStyleDuration) * 1000 / sec;
  };
  await send("Performance.enable", {});
  const count = await ev(`(async () => {
    const entry = ${JSON.stringify(BASE + "webkit.css")};
    const text = await (await fetch(entry, { cache: "reload" })).text();
    const urls = [...text.matchAll(/@import\\s+url\\(["']?([^"')]+)["']?\\)/g)].map((m) => new URL(m[1], entry).href);
    document.querySelectorAll('link[href*="millennium.host"][href*="webkit.css"]').forEach((l) => (l.disabled = true));
    for (const u of urls) {
      const s = document.createElement("style");
      s.dataset.aikaBisect = u.replace(${JSON.stringify(BASE)}, "");
      s.textContent = await (await fetch(u, { cache: "reload" })).text();
      document.head.append(s);
    }
    // top-level rules of the file (brace matching, comments dropped)
    const s = document.querySelector('style[data-aika-bisect="${file}"]');
    const src = s.textContent.replace(/\\/\\*[\\s\\S]*?\\*\\//g, "");
    const rules = []; let depth = 0, start = 0;
    for (let i = 0; i < src.length; i++) {
      if (src[i] === "{") depth++;
      else if (src[i] === "}") { depth--; if (depth === 0) { rules.push(src.slice(start, i + 1).trim()); start = i + 1; } }
    }
    window.__aikaRules = rules; window.__aikaRuleStyle = s;
    window.__aikaKeep = (skip) => { s.textContent = rules.filter((_, i) => !skip.includes(i)).join("\\n"); };
    return rules.length;
  })()`);
  const base = await measure();
  console.log(`${file}: ${count} rules, style ${base.toFixed(1)} ms/s with all`);
  const without = async (idx) => { await ev(`__aikaKeep(${JSON.stringify(idx)})`); return measure(); };
  // find a minimal-ish set: split into halves recursively while one half alone explains the saving
  let set = [...Array(count).keys()];
  const culprits = [];
  const search = async (cand, depth) => {
    if (cand.length === 1) { culprits.push(cand[0]); return; }
    const mid = cand.length >> 1, a = cand.slice(0, mid), b = cand.slice(mid);
    const ca = base - await without(a), cb = base - await without(b);
    console.log(`${"  ".repeat(depth)}[${cand[0]}…${cand[cand.length - 1]}] removing first half saves ${ca.toFixed(0)}, second half ${cb.toFixed(0)}`);
    if (ca >= THRESHOLD) await search(a, depth + 1);
    if (cb >= THRESHOLD) await search(b, depth + 1);
  };
  await search(set, 0);
  const sel = await ev(`JSON.stringify(${JSON.stringify(culprits)}.map(i => __aikaRules[i].split("{")[0].trim().slice(0, 300)))`);
  console.log("culprit rules:\n" + JSON.parse(sel).map((s, k) => `  #${culprits[k]}: ${s}`).join("\n"));
  await ev(`document.querySelectorAll("style[data-aika-bisect]").forEach((s) => s.remove()); document.querySelectorAll('link[href*="millennium.host"]').forEach((l) => (l.disabled = false)); 1`);
  process.exit(0);
})();
