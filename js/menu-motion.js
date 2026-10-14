// menu-motion.js — menu windows (skin.json: Patch by .ContextMenuPopup).
//
// 1. Lets the Card Nav menu animations play on every opening.
//    Steam keeps a menu window between openings and only hides it. While the
//    window is hidden Chromium holds its animation clock; the menu box gets
//    .ready ~10 ms before the window shows, so its animations started on the
//    frozen clock and, when the window appeared, the clock jumped ahead — the
//    unfold and the item rise were over in the first frame (measured
//    2026-10-14: 0 ms clipped, 4 ms done). Only the very first opening played.
//    Here: html.aika-menu-open while the window is visible. components/menu.css
//    holds the menu in its starting state (folded, items hidden) until the
//    class comes, so the animations start on the live clock. Without this
//    script the menus keep the old behaviour (they simply show).
//
// 2. The Add a Game menu as a floating action button menu (author 2026-10-14).
//    Steam opens the window with its bottom-left corner at the click point, so
//    the icon column landed wherever the "+" was clicked. js/fab.js in the main
//    window sends the "+" rect (screen px) on pointerdown — over a
//    BroadcastChannel and into localStorage: Steam usually creates this menu
//    window on the click, after the message went out (the script comes ~24 ms
//    into the new window), so the stored copy is what it finds. When this window shows the Add a Game menu, it moves itself
//    (SteamClient.Window.MoveTo, CSS px with the DPI flag) so the icon column
//    stands centered over the "+", --aika-fab-gap above it, and only then lets
//    the items pop out. On hide it tells the main window, which turns the "×"
//    back into "+".

(() => {
    "use strict";
    if (window.__aikaMenuMotion) return;
    window.__aikaMenuMotion = true;

    const html = document.documentElement;
    html.classList.add("aika-menu-js");

    const FAB_MENU = ".contextMenu.ready > .AddGameMenu";
    const ANCHOR_FRESH = 3000;   // ms: an anchor older than this is from another opening

    const channel = "BroadcastChannel" in window ? new BroadcastChannel("aika-fab") : null;
    let anchor = null, fabShown = false, placing = false;
    if (channel) channel.onmessage = (e) => { if (e.data && e.data.type === "anchor") anchor = e.data; };

    const freshAnchor = () => {
        let a = anchor;
        try {
            const stored = JSON.parse(localStorage.getItem("aika-fab-anchor") || "null");
            if (stored && (!a || stored.t > a.t)) a = stored;
        } catch (e) { /* storage off — the message is all there is */ }
        return a && Date.now() - a.t < ANCHOR_FRESH ? a : null;
    };

    const open = () => html.classList.add("aika-menu-open");

    // Stand the icon column over the "+": the circle is the item's left square.
    // Steam places the window itself right after it shows — after our first
    // move (measured: our move at 117 ms, the window back at the click point) —
    // so keep moving until the position holds, then let the items out.
    const SETTLE_STEP = 32, SETTLE_TRIES = 8, SETTLE_SLACK = 8;   // ms, times, px
    function place(a, done) {
        const item = document.querySelector(FAB_MENU + " > .contextMenuItem:last-child");
        const move = window.SteamClient && SteamClient.Window && SteamClient.Window.MoveTo;
        if (!item || !move) return false;
        const r = item.getBoundingClientRect();
        const gap = parseFloat(getComputedStyle(html).getPropertyValue("--aika-fab-gap")) || 0;
        const left = a.left + a.width / 2 - (r.left + r.height / 2);
        const top = a.top - gap - r.bottom;
        const x = Math.round(left), y = Math.round(top);
        let tries = 0;
        const step = () => {
            SteamClient.Window.MoveTo(x, y, true);
            setTimeout(() => {
                const held = Math.abs(window.screenX - x) <= SETTLE_SLACK && Math.abs(window.screenY - y) <= SETTLE_SLACK;
                if (held || ++tries >= SETTLE_TRIES) done(); else step();
            }, SETTLE_STEP);
        };
        step();
        return true;
    }

    // A window made for one opening is visible from the start and the script
    // comes ~24 ms in — before Steam has drawn the menu into it. Wait for the
    // menu (it stays hidden by CSS meanwhile), but not forever.
    const MENU_WAIT = 400;   // ms
    let waiter = null, waitTimer = 0;
    function waitForMenu() {
        if (waiter) return;
        waiter = new MutationObserver(() => { if (document.querySelector(".contextMenu.ready")) stopWaiting(true); });
        waiter.observe(document.body || html, { subtree: true, childList: true, attributes: true, attributeFilter: ["class"] });
        waitTimer = setTimeout(() => stopWaiting(true), MENU_WAIT);
    }
    function stopWaiting(resync) {
        if (waiter) waiter.disconnect();
        waiter = null;
        clearTimeout(waitTimer);
        if (resync) sync(true);
    }

    function sync(waited) {
        if (document.visibilityState !== "visible") {
            stopWaiting(false);
            html.classList.remove("aika-menu-open");
            if (fabShown && channel) channel.postMessage({ type: "closed" });
            fabShown = false;
            return;
        }
        if (!waited && !document.querySelector(".contextMenu.ready")) {
            waitForMenu();
            return;
        }
        if (document.querySelector(FAB_MENU)) {
            if (!fabShown && channel) channel.postMessage({ type: "shown" });
            fabShown = true;
            const a = freshAnchor();
            if (!html.classList.contains("aika-menu-open") && !placing && a) {
                placing = true;
                if (place(a, () => { placing = false; requestAnimationFrame(open); })) return;
                placing = false;
            }
            if (placing) return;
        }
        open();
    }

    document.addEventListener("visibilitychange", () => sync(false));
    // a menu window made for one opening may be closed without being hidden first
    window.addEventListener("pagehide", () => { if (fabShown && channel) channel.postMessage({ type: "closed" }); });
    sync(false);
})();
