// Which CSS rules set properties on an element — strongest to weakest.
// Used to find out which Steam specificity has to be beaten.
//   node tools/rules.js [window|ws://…] "<selector>" "background,color"
const target = require("./target");
const args = process.argv.slice(2);
const props = args.pop(), sel = args.pop();
const want = props.split(",");
(async () => {
  const ws = new WebSocket(await target(args[0]));
  let id = 0; const pending = {};
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pending[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending[m.id]) pending[m.id](m.result || m.error); };
  ws.onopen = async () => {
    await send("DOM.enable"); await send("CSS.enable");
    const doc = await send("DOM.getDocument", { depth: 0 });
    const q = await send("DOM.querySelector", { nodeId: doc.root.nodeId, selector: sel });
    if (!q.nodeId) { console.log("element not found:", sel); process.exit(1); }
    const res = await send("CSS.getMatchedStylesForNode", { nodeId: q.nodeId });
    for (const m of (res.matchedCSSRules || []).reverse()) {
      const hit = m.rule.style.cssProperties.filter(p => want.some(w => p.name === w || p.name.startsWith(w + "-")) && p.value);
      if (hit.length) console.log(m.rule.selectorList.text.slice(0, 160), "|", m.rule.origin, "\n   ", hit.map(p => p.name + ": " + p.value.slice(0, 60)).join("; "));
    }
    process.exit(0);
  };
  setTimeout(() => { console.log("timeout"); process.exit(1); }, 10000);
})();
