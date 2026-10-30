# Linux client class compatibility

## Root cause (issue #4)

Aika styles and scripts use names such as `SuperNav`, `HomeBox`,
`LibraryItemBox`, `BottomBar` and `AddGameButton`. In the tested production Linux
Steam build, the corresponding DOM elements only had CSS-module hashes. The
original Aika stylesheet and all of its imports loaded successfully, but these
selectors matched nothing. Changing injection regexes, concatenating CSS, or
pasting it into Quick CSS does not repair missing selectors.

The Store is a separate document, explaining why it could already look themed.
This fix does not add styles for sections that Aika has not designed yet.

## Implementation

- `client-classes.js` reads `sp.js` and `library.js` from Steam's own
  `https://steamloopback.host/` endpoint, once per shared client window/session.
  Nothing is fetched from third-party mapping services.
- `client-classes-core.js` parses literal CSS-module export objects without
  evaluating the bundles and derives hash → readable-name aliases.
- Original hashed classes are preserved. Native readable classes are preserved.
  Only aliases owned by the adapter are removed when their hashes disappear.
- A MutationObserver handles React rerenders, state changes and inserted
  subtrees. It does not rescan the whole document every frame or run a timer.
- Small client entry points await initial alias setup before starting the
  existing main/menu/toast/friends scripts. Modal, friends and sign-in contexts also
  receive the adapter. Web Store/Community entry points are unchanged.
- Centered navigation puts its trailing auto margin on the decorative spacer,
  rather than the final profile menu wrapper. This fixes the profile dropdown
  appearing at the far right; confirmed interactively on Umbriel.
- Theme option conditions accept both `Steam` and `Steam Games List` titles.
- There is no hard-coded hash table or persistent mapping cache. Restarting
  Steam reads its current bundles, including after client updates.
- If the bundle format changes or a fetch fails, a warning is logged and the
  original theme scripts still start. A ten-second fetch timeout bounds setup.

This requires theme JavaScript to be enabled in Millennium, as do Aika's
existing interactive features. A theme-store update can overwrite a locally
patched release; use the patched package until this is merged upstream.

## Tests

Node 22+ (no dependencies):

```sh
node --test tests/client-classes.test.mjs
```

DOM regression test: open `tests/client-classes-dom.html` through a local HTTP
server, or run Chromium from the repository root:

```sh
chromium --headless --no-sandbox --disable-gpu --allow-file-access-from-files \
  --user-data-dir=/tmp/aika-dom-tests --dump-dom --virtual-time-budget=3000 \
  "file://$PWD/tests/client-classes-dom.html"
```

Expected: `PASS: 7 DOM regression checks`. Tests cover initial/inserted DOM,
React class replacement, removal of stale state aliases, native readable class
preservation, removal of source hashes, and absence of observer feedback loops.
Parser tests cover quoted keys, deduplication, multiple bundles, Windows-style
readable names, invalid/prototype keys, and changed hashes.

## Live verification, 2026-10-22

- EndeavourOS (Arch-based), Umbriel/Wayland.
- Steam build 1791918634, Millennium v3.6.2, Aika 0.1.5.
- Full Steam restart, with the installed theme loading `js/client-main.js`
  automatically: adapter version 2 active without a console import or Quick CSS.
- Icon navigation, selected tab, wordmark and floating bottom buttons restored.
- Library Home: readable aliases present; 20 visible cover elements; computed
  cover corner radius 12px. Game details visually checked as well.
- Collections and Downloads navigation exercised; newly rendered content gained
  readable aliases while the navigation remained themed.
- Four Node tests and seven Chromium DOM regression checks passed.

Actual Windows runtime testing, all locales, chat/toasts, and the logged-out
sign-in form still need maintainer verification. Steam can change its bundle
format, so this is not a promise of compatibility with every future release.

The live checks above ran on Aika 0.1.5. The fix was then carried over to 0.1.7
with `skin.json` merged by hand (`js/client-friends.js` and the cover-press
options are new in that step); the automated tests were rerun, but the 0.1.7
merge has not been run in Steam yet.
