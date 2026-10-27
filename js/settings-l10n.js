// settings-l10n.js — the theme settings in Russian when Steam is in Russian
// (author 2026-10-16). Imported by js/main.js.
//
// Millennium has no localization for theme settings: the editor shows the
// Conditions keys of skin.json as labels and their English descriptions. Its
// editor lives in the Millennium sidebar of the main window
// (.MillenniumDesktopSidebar; every setting is a Steam .Field with
// data-condition="<key>"), so this script rewrites the text there:
//   - labels and descriptions by the condition key (NAMES / DESCRIPTIONS);
//   - the tab picker, the dropdown values and the color names by their text;
//   - the dropdown menus (.DialogDropDownMenu, portaled outside the sidebar,
//     in the same window) while one opened from the sidebar is on screen.
// Only text nodes change (no nodes are added or removed), so React keeps
// working on them; a re-render that writes English back is caught by the
// observer. Only when the editor shows Aika; other themes and plugins are
// left alone. English Steam: nothing runs.
(() => {
  "use strict";
  if (window.__aikaSettingsL10n) return;
  window.__aikaSettingsL10n = true;

  const lang = (() => {
    try { return new URLSearchParams(window.opener?.location.search).get("LANGUAGE") || ""; } catch { return ""; }
  })() || document.documentElement.lang;
  if (!/^(russian|ru)/i.test(lang)) return;

  const NAMES = {
    "Color preset": "Цветовой пресет",
    "Top bar": "Вкладки в шапке",
    "Compact header": "Компактная шапка",
    "Header wordmark": "Надпись в шапке",
    "Preloader": "Прелоадер",
    "Offline friends": "Друзья не в сети",
    "Friends background": "Фон",
    "Friends background opacity": "Видимость фона",
    "Friends list layout": "Вид списка",
    "Friend search": "Поиск по друзьям",
    "Wallet visibility": "Кошелёк",
    "URL visibility": "Адресная строка",
    "What's New visibility": "«Что нового»",
    "Add Shelf visibility": "«Добавить новый раздел»",
    "Steam News visibility": "Новости Steam",
    "Performance": "Производительность",
    "Store": "Страница игры в магазине",
    "Library covers": "Обложки в библиотеке",
    "Cursor glow": "Свечение под курсором",
    "Cursor glow radius": "Радиус свечения",
    "Privacy blur": "Размытие для приватности",
    "Notification wordmark": "Надпись в уведомлениях",
    "Notification opacity": "Непрозрачность уведомлений",
    "Custom colors": "Свои цвета",
  };

  const DESCRIPTIONS = {
    "Color preset": "Набор цветов темы: акцент и пятна света. Чтобы задать цвета вручную, включите «Свои цвета» на вкладке «Набор цветов».",
    "Top bar": "Где в шапке стоят вкладки «Магазин», «Библиотека», «Сообщество» и профиль.",
    "Compact header": "Компактная: меню, вкладки и кнопки аккаунта в одну строку.",
    "Header wordmark": "Название «Aika» слева вверху окна: классическое с засечками, каллиграфия или アイカ катаканой кистью.",
    "Preloader": "Окно «Войти в Steam», которое видно при запуске Steam. Классический: сетка обложек в тоне пресета и кольцо-комета. Терминал: падающие hex-символы и логотип Aika. Горизонт: светящийся край планеты. Орбиты: биты летают вокруг значка. Сияние: мягкие ленты северного сияния. Рамка: луч бежит по краю окна, точки бьются как сердце. Звёздный варп: звёзды вылетают из значка. Все следуют цветовому пресету; видно при следующем запуске Steam.",
    "Offline friends": "Группа «Не в сети» в списке друзей: сетка лиц (имя — при наведении) или обычный список Steam.",
    "Friends background": "Узор за списком друзей: волна из точек, мягко мигающие квадраты или только пятна света. Рисуется с малой частотой кадров и замирает, пока окно скрыто; при производительности «Низкая» — один неподвижный кадр.",
    "Friends background opacity": "Насколько заметен узор за списком друзей.",
    "Friends list layout": "Компактный список друзей самого Steam, переключается отсюда. «Как в Steam»: тема не трогает настройку Steam.",
    "Friend search": "Поиск на вкладке «Друзья». Лупа: круглая кнопка, по клику вытягивается в поле. Командная строка: всегда поле, моноширинный шрифт, знак «›» и число найденных друзей.",
    "Wallet visibility": "Баланс кошелька рядом с именем аккаунта в шапке.",
    "URL visibility": "Капсула с адресом поверх страниц магазина и сообщества, слева вверху (до страниц доходит после перезапуска Steam).",
    "What's New visibility": "Полка «Что нового» наверху главной страницы библиотеки.",
    "Add Shelf visibility": "Строка «Добавить новый раздел» внизу главной страницы библиотеки.",
    "Steam News visibility": "Кнопка новостей Steam (рупор) в шапке.",
    "Performance": "Сколько тема двигается сама. Полная: всё как задумано (по умолчанию; уже настроено так, чтобы стоить как можно меньше). Сбалансированная: меньше движения на элементах и вокруг них — нет света, бегущего за курсором по блокам магазина и панелям библиотеки, перелива «Играть», бликов и бегущего света по рамкам; обложки с 3D-наклоном просто приподнимаются, описание на кинематографичной странице не «дышит», пятна света на фоне стоят; меню, наведения, переходы, трейлеры, фоны магазина (30 кадров в секунду) и стеклянные уведомления остаются. Низкая: никаких анимаций Aika и тяжёлых эффектов — внешний вид остаётся, но ничего добавленное темой не двигается (только анимации самого Steam); пятна света — одна статичная картинка, без размытия фона, без стекла в уведомлениях, без анимированных фонов магазина, вместо трейлеров на странице игры — скриншот.",
    "Store": "Вид страницы игры в магазине. Кинематографичная: трейлеры без звука идут на всё окно за логотипом, ценой и кнопками, ниже — галерея; издания и всё остальное — как в Классической. Нужны скрипты темы.",
    "Library covers": "Как обложки игр в библиотеке (полки главной, коллекции) реагируют на курсор. 3D-наклон: обложка поворачивается к курсору в 3D с бегущим бликом. Подъём: немного приподнимается. Приближение: арт приближается в рамке с бликом.",
    "Cursor glow": "Мягкое свечение акцентом под курсором на больших блоках библиотеки (панели страницы игры, «Что нового», коллекции).",
    "Cursor glow radius": "Размер свечения под курсором, в пикселях.",
    "Privacy blur": "Размывает баланс кошелька (или имя аккаунта и баланс) на кнопке аккаунта справа вверху, пока на неё не наведёшь; в её меню логин и баланс размыты до наведения — удобно для стримов и скриншотов.",
    "Notification wordmark": "Шрифт надписи «Aika» на фоне всплывающих уведомлений.",
    "Notification opacity": "Насколько уведомление закрывает рабочий стол: меньше — прозрачнее.",
    "Custom colors": "Свои цвета вместо пресета. Сами цвета (акцент, акцент при наведении, три пятна света) — на странице «Цвета» сразу ниже.",
  };

  // Tabs, dropdown values, color names — by their text
  const TEXT = {
    "Main": "Основное",
    "Elements": "Элементы",
    "Friends list": "Список друзей",
    "Halftone wave": "Волна точек",
    "Blinking squares": "Мигающие квадраты",
    "As in Steam": "Как в Steam",
    "Regular": "Обычный",
    "Dense": "Компактный",
    "Magnifier": "Лупа",
    "Command line": "Командная строка",
    "Animations": "Анимации",
    "Advanced": "Дополнительно",
    "Color set": "Набор цветов",
    "Center": "По центру",
    "Left": "Слева",
    "Normal": "Обычная",
    "Compact": "Компактная",
    "Calligraphy": "Каллиграфия",
    "Faces": "Сетка лиц",
    "List": "Список",
    "Katakana brush": "アイカ — кисть",
    "Katakana soft": "アイカ — мягкая кисть",
    "Terminal": "Терминал",
    "Horizon": "Горизонт",
    "Orbits": "Орбиты",
    "Aurora": "Сияние",
    "Frame": "Рамка",
    "Glitter warp": "Звёздный варп",
    "Full": "Полная",
    "Balanced": "Сбалансированная",
    "Low": "Низкая",
    "Cinematic": "Кинематографичная",
    "Classic": "Классическая",
    "3D tilt": "3D-наклон",
    "Lift": "Подъём",
    "Zoom": "Приближение",
    "Balance": "Баланс",
    "Name and balance": "Имя и баланс",
    "Off": "Выкл.",
    "Gothic": "Готический",
    "Japanese": "Японский",
    "Accent": "Акцент",
    "Accent hover": "Акцент при наведении",
    "Light: main": "Свет: основной",
    "Light: pink": "Свет: розовый",
    "Light: warm": "Свет: тёплый",
  };

  // The color descriptions (root-colors.css @description), by the color name
  const COLOR_DESCRIPTIONS = {
    "Accent": "Действия, выделение, ссылки. Пресеты: #8B7FF0 лавандовый индиго, #5E6AD2 индиго Linear, #B79CF0 лавандовый, #D97757 коралловый Claude",
    "Accent hover": "Чуть светлее акцента. Пресеты: #A497F5, #7480E0, #C8B2F5, #E58A6B",
    "Light: main": "Пятно света наверху, обычно того же цвета, что акцент",
    "Light: pink": "Пятно света слева",
    "Light: warm": "Пятно света справа внизу",
  };
  const COLOR_KEY = {};
  for (const k of Object.keys(COLOR_DESCRIPTIONS)) { COLOR_KEY[k] = k; COLOR_KEY[TEXT[k]] = k; }

  // Sets an element's text without replacing its nodes
  const setText = (el, text) => {
    if (!el || el.textContent === text) return;
    const nodes = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n);
    if (!nodes.length) return;
    nodes[0].nodeValue = text;
    for (let i = 1; i < nodes.length; i++) nodes[i].nodeValue = "";
  };
  const byText = (el) => { const t = el?.textContent.trim(); if (t && TEXT[t]) setText(el, TEXT[t]); };

  // Is the sidebar editor showing Aika? Told by what is on the page, not by
  // how it was opened (Millennium reopens the last theme without a click on
  // the theme list — only the first tab was recognized then, by one key):
  //   a settings tab — every condition key on it is one of ours;
  //   the "Colors" page — every color name on it is one of ours (root-colors.css).
  const isAika = (side) => {
    const keys = [...side.querySelectorAll(".MillenniumDesktopSidebar_EditorContent [data-condition]")].map((f) => f.dataset.condition);
    if (keys.length) return keys.every((k) => k in NAMES);
    const colors = [...side.querySelectorAll(".MillenniumDesktopSidebar_EditorContent .Field .FieldLabel")].map((l) => l.textContent.trim());
    return colors.length > 0 && colors.every((c) => c in COLOR_KEY);
  };

  const apply = (side) => {
    if (!isAika(side)) return;
    for (const f of side.querySelectorAll("[data-condition]")) {
      const key = f.dataset.condition;
      if (NAMES[key]) setText(f.querySelector(".FieldLabel"), NAMES[key]);
      if (DESCRIPTIONS[key]) setText(f.querySelector(".FieldDescription"), DESCRIPTIONS[key]);
      f.querySelectorAll(".DialogDropDown_CurrentDisplay").forEach(byText);
    }
    side.querySelectorAll(".MillenniumDesktopSidebar_EditorHeader .DialogDropDown_CurrentDisplay").forEach(byText);
    // The "Colors" page: fields without a condition key, named by root-colors.css
    for (const label of side.querySelectorAll(".Field:not([data-condition]) .FieldLabel")) {
      const key = COLOR_KEY[label.textContent.trim()];
      if (!key) continue;
      setText(label, TEXT[key]);
      setText(label.closest(".Field").querySelector(".FieldDescription"), COLOR_DESCRIPTIONS[key]);
    }
  };

  // A dropdown opened from the sidebar: its menu is portaled elsewhere in the
  // window — translate its items for a moment after the press
  const menus = () => {
    const until = performance.now() + 800;
    const step = () => {
      document.querySelectorAll(".DialogDropDownMenu .DialogDropDownMenu_Item").forEach(byText);
      if (performance.now() < until) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const hook = (side) => {
    let frame = 0;
    const queue = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; apply(side); }); };
    new MutationObserver(queue).observe(side, { childList: true, subtree: true, characterData: true });
    const opened = (e) => { if (isAika(side) && e.target.closest?.(".DialogDropDown")) menus(); };
    side.addEventListener("click", opened, true);
    side.addEventListener("keydown", opened, true);
    queue();
  };

  const find = () => {
    const side = document.querySelector(".MillenniumDesktopSidebar");
    if (side) { hook(side); return true; }
    return false;
  };
  if (!find()) {
    let tries = 0;
    const t = setInterval(() => { if (find() || ++tries > 60) clearInterval(t); }, 1000);
  }
})();
