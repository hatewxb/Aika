// Выполнить JS-выражение в окне Steam и вывести результат.
//   node tools/cdp.js [окно|ws://…] "<выражение>"
//   node tools/cdp.js "document.title"                 — главное окно «Steam»
//   node tools/cdp.js "Games Root Menu" "document.body.className"
const target = require("./target");
const args = process.argv.slice(2);
const expr = args.pop();
(async () => {
  const ws = new WebSocket(await target(args[0]));
  ws.onopen = () => ws.send(JSON.stringify({ id: 1, method: "Runtime.evaluate", params: { expression: expr, awaitPromise: true, returnByValue: true } }));
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id === 1) { console.log(JSON.stringify(m.result.result.value ?? m.result, null, 1)); process.exit(0); }
  };
  setTimeout(() => { console.log("timeout"); process.exit(1); }, 10000);
})();
