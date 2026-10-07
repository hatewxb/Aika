// Hover the mouse over an element (via CDP Input) to check :hover styles:
// after that audit.js / rules.js see the element in its hover state.
//   node tools/hover.js [window|ws://…] "<selector>"   — onto the center of the first match
//   node tools/hover.js [window|ws://…] off            — move the mouse to the corner
// If the element is off screen — scroll to it first (scrollIntoView).
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
          e.scrollIntoView({ block: "nearest" }); const r = e.getBoundingClientRect();
          return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()` });
      const p = r.result.value;
      if (!p) { console.log("element not found: " + sel); process.exit(1); }
      ({ x, y } = p);
    }
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
    console.log(`mouse: ${Math.round(x)},${Math.round(y)}`);
    process.exit(0);
  };
  setTimeout(() => { console.log("timeout"); process.exit(1); }, 10000);
})();
