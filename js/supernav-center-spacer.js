// Insert an independent flex spacer immediately before the first tab.
// Keeping the auto margin OFF Store's MenuWrapper prevents the popup anchor
// from inheriting a huge empty left-hand margin.
(() => {
  'use strict';
  if (window.__aikaCenterSpacerLoaded) return;
  window.__aikaCenterSpacerLoaded = true;

  function apply() {
    const nav = document.querySelector('.TopBar .SuperNav');
    if (!nav) return false;
    const first = nav.querySelector(':scope > .MenuWrapper');
    if (!first) return false;
    let spacer = nav.querySelector(':scope > .aika-supernav-center-spacer');
    if (!spacer) {
      spacer = document.createElement('span');
      spacer.className = 'aika-supernav-center-spacer';
      spacer.setAttribute('aria-hidden', 'true');
    }
    if (spacer.nextElementSibling !== first) first.before(spacer);
    return true;
  }

  if (!apply()) {
    const observer = new MutationObserver(() => {
      if (apply()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 15000);
  }
})();
