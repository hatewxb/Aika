// A real mouse click on an element (via CDP Input): Steam's React handlers
// often ignore a synthetic el.click().
//   node tools/click.js [window|ws://…] "<selector>"          — single click
//   node tools/click.js [window|ws://…] "<selector>" double   — double click
//   node tools/click.js [window|ws://…] "<selector>" right    — right click (context menu)
const target = require("./target");
const args = process.argv.slice(2);
const double = args[args.length - 1] === "double" ? (args.pop(), true) : false;
const button = args[args.length - 1] === "right" ? (args.pop(), "right") : "left";
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
    const r = await send("Runtime.evaluate", { returnByValue: true, expression:
      `(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null;
        e.scrollIntoView({ block: "nearest" }); const r = e.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()` });
    const p = r.result.value;
    if (!p) { console.log("element not found: " + sel); process.exit(1); }
    const { x, y } = p;
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
    for (let n = 1; n <= (double ? 2 : 1); n++) {
      await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button, clickCount: n });
      await send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button, clickCount: n });
    }
    console.log(`click: ${Math.round(x)},${Math.round(y)}${double ? " ×2" : ""}`);
    process.exit(0);
  };
  setTimeout(() => { console.log("timeout"); process.exit(1); }, 10000);
})();
