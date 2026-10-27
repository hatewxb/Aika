// cover-hold.js — the pressed state of library covers (the "Cover press"
// setting). Imported by js/main.js.
//
// It used to be CSS :active, and it "worked every other time": covers are
// draggable, and after a drag that ends outside the window Chromium gives the
// next press no :active, though pointerdown arrives every time (reproduced
// 2026-10-27 with real mouse clicks: drag out → press → no :active → press →
// :active). So the press is ours: data-aika-held on the cover from pointerdown
// until pointerup / pointercancel / dragstart / the window losing focus (an
// attribute — React rewrites className, not unknown attributes). The press
// point goes to --aika-hold-x / -y (%) for the effects; they draw in
// .aika-hold-fx, a layer appended inside the cover (overflow: hidden there).

(() => {
  "use strict";
  if (window.__aikaCoverHold) return;
  window.__aikaCoverHold = true;

  const COVERS = ".Draggable .LibraryItemBox";
  let held = null;

  const release = () => {
    if (!held) return;
    held.removeAttribute("data-aika-held");
    held = null;
  };

  document.addEventListener("pointerdown", (e) => {
    release();
    if (e.button !== 0 || !(e.target instanceof Element)) return;
    const cover = e.target.closest(COVERS);
    if (!cover) return;
    const r = cover.getBoundingClientRect();
    cover.style.setProperty("--aika-hold-x", (((e.clientX - r.left) / r.width) * 100).toFixed(1) + "%");
    cover.style.setProperty("--aika-hold-y", (((e.clientY - r.top) / r.height) * 100).toFixed(1) + "%");
    if (!cover.querySelector(":scope > .aika-hold-fx")) {
      const fx = document.createElement("span");
      fx.className = "aika-hold-fx";
      cover.append(fx);
    }
    cover.setAttribute("data-aika-held", "");
    held = cover;
  }, { capture: true, passive: true });

  for (const type of ["pointerup", "pointercancel", "dragstart"]) {
    document.addEventListener(type, release, { capture: true, passive: true });
  }
  window.addEventListener("blur", release);
})();
