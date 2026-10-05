// Жидкое стекло на всплывающих уведомлениях Steam (сообщение, «играет в»,
// загрузка завершена…). Подключается Patch'ем по .DesktopToastContainer.
//
// Окно уведомления — отдельное окно ОС: рабочий стол за ним странице
// недоступен, преломлять его нельзя. Преломляется «сцена» внутри карточки —
// тонировка, пятна света и надпись «Aika» (components/toast.css).
//
// Сцена — свой слой .aika-toast-scene, и hyalite (js/vendor/hyalite.js, MIT)
// гнёт его в режиме self (filter на самом слое). Не backdrop-filter: Chromium
// рисует отфильтрованный фон поверх исходного, и полупрозрачная карточка
// от двух слоёв становится почти непрозрачной (проверено 2026-10-06).
// Без JS сцена рисуется на самой карточке, без преломления.
import "./vendor/hyalite.js";

const glass = window.Hyalite;

// CEF Steam — Chromium, но userAgent у него свой: не полагаемся на проверку
// движка внутри hyalite.
glass.force(true);

// Слой добавляется в конец карточки: React Steam вставляет и убирает свои
// узлы по ссылкам на них, лишний последний узел ему не мешает. Порядок
// рисования задаёт z-index в CSS.
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

// Отступы стопки уведомлений от края экрана (над панелью задач и сбоку).
// Окна уведомлений ставит SharedJSContext (window.opener этого окна):
// рабочая область экрана + NotificationPosition окна Steam, у которого
// отступы по умолчанию 0. Задаём их из токенов --aika-toast-inset-*
// (tokens.css). Цикл анимации Steam замечает новые отступы в следующем
// кадре и переставляет окна; позицию (угол экрана) не трогаем (-1).
// Значение живёт до перезапуска Steam — ставим при каждом уведомлении.
function setInsets() {
    try {
        const css = getComputedStyle(document.documentElement);
        const x = parseInt(css.getPropertyValue("--aika-toast-inset-x"), 10);
        const y = parseInt(css.getPropertyValue("--aika-toast-inset-y"), 10);
        const win = window.opener?.SteamUIStore?.WindowStore?.SteamUIWindows?.[0];
        if (!win) return true;                              // не наш Steam — не повторяем
        if (Number.isNaN(x) || Number.isNaN(y)) return false;  // CSS темы ещё не загружен
        const pos = win.NotificationPosition;
        if (pos.horizontalInset !== x || pos.verticalInset !== y) win.SetNotificationPosition(-1, x, y);
    } catch (e) {
        // Steam поменял устройство окон — уведомления просто встанут по-старому
    }
    return true;
}

// Токены приходят с CSS темы, а он может загрузиться позже скрипта —
// повторяем по кадрам, пока не появятся (не дольше ~2 с)
(function tryInsets(left) {
    if (!setInsets() && left > 0) requestAnimationFrame(() => tryInsets(left - 1));
})(120);

// Карточка маленькая (283×70): узкий скос, чтобы надпись и пятна
// изгибались у края, а середина оставалась ровной.
glass.watch(document.body, ".aika-toast-scene", {
    self: true,
    bevel: 20,
    thickness: 34,
    light: -140,
    materialize: 450
});
