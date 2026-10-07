// Position and motion of the notification toast window.
//
// Notification windows are driven by SharedJSContext (this window's window.opener): every
// frame it computes their place and calls SteamClient.Window.MoveTo for this window.
// Steam's enter and leave is a linear shift by the window height over 300 ms.
// Here:
//   1. the stack offsets from the screen edge — tokens --aika-toast-inset-*;
//   2. MoveTo is replaced: the window doesn't jump along Steam's linear steps but
//      follows the target on a spring without overshoot — neighboring
//      notifications settle just as smoothly when a new one arrives or an old one leaves;
//   3. the card fades in along the --aika-ease curve, and when Steam starts
//      removing the notification the window freezes and the card floats to the edge along
//      --aika-ease-leave.
//
// Everything is computed in the opener's frames: Chromium considers the notification
// window hidden (document.visibilityState = "hidden", verified 2026-10-06) —
// neither requestAnimationFrame nor CSS animations run in it, timers
// are throttled. The card is moved by CSS variables on <html> that are
// set here every frame (components/toast.css, .aika-toast-motion).
// If Steam's internals change, everything silently falls back to its behavior.

const steam = window.opener;
const win = window.SteamClient?.Window;
const root = document.documentElement;

// Notification states in SharedJSContext (an enum in Steam's code, 2026-10-06):
// 1 — entering, 2 — shown, 3 — leaving, 4 — finished (window hidden)
const LEAVING = 3, FINISHED = 4;

/* --------------------------------------------------------------------------
   1. Offsets from the screen edge (above the taskbar and on the side)
   NotificationPosition of the Steam window: a screen corner + offsets, 0 by default.
   Steam's loop picks up new offsets in the next frame. The corner stays untouched
   (-1). The value lives until Steam restarts — we set it on every notification.
   -------------------------------------------------------------------------- */

function setInsets(css) {
    try {
        const x = parseInt(css.getPropertyValue("--aika-toast-inset-x"), 10);
        const y = parseInt(css.getPropertyValue("--aika-toast-inset-y"), 10);
        const main = steam?.SteamUIStore?.WindowStore?.SteamUIWindows?.[0];
        if (!main || Number.isNaN(x) || Number.isNaN(y)) return;
        const pos = main.NotificationPosition;
        if (pos.horizontalInset !== x || pos.verticalInset !== y) main.SetNotificationPosition(-1, x, y);
    } catch (e) {
        // notifications will just settle the old way
    }
}

/* --------------------------------------------------------------------------
   The record for this notification in SharedJSContext.
   Steam's notification stack is a React component; its first useState hook
   holds an array of records { m_popup, m_eState, … }, m_popup is the window.
   The component is an ancestor of the portal the card is rendered in; a fresh array
   can be in the current node or in its copy (alternate) — we check both.
   The record is the same object, Steam changes its fields in place.
   -------------------------------------------------------------------------- */

let entry = null;

function findEntry() {
    if (entry) return entry;
    const card = document.querySelector(".DesktopToastPopup");
    const key = card && Object.keys(card).find(k => k.startsWith("__reactFiber$"));
    let fiber = key && card[key];
    for (let depth = 0; fiber && depth < 12; depth++, fiber = fiber.return) {
        for (const node of [fiber, fiber.alternate]) {
            const list = node?.memoizedState?.memoizedState;
            if (!Array.isArray(list)) continue;
            const mine = list.find(t => t && t.m_popup === window);
            if (mine) return (entry = mine);
        }
    }
    return null;
}

/* --------------------------------------------------------------------------
   Curves and values — from the tokens (tokens.css)
   -------------------------------------------------------------------------- */

// cubic-bezier(x1, y1, x2, y2) → a 0…1 progress function (as in CSS)
function bezier(text, fallback) {
    const m = /cubic-bezier\(([^)]+)\)/.exec(text);
    const p = m ? m[1].split(",").map(Number) : fallback;
    const [x1, y1, x2, y2] = p;
    const at = (a, b, t) => ((1 - 3 * b + 3 * a) * t + (3 * b - 6 * a)) * t * t + 3 * a * t;
    const slope = (a, b, t) => 3 * (1 - 3 * b + 3 * a) * t * t + 2 * (3 * b - 6 * a) * t + 3 * a;
    return x => {
        if (x <= 0) return 0;
        if (x >= 1) return 1;
        let t = x;
        for (let i = 0; i < 8; i++) {
            const d = slope(x1, x2, t);
            if (Math.abs(d) < 1e-6) break;
            t -= (at(x1, x2, t) - x) / d;
        }
        return at(y1, y2, Math.min(1, Math.max(0, t)));
    };
}

function readTokens() {
    const css = getComputedStyle(root);
    const num = name => parseFloat(css.getPropertyValue(name));
    if (Number.isNaN(num("--aika-dur-enter"))) return null;    // the theme CSS isn't loaded yet
    const motion = num("--aika-motion");
    return {
        css,
        motion: Number.isNaN(motion) ? 1 : motion,
        enterMs: num("--aika-dur-enter"),
        leaveMs: num("--aika-toast-dur-leave"),
        easeIn: bezier(css.getPropertyValue("--aika-ease"), [0.16, 1, 0.3, 1]),
        easeOut: bezier(css.getPropertyValue("--aika-ease-leave"), [0.7, 0, 0.84, 0]),
        enterShift: num("--aika-toast-enter-shift"),
        enterScale: num("--aika-toast-enter-scale"),
        enterBlur: num("--aika-toast-enter-blur"),
        leaveShift: num("--aika-toast-leave-shift"),
        leaveScale: num("--aika-toast-leave-scale"),
        leaveBlur: num("--aika-toast-leave-blur")
    };
}

