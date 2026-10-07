# Aika — work status and plan

> For a new agent: read CLAUDE.md → DESIGN.md (especially §0 and §11) →
> this file. Here: what's done, what's next and in what order.
> Update this file in every commit that closes or adds a task.
> Dates are absolute. Write in English.

## How to work (short)

- Steam runs with `-dev`, CDP at `http://localhost:8080/json`. The main window is
  the page titled "Steam". Menus are separate windows ("Games Root Menu",
  "Menu", "… Supernav").
- Capture classes yourself via CDP (Runtime.evaluate, CSS.getMatchedStylesForNode):
  look at both the readable class and the strength (specificity) of the Steam rule
  that has to be beaten. Scripts in `tools/` (Node, no dependencies; without a window
  argument they work with the main "Steam" window):
  - `node tools/cdp.js "<expression>"` — run JS in a window;
    the window can be given by part of its title: the community web page
    "Steam Community :: … :: Friends Activity" is
    `node tools/cdp.js "Friends Activity" "…"`, reloading its CSS —
    `node tools/reload.js "Friends Activity" webkit.css`;
  - `node tools/rules.js "<selector>" "background,color"` — which Steam rules
    set the properties (strongest to weakest);
  - `node tools/reload.js` — reload the theme CSS without restarting Steam
    (`node tools/reload.js "Games Root Menu" popup.css` — in a menu window);
  - `node tools/watch-window.js "<part of title>" <file> [sec]` — waits for a window
    to appear (e.g. "notificationtoasts") and captures its classes, styles and DOM at once;
  - `node tools/toast-test.js [message|ingame|online|download] [inject|-] [shot.png]` —
    show a Steam test notification (NotificationStore.Test… in SharedJSContext),
    check the theme styles in it and take a screenshot (screenshots work in the notification window);
    `inject` — load fresh toast.css and js/toast.js without restarting Steam;
    trial edits — the AIKA_EXTRA_CSS / AIKA_EVAL variables;
  - `node tools/click.js "<window>" "<selector>" [double]` — a real click (React ignores el.click());
  - `node tools/hover.js "<selector>"` — hover the mouse over an element (scrolls to it),
    then audit.js sees the :hover colors; `node tools/hover.js off` — move the mouse away;
  - open a game page: `Start-Process "steam://nav/games/details/<appid>"`
    (PowerShell); appid — via the SharedJSContext window:
    `collectionStore.allAppsCollection.allApps` (appid, display_name);
  - `node tools/audit.js Steam all "<scope>"` — find visible elements
    in Steam colors (not from the Aika palette) and plates without rounding. It sees
    only what's in the window: for long pages scroll (scrollTop
    via cdp.js) and run it again. Wait ~3 s after a reload —
    otherwise it catches Steam's CSS transitions. **Close every new section
    with a clean audit** (except the intentional exceptions below).
- CDP screenshots don't work in Steam — ask the author for visual checks.
  Verify values via computed styles; when reading right after a CSS
  reload, wait for transitions to finish (~0.5 s).
- Beat Steam without `!important`: an `html` prefix, a tag, one more readable
  class. `!important` only if Steam itself uses it (with a comment next to it).
- Hash classes (`_1UBp…`) only in `selectors.css`, with a verification date.
  A hash often has a readable twin (`Selected`, `HoversEnabled`, `Play`) —
  check in the live state (select a game, hover) before
  going to selectors.css.
- Colors: `root-colors.css` (RootColors, #hex only) / `colors.css` (everything
  else). No `rgba()` in root-colors.css — Millennium zeroes the alpha.
- New Patches in skin.json are picked up only after restarting Steam.
- Commit after every finished step; at the end of a step — a short note to the author:
  what was done, the hash, what to check in Steam.

## Done

