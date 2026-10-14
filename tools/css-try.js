// "What if" for style-recalc cost: inlines the theme entry file's imports as
// <style> elements (like tools/css-bisect.js), measures, then applies text
// replacements to one file and measures again.
//   node tools/css-try.js "<window>" <file> "<find>" "<replace>" [<find> "<replace>" …]
// <find> is a plain string (every occurrence is replaced).
const target = require("./target");
const [win, file, ...pairs] = process.argv.slice(2);
const sec = 3;
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
    await new Promise((r) => setTimeout(r, 800));
    const a = await metrics();
    await new Promise((r) => setTimeout(r, sec * 1000));
    const b = await metrics();
    return `style ${((b.RecalcStyleDuration - a.RecalcStyleDuration) * 1000 / sec).toFixed(1)} ms/s, ${((b.RecalcStyleCount - a.RecalcStyleCount) / sec).toFixed(0)}/s`;
  };
  await send("Performance.enable", {});
  await ev(`(async () => {
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
  })()`);
  console.log("as is:   " + await measure());
  const found = await ev(`(() => {
    const s = document.querySelector('style[data-aika-bisect="${file}"]');
    const pairs = ${JSON.stringify(pairs)};
    let t = s.textContent, hits = [];
    for (let i = 0; i < pairs.length; i += 2) { hits.push(t.split(pairs[i]).length - 1); t = t.split(pairs[i]).join(pairs[i + 1]); }
    s.textContent = t;
    return hits.join(",");
  })()`);
  console.log(`changed: ${await measure()}   (replacements per pair: ${found})`);
  await ev(`document.querySelectorAll("style[data-aika-bisect]").forEach((s) => s.remove()); document.querySelectorAll('link[href*="millennium.host"]').forEach((l) => (l.disabled = false)); 1`);
  process.exit(0);
})();
