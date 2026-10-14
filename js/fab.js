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
//
// A second press on the open "×" closes the menu (author 2026-10-14). The
// press moves the OS focus to the main window, and that alone makes Steam
// close the menu — but the click then reached the button and Steam opened a
// new one. Measured with real clicks: main focus → pointerdown → "closed"
// from the menu ~9 ms later → click → a new menu. So a press that lands while
// the button is still marked open (or right after "closed") is swallowed
// whole — pointerdown to click never reach Steam — and the "×" turns back.

(() => {
    "use strict";
    if (window.__aikaFab) return;
    window.__aikaFab = true;
    if (!("BroadcastChannel" in window)) return;

    const BUTTON = ".BottomBar .AddGameButton";
    const OPEN = "aika-fab-open";
    const SHOW_WAIT = 900;   // ms for the menu window to report it is shown
    const JUST_CLOSED = 350; // ms: "closed" may also beat the pointerdown

    const channel = new BroadcastChannel("aika-fab");
    let waiting = 0, closedAt = 0, swallow = false;

    const button = (e) => e.target instanceof Element ? e.target.closest(BUTTON) : null;
    const setOpen = (on) => document.querySelectorAll(BUTTON).forEach((b) => b.classList.toggle(OPEN, on));
    const isOpen = () => !!document.querySelector(BUTTON + "." + OPEN);
    const stop = (e) => { e.stopImmediatePropagation(); e.preventDefault(); };

    // the rest of a swallowed press
    for (const type of ["mousedown", "pointerup", "mouseup"]) {
        document.addEventListener(type, (e) => { if (swallow && button(e)) stop(e); }, true);
    }

    document.addEventListener("pointerdown", (e) => {
        const b = button(e);
        if (!b) return;
        swallow = isOpen() || Date.now() - closedAt < JUST_CLOSED;
        if (swallow) {
            stop(e);
            clearTimeout(waiting);
            setOpen(false);
            return;
        }
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
        if (swallow) { swallow = false; stop(e); return; }
        setOpen(true);
        clearTimeout(waiting);
        waiting = setTimeout(() => setOpen(false), SHOW_WAIT);
    }, true);

    channel.onmessage = (e) => {
        const type = e.data && e.data.type;
        if (type === "shown") { clearTimeout(waiting); setOpen(true); }
        else if (type === "closed") { closedAt = Date.now(); setOpen(false); }
    };
})();
