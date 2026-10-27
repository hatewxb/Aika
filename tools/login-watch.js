// Waits for the "Sign in to Steam" window (it lives ~7 s at startup) and
// captures it: the element tree of .Login, the stylesheet links, the outerHTML
// (for the test bench) and a few screenshots.
//   node tools/login-watch.js <out prefix> [shots, default 3] [seconds to wait, default 120]
// Output: <prefix>.txt (tree + links), <prefix>.html (outerHTML), <prefix>-N.png
const fs = require("fs");
const [prefix, shots = "3", secs = "120"] = process.argv.slice(2);
const deadline = Date.now() + Number(secs) * 1000;
const TITLE = /^(Sign in to Steam|Войти в Steam)$/;

const tree = `(() => {
  const d = (e, l = 0) => l > 9 ? "" : "  ".repeat(l) + e.tagName.toLowerCase()
    + (typeof e.className === "string" && e.className ? "." + e.className.trim().split(/\\s+/).join(".") : "")
    + " " + e.offsetWidth + "x" + e.offsetHeight + "@" + e.offsetLeft + "," + e.offsetTop
    + " bi=" + getComputedStyle(e).backgroundImage.slice(0, 80)
    + " «" + (e.childElementCount ? "" : (e.textContent || "").trim().slice(0, 40)) + "»\\n"
    + [...e.children].map(c => d(c, l + 1)).join("");
  return "html: " + document.documentElement.className + "\\nbody: " + document.body.className
    + "\\nsize: " + innerWidth + "x" + innerHeight
    + "\\nlinks:\\n" + [...document.querySelectorAll("link[rel=stylesheet]")].map(l => "  " + l.href).join("\\n")
    + "\\n\\n" + d(document.body);
})()`;

function session(url) {
  const ws = new WebSocket(url);
  let id = 0;
  const wait = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); wait.get(m.id)?.(m); };
  const send = (method, params = {}) => new Promise(r => { wait.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
  return new Promise(r => { ws.onopen = () => r({ send, close: () => ws.close() }); });
}

(async function loop() {
  while (Date.now() < deadline) {
    try {
      const list = await (await fetch("http://localhost:8080/json")).json();
      const t = list.find(p => TITLE.test(p.title));
      if (t) {
        const s = await session(t.webSocketDebuggerUrl);
        const ev = async expr => (await s.send("Runtime.evaluate", { expression: expr, returnByValue: true })).result?.result?.value;
        // Wait for the theme to attach (0.6 s to several seconds at startup, see CLAUDE.md), then let it paint
        for (let i = 0; i < 60 && !(await ev("!!document.querySelector('link[href*=\"/Aika/login.css\"]')")); i++) await new Promise(r => setTimeout(r, 100));
        await new Promise(r => setTimeout(r, 400));
        fs.writeFileSync(prefix + ".txt", await ev(tree));
        fs.writeFileSync(prefix + ".html", await ev("document.documentElement.outerHTML"));
        for (let i = 0; i < Number(shots); i++) {
          const m = await s.send("Page.captureScreenshot", { format: "png" });
          if (m.result) fs.writeFileSync(`${prefix}-${i}.png`, Buffer.from(m.result.data, "base64"));
          await new Promise(r => setTimeout(r, 700));
        }
        console.log("captured", t.title);
        process.exit(0);
      }
    } catch { /* CDP not up yet */ }
    await new Promise(r => setTimeout(r, 150));
  }
  console.log("no sign-in window");
  process.exit(1);
})();
