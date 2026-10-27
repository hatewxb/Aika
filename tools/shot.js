// A screenshot of a part of a Steam window (works in the friends list, the
// notification and the store windows; see CLAUDE.md for the main window).
//   node tools/shot.js "<window>" x y w h out.png
const fs = require("fs");
const target = require("./target");
const [title, x, y, w, h, out] = process.argv.slice(2);
(async () => {
  const ws = new WebSocket(await target(title));
  ws.onopen = () => ws.send(JSON.stringify({ id: 1, method: "Page.captureScreenshot", params: { format: "png", clip: { x: +x, y: +y, width: +w, height: +h, scale: 1 } } }));
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id !== 1) return;
    if (!m.result) { console.log(JSON.stringify(m.error)); process.exit(1); }
    fs.writeFileSync(out, Buffer.from(m.result.data, "base64"));
    process.exit(0);
  };
  setTimeout(() => { console.log("timeout"); process.exit(1); }, 10000);
})();
