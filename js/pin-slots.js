// pin-slots.js — the Family View PIN as four animated cells
// (idea: reactbits.dev "Code Slots", our own code and motion — DESIGN.md §11).
// Imported by js/main.js (the client dialog) and attached by a Patch to store
// and community pages (the "Family View" web page).
//
// Steam's field stays the real input: focus, typing, paste and submit are all
// Steam's (a React-controlled input[type=password]). We only make it see-through
// (.aika-pin-js) and lay a row of cells over it (.aika-pin-slots), mirroring the
// value length every frame while the field is on screen — Steam also clears it
// programmatically after a wrong PIN, which fires no event.
//   typing     — the cell fills with the accent from its center, a dot rises in;
//   erasing    — the dot drops out, the fill shrinks back;
//   wrong PIN  — the dots fall out right to left, the cells flash red;
//   the caret  — glides to the next empty cell, blinks like a terminal.
// Without the script the field is Steam's single box with dashes (components/input.css).

(() => {
  "use strict";
  if (window.__aikaPinSlots) return;
  window.__aikaPinSlots = true;

  const FIELDS = [
    ".GenericConfirmDialog .Body > input.TextInput[type=\"password\"]",   // the client dialog
    "#parental_main_content form input[type=\"password\"]",               // the web page
  ].join(", ");
  const DIGITS = 4;            // Steam PINs are four digits (= --aika-pin-digits)
  const CASCADE = 40;          // ms between cells when they empty together
  const ERROR_HOLD = 900;      // ms the red flash stays
  const WEB_GIVE_UP = 15000;   // web pages: stop looking if no PIN form appears

  const attach = (input) => {
    input.dataset.aikaPin = "";
    const row = document.createElement("span");
    row.className = "aika-pin-slots";
    row.setAttribute("aria-hidden", "true");
    const cells = Array.from({ length: DIGITS }, () => {
      const cell = document.createElement("span");
      cell.className = "aika-pin-cell";
      cell.innerHTML = "<span class=\"aika-pin-fill\"></span><span class=\"aika-pin-dot\"></span>";
      row.append(cell);
      return cell;
    });
    const caret = document.createElement("span");
    caret.className = "aika-pin-caret";
    row.append(caret);
    input.classList.add("aika-pin-js");
    input.after(row);

    const place = () => {
      row.style.left = input.offsetLeft + "px";
      row.style.top = input.offsetTop + "px";
      row.style.width = input.offsetWidth + "px";
      row.style.height = input.offsetHeight + "px";
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(input);
    ro.observe(input.parentElement);

    const errorText = () => input.parentElement.querySelector(".ErrorText")?.textContent.trim() ||
      input.closest("form")?.querySelector("[class*=rror]")?.textContent.trim() || "";

    let shown = 0, focused = false, errorTimer = 0;
    const setFilled = (i, on, delay = 0) => {
      cells[i].style.setProperty("--aika-pin-delay", delay + "ms");
      cells[i].classList.toggle("is-filled", on);
    };
    const render = (len, drain) => {
      for (let i = 0; i < DIGITS; i++) {
        const on = i < len;
        if (cells[i].classList.contains("is-filled") === on) continue;
        // emptying several at once (a wrong PIN, select-all + delete): right to left
        setFilled(i, on, !on && drain ? (shown - 1 - i) * CASCADE : 0);
      }
      const active = Math.min(len, DIGITS - 1);
      row.style.setProperty("--aika-pin-active", active);
      row.classList.toggle("has-caret", focused && len < DIGITS);
      cells.forEach((c, i) => c.classList.toggle("is-active", focused && i === active));
    };

    const tick = () => {
      if (!input.isConnected) { ro.disconnect(); row.remove(); return; }
      const f = document.activeElement === input;
      const len = Math.min(input.value.length, DIGITS);
      if (len !== shown || f !== focused) {
        focused = f;
        const drain = shown - len > 1;
        if (drain && errorText()) {
          row.classList.add("is-error");
          clearTimeout(errorTimer);
          errorTimer = setTimeout(() => row.classList.remove("is-error"), ERROR_HOLD);
        }
        render(len, drain);
        shown = len;
      }
      requestAnimationFrame(tick);
    };
    shown = Math.min(input.value.length, DIGITS);
    render(shown, false);
    requestAnimationFrame(tick);
  };

  const scan = () => document.querySelectorAll(FIELDS).forEach((el) => {
    if (!("aikaPin" in el.dataset)) attach(el);
  });

  // The client dialog appears any time. It mounts inside .FullModalOverlay (there
  // from the window's start), so a MutationObserver on just that subtree catches
  // it before its first frame — the field never shows its no-script look
  // (components/input.css keeps it hidden until .aika-pin-js). A subtree observer
  // on the whole main window would fire constantly; the overlay is quiet.
  // A cheap look twice a second stays as a safety net (an overlay not yet there).
  // Web pages: the form renders shortly after load, or never. Recognized by
  // the host — the client windows are https too (steamloopback.host), and
  // giving up there left the dialog without cells after a restart.
  const web = /^(store\.steampowered|steamcommunity)\.com$/.test(location.hostname);
  const watched = new WeakSet();
  const watchOverlays = () => document.querySelectorAll(".FullModalOverlay").forEach((o) => {
    if (watched.has(o)) return;
    watched.add(o);
    new MutationObserver(scan).observe(o, { childList: true, subtree: true });
  });
  const timer = setInterval(() => { if (!web) watchOverlays(); scan(); }, 500);
  if (!web) watchOverlays();
  scan();
  if (web) setTimeout(() => { if (!document.querySelector(".aika-pin-slots")) clearInterval(timer); }, WEB_GIVE_UP);
})();
