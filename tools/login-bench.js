// A test bench for the sign-in window presets without restarting Steam: rebuilds
// the window (from a capture by tools/login-watch.js) in a 700×440 iframe over
// the main window, with the theme CSS + one preloader preset, and screenshots it.
//   node tools/login-bench.js <capture.html> <preset|classic> <out.png> [color preset, default aika] [delay ms, default 1500]
//   node tools/login-bench.js off            — remove the bench
const fs = require("fs");
const target = require("./target");
const [cap, preset, out, color = "aika", delay = "1500"] = process.argv.slice(2);
const T = "https://millennium.host/v1/themes/Aika/";

function session(url) {
  const ws = new WebSocket(url);
  let id = 0;
  const wait = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); wait.get(m.id)?.(m); };
  const send = (method, params = {}) => new Promise(r => { wait.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
  return new Promise(r => { ws.onopen = () => r({ send }); });
}

(async () => {
  const s = await session(await target());
  const ev = async expr => (await s.send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
  if (cap === "off") { console.log(await ev("document.getElementById('aika-login-bench')?.remove(), 'off'")); process.exit(0); }
  const html = fs.readFileSync(cap, "utf8");
  const htmlClass = html.match(/<html[^>]*class="([^"]*)"/)?.[1] ?? "";
  const body = html.match(/<body([^>]*)>([\s\S]*)<\/body>/);
  const v = Date.now();
  const links = [`${T}options/presets/${color}.css?v=${v}`,
    ...(preset === "classic" ? [] : [`${T}options/preloader-${preset}.css?v=${v}`]),
    `${T}login.css?v=${v}`]
    .map(h => `<link rel="stylesheet" href="${h}">`).join("");
  // Steam's own login rules live in the main window's <style> tags (webpack chunks) — cloned in after load
  const doc = `<!doctype html><html class="${htmlClass}"><head><base href="https://steamloopback.host/">${links}</head><body${body[1]}>${body[2]}</body></html>`;
  await ev(`(() => {
    document.getElementById('aika-login-bench')?.remove();
    const f = document.createElement('iframe');
    f.id = 'aika-login-bench';
    f.style.cssText = 'position:fixed;left:0;top:0;width:700px;height:440px;border:0;z-index:2147483647';
    f.srcdoc = ${JSON.stringify(doc)};
    document.body.appendChild(f);
    return new Promise(r => f.onload = () => {
      const head = f.contentDocument.head;
      document.querySelectorAll('style').forEach(s => head.prepend(s.cloneNode(true)));
      // steamloopback <link>s do not load in a srcdoc frame: Steam's sheets go in as text
      for (const sh of document.styleSheets) if (/[/]css[/](library|sp)[.]css/.test(sh.href || '')) {
        const st = f.contentDocument.createElement('style');
        st.textContent = [...sh.cssRules].map(r => r.cssText).join(' ');
        head.prepend(st);
      }
      // …nor do its images: the cover grid and the avatar come in as blobs
      const blob = u => fetch(u).then(x => x.blob()).then(b => URL.createObjectURL(b));
      const d = f.contentDocument;
      Promise.all([
        blob('/images/client_login_bg_grid.jpg').then(u => d.querySelector('.LoginAnimatedBackground').style.backgroundImage = 'url(' + u + ')'),
        ...[...d.images].map(i => blob(i.getAttribute('src')).then(u => i.src = u).catch(() => {})),
      ]).then(() => r('ok'), e => r('img fail ' + e));
    });
  })()`);
  await new Promise(r => setTimeout(r, Number(delay)));
  const m = await s.send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: 700, height: 440, scale: 1 } });
  if (!m.result) { console.log(JSON.stringify(m.error)); process.exit(1); }
  fs.writeFileSync(out, Buffer.from(m.result.data, "base64"));
  console.log("ok", out);
  process.exit(0);
})();
