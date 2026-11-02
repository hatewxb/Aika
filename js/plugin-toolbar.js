// Reserve room for Auto-Claim's real toolbar button, which is inserted into
// Steam's URLBar. No calls to the plugin's scanner or claim actions.
(() => {
  if (window.__aikaPluginToolbar) return;
  const selector = ".BrowserWrapper > .URLBar > .autoclaim-toolbar-container";
  let button = document.querySelector(selector);
  const sync = () => document.documentElement.classList.toggle("aika-autoclaim", !!button?.isConnected);
  sync();
  const observer = new MutationObserver(records => {
    if (button && !button.isConnected) {button = null; sync();}
    for (const record of records) for (const node of record.addedNodes) {
      if (node.nodeType !== 1) continue;
      const next = node.matches(selector) ? node : node.querySelector(selector);
      if (next) {button = next; sync(); return;}
    }
  });
  observer.observe(document.documentElement, {subtree: true, childList: true});
  const destroy = () => {observer.disconnect(); document.documentElement.classList.remove("aika-autoclaim");delete window.__aikaPluginToolbar;};
  window.addEventListener("pagehide", destroy, {once: true});
  window.__aikaPluginToolbar = {destroy};
})();
