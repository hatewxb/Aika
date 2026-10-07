// menu-gap.js — a gap between a context menu and its submenu (author's fix
// 2026-10-06: "the gaps between dropdown menus are too small").
//
// Library context menus (right-click on a game) are drawn inside the main
// window: the root menu and the submenu are sibling .contextMenu elements in one
// container, with no distinguishing classes. Steam places the submenu flush
// against the item edge — with our menu padding it overlaps the parent by 4 px.
// It opens to the right or, if it doesn't fit, to the left — CSS can't
// know that, so here: we compare the submenu with the menu before it and
// shift it toward the opening side so that the edges are
// --aika-submenu-gap (tokens.css).
// The shift uses the translate property: the top/left that Steam writes stay untouched.

(() => {
    "use strict";
    if (window.__aikaMenuGap) return;
    window.__aikaMenuGap = true;

    const MENU = ".contextMenu.ContextMenuPosition";

    function gap() {
        const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--aika-submenu-gap"));
        return Number.isNaN(v) ? 0 : v;
    }

    // The menu this submenu follows (its parent)
    function parentMenu(menu) {
        for (let e = menu.previousElementSibling; e; e = e.previousElementSibling) {
            if (e.matches(MENU) && e.offsetWidth) return e;
        }
        return null;
    }

    function place(menu) {
        const parent = parentMenu(menu);
        if (!parent) {
            menu.style.removeProperty("translate");
            return;
        }
        // Measure without our shift, otherwise the side "drifts" on repeat
        menu.style.removeProperty("translate");
        const m = menu.getBoundingClientRect(), p = parent.getBoundingClientRect();
        const toRight = m.left + m.width / 2 >= p.left + p.width / 2;
        // The visible gap between the box edges is exactly --aika-submenu-gap
        const shift = toRight ? gap() - (m.left - p.right) : (p.left - m.right) - gap();
        menu.style.translate = `${Math.round(shift)}px 0`;
    }

    let frame = 0;
    const queue = new Set();
    const flush = () => {
        frame = 0;
        queue.forEach(place);
        queue.clear();
    };
    // Our translate also changes the style attribute — react only to
    // top/left changes (Steam writes them), otherwise the observer loops
    const schedule = menu => {
        const at = menu.style.top + "|" + menu.style.left;
        if (menu.__aikaGapAt === at) return;
        menu.__aikaGapAt = at;
        queue.add(menu);
        if (!frame) frame = requestAnimationFrame(flush);
    };

    // New menus and their moves (Steam repositions the submenu when
    // another item with an arrow is hovered)
    new MutationObserver(records => {
        for (const r of records) {
            if (r.type === "attributes") {
                if (r.target.matches?.(MENU)) schedule(r.target);
                continue;
            }
            r.addedNodes.forEach(n => {
                if (n.nodeType !== 1) return;
                if (n.matches(MENU)) schedule(n);
                n.querySelectorAll?.(MENU).forEach(schedule);
            });
        }
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["style"] });
})();
