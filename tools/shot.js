// A screenshot of a part of a Steam window (works in the friends list, the
// notification and the store windows; see CLAUDE.md for the main window).
//   node tools/shot.js "<window>" x y w h out.png
const fs = require("fs");
const target = require("./target");
const [title, x, y, w, h, out] = process.argv.slice(2);
(async () => {
  const ws = new WebSocket(await target(title));
  ws.onopen = () => ws.send(JSON.stringify({ id: 1, method: "Runtime.evaluate", params: { expression: "({x:scrollX,y:scrollY})", returnByValue: true } }));
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id === 1) {
      const offset = m.result?.result?.value || {x:0,y:0};
      ws.send(JSON.stringify({ id: 2, method: "Page.captureScreenshot", params: { format: "png", clip: { x: +x + offset.x, y: +y + offset.y, width: +w, height: +h, scale: 1 } } }));
      return;
    }
    if (m.id !== 2) return;
    if (!m.result) { console.log(JSON.stringify(m.error)); process.exit(1); }
    fs.writeFileSync(out, Buffer.from(m.result.data, "base64"));
    process.exit(0);
  };
  setTimeout(() => { console.log("timeout"); process.exit(1); }, 10000);
})();
