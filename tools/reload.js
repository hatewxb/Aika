// Перезагрузить CSS темы в окне Steam без перезапуска:
// обновить HTTP-кэш всех .css темы и пересоздать <link> точки входа.
//   node tools/reload.js                         — главное окно, main.css
//   node tools/reload.js "Games Root Menu" popup.css — окно-меню (link добавится, если его нет)
const fs = require("fs"), path = require("path");
const target = require("./target");
const root = path.resolve(__dirname, "..");
const [win, entry = "main.css"] = process.argv.slice(2);
const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) { if (!/^(\.git|assets|tools)$/.test(f)) walk(p); }
    else if (f.endsWith(".css")) files.push(path.relative(root, p).split(path.sep).join("/"));
  }
})(root);
const expr = `(async()=>{const base="https://millennium.host/v1/themes/Aika/";
await Promise.all(${JSON.stringify(files)}.map(f=>fetch(base+f,{cache:"reload"})));
const old=document.querySelector('link[href*="themes/Aika/${entry}"]');
const l=document.createElement("link");l.rel="stylesheet";l.href=base+"${entry}?v="+Date.now();
await new Promise(r=>{l.onload=r;l.onerror=r;old?old.after(l):document.head.append(l)});
if(old)old.remove();return "reloaded ${files.length} files, ${entry}"})()`;
(async () => {
  const ws = new WebSocket(await target(win));
  ws.onopen = () => ws.send(JSON.stringify({ id: 1, method: "Runtime.evaluate", params: { expression: expr, awaitPromise: true, returnByValue: true } }));
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id === 1) { console.log(JSON.stringify(m.result.result.value ?? m.result)); process.exit(0); } };
  setTimeout(() => { console.log("timeout"); process.exit(1); }, 10000);
})();
