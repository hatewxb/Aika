// extendium-bridge.js — the Extendium button in the page address capsule
// (author 2026-10-20). Imported by js/main.js.
//
// Extendium puts its toolbar into Steam's address bar in the main window;
// the theme hides that bar and draws the address inside the page instead
// (js/url-capsule.js), so the toolbar's button is shown there too. The page
// can't reach the client, but its address can: a click on the capsule's
// button sets the hash #aika-extensions for a moment (history.replaceState),
// Steam mirrors it into its hidden address bar here, and this script clicks
// Extendium's real button. The real toolbar stays invisible, placed under the
// capsule's button so Extendium opens its menu next to it
// (sections/plugins.css).
(() => {
  "use strict";
  if (window.__aikaExtendiumBridge) return;
  window.__aikaExtendiumBridge = true;

  const MARK = "#aika-extensions";
  let bar = null, fired = false;

  const check = () => {
    const url = bar?.querySelector(".URL")?.textContent || "";
    if (!url.endsWith(MARK)) { fired = false; return; }
    if (fired) return;
    fired = true;
    document.querySelector(".BrowserWrapper .extensions-bar-container .extension-button")?.click();
  };

  const observer = new MutationObserver(check);
  // The address bar mounts with the first web page and may remount later
  const find = () => {
    const next = document.querySelector(".BrowserWrapper > .URLBar");
    if (!next || next === bar) return;
    bar = next;
    observer.disconnect();
    observer.observe(bar, { childList: true, subtree: true, characterData: true });
  };
  find();
  setInterval(find, 2000);
})();
