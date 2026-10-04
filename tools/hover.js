// Навести мышь на элемент (через CDP Input), чтобы проверить :hover-стили:
// после этого audit.js / rules.js видят элемент в состоянии наведения.
//   node tools/hover.js [окно|ws://…] "<селектор>"   — на центр первого найденного
//   node tools/hover.js [окно|ws://…] off            — увести мышь в угол
// Если элемент вне экрана — сначала прокрутить к нему (scrollIntoView).
const target = require("./target");
const args = process.argv.slice(2);
const sel = args.pop();
(async () => {
  const ws = new WebSocket(await target(args[0]));
  let id = 0;
  const send = (method, params) => new Promise(res => {
    const my = ++id;
    const on = e => { const m = JSON.parse(e.data); if (m.id === my) { ws.removeEventListener("message", on); res(m.result); } };
    ws.addEventListener("message", on);
    ws.send(JSON.stringify({ id: my, method, params }));
  });
  ws.onopen = async () => {
    let x = 1, y = 1;
    if (sel !== "off") {
      const r = await send("Runtime.evaluate", { returnByValue: true, expression:
        `(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null;
          e.scrollIntoView({ block: "center" }); const r = e.getBoundingClientRect();
          return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()` });
      const p = r.result.value;
      if (!p) { console.log("элемент не найден: " + sel); process.exit(1); }
      ({ x, y } = p);
    }
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
    console.log(`мышь: ${Math.round(x)},${Math.round(y)}`);
    process.exit(0);
  };
  setTimeout(() => { console.log("timeout"); process.exit(1); }, 10000);
})();
