// Ждёт появления окна Steam (по части заголовка) и сразу снимает его:
// классы <html>/<body>, подключены ли стили темы, дерево элементов
// с цветами. Нужен для короткоживущих окон (всплывающие уведомления).
//   node tools/watch-window.js "<часть заголовка>" <файл-результата> [секунд, по умолчанию 600]
const fs = require("fs");
const [part, outFile, secs = "600"] = process.argv.slice(2);
const deadline = Date.now() + Number(secs) * 1000;

const snapshot = `(() => {
  const d = (e, l = 0) => l > 8 ? "" : "  ".repeat(l) + e.tagName.toLowerCase()
    + (typeof e.className === "string" && e.className ? "." + e.className.trim().split(/\\s+/).join(".") : "")
    + " " + e.offsetWidth + "x" + e.offsetHeight
    + " bg=" + getComputedStyle(e).backgroundColor + " bi=" + getComputedStyle(e).backgroundImage.slice(0, 60)
    + " c=" + getComputedStyle(e).color + " r=" + getComputedStyle(e).borderRadius
    + " «" + (e.childElementCount ? "" : (e.textContent || "").trim().slice(0, 40)) + "»\\n"
    + [...e.children].map(c => d(c, l + 1)).join("");
  return "html: " + document.documentElement.className + "\\nbody: " + document.body.className
    + "\\nlinks: " + [...document.querySelectorAll("link[rel=stylesheet]")].map(l => l.href.split("/").pop()).join(", ")
    + "\\n\\n" + d(document.body);
})()`;

(async function loop() {
  while (Date.now() < deadline) {
    try {
      const list = await (await fetch("http://localhost:8080/json")).json();
      const page = list.find(p => p.title.includes(part));
      if (page) {
        // окно отрисовывается не мгновенно — даём ему кадр-другой
        await new Promise(r => setTimeout(r, 400));
        const ws = new WebSocket(page.webSocketDebuggerUrl);
        ws.onopen = () => ws.send(JSON.stringify({ id: 1, method: "Runtime.evaluate", params: { expression: snapshot, returnByValue: true } }));
        ws.onmessage = e => {
          const m = JSON.parse(e.data);
          if (m.id === 1) {
            fs.writeFileSync(outFile, page.title + "\n" + (m.result.result.value || JSON.stringify(m.result)));
            console.log("снято: " + page.title);
            process.exit(0);
          }
        };
        return;
      }
    } catch (e) { /* Steam мог быть занят — пробуем дальше */ }
    await new Promise(r => setTimeout(r, 250));
  }
  console.log("окно не появилось");
  process.exit(1);
})();