/* --------------------------------------------------------------------------
   3. The card: enter and leave.
   in — enter progress (0 → 1), out — leave progress (0 → 1), both along curves.
   -------------------------------------------------------------------------- */

function paintCard(tk, inP, outP) {
    const m = tk.motion;
    const alpha = inP * (1 - outP);
    const dy = (1 - inP) * tk.enterShift * m;
    const dx = outP * tk.leaveShift * m;
    const scale = 1 - ((1 - inP) * (1 - tk.enterScale) + outP * (1 - tk.leaveScale)) * m;
    const blur = ((1 - inP) * tk.enterBlur + outP * tk.leaveBlur) * m;
    root.style.setProperty("--aika-toast-alpha", alpha.toFixed(3));
    root.style.setProperty("--aika-toast-dx", dx.toFixed(2) + "px");
    root.style.setProperty("--aika-toast-dy", dy.toFixed(2) + "px");
    root.style.setProperty("--aika-toast-scale", scale.toFixed(4));
    root.style.setProperty("--aika-toast-blur", blur.toFixed(2) + "px");
}

/* --------------------------------------------------------------------------
   2. A spring instead of Steam's linear steps.
   Critical damping (no overshoot): acceleration = ω²·(target − x) − 2ω·v.
   ω = 24 — the window settles about 200 ms after the target
   stops. The first call is taken as is: the window position is unknown before it.
   -------------------------------------------------------------------------- */

const OMEGA = 24;
const ENTER_WAIT_MS = 200;   // no longer — in case Steam never moved the window
const spring = { pos: null, vel: { x: 0, y: 0 }, target: null, shown: null, dpi: 1 };
let moveTo = null;

function stepSpring(dt) {
    if (!spring.target || !moveTo) return;
    for (const axis of ["x", "y"]) {
        const diff = spring.target[axis] - spring.pos[axis];
        spring.vel[axis] += (OMEGA * OMEGA * diff - 2 * OMEGA * spring.vel[axis]) * dt;
        spring.pos[axis] += spring.vel[axis] * dt;
        if (Math.abs(diff) < 0.5 && Math.abs(spring.vel[axis]) < 10) {
            spring.pos[axis] = spring.target[axis];
            spring.vel[axis] = 0;
        }
    }
    const x = Math.round(spring.pos.x), y = Math.round(spring.pos.y);
    if (x !== spring.shown.x || y !== spring.shown.y) {
        spring.shown = { x, y };
        moveTo(x, y, spring.dpi);
    }
}

/* --------------------------------------------------------------------------
   Start: one loop over the opener's frames for everything
   -------------------------------------------------------------------------- */

if (steam?.requestAnimationFrame && win?.MoveTo) {
    const clock = () => steam.performance.now();
    let tk = null, insetsSet = false;
    let enterStart = null, leaveStart = null, last = clock(), hadCard = false, cardSeen = null;
    // Steam doesn't start raising the window right away (~100 ms after the card
    // appears) — the card fade-in starts together with the first window shift
    let windowMoved = false;

    root.classList.add("aika-toast-motion");
    root.style.setProperty("--aika-toast-alpha", "0");

    moveTo = win.MoveTo.bind(win);
    win.MoveTo = (x, y, d) => {
        spring.dpi = d;
        if (!spring.pos || !tk || tk.motion === 0) {
            spring.pos = { x, y };
            spring.shown = { x, y };
            spring.target = { x, y };
            return moveTo(x, y, d);
        }
        // Leaving: the window stays put, the card floats away on its own
        if (leaveStart !== null) return;
        windowMoved = true;
        spring.target = { x, y };
    };

    const frame = () => {
        try {
            // The window was closed (e.g. by a click) — the loop lives in SharedJSContext,
            // we have to stop it ourselves. The card may not exist yet: the script
            // arrives before Steam finishes drawing it.
            const card = document.querySelector(".DesktopToastPopup");
            if (window.closed || (hadCard && !card)) return;
            hadCard = hadCard || !!card;
            const now = clock();
            const dt = Math.min(0.032, (now - last) / 1000);
            last = now;
            tk = tk || readTokens();
            if (tk && !insetsSet) {
                setInsets(tk.css);
                insetsSet = true;
            }
            if (tk && card) {
                if (cardSeen === null) cardSeen = now;
                if (enterStart === null && (windowMoved || now - cardSeen > ENTER_WAIT_MS)) enterStart = now;
                const me = findEntry();
                if (me && me.m_eState >= LEAVING && leaveStart === null) leaveStart = now;
                const inP = enterStart === null ? 0 : tk.easeIn(Math.min(1, (now - enterStart) / tk.enterMs));
                const outP = leaveStart === null ? 0 : tk.easeOut(Math.min(1, (now - leaveStart) / tk.leaveMs));
                paintCard(tk, inP, outP);
                stepSpring(dt);
                if (me && me.m_eState >= FINISHED) return;     // window hidden — the loop is no longer needed
            }
            steam.requestAnimationFrame(frame);
        } catch (e) {
            // the window was closed or Steam changed — stop and
            // return the card as is so it isn't left transparent
            try { root.classList.remove("aika-toast-motion"); } catch (e2) { /* the window is gone */ }
        }
    };
    steam.requestAnimationFrame(frame);
}
