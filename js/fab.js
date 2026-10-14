// fab.js — the floating "+" (Add a Game) as a floating action button
// (author 2026-10-14, after the motion.dev FAB example; the look is CSS —
// sections/library.css and the menu in components/menu.css).
//
// The menu is a separate window that Steam opens at the click point. On
// pointerdown the "+" rect goes to the menu window over a BroadcastChannel
// and into localStorage (screen px; js/menu-motion.js moves the window over
// the button). While the menu is open the button carries .aika-fab-open —
// the "+" turns into "×" on the accent. The menu window reports "shown" /
// "closed"; if it never shows (Steam toggled it closed) the class drops
// after SHOW_WAIT.

(() => {
    "use strict";
    if (window.__aikaFab) return;
    window.__aikaFab = true;
    if (!("BroadcastChannel" in window)) return;

    const BUTTON = ".BottomBar .AddGameButton";
    const OPEN = "aika-fab-open";
    const SHOW_WAIT = 900;   // ms for the menu window to report it is shown

    const channel = new BroadcastChannel("aika-fab");
    let waiting = 0;

    const button = (e) => e.target instanceof Element ? e.target.closest(BUTTON) : null;
    const setOpen = (on) => document.querySelectorAll(BUTTON).forEach((b) => b.classList.toggle(OPEN, on));

    document.addEventListener("pointerdown", (e) => {
        const b = button(e);
        if (!b) return;
        // the hover growth scales the rect — measure the unscaled box around its center
        const r = b.getBoundingClientRect();
        const w = b.offsetWidth, h = b.offsetHeight;
        const anchor = {
            type: "anchor",
            left: window.screenX + r.left + (r.width - w) / 2,
            top: window.screenY + r.top + (r.height - h) / 2,
            width: w,
            height: h,
            t: Date.now(),
        };
        channel.postMessage(anchor);
        // the menu window is usually created after this — it reads the stored copy
        try { localStorage.setItem("aika-fab-anchor", JSON.stringify(anchor)); } catch (err) { /* storage off */ }
    }, true);

    document.addEventListener("click", (e) => {
        if (!button(e)) return;
        setOpen(true);
        clearTimeout(waiting);
        waiting = setTimeout(() => setOpen(false), SHOW_WAIT);
    }, true);

    channel.onmessage = (e) => {
        const type = e.data && e.data.type;
        if (type === "shown") { clearTimeout(waiting); setOpen(true); }
        else if (type === "closed") setOpen(false);
    };
})();
