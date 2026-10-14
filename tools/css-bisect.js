// Which theme file makes style recalcs expensive on a web page: swaps the
// theme <link> for one inline <style> per @import of the entry file, then
// turns the files off one at a time and measures the main thread (CDP
// Performance.getMetrics). Something must keep the page producing frames
// (an animation + a rAF loop, e.g. the search page aurora).
//   node tools/css-bisect.js "<window title part>" [entry=webkit.css] [seconds=2]
const target = require("./target");
const [win, entry = "webkit.css", secArg] = process.argv.slice(2);
const sec = +(secArg || 2);
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
    const a = await metrics();
    await new Promise((r) => setTimeout(r, sec * 1000));
    const b = await metrics();
    return { style: (b.RecalcStyleDuration - a.RecalcStyleDuration) * 1000 / sec, n: (b.RecalcStyleCount - a.RecalcStyleCount) / sec };
  };
  await send("Performance.enable", {});

  const files = await ev(`(async () => {
    const entry = ${JSON.stringify(BASE + entry)};
    const text = await (await fetch(entry, { cache: "reload" })).text();
    const urls = [...text.matchAll(/@import\\s+url\\(["']?([^"')]+)["']?\\)/g)].map((m) => new URL(m[1], entry).href);
    document.querySelectorAll('link[href*="millennium.host"][href*=${JSON.stringify(entry)}]').forEach((l) => (l.disabled = true));
    const out = [];
    for (const u of urls) {
      const css = await (await fetch(u, { cache: "reload" })).text();
      const s = document.createElement("style");
      s.dataset.aikaBisect = u.replace(${JSON.stringify(BASE)}, "");
      s.textContent = css;
      document.head.append(s);
      out.push(s.dataset.aikaBisect);
    }
    return out;
  })()`);
  await new Promise((r) => setTimeout(r, 1500));
  const all = await measure();
  console.log(`all on: style ${all.style.toFixed(1)} ms/s, ${all.n.toFixed(0)} recalcs/s`);
  const rows = [];
  for (const f of files) {
    await ev(`document.querySelector('style[data-aika-bisect="${f}"]').disabled = true`);
    await new Promise((r) => setTimeout(r, 600));
    const m = await measure();
    await ev(`document.querySelector('style[data-aika-bisect="${f}"]').disabled = false`);
    rows.push({ off: f, "style ms/s": +m.style.toFixed(1), "saved": +(all.style - m.style).toFixed(1) });
  }
  rows.sort((x, y) => y.saved - x.saved);
  console.table(rows);
  // restore the page: drop the inline copies, turn the link back on
  await ev(`document.querySelectorAll("style[data-aika-bisect]").forEach((s) => s.remove()); document.querySelectorAll('link[href*="millennium.host"]').forEach((l) => (l.disabled = false)); 1`);
  process.exit(0);
})();
