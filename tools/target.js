// Находит WebSocket-адрес окна Steam для CDP (Steam запущен с -dev).
// Аргумент: ws://… — как есть; иначе заголовок окна (по умолчанию «Steam»).
module.exports = async function target(arg) {
  if (arg && arg.startsWith("ws://")) return arg;
  const title = arg || "Steam";
  const list = await (await fetch("http://localhost:8080/json")).json();
  const page = list.find(p => p.title === title);
  if (!page) throw new Error(`Окно «${title}» не найдено. Есть: ${[...new Set(list.map(p => p.title))].join(", ")}`);
  return page.webSocketDebuggerUrl;
};
