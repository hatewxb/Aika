// Finds the WebSocket address of a Steam window for CDP (Steam runs with -dev).
// Argument: ws://… — used as is; otherwise the window title (default "Steam").
module.exports = async function target(arg) {
  if (arg && arg.startsWith("ws://")) return arg;
  const title = arg || "Steam";
  const list = await (await fetch("http://localhost:8080/json")).json();
  // exact title match, otherwise a substring (web pages: "… :: Friends Activity")
  const page = list.find(p => p.title === title) || list.find(p => p.type === "page" && p.title.includes(title));
  if (!page) throw new Error(`Window "${title}" not found. Available: ${[...new Set(list.map(p => p.title))].join(", ")}`);
  return page.webSocketDebuggerUrl;
};
