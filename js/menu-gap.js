// menu-gap.js — зазор между контекстным меню и его подменю (правка автора
// 2026-10-06: «между выпадающими меню слишком маленькие отступы»).
//
// Контекстные меню библиотеки (ПКМ по игре) рисуются внутри главного
// окна: корневое меню и подменю — соседние .contextMenu в одном
// контейнере, без отличающих классов. Steam ставит подменю вплотную
// к краю пункта — с нашими полями меню оно заходит на родителя на 4 px.
// Открывается оно вправо или, если не помещается, влево — CSS этого
// не знает, поэтому здесь: сравниваем подменю с меню перед ним и
// сдвигаем в сторону раскрытия так, чтобы между краями было
// --aika-submenu-gap (tokens.css).
// Сдвиг — свойство translate: top/left, которые пишет Steam, не трогаем.

(() => {
    "use strict";
    if (window.__aikaMenuGap) return;
    window.__aikaMenuGap = true;

    const MENU = ".contextMenu.ContextMenuPosition";

    function gap() {
        const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--aika-submenu-gap"));
        return Number.isNaN(v) ? 0 : v;
    }

    // Меню, после которого стоит это подменю (его родитель)
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
        // Меряем без нашего сдвига, иначе сторона «плывёт» при повторе
        menu.style.removeProperty("translate");
        const m = menu.getBoundingClientRect(), p = parent.getBoundingClientRect();
        const toRight = m.left + m.width / 2 >= p.left + p.width / 2;
        // Видимый зазор между краями коробок — ровно --aika-submenu-gap
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
    // Наш translate тоже меняет атрибут style — реагируем только на
    // смену top/left (их пишет Steam), иначе наблюдатель зациклится
    const schedule = menu => {
        const at = menu.style.top + "|" + menu.style.left;
        if (menu.__aikaGapAt === at) return;
        menu.__aikaGapAt = at;
        queue.add(menu);
        if (!frame) frame = requestAnimationFrame(flush);
    };

    // Новые меню и смена их места (Steam переставляет подменю, когда
    // наводят на другой пункт со стрелкой)
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
