// JS entry point for the main window (Patch "^Steam$" in skin.json):
// the loading curtain (first, so it covers the window as early as possible),
// cursor glow, the gap between a menu and its submenu, the Family View PIN cells,
// the 3D tilt of library covers ("Library covers" setting), the achievement bars
// filling in on a game page, the curtain between pages, the "+" as a
// floating action button, the compact header balance, the theme settings in
// Russian.
import "./boot-reveal.js";
import "./spotlight.js";
import "./menu-gap.js";
import "./pin-slots.js";
import "./cover-tilt.js";
import "./achievement-progress.js";
import "./page-curtain.js";
import "./fab.js";
import "./header-compact.js";
import "./settings-l10n.js";