| Date | What | Files |
|:--|:--|:--|
| 2026-10-04 | Design system, documentation, renamed to Aika (author hatewxb) | DESIGN.md, CLAUDE.md, README.md, skin.json |
| 2026-10-04 | Foundation: palette, tokens, fonts (Inter, Geist Mono, Fraunces — OFL), a 4-layer background | root-colors.css, colors.css, tokens.css, base.css, background.css, assets/fonts |
| 2026-10-04 | Narrow RootColors (the Millennium alpha bug), font weight from 400 | root-colors.css, base.css |
| 2026-10-04 | Buttons: DialogButton, "Play", ▶ on covers, inactive "Play" | components/button.css, selectors.css |
| 2026-10-04 | Cards: LibraryItemBox covers — a lift instead of the 3D tilt | components/card.css |
| 2026-10-04 | Inputs and dropdowns | components/input.css |
| 2026-10-04 | Navigation: game list (Fluent indicator), "Library", search, top tabs as icons | components/nav.css, tokens.css (icons) |
| 2026-10-04 | Panels: game page blocks (header strip + body), Steam captions unchanged | components/panel.css |
| 2026-10-04 | Statuses/labels/badges; the "Play" bar stats are mono | components/status.css |
| 2026-10-04 | Game page: the "Play" bar, "Play" + streaming, settings buttons | sections/game-page.css |
| 2026-10-04 | Menus: a separate popup.css entry point + a `.ContextMenuPopup` Patch | components/menu.css, popup.css, skin.json |
| 2026-10-04 | Progress: the achievements bar | components/progress.css |
| 2026-10-04 | Contrast: `--aika-accent-fill` button fill, fg-subtle 0.52 | colors.css |
| 2026-10-04 | Game page: the hero (banner darkening, fade on scroll, chips), the description block | sections/game-page.css |
| 2026-10-04 | Library: shelves (H2 heading, dividers, arrows, "Yesterday"), window header, bottom panel | sections/library.css |
| 2026-10-04 | Color and rounding audit (tools/audit.js): library home and game page clean — Steam leftovers recolored | sections/*.css, components/status.css, selectors.css |
| 2026-10-04 | The activity feed on the game page (width, news cards), panel body alignment, the selected game without blue on hover, community content | sections/game-page.css, components/panel.css, components/nav.css |
| 2026-10-04 | The "Friends Activity" page (community, profile menu → "Activity"): event cards, right column, avatars by status, fields, site buttons, Workshop — clean audit | sections/community.css, webkit.css, tools/target.js |
| 2026-10-04 | Game page: hero + "Play" as one rounded block with an accent outline (parallax and darkening kept); no gap between panel header and body; badge/cards, Workshop, DLC, feed comments, reactions, screenshot caption; play time is mono | sections/game-page.css, components/panel.css, components/status.css, tokens.css |
| 2026-10-04 | Author's fixes (2): "Major update" and "Featured" in the feed — accent cards; "Load more events" rounded; hidden achievements and "+N"; "Change preferred copy"; the account in the header and its menu; Win11 window buttons; "Aika" instead of "Steam", mono menu; version 0.1.0 | sections/game-page.css, sections/library.css, components/window.css, components/menu.css, components/status.css, tokens.css, colors.css, skin.json |
| 2026-10-04 | "Collections" mode (card tiles, a 3D showcase in our colors, a dashed "Create collection") and the collection page (name, counter, sorting, groups) — clean audit | sections/library.css, tokens.css |
| 2026-10-04 | "Downloads" without an active download: background, top panel, empty banner, graph (network — accent, disk — warm), queue sections; client tooltips (.TextToolTip) | sections/downloads.css, components/menu.css, main.css |
| 2026-10-04 | Library: "What's New" — panel and cards in Aika colors; the "All (698/727)" heading in the game list; the "Library" item is accent | sections/library.css |
| 2026-10-04 | Author's fixes: "Play" — even padding; banner reflection sides faded; "About this game" (the i button) slides out lower, "Play" above it; achievements in "Play" — accent; a friend on hover; "New content released"; a more compact feed top, Aika font; screenshot thumbnails and the like — accent; a lighter library search; tools/hover.js | sections/game-page.css, sections/library.css, components/nav.css, tokens.css, tools/hover.js |
| 2026-10-04 | Store (web, home): store design system variables (greyneutral/blue scales, texts, old --*-ctn-bg, --green/--blue) → the Aika palette on the document :root; background, menu strip, search and suggestions, prices and discounts (mono), "Add to Cart" — primary, capsules, tabs, the game hover card, footer — clean audit (with hover) | sections/store.css, colors.css, tokens.css |
| 2026-10-04 | Game page right column (Cairn): "Store page…" links — rounding and our hover; an empty badge — our dashed border; card hover shadow — layered; "All achievements unlocked" — an accent bar and medal — clean audit (with hover) | sections/game-page.css |
| 2026-10-04 | Store game page (app/…, ELDEN RING): light from the top — accent; btnv6 buttons — secondary (the :not() hover chain like Steam's); summary and pill tags; right column — cards (features, controllers, languages, rating, achievements, links); DRM — warn; purchase, price — mono; DLC; description, "Read more", requirements and OS tabs; "Recent Events"; carousels at the bottom (panels, prices, capsule labels, buttons, tooltip); the screenshot player; user reviews entirely; the `--color-storegreen-*` scale → ok — clean audit (with hover), home also clean after the fixes | sections/store.css, selectors.css, colors.css, tokens.css |
| 2026-10-04 | Author's fixes (store): an Apple-style trailer player (a floating capsule with blur, a thin bar, mono time, round arrows); "More products / More like this" capsules rounded, "Pre-Purchase"; "About this game" — images/gifs/videos rounded, section headings Inter 600; web page font: "Motiva Sans" → Inter via @font-face; the search dropdown with an empty query | selectors.css, sections/store.css, web-fonts.css, webkit.css, colors.css, tokens.css, DESIGN.md |
| 2026-10-04 | Store: the "Browse / Recommendations / Categories / Ways to Play / Special Sections" mega menu — the strip under the button in accent, the main links column is an accent card, column headings are captions, large tiles (were pink/teal/blue) are accent cards, the page darkening; `--Neutrals-*` declared; prices in search suggestions — clean audit (all 5 menus, hovering an item) | selectors.css, sections/store.css |
| 2026-10-04 | Store, new engine (#StoreTemplate, body without .v6) — the wishlist: scales and background wired up, the menu strip and all 5 menus, search and suggestions, filters and chips, game rows, labels, prices, "Add to Cart", "Remove", tooltip, "Options" (a popover via `--popover-*`), avatar; declared `--Colors-blue`, `--Blue-gredient`, `--Text-Main`, `--Blues-darkestGrey` — clean audit | sections/store.css, selectors.css, tokens.css |
| 2026-10-04 | Store: the cart (empty; DialogButton/DialogDropDown — components/button.css and input.css imported in webkit.css) and search (field, tags, sorting, rows, discounts, filters) — clean audit (with hover); audit.js finishes CSS transitions in a hidden window | sections/store.css, selectors.css, webkit.css, tools/audit.js |
| 2026-10-04 | Friends & chat: the friends list window (header, tabs, groups and lines, rows by status, favorites, chats, focus strip), the chat window (tabs, header, history, names by status, mono time, input field and buttons), the mini profile on hover (shared across the client) — clean audit (with hover); tools/click.js — a real click via CDP | sections/friends.css, components/status.css, tools/click.js |
| 2026-10-04 | The "Settings" window — all 15 sections: menu with a Fluent indicator, setting rows, subheadings, large buttons; "Family" (statuses, "This is you"), "Security", "Library" (segmented group), "Storage" (chart in the Aika palette, game list, checkboxes, buttons), "Game Recording" (intro, mode cards); toggles and checkboxes for the whole client (closed the TODO in input.css) — clean audit (with hover), no regressions in the main window | sections/settings.css, components/input.css, components/nav.css, components/status.css |
| 2026-10-04 | Author's fixes (3): "Send" in chat — accent; pinned friends and friend search; our own "away" (a moon with z) and "on mobile" icons (tokens.css, components/status.css); the settings menu like the library panel (icon containers, an accent card); drive picker hover; positive scores — green; denser prices | sections/friends.css, sections/settings.css, sections/store.css, components/status.css, components/input.css, selectors.css, tokens.css |
| 2026-10-04 | Author's fixes (4): the drive list (.DialogDropDownMenu — all dropdowns in windows), prices in store search suggestions, header tabs centered in the window and larger; the game logo above the trailer in the store — js/store-logo.js + a URL Patch in skin.json (verified live on PEAK by injecting the script via CDP) | components/input.css, components/nav.css, sections/store.css, selectors.css, js/store-logo.js, skin.json |
| 2026-10-04 | Author's fixes (5): the store page of a game in the library (PEAK) — the "already in library" strip, the "Play / hours / review" block, "In Library" labels, the fade above "Read more", bundle, friends who own it; the game "Properties" window — all 8 sections (betas, controller, files); "Friends who play" on the library game page verified (PEAK) — clean audit | sections/store.css, sections/settings.css, selectors.css, tokens.css |
| 2026-10-04 | Cursor spotlight: js/spotlight.js (Patch "^Steam$" + TargetJs) writes --aika-spot-x/y, the glow is components/card.css (::after, screen); verified live on game page panels | js/spotlight.js, components/card.css, skin.json |
| 2026-10-04 | Theme settings in Millennium (Conditions by tab): "Top bar" — tab position (center by default / left), "Color presets" — "Aika", "Advanced" — "Custom colors"; RootColors renamed to --aika-user-*, the final colors are in colors.css (html:root); switching verified live | skin.json, options/, root-colors.css, colors.css, components/nav.css |
| 2026-10-04 | Author's fixes (6): the cover on the right of the store game page rounded; settings — sections 16–20 ("Voice", Remote Play, "Broadcasting", "Music", "Developer"; the audit had covered only 15 before): the microphone bar, .DialogProgressBar_*, "Configure microphone", the push-to-talk block — clean audit (with advanced voice settings expanded) | sections/store.css, sections/settings.css |
| 2026-10-04 | Toggles: on — the main accent with a glow (was --aika-accent-fill, read as blue); game page panels appear with a stagger (CSS, by column position, 60 ms step; reduced-motion — no animation) | components/input.css, components/panel.css |
| 2026-10-04 | Toggles (the blue fill was in .ToggleRail::before), sliders, segmented group; audit.js checks ::before/::after. Downloads — an active download (cover, "network/disk" bars, pause, rows and their buttons, "Completed", graph bars, the bottom strip); the game install dialog (in-window dialogs) — verified while installing Among Us and APE OUT | components/input.css, sections/downloads.css, sections/settings.css, tokens.css, tools/audit.js |
| 2026-10-04 | A cart with an item (ELDEN RING, removed afterwards): the "Added to your cart!" dialog (the shared store React dialog and its buttons), "Cart N" in the menu — accent, "Remove all items", "Follow the creators", FollowButton everywhere — secondary | selectors.css, sections/store.css |
| 2026-10-05 | Community → "Friends" (…/friends/): header, left menu (active — accent + strip), search strip, friend cards by status (avatar strip on the right, name, game — ok), blocked (live), the site's mini profile on hover, all subsections (add, invites, recently played with, moderators, followed users and games, groups); avatars in the subpage profile header — clean audit | sections/community.css, selectors.css |
| 2026-10-05 | Author's fixes (7): a 46 px tab bar, buttons vertically centered; a barely visible cursor glow (6 %, 160 px) + a toggle and a "Glow radius" slider in "Advanced" (slider → --aika-setting-spot-size); the download banner is a neutral warm (was bluish); the header — Family View, news, notifications: the active state in accent; the glow behind the "Friends" header — accent | tokens.css, colors.css, components/nav.css, options/spotlight-off.css, skin.json, sections/downloads.css, selectors.css, sections/community.css |
| 2026-10-05 | Client notification toasts: a dedicated toast.css entry point + a Patch on body .DesktopToastContainer (the theme wasn't attached there at all), components/toast.css — a dark card with an accent outline and strip; tools/watch-window.js — capturing short-lived windows. Verified live on "Download complete" | toast.css, components/toast.css, skin.json, tools/watch-window.js |
| 2026-10-05 | Friend thumbnails: the status is a rounded pill with an offset; the mini profile from "Friends who play" (game page) — rounding, the play time block (.PlaytimeSection) in a warm accent instead of light blue | components/status.css |
| 2026-10-05 | "Content" → "Screenshots" by game: js/content-shelves.js builds a shelf per game (an icon from steamcmd.net appinfo with a cache + the title as a filter link, a horizontal carousel of rounded screenshots, arrows, fading edges, shimmer placeholders, an "all screenshots of the game" card); shelves load as they approach the viewport, at most 2 requests at once, an empty Steam response is retried. The "Name » Screenshots" header, tabs, the management strip, dropdowns and their lists, the selected game chip, Steam's wall (per-game filter / "Manage"), artwork, videos — clean audit. Verified by injecting the script via CDP | js/content-shelves.js, sections/content.css, tokens.css, webkit.css, skin.json |
| 2026-10-05 | README for GitHub: description, screenshots (the screenshots/ folder, the screenshots.txt note — not in git), installation, theme settings, a per-section roadmap; .gitignore — .claude/, SSforClaude/ | README.md, .gitignore, screenshots/ |
| 2026-10-05 | The author's screenshots in the README (7): checked for privacy (everything personal blurred, PNG/JPG have no EXIF or text chunks), arranged by section | README.md, screenshots/ |
| 2026-10-05 | Version 0.1.0a, the first release on GitHub (tag v0.1.0a, the Aika-0.1.0a.zip archive — theme files only) | skin.json, README.md, DESIGN.md |
| 2026-10-05 | The GitHub repository — private, About and topics; README shortened: preview, screenshots as a table, installation, a per-section roadmap (done / not done) | README.md |
| 2026-10-06 | Notifications — liquid glass: a translucent card over the desktop, under the glass light spots and the "Aika" wordmark (blackletter / "Japanese brush") instead of the Steam logo; hyalite (MIT, js/vendor) in self mode bends the scene layer near the edges (backdrop-filter stacked translucency into opacity); the friend's name, "now playing", the game (ok), the status strip — a pill. Settings: the "Notifications" tab — "Notification wordmark", "Notification opacity". tools/toast-test.js — Steam test notifications + a screenshot. Verified with screenshots on a message, "now playing", "Download complete" after restarting Steam | components/toast.css, js/toast-glass.js, js/vendor/, skin.json, options/toast-mark-brush.css, base.css, tokens.css, colors.css, assets/fonts, tools/toast-test.js |
| 2026-10-06 | Notifications: spacing. The stack is 16 px from the edge and above the taskbar (Steam offsets: js/toast-glass.js via window.opener → SteamUIStore…SetNotificationPosition, values are the --aika-toast-inset-* tokens); an 8 px gap between notifications — the card sits lower in the window (Steam stacks windows flush, step = window height). Verified with three notifications in a row after a restart | js/toast-glass.js, components/toast.css, tokens.css, tools/toast-test.js |
| 2026-10-06 | Notifications: animation along curves. Chromium considers the notification window hidden — rAF and CSS animations don't run in it, so everything runs in SharedJSContext frames (window.opener): the card fades in/grows/sharpens along --aika-ease together with the window sliding in; SteamClient.Window.MoveTo is replaced with a spring (stack windows settle smoothly, without Steam's linear steps); leaving — the notification state is read from Steam's React stack (m_eState), the window freezes, the card floats right along --aika-ease-leave. JS split: js/toast.js → toast-glass.js, toast-motion.js. Verified with a frame trace (enter, leave, three in a row) | js/toast.js, js/toast-motion.js, js/toast-glass.js, components/toast.css, tokens.css, skin.json |
| 2026-10-06 | The PIN dialog (exiting Family View, kiosk mode): heading and text in theme fonts, the field — four underlined cells (Geist Mono, 44 px step), focus — accent with a ring, error — --aika-live. The line above all in-window dialogs (.ModalPosition_TopBar) — an accent fading toward the edges instead of Steam's blue. The Family View button "didn't press" — Steam's modal manager measurer was stuck (requests piled up since launch), a restart fixed it; the theme wasn't at fault | sections/settings.css, tokens.css, CLAUDE.md |
| 2026-10-06 | "Play" brighter than "Install" (author's fix): for an installed game (.PlayButtonContainer.Green) — an accent → pink light spot gradient with a slow shimmer and a double glow; "Install" — the previous accent. The game context menu (right-click in the list; drawn inside the main window, popup.css doesn't reach it): the .ContextMenuAction item without Steam's blue/green and caps — "Play" bright, "Install" etc. in accent. Submenu — a visible 6 px gap from the menu (js/menu-gap.js: a translate shift toward the opening side). Main window JS — the js/main.js entry point (spotlight + menu-gap); tools/click.js can do right | sections/game-page.css, components/menu.css, colors.css, tokens.css, js/main.js, js/menu-gap.js, skin.json, tools/click.js |
| 2026-10-06 | A game row in the list while a context menu is open on it (.Container.HasContextMenuOpen): instead of Steam's gray-blue #506588 border and #293344 background — an accent border and the theme hover background (the selected row keeps its accent background). Found from the pixels of the author's screenshot: the class is set only on a real right-click | components/nav.css |
| 2026-10-06 | Game row states in the list (using Pratfall, "Update queued"): .Updating and .Synchronizing — fully accent (title, the .DownloadProgress caption, the progress ring), the icon under the ring dimmed to 0.7 instead of 0.4; .CloudError — --aika-live, .CloudOutOfDate — --aika-warn, .Running — --aika-ok; the color holds on hover and on the selected row | components/nav.css, tokens.css |
| 2026-10-06 | The left panel "slid" up (screenshot 4: "Library" cut off): Steam's hidden "Back to top" (translateY(30px)) stuck out of .ContentFrame, the frame got 30 px of scrolling, scrollIntoView (our tools/click.js, hover.js; Steam when selecting a game) scrolled it. The button wrapper is overflow-y: clip; tools use scrollIntoView({block: "nearest"}) | sections/library.css, tools/click.js, tools/hover.js, CLAUDE.md |
| 2026-10-07 | The news window (screenshot 3: a click on a feed event / "What's New"; .AppPartnerEventsPage): the panel — bg-elevated, radius-xl, an accent outline with a glow instead of the gray-blue gradient; the event type — a mono accent pill badge without caps; "Posted" and the date — mono; links — accent; images rounded; the YouTube placeholder (Steam's PNG logo in a light-blue ring) — a rounded surface with a spinning accent ring; "Like / Discuss / Share" — secondary buttons, mono counters; the buttons on the right (close, up/down, game) — opaque secondary with accent on hover. The same window in the store's News Hub (screenshot "3_news page") — the same module but hashes only: selectors.css; the "News Hub" banner and the veil under the window. Clean window audit in both places | sections/game-page.css, selectors.css, tokens.css |
| 2026-10-07 | The tooltip on hovering a game cover (screenshot 5, Valheim; .HoverPosition .AppPortraitHover — "Recent Games" shelves, collections): instead of a rectangular #363c45 plate with a gray-blue blurred cover — a dark translucent tooltip card (surface-translucent, radius-lg, shadow-menu), the cover under it — a dark colored glow; the screenshot frame rounded; "Copies in Family Library" — no caps; "You've played" and the time — mono. Clean audit | sections/library.css |
| 2026-10-07 | The store News Hub (task 3b; store…/news/ and news/app/…): our page background, the left menu — a dark panel, the selected item — an accent backing with a strip instead of the light-blue gradient, group captions and "Search" — mono, the counter — a pill, "Options and filters" — secondary; section headers (sticky) — opaque, headings without caps; event cards — rounded with an outline, hover — accent (Steam's (0,6,0) beaten by repeating the class), the event type — a pill, mono dates, "Now / Ends in" — ok; images rounded; the curators block — an accent card, "Follow" / "Discover more" — secondary, without the pink line; the game banner on its news page. All via hashes in selectors.css. Clean audit along the whole length of both pages and on hover | selectors.css |
| 2026-10-07 | News Hub, fixes from the screenshot "3_b color mismatches": Steam's body background #171a21 showed between cards and under sections (html body.events_hub.v6, (0,2,2) — stronger than our body.v6.v6; the audit didn't catch it: body is skipped) — ours is now body.v6.v6.v6; the event type pill ("Small update or patch notes") stretched to the full row height (the row is the last flex block of the column with flex-grow: 1) and slid down — align-self: flex-start, level with the date; the game banner — the full-width blurred cover dimmed to a dark glow (it was gray-blue on light artwork) | sections/store.css, selectors.css |
| 2026-10-07 | News Hub, screenshot "3_c color mismatches…": sticky section headers ("Friday", "September"…) were solid black strips over the light spots — the backing is now a gradient: transparent → --aika-scrim behind the caption → transparent (--aika-sticky-fade); the pinned game banner (news/app/…) — no line below, the backing and blurred cover fade toward the bottom (--aika-banner-fade, --aika-banner-mask) | selectors.css, tokens.css |
| 2026-10-07 | A friend's mini profile, screenshot 6: when the friend is in game, Steam draws the time block in a compact form (the hash modifier ._3s-55t0zdXZvIG4VIzVaqE — no background, padding or logo; found in Steam's stylesheets) to the right under the status line, and our stronger .miniProfile .PlaytimeSection rule drew a backing, glow and line there — a lilac rectangle over "Climbing the Tropics". The strip styling is now for the full variant only: .PlaytimeSection:has(> .GameLogo). Verified on "not in game" and by simulating the compact one; live with a friend in game — waiting for the author | components/status.css |
| 2026-10-07 | "Edit Profile" (task 7, steamcommunity…/edit/…), all 10 tabs: the left menu — a hover backing, the selected item — accent with a strip (Steam has a sliding #3d4450), "Points Shop items" — secondary instead of a light-blue outline; section headings without caps, field captions — mono labels, "About" and the emoticon button — like theme fields; round toggles — accent; selection grids (profile background, mini profile, game profile, avatars and frames, badges, groups, themes) — rounded cards, hover — an accent outline, selected — an accent ring and caption (Steam's light blue #2e83c9), the empty option — a warm surface; the background preview rounded, the profile layout desaturated with a filter; the mini profile preview — statuses in accent; "Privacy" — headings and values without light blue, theme dividers; "Manage Showcases" — showcase plates, arrows, lists, buttons, "Favorite Group" (in game — ok); the Valve footer. Readable classes — sections/community.css, hashes — selectors.css (with a map). Verified with my own "foreign colors" collector on every tab + a rounding audit. Left alone: the colors inside theme preview circles (those are Steam's themes themselves), the level ring (Steam's scale) | sections/community.css, selectors.css |
| 2026-10-07 | "Edit Profile" — page background (author's fix): Steam's body.profile_edit_page (0,1,1) has its own gray-blue gradient #262d33 → #1d1e20, stronger than our transparent body; killed, the theme background shows. The Valve React footer (footer.TT1_g1X…, on every community page that has it) — was solid black #000, now transparent with a fading line on top. Lesson: tools/audit.js and my collector don't look at the html/body background — on a new page check getComputedStyle(document.body).background separately | sections/community.css, selectors.css |
| 2026-10-07 | The notifications dropdown (tasks 8 and 10, the "Notifications Menu" window): Steam's inner .NotificationsMenu box (a 1 px #000 border, two inset shadows, square corners, a gray-blue background) inside our rounded one made a double frame (author's fix) — removed; "View all" — secondary; the empty state — theme colors. Cards (.AllNotificationsTemplate, .Unread, .Title, .Timestamp, .Icon, .NewIndicator — readable names of Steam's CSS module, found via the __req module map) — rounded on a surface, unread — accent, mono time, the "new" dot — accent. Haven't seen the cards live (no new notifications, the NotificationStore.Test* ones don't reach the menu) — verified with a mockup using Steam's classes | components/menu.css |
| 2026-10-07 | The community notifications page (task 9, steamcommunity…/notifications): cards (the same template as in the dropdown, web hashes of module 75883) — rounded with an outline, a gap between them, hover and unread — accent, mono time and price, the "new" dot — accent; the loading placeholder — without the lime shimmer; the right column — a card, "Filter" — a mono label, a checkbox, "Community actions" — an accent link without the gray-blue line; the heading. The profile header (name #ebebeb) and base text — now on every profile page, not only in the editor. The body background here was already transparent (verified) | selectors.css, sections/community.css |
| 2026-10-07 | The game logo in the store (task 11, screenshot 11 — STEEP): during a sale the .saleEventBannerBig banner (z 100) stands instead of the title strip, and the top of the logo (z 30) went under it. Raising the logo's z-index isn't enough: Steam's ".widestore #game_highlights" has backdrop-filter: blur(7px), its own stacking context. #game_highlights:has(.aika-store-logo) — position: relative + --aika-z-store-logo (110: above the banner and the event block 101, below tooltips 1526, modals 1500 and menus 10000); Steam's blur is kept. Verified with elementFromPoint along the logo edges (with pointer-events temporarily on — otherwise it's "transparent" to the check) | sections/store.css, tokens.css |
| 2026-10-07 | The second batch of screenshots. 3e: the plate above the news window in the News Hub (.AppPartnerEventsBanner) fades toward the bottom, without Steam's black shadow, the blurred cover desaturated into a warm neutral (--aika-blur-cover-neutral; for "Steam News" it's blue). 12: "Library filters" — a translucent panel, mono accent group captions, the filter button icon in the open state — accent. 13: game achievements — a panel with an accent outline, the header fades into the panel background, progress in accent (Steam sets an inline background: var(--gpColor-Blue) — the variable is overridden), the tab — accent, "My" and "Global" rows — cards, the player share — an accent fill, mono dates and percentages | selectors.css, tokens.css, sections/library.css, sections/game-page.css |
| 2026-10-07 | The second batch, continued. The "Steam News" icon (apps/593110/header.jpg — blue) in banners — tinted to the accent with a filter (--aika-tint-accent), selected by the image address. 14: "Your favorite genres" labels in store search — without our own doubled dark plate, light text with a shadow. 16: purchase warnings (.notice_box_content) — warn cards. 15: Early Access (.early_access_header, verified on Enshrouded — SUPER PEOPLE was delisted): an accent card, "Note" and "Leaving Early Access" — warn, "Read more" fades into the background; the "Report bugs" plate — a card, the bug in accent tone. 17: game discussions — topic rows as cards (hover — accent), "PINNED" in accent, PNG icons in accent tone, pagination, the right column (search, cards, the selected forum — accent with a strip, "New discussion" — accent, "Subscribe" — secondary) | selectors.css, tokens.css, sections/store.css, sections/community.css |
| 2026-10-07 | Game discussions, author's fixes from the screenshot "17 page fixes": topic author and time on hover — without the light-blue #70beed (Steam ".forum_topic:hover …" (0,3,0)); the topic preview (.forum_topic_tooltip, light-blue #417a9b) — a dark translucent tooltip, the author in accent, mono date; the selected hub tab — an accent line instead of #1a9fff; search — a full-width field, instead of the blue GIF button a magnifier mask inside the field (--aika-icon-search), focus — a ring; the award icon — our own mask (--aika-icon-award) in accent instead of award_icon_blue.svg; the selected forum — the backing wider than the text (the text doesn't stick to the edge) | sections/community.css, tokens.css |
| 2026-10-07 | Discussions, search (screenshot "17_d search"): a blue square remained to the right of the field — it's a ::before on .discussionSearchTextContainer with Steam's button image (right: -40px); killed (content: none). Lesson: elementsFromPoint and my collector don't see pseudo-elements — for "extra" images next to fields check ::before/::after (tools/audit.js checks them) | sections/community.css |
| 2026-10-07 | Version 0.1.0b, the second release on GitHub (tag v0.1.0b, the Aika-0.1.0b.zip archive — the same contents as 0.1.0a: theme files + README, without CLAUDE/DESIGN/ROADMAP/tools/screenshots). Privacy checked: the files and changes since 0.1.0a contain no account name, profile ID, friend nicknames, paths with the user name; the new binaries are only OFL fonts with licenses | skin.json, README.md, DESIGN.md |
| 2026-10-07 | Repository localized to English: code comments, README, ROADMAP, skin.json (setting names and descriptions), commit history messages; DESIGN.md and CLAUDE.md removed from the repository and its history (kept locally); the repository made public | all files |
| 2026-10-08 | Full color presets: a preset can now set the background steps, text, the overlay tone (--aika-ink, was hardcoded 255,246,236), the accent fills and text on the accent; hardcoded copies (scrim, translucent menus, player material, fg-subtle/fade, borders, glares) derived from the roots; Aika values kept as var() fallbacks. The second preset "Hello Bert" (cyan on ink-black, dark text on teal fills); verified live by injecting the preset — roots and derived colors switch, Aika values unchanged without it. Local color-concepts/ folder for scheme drafts (ignored) | colors.css, options/presets/hello-bert.css, options/colors-manual.css, skin.json, .gitignore |

## Waiting for the author to check in Steam

- [ ] **Restart Steam** (a new Conditions value), theme settings → "Color presets" →
      "Hello Bert": the whole client turns cool (ink-black, slate panels, cyan accent,
      dark text on accent buttons and "Play"); switching back to "Aika" — unchanged warm look.

- [ ] **Restart Steam** (a new Patch for profile screenshots), open
      the profile → "Content" → "Screenshots": per-game shelves, carousels scroll
      with the arrows and Shift+wheel, a click opens the screenshot.
- [ ] Menus (after a full Steam restart — the Patch for `.ContextMenuPopup`):
      dark translucent, rounded, a dark item highlight.
- [ ] Keyboard highlight of a menu item (the `_18z-3vk…` hash in selectors.css).
- [ ] Top tab icons, the selected tab.
- [ ] New button colors (`--aika-accent-fill`).
- [ ] After a restart: `millennium\config\config.json` → themeColors.Aika
      should contain only the 5 #hex values from root-colors.css.
- [ ] The game page hero: the banner fades into the background, fades on scroll.
- [ ] Home page shelves, window header, bottom panel.
- [ ] The selected game in the left list doesn't turn blue on a long hover
      (a rule on the row's descendants; not verified live — the row was off screen).
- [ ] The feed on the game page: sits at the top next to the right column, without a dark
      strip; news (including with images) — rounded cards.
- [ ] "Friends Activity" (profile → "Activity"): events — rounded
      cards with an author strip, the right column — cards, avatars
      with a status frame, the "👍 / Share" buttons, the status field.
- [ ] Hero + "Play" as one block: rounded corners, an accent outline
      and glow, the banner hasn't shifted (10 px margins), parallax on scroll
      as before; panels have no gap under the header.
- [ ] "What's New" (panel, cards, hover), "All (698/727)",
      the accent "Library" item; badge, Workshop, DLC, comments
      under screenshots; "31.3 hrs past 2 weeks" — mono.
- [ ] Fixes 2026-10-04 (PUBG, Pragmata, "The Last of Us"): the "Play" button centered
      in the bar; no rectangular edges under rounded corners; "i" → the block
      slides out with a margin and doesn't cover the "Play" glow; the trophy and the achievements
      bar in accent; hovering a friend; "New content released";
      "Tell your friends…" / "Show latest news"; the selected screenshot
      thumbnail; the search field.
- [ ] Fixes (2): "Major update" (Jedi: Fallen Order), "Featured"
      (The Witcher 3), hidden achievements (Until Dawn), "Change
      preferred copy" (Dead by Daylight), the "Load more
      events" button; the account in the header and its dropdown (after a restart —
      the menu Patch); window buttons (normal and maximized window — the
      "restore" icon); "Aika" on the left, mono menu items.
- [ ] "Major update" (Jedi — Aug 25 2020, DBD — Aug 26): no
      blue ring along the outline and no strip on the left; under the text — a soft
      colored glow from the cover.
- [ ] "Friends Activity": avatars with a profile item frame are visible
      (the frame on top, no colored status square under it).
- [ ] "Activity": "Link to a game" — our dropdown (and the game list
      itself); the client browser address bar above the page — a mono pill.
- [ ] Tab menus (Store, Library, Community, profile) — width
      fits the longest label, equal padding; on all menus (the account one too,
      and "Aika / View / Friends…") all four corners are rounded.
- [ ] "Collections": tiles (hover — a lift and an accent outline),
      "Create collection", the collection page.
- [ ] "Downloads" (empty queue): the top panel, graph, sections;
      tooltips on hover (dark translucent).
- [ ] Right column: "Store page / DLC…" on hover —
      a rounded warm backing; an empty badge — a dim dashed line;
      a trading card on hover — a soft shadow with accent light;
      a game with all achievements — an accent bar, a purple medal
      with a yellow circle (not seen live — needs a 100 % game).
- [ ] Store, home: the dark Aika background instead of the sale wallpaper (the sale
      banner at the top stays), the menu strip and search (focus — a ring),
      search suggestions, discounts (Aika green, mono), "Add to Cart" — accent,
      rounded capsules, "New & Trending…" tabs with an accent line,
      the game hover card, the footer.
- [ ] Store, game page (any, checked on ELDEN RING): light from the top is
      purple, not blue; screenshots and thumbnails rounded, the selected one —
      an accent border; "Community Hub", "Add to your wishlist", "Follow" —
      dark buttons (lighter on hover); tags — pills; cards on the right;
      the purchase block — a card, mono price; DLC; "Read more"; reviews
      at the bottom (summary, filters, cards, "Yes / No / Funny"); the
      "More from…" carousels and the tooltip on hovering "Follow".
- [ ] Store, fixes: the trailer — hover it: a capsule with blur at the bottom,
      a thin light bar (thicker on hover), mono time, round
      buttons; round arrows on the sides; the "More products /
      More like this" cards rounded; in "About this game" gifs/videos rounded,
      headings — Inter; all store and community text — Inter
      (was Motiva Sans) — check that nothing got thinner/larger.
- [ ] Store, the "Browse…" menu (hover an item of the store strip):
      a purple strip under the button, an accent column on the left, the tiles
      on the right (were pink and teal) — identical accent cards.
- [ ] Wishlist: game rows — cards, pill tags, mono prices
      with the discount in Aika green, "Add to Cart" — accent, "Remove" — Aika
      red; search and filters at the top; "Options" — a dark panel;
      all five menus of the store strip (including the banner and genre tiles).
- [ ] Cart (empty): blocks — cards, "Continue to payment" / "Continue
      shopping" — Aika buttons, the country list. Store search: the field, query
      tags, sorting (and the open list), result rows
      (rounding, hover), discounts, the filters on the right — cards, checkboxes.
- [ ] Friends: the list (statuses by color, tabs, groups with lines), the chat
      (the input field — rounded, a ring on focus; buttons on the right), the mini profile
      on hovering a friend (dark strips over the profile background).
- [ ] Settings: the left menu (selected — a purple strip), rows on dark
      plates, toggles (on — accent), "Storage" (the chart
      in theme colors), "Game Recording" (the intro without gold).
- [ ] Fixes (3): type something in chat — "Send" is purple; friends
      "away" — a moon, "on mobile" — an outline phone (in the status color);
      the settings menu; "…Positive" scores are green; prices in search are readable.
- [ ] **Restart Steam** (a new Patch in skin.json), open a game in the store
      (PEAK, ELDEN RING): the logo centered above the trailer, with a shadow, the text
      title hidden; no logo — the regular title. The drive list
      in "Storage", prices in search suggestions, centered tabs.
- [ ] Store, PEAK (a game in the library): the "already in library" strip — an accent
      card, "Play" / "Post" — accent, the review form, the
      "In Library" label on the purchase is purple, above "Read more" — no light blue.
      Game properties (right-click → Properties): all sections, "Betas".
- [ ] **Restart Steam** (TargetJs on the main window): on a game page
      in the library, hovering panels (achievements, friends, notes…)
      a soft purple glow follows the cursor; "What's New" and collection
      tiles — the same (not verified live there).
- [ ] **Restart Steam** (new Conditions): Millennium → themes → Aika →
      the "Top bar", "Color presets", "Advanced" tabs. Tabs
      centered by default, "Left" — like Steam. If the color editor
      shows old values — reset the theme colors (the variable names
      changed to --aika-user-*).
- [ ] "On" toggles (Notifications → "When I unlock an achievement") —
      lavender with a glow. Open any game in the library: the panels
      on the right and left appear one by one from the bottom up.
- [ ] Long game titles in the left list on hover — the "old style"
      (postponed by the author; didn't reproduce for me — need a screenshot).
- [ ] Downloads: during a download — the cover fades into purple, the "network"
      (accent) and "disk" (warm) bars, a round pause button, the bar in the bottom
      panel; the "Install" dialog — rounded, the selected folder — accent.
      (Among Us and APE OUT were installed for testing — can be removed.)
- [ ] Community → "Friends": friend cards (in game — a green strip,
      online — purple), the left menu, search, the mini profile on hover;
      the "Add Friend", "Blocked", "Followed Games" sections, groups.
- [ ] **Restart Steam** (new settings): "Advanced" → "Cursor
      glow", "Glow radius". A taller tab bar; news and notifications
      with unread items — purple; Family View — purple when active.
- [ ] Notifications — liquid glass (2026-10-06): send yourself a message /
      wait for "now playing" and look at it over a real desktop; try
      "Notifications" → "Wordmark" (blackletter / Japanese) and "Opacity".
      (Several small games were installed for testing — can be removed.)
- [ ] The news window (2026-10-07): open any game news item (the feed on
      the game page or "What's New") — a rounded panel with an accent
      outline, the event type — a purple pill, dark buttons on the right,
      a purple spinner ring instead of the Steam logo in the video block.
      The same in the store: News Hub → any news item.
- [ ] Cover tooltip (2026-10-07): hover a cover in "Recent Games"
      or in a collection — a dark rounded card without gray-blue, mono time.
- [ ] News Hub (2026-10-07): Store → News — the left menu, cards (hover — a purple outline), the curators block at the bottom; a game's news page (the banner at the top).
- [ ] A friend's mini profile IN GAME (2026-10-07): hover a playing friend in "Friends who play" — under "In game / game / status" the time without a lilac plate and line.
- [ ] "Edit Profile" (2026-10-07): go through all tabs — the left menu, picking a background/mini profile/frame (selected — a purple ring), "Privacy", "Manage Showcases"; how Steam marks the selected theme in the "Theme" tab — not checked (need a screenshot).
- [ ] The notifications dropdown (2026-10-07): one rounded frame; when notifications arrive — cards (unread are purple), "View all".
- [ ] The store logo during a sale (2026-10-07, STEEP): the whole logo over the sale banner; the store menu and hover tooltips — over the logo.
- [ ] The second batch (2026-10-07): News Hub → a Steam news item (a plate without a shadow, a purple icon); library filters; game achievements (both tabs); store search (genres); an Early Access game page and one with warnings; game discussions ("New discussion" is visible only where posting is allowed — not checked).
- [ ] After the audit: header/filter/bottom panel icons, the review, friends
      (statuses), achievements, the feed, screenshots — in Aika colors.
- [ ] **After localization (2026-10-07):** setting names in Millennium are now English
      ("Tab position", "Preset", "Custom colors", "Cursor glow", "Notification wordmark",
      "Notification opacity", "Glow radius") — the saved choices reset to defaults once;
      check that the theme loads and the settings switch.

## Next (in order)

### Fixes from the author's screenshots (SSforClaude, 2026-10-06; number = screenshot number)

The screenshot file name is the gist of the fix. Do them in number order.

- [x] **1–2. The game context menu** (right-click in the list, submenu) — no blue,
      a gap at the submenu. Done 2026-10-06.
- [x] **3. The news window** (3.png — "The Witcher 3" in the library;
      "3_news page" — the same window in the store's News Hub).
      Done 2026-10-07, see "Done".
- [x] **3b. The News Hub — the page itself** (store…/news/…, visible under
      the news window): the "Steam News" banner, the left menu ("Your news
      and events", "Search", "Options and filters"), the news list — gray-blue
      #0f1924 / #19232f / #2d3138, caps, no rounding. Hashes only →
      selectors.css. Found by the audit 2026-10-07.
- [x] **4. The left panel slid up** — done 2026-10-06.
- [x] **5. The tooltip on hovering a game cover** ("5_recolor"; library
      shelves, Valheim): a gray-blue plate with an image, "Copies
      in Family Library: 3", "YOU'VE PLAYED" in caps, the time in gray-blue.
      To do: a dark translucent card (like tooltips), rounding,
      the heading in the theme font, mono captions, mono time.
- [x] **6. A friend's mini profile — the time block background** ("6_activity
      time background bug"; hovering a friend in "Friends who play"):
      the "17.7 hrs past 2 weeks / 63.1 hrs on record" backing
      overlaps the "Climbing the Tropics 1/4" line (rich presence)
      and looks like a separate plate. Fix the position/background (see the fix
      2904ebf — the warm accent of the time block).
- [x] **7. "Edit Profile"** ("7_profile settings recolor",
      steamcommunity…/edit/info): the header with the avatar, the left menu (the selected
      item — a gray plate), section headings in caps, fields, the
      "Country" list, "About", the blue outline button "Points Shop items", a blue
      checkbox — in Aika style (like the client settings).
- [x] **8. The notifications dropdown — empty** ("8_notifications recolor",
      the bell in the header): the "View all" button is gray-blue → secondary.
- [x] **9. The community notifications page** ("9_notifications page
      recolor", steamcommunity…/notifications): notification rows
      (icon, type, time, text), the buttons on the right "Mark all as
      read" / "Settings" / "Reset", the filter checkbox — in Aika style.
- [x] **10. The notifications dropdown with a list** ("10_notifications dropdown
      recolor"): gray-blue notification cards, type
      icons ("Game discounts…", "Trade offer"), time, text —
      in Aika colors, rounded cards, hover — a warm backing.
- [x] **11. The store game logo — to the front** ("11_logo to the
      front", STEEP): the js/store-logo.js logo above the trailer
      goes under the dark strip/frame of the trailer window — raise the z-index
      so the whole logo is on top.

### Fixes from the author's screenshots, second batch (SSforClaude, 2026-10-07)

- [x] **3e. News Hub — the plate above the news window** ("3_e top
      plate, gradient transition, style", news/app/593110 — "Steam News"):
      the section banner (.AppPartnerEventsBanner) is gray-blue, the bottom edge
      is hard, the logo square is blue — fade toward the bottom, like the game banner.
- [x] **12. "Library filters"** (the filter button next to the library search,
      .AdvancedSearchPane): a gray-blue panel, light-blue group headings,
      checkboxes, dropdowns, the "tag / friend" fields, buttons at the bottom.
- [x] **13. Game achievements in the client** (game page → "Achievements"):
      the header with progress (a light-blue bar), the "My / Global" tabs,
      search and "Compare with…", gray-blue achievement cards, light-blue
      bars under the unlock time, caps.
- [x] **14. Store — "Your favorite genres"** (menu/home): a black
      plate under the genre name on a tile.
- [x] **15. Store, game page — Early Access and discussions**
      (SUPER PEOPLE): the "Early Access Game" block (a light-blue gradient,
      a yellow "Note", "Read more"), "Notice" (an orange border),
      the "Report bugs…" plate (gray, a light-blue bug, a button).
- [x] **16. Store, game page — warnings** (Spec Ops: The Line):
      "Russian language not supported", "Notice: … is not available",
      "Notice: … CIS" — orange borders → theme warning cards.
- [x] **17. Community — game discussions** (steamcommunity…/app/…/discussions):
      blue topic rows, icons (envelope, lock), "PINNED" in green,
      pagination, the right column (search, "New discussion", "Subscribe
      to forum", the forum list with a blue arrow, "Rules", "History").

1. ~~Library — an empty shelf~~ — visible on the author's screenshot (2026-10-05), styled.
2. ~~Friends on the game page~~ — verified on PEAK (2026-10-04), clean.
3. ~~Downloads — an active download~~ — done (2026-10-04).
4. **Store — leftovers** (`sections/store.css`): home, game page,
   mega menu, wishlist, cart (empty and with an item), search are done.
   Untouched: checkout (JS isn't allowed there).
   Notification toasts — liquid glass and animation (toast.css, js/toast.js);
   other types (achievement, invite) — `node tools/toast-test.js`
   can show them (NotificationStore.TestAchievement… in SharedJSContext). Not seen
   on game pages yet (capture when they show up): the "You own" block, Early Access,
   free weekends (`.free_weekend`), trials (`.pt_active`).
5. **Friends & chat — leftovers** (`sections/friends.css`): the list and direct
   chat are done. Capture when they show up: group chat (members on the right,
   channels), voice chat, friend requests, the "…" menu on a friend.
6. **Modal windows — leftovers** (`sections/settings.css`): settings and game
   properties are done; the login window and other .ModalDialogPopup — when they show up.
7. ~~JS~~ — spotlight (js/spotlight.js) and the staggered panel entrance (CSS) are done.
8. After every Steam update — re-check `selectors.css`.
9. **"Content" — leftovers** (`sections/content.css`): "Workshop Items"
   (its own markup: the right column .primary_panel, .rightSectionHolder —
   light-blue gradients), "Collections", "Valve Store"; the single
   screenshot page (sharedfiles/filedetails).

## Known limitations

- Menu windows: Steam sizes the window from a measurement of the menu box when it
  appears (including transform). So menus have no scale in the animation,
  the box has box-sizing: border-box, and the separator is no wider than the box —
  otherwise the window is narrower than the menu and the right corners get clipped (components/menu.css).

- Fraunces has no Cyrillic — large Russian headings fall back to Georgia.
- Tabs are told apart by position (`nth-of-type`), since they have no classes of their own;
  "Console" exists only in `-dev` mode.
- The game page block body background is `!important` (Steam uses it there too).
- Home page shelves aren't bento: Steam's grid computes positions itself,
  rearranging breaks scrolling and dragging.

- Steam's right column on the game page is float: right; the left column blocks
  are kept flow-root (otherwise they either slide under the column or stretch the dark
  body under it). Don't give them width: 100%.

### Intentional audit exceptions (don't fix)

- The gold of rare achievements (`RareAchievementIconGlow`, `IconGlow`) — a rarity sign.
- The gold / red / bronze "PLAYERS" online count — an inline style of a third-party Millennium plugin.
- Full-height panels — flush with the edges, no rounding.
- The red/gold online count in "Play" — the plugin's inline style (see above).
- The screenshot caption in the feed (`ScreenshotCaption`) — only the
  top right corner is rounded: it's pressed against the image edge.
- The 3D cube faces in the pre-purchase block (`CubeFace`).
- Store: colored category tiles (`content_hub_capsule_ctn .gradient` —
  each has its own paint), the red glow of the broadcast icon
  (`broadcast_live_stream_icon`), temporary sale event widgets
  (stickers etc., hash classes only) and the sale banner at the top.
- The level ring in the mini profile (`.friendPlayerLevel.lvl_N`) — Steam's level scale.
- Store, game page: the Metacritic score (its own color scale), Steam
  Awards banners (`steamawards*_app_banner`, promo styling), video
  player buttons over the video (Steam's neutral gray, hashes only),
  the gold "Award" icon under reviews.
