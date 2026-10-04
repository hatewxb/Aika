// spotlight.js — свечение за курсором на крупных поверхностях клиента
// (DESIGN.md §1 «Spotlight за курсором», §4 Cards). Подключён Patch'ем
// к главному окну (skin.json, «^Steam$»).
//
// Один пассивный обработчик pointermove на документе, не чаще кадра:
// находит ближайшую поверхность из SURFACES и пишет координаты курсора
// в её --aika-spot-x / --aika-spot-y. Само свечение — CSS
// (components/card.css, «Spotlight на поверхностях Steam»); без скрипта
// оно светит из верхнего центра (значения токенов по умолчанию).
//
// Только крупные блоки, которых на экране единицы (не списки и не обложки
// в сетке — DESIGN.md §7, производительность).

(() => {
  "use strict";
  if (window.__aikaSpotlight) return;
  window.__aikaSpotlight = true;

  const SURFACES = [
    ".AppDetailsSection",                               // панели страницы игры
    ".PartnerEventRowCapsule_Container.HoversEnabled",   // карточки «Что нового»
    ".CSSGrid.Grid .Collection",                         // плитки коллекций
  ].join(", ");

  let frame = 0;
  let lastEvent = null;
  let lastTarget = null;

  const update = () => {
    frame = 0;
    const e = lastEvent;
    const t = e && e.target instanceof Element ? e.target.closest(SURFACES) : null;
    if (!t) { lastTarget = null; return; }
    const r = t.getBoundingClientRect();
    t.style.setProperty("--aika-spot-x", Math.round(e.clientX - r.left) + "px");
    t.style.setProperty("--aika-spot-y", Math.round(e.clientY - r.top) + "px");
    lastTarget = t;
  };

  document.addEventListener("pointermove", (e) => {
    lastEvent = e;
    if (!frame) frame = requestAnimationFrame(update);
  }, { passive: true, capture: true });
})();
