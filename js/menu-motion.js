// menu-motion.js — lets the Card Nav menu animations play on every opening
// (skin.json: Patch by .ContextMenuPopup, the menu windows).
//
// Steam keeps a menu window between openings and only hides it. While the
// window is hidden Chromium holds its animation clock; the menu box gets
// .ready ~10 ms before the window shows, so its animations started on the
// frozen clock and, when the window appeared, the clock jumped ahead — the
// unfold and the item rise were over in the first frame (measured
// 2026-10-14: 0 ms clipped, 4 ms done). Only the very first opening played.
//
// Here: html.aika-menu-open while the window is visible. components/menu.css
// holds the menu in its starting state (folded, items hidden) until the class
// comes, so the animations start on the live clock. Without this script the
// menus keep the old behaviour (they simply show).

(() => {
    "use strict";
    if (window.__aikaMenuMotion) return;
    window.__aikaMenuMotion = true;

    const html = document.documentElement;
    html.classList.add("aika-menu-js");

    const sync = () => html.classList.toggle("aika-menu-open", document.visibilityState === "visible");
    document.addEventListener("visibilitychange", sync);
    sync();
})();
