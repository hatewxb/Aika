// Main-thread cost of every Steam window over a few seconds of idle (CDP
// Performance.getMetrics deltas): task / script / style / layout time and
// counts, per second. Windows that did nothing are left out.
//   node tools/perf.js [seconds=5] [title filter]
// Pair it with a process-level CPU/GPU sample (see ROADMAP, "Performance").
const sec = +(process.argv[2] || 5);
const filter = process.argv[3] || "";

const conn = (url) => new Promise((resolve, reject) => {
  const ws = new WebSocket(url);
  let id = 0;
  const send = (method, params) => new Promise((r) => {
    const i = ++id;
    const h = (e) => { const m = JSON.parse(e.data); if (m.id === i) { ws.removeEventListener("message", h); r(m.result || {}); } };
    ws.addEventListener("message", h);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
  ws.onopen = () => resolve({ ws, send });
  ws.onerror = reject;
});

const pick = (metrics) => Object.fromEntries((metrics || []).map((m) => [m.name, m.value]));

(async () => {
  const list = (await (await fetch("http://localhost:8080/json")).json())
    .filter((t) => t.type === "page" && t.title.includes(filter));
  const sessions = [];
  for (const t of list) {
    try {
      const c = await conn(t.webSocketDebuggerUrl);
      await c.send("Performance.enable", {});
      const vis = await c.send("Runtime.evaluate", { expression: "document.visibilityState", returnByValue: true });
      sessions.push({ t, c, vis: vis.result && vis.result.value, a: pick((await c.send("Performance.getMetrics", {})).metrics) });
    } catch (e) { /* a window that went away */ }
  }
  await new Promise((r) => setTimeout(r, sec * 1000));
  const rows = [];
  for (const s of sessions) {
    const b = pick((await s.c.send("Performance.getMetrics", {})).metrics);
    const d = (k) => (b[k] || 0) - (s.a[k] || 0);
    const task = d("TaskDuration") * 1000 / sec;
    if (task < 1) { s.c.ws.close(); continue; }
    rows.push({
      window: s.t.title.slice(0, 34) + " [" + (s.vis || "?")[0] + "]",
      "task ms/s": +task.toFixed(1),
      "script": +(d("ScriptDuration") * 1000 / sec).toFixed(1),
      "style": +(d("RecalcStyleDuration") * 1000 / sec).toFixed(1),
      "layout": +(d("LayoutDuration") * 1000 / sec).toFixed(1),
      "styles/s": +(d("RecalcStyleCount") / sec).toFixed(1),
      "layouts/s": +(d("LayoutCount") / sec).toFixed(1),
    });
    s.c.ws.close();
  }
  rows.sort((x, y) => y["task ms/s"] - x["task ms/s"]);
  console.table(rows);
  process.exit(0);
})();
