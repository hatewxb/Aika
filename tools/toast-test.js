// A test Steam notification toast + a check of the theme styles in it.
// Steam can show test notifications itself (NotificationStore.Test…
// in SharedJSContext) — no need to wait for a real message.
//   node tools/toast-test.js [message|ingame|online|download] [inject|-] [shot.png]
//     inject — load fresh toast.css and js/toast.js into the window
//              (until Steam restarts and picks up new Patches)
// Prints: attached styles/scripts, whether the scene layer and the hyalite filter
// on it exist, the "Aika" wordmark font and whether it has loaded.
const [kind = "message", mode = "", shotFile] = process.argv.slice(2);
const calls = {
  message: `NotificationStore.TestFriendMessage(null, "Hi! Aika notification test")`,
  ingame: `NotificationStore.TestFriendIngame("Portal 2")`,
  online: `NotificationStore.TestFriendOnline()`,
  download: `NotificationStore.TestDownloadComplete(570)`
};
const base = "https://millennium.host/v1/themes/Aika/";

const inject = `(async () => {
  const css = ["toast.css", "root-colors.css", "colors.css", "tokens.css", "base.css",
    "components/toast.css", "components/status.css", "selectors.css", "options/toast-mark-brush.css"];
  await Promise.all(css.map(f => fetch("${base}" + f, { cache: "reload" })));
  const old = document.querySelector('link[href*="themes/Aika/toast.css"]');
  const l = document.createElement("link"); l.rel = "stylesheet"; l.href = "${base}toast.css?v=" + Date.now();
  await new Promise(r => { l.onload = r; l.onerror = r; old ? old.after(l) : document.head.append(l); });
  if (old) old.remove();
  if (!window.Hyalite) await import("${base}js/toast.js?v=" + Date.now());
})()`;

const report = `(async () => {
  await new Promise(r => setTimeout(r, 900));
  await document.fonts.ready;
  const q = s => document.querySelector(s), cs = (e, p) => e ? getComputedStyle(e, p) : {};
  const pop = q(".DesktopToastPopup"), tpl = q(".DesktopToastTemplate"), scene = q(".aika-toast-scene");
  const mark = q(".aika-toast-mark") ? cs(q(".aika-toast-mark")) : cs(pop, "::after");
  return {
    links: [...document.querySelectorAll("link[rel=stylesheet], script[src]")].map(e => (e.href || e.src).split("/").slice(-2).join("/")),
    hyalite: !!window.Hyalite,
    scene: !!scene,
    sceneFilter: scene ? cs(scene).filter.slice(0, 60) : "-",
    svgFilters: document.querySelectorAll("svg filter").length,
    sceneBg: cs(scene || pop).backgroundImage?.slice(0, 80) + " | " + cs(scene || pop).backgroundColor,
    mark: mark.fontFamily + " " + mark.fontSize,
    markFontLoaded: document.fonts.check("62px UnifrakturMaguntia") + " / " + document.fonts.check("46px Shojumaru"),
    text: tpl ? tpl.innerText.replace(/\\n/g, " | ") : "-"
  };
})()`;

function evaluate(ws, id, expression) {
  return new Promise(res => {
    const h = e => { const m = JSON.parse(e.data); if (m.id === id) { ws.removeEventListener("message", h); res(m.result.result?.value ?? m.result); } };
    ws.addEventListener("message", h);
    ws.send(JSON.stringify({ id, method: "Runtime.evaluate", params: { expression, awaitPromise: true, returnByValue: true } }));
  });
}
const open = url => new Promise(r => { const ws = new WebSocket(url); ws.onopen = () => r(ws); });
const pages = async () => (await fetch("http://localhost:8080/json")).json();

(async () => {
  const before = new Set((await pages()).map(p => p.id));
  const shared = (await pages()).find(p => p.title === "SharedJSContext");
  const sws = await open(shared.webSocketDebuggerUrl);
  await evaluate(sws, 1, calls[kind] || kind);
  sws.close();
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    const page = (await pages()).find(p => p.title.includes("notificationtoasts") && !before.has(p.id));
    if (page) {
      const ws = await open(page.webSocketDebuggerUrl);
      if (mode === "inject") await evaluate(ws, 2, inject);
      // AIKA_EXTRA_CSS="…" — trial CSS on top of the theme (tune values before editing files)
      if (process.env.AIKA_EXTRA_CSS) await evaluate(ws, 5, `document.head.append(Object.assign(document.createElement("style"), { textContent: ${JSON.stringify(process.env.AIKA_EXTRA_CSS)} }))`);
      // AIKA_EVAL="…" — trial JS in the window (e.g. Hyalite.setOpts({...})), the result is printed
      if (process.env.AIKA_EVAL) console.log("eval:", JSON.stringify(await evaluate(ws, 6, process.env.AIKA_EVAL)));
      console.log(page.title, JSON.stringify(await evaluate(ws, 3, report), null, 1));
      // Unlike the main window, a notification window can be captured
      // (transparent corners come out white in the shot)
      if (shotFile) {
        const shot = await new Promise(res => {
          ws.addEventListener("message", e => { const m = JSON.parse(e.data); if (m.id === 4) res(m.result); });
          ws.send(JSON.stringify({ id: 4, method: "Page.captureScreenshot", params: { format: "png" } }));
        });
        if (shot?.data) require("fs").writeFileSync(shotFile, Buffer.from(shot.data, "base64"));
        console.log(shot?.data ? "screenshot: " + shotFile : "screenshot failed");
      }
      process.exit(0);
    }
    await new Promise(r => setTimeout(r, 150));
  }
  console.log("notification window never appeared (Family View on? notifications aren't shown in it)");
  process.exit(1);
})();
