// Liquid glass on Steam notification toasts (a message, "now playing",
// download complete…). Loaded from js/toast.js.
//
// A notification window is a separate OS window: the page can't reach the
// desktop behind it, so it can't be refracted. What refracts is the "scene" inside the card —
// the tint, the light spots and the "Aika" wordmark (components/toast.css).
//
// The scene is its own .aika-toast-scene layer, and hyalite (js/vendor/hyalite.js, MIT)
// bends it in self mode (a filter on the layer itself). Not backdrop-filter: Chromium
// paints the filtered backdrop over the original, and a translucent card
// becomes almost opaque from the two layers (verified 2026-10-06).
// Without JS the scene is drawn on the card itself, without refraction.
import "./vendor/hyalite.js";

const glass = window.Hyalite;

// Steam's CEF is Chromium, but its userAgent is custom: we don't rely on the
// engine check inside hyalite.
glass.force(true);

// The layer is appended at the end of the card: Steam's React inserts and removes its
// nodes by reference, an extra last node doesn't bother it. Paint order
// is set by z-index in CSS.
function addScene(popup) {
    if (popup.querySelector(":scope > .aika-toast-scene")) return;
    const scene = document.createElement("div");
    scene.className = "aika-toast-scene";
    scene.setAttribute("aria-hidden", "true");
    const mark = document.createElement("span");
    mark.className = "aika-toast-mark";
    mark.textContent = "Aika";
    scene.append(mark);
    popup.append(scene);
}

function scan() {
    document.querySelectorAll(".DesktopToastPopup").forEach(addScene);
}

scan();
new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });

// The card is small (283×70): a narrow bevel so the wordmark and spots
// bend near the edge while the middle stays flat.
glass.watch(document.body, ".aika-toast-scene", {
    self: true,
    bevel: 20,
    thickness: 34,
    light: -140,
    materialize: 450
});
