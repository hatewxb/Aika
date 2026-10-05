// Положение и движение окна всплывающего уведомления.
//
// Окна уведомлений ведёт SharedJSContext (window.opener этого окна): каждый
// кадр считает их место и зовёт SteamClient.Window.MoveTo этого окна.
// Появление и уход у Steam — линейный сдвиг на высоту окна за 300 мс.
// Здесь:
//   1. отступы стопки от края экрана — токены --aika-toast-inset-*;
//   2. MoveTo подменён: окно не прыгает за линейными шагами Steam, а
//      догоняет цель по пружине без перелёта — так же плавно встают
//      соседние уведомления, когда приходит новое или уходит старое;
//   3. карточка проявляется по кривой --aika-ease, а когда Steam начинает
//      убирать уведомление — окно замирает, карточка уплывает к краю по
//      --aika-ease-leave.
//
// Всё считается в кадрах opener'а: окно уведомления Chromium считает
// скрытым (document.visibilityState = "hidden", проверено 2026-10-06) —
// в нём не идут ни requestAnimationFrame, ни CSS-анимации, таймеры
// замедлены. Карточку двигают CSS-переменные на <html>, которые здесь
// выставляются каждый кадр (components/toast.css, .aika-toast-motion).
// Если устройство Steam поменяется, всё молча откатывается к его поведению.

const steam = window.opener;
const win = window.SteamClient?.Window;
const root = document.documentElement;

// Состояния уведомления в SharedJSContext (enum в коде Steam, 2026-10-06):
// 1 — появление, 2 — показ, 3 — уход, 4 — закончено (окно спрятано)
const LEAVING = 3, FINISHED = 4;

/* --------------------------------------------------------------------------
   1. Отступы от края экрана (над панелью задач и сбоку)
   NotificationPosition окна Steam: угол экрана + отступы, по умолчанию 0.
   Цикл Steam замечает новые отступы в следующем кадре. Угол не трогаем
   (-1). Значение живёт до перезапуска Steam — ставим при каждом уведомлении.
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
        // уведомления просто встанут по-старому
    }
}

/* --------------------------------------------------------------------------
   Запись об этом уведомлении в SharedJSContext.
   Стопка уведомлений Steam — React-компонент; его первый хук useState
   держит массив записей { m_popup, m_eState, … }, m_popup — это окно.
   Компонент — предок портала, в котором нарисована карточка; свежий массив
   бывает и в текущем узле, и в его копии (alternate) — смотрим оба.
   Запись — один и тот же объект, Steam меняет его поля на месте.
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
   Кривые и значения — из токенов (tokens.css)
   -------------------------------------------------------------------------- */

// cubic-bezier(x1, y1, x2, y2) → функция прогресса 0…1 (как в CSS)
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
    if (Number.isNaN(num("--aika-dur-enter"))) return null;    // CSS темы ещё не загружен
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
   3. Карточка: появление и уход.
   in — прогресс появления (0 → 1), out — ухода (0 → 1), обе по кривым.
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
   2. Пружина вместо линейных шагов Steam.
   Критическое затухание (без перелёта): ускорение = ω²·(цель − x) − 2ω·v.
   ω = 24 — окно встаёт примерно через 200 мс после того, как цель
   остановилась. Первый вызов — как есть: до него положение окна неизвестно.
   -------------------------------------------------------------------------- */

const OMEGA = 24;
const ENTER_WAIT_MS = 200;   // не дольше — если Steam окно так и не сдвинул
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
   Запуск: один цикл кадров opener'а на всё
   -------------------------------------------------------------------------- */

if (steam?.requestAnimationFrame && win?.MoveTo) {
    const clock = () => steam.performance.now();
    let tk = null, insetsSet = false;
    let enterStart = null, leaveStart = null, last = clock(), hadCard = false, cardSeen = null;
    // Steam начинает поднимать окно не сразу (~100 мс после появления
    // карточки) — проявление карточки стартует вместе с первым сдвигом окна
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
        // Уходит: окно стоит на месте, карточка уплывает сама
        if (leaveStart !== null) return;
        windowMoved = true;
        spring.target = { x, y };
    };

    const frame = () => {
        try {
            // Окно закрыли (например, кликом) — цикл живёт в SharedJSContext,
            // его надо остановить самим. Карточки может ещё не быть: скрипт
            // приходит раньше, чем Steam её дорисует.
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
                if (me && me.m_eState >= FINISHED) return;     // окно спрятано — цикл больше не нужен
            }
            steam.requestAnimationFrame(frame);
        } catch (e) {
            // окно закрыто или Steam изменился — останавливаемся и
            // возвращаем карточку как есть, чтобы она не осталась прозрачной
            try { root.classList.remove("aika-toast-motion"); } catch (e2) { /* окна уже нет */ }
        }
    };
    steam.requestAnimationFrame(frame);
}
