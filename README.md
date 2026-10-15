<div align="center">

# Aika

**A warm dark theme for Steam** · [Millennium](https://steambrew.app) · 0.1.3 · by **hatewxb**

**[Get it on Steambrew](https://steambrew.app/theme/uV8M1eg45Hh662blPuyD)** — the official Millennium theme store

https://github.com/user-attachments/assets/48f5941a-a2c6-4d1c-a721-8e7a3f79c630

| | |
|:--:|:--:|
| ![Startup and store home](screenshots/gifs/01-startup-store-home.gif) | ![Store menus](screenshots/gifs/02-store-menus.gif) |
| **Startup and store home** | **Store menus** |
| ![Store search](screenshots/gifs/03-store-search.gif) | ![Wishlist](screenshots/gifs/04-wishlist.gif) |
| **Store search** | **Wishlist** |
| ![Family View and library home](screenshots/gifs/05-family-view-library-home.gif) | ![Game page: library and Cinematic store](screenshots/gifs/06-game-page.gif) |
| **Family View and library home** | **Game page: library and Cinematic store** |
| ![Friends Activity](screenshots/gifs/07-friends-activity.gif) | ![Library menus](screenshots/gifs/08-library-menus.gif) |
| **Friends Activity** | **Library menus** |

![Aika — a game page in the library](screenshots/library-game.png)

*A game page in the library*

</div>

A calm dark interface on a near-black background with soft spots of warm
light. Fluent structure, rounded corners, one signature accent instead of
Steam's light blue. The theme doesn't change any Steam text, only the look.

- **Game logo above the trailer** in the store and an Apple-style **trailer player**.
- **Cinematic store game page**: trailers play muted behind the logo,
  price and buttons over the whole window, with a media gallery and viewer
  (the classic layout is one setting away).
- **Menus that unfold** like cards with their items rising in; the library's Add a Game is a floating + button.
- **Motion throughout**: a line-reveal loading curtain as Steam starts, page
  changes behind a soft curtain, achievement bars that fill on a spring,
  letters that fold, split or stand up like dominoes in page titles.
- **Living backdrops**: an aurora on store search, a dark veil on the wishlist,
  both in the colors of your preset.
- **Four color presets**: Aika, Hello Bert, Greeny and Rose Ash.
- **Screenshots grouped by game** in the profile: a carousel shelf per game.
- **Library covers** that tilt toward the cursor in 3D, and floating library icons.
- **Privacy blur** for the wallet balance in the account menu until you hover it.
- **Top bar tabs centered** (can be moved back to the left).
- **Performance** setting: Full by default; Balanced calms the ambient motion; Low turns off every Aika animation and heavy effect (blur, glass, WebGL) and keeps the plain Fluent look for weaker machines.

## Screenshots

| Library | Store |
|:--:|:--:|
| ![Library](screenshots/library-home.jpg) | ![Store](screenshots/store-home.jpg) |
| **Store game page** (Cinematic) | **Store search** |
| ![Store game page](screenshots/store-app.jpg) | ![Store search](screenshots/store-search.jpg) |
| **Wishlist** | **Friends** |
| ![Wishlist](screenshots/store-wishlist.jpg) | ![Friends](screenshots/community-friends.png) |
| **Screenshots by game** | **Settings** |
| ![Screenshots by game](screenshots/community-screenshots.png) | ![Settings](screenshots/settings.png) |

**Color presets** — Hello Bert, Greeny, Rose Ash (Aika is above):

| | | |
|:--:|:--:|:--:|
| ![Hello Bert](screenshots/preset-hello-bert.jpg) | ![Greeny](screenshots/preset-greeny.jpg) | ![Rose Ash](screenshots/preset-rose-ash.jpg) |

## Installation

### From Steambrew (recommended)

Aika is in the official Millennium theme store:
[steambrew.app/theme/uV8M1eg45Hh662blPuyD](https://steambrew.app/theme/uV8M1eg45Hh662blPuyD).

1. Install [Millennium](https://steambrew.app).
2. On the [Aika page](https://steambrew.app/theme/uV8M1eg45Hh662blPuyD), press **Copy Theme ID**.
3. In Steam: the **Steam** menu (top left) → **Millennium** → **Themes** → **Install a theme**, then paste the ID.
4. Pick **Aika** in the theme list. If theme scripts are disabled, enable them.

### Manual

1. Install [Millennium](https://steambrew.app).
2. Download `Aika-<version>.zip` from [Releases](../../releases).
3. Extract the `Aika` folder into `C:\Program Files (x86)\Steam\millennium\themes\`.
4. Steam → **Millennium → Themes** → **Aika**. If theme scripts are disabled, enable them.

Theme settings (the gear next to Aika in Millennium): **Main** — top bar tab
position, store game page layout (Cinematic / Classic), library covers (3D
tilt / Lift / Zoom), cursor glow and its radius, privacy blur of the wallet
balance (or name and balance) in the account menu until hovered, color preset,
notification wordmark and opacity, performance (Full / Balanced / Low); **Advanced** — custom colors, set on the
**Colors** page.

## Roadmap

| Section | Done | Not done yet |
|:--|:--|:--|
| Library | Home, game list, game page, game news, achievements, filters, collections, floating bottom icons | Long game titles on hover |
| Store | Home, menu capsule and all menus, game page (Classic and Cinematic, Early Access, warnings, queue), search, wishlist, discovery queue, cart, checkout (payment info), News Hub | Purchase steps after payment info, free weekends and trials |
| Community | Activity, friends, screenshots, artwork, videos, profile editing, notifications, discussions home, game discussions | Workshop, collections, profile, the rest of the game community hub |
| Friends & chat | Friends list, direct chat, mini profiles | Group and voice chat, friend requests |
| Downloads | Everything | — |
| Settings & windows | Settings, game properties, dialogs, Family View (client PIN and web page), the sign-in window while signing in | The sign-in form (no saved account) |
| General | Menus, tooltips, notifications dropdown, notification toasts (message, "now playing", download) — liquid glass, smooth entrance; color presets (Aika, Hello Bert, Greeny, Rose Ash); the startup loading curtain and page transitions | Other notifications, Big Picture, overlay |

## Licenses

The Inter, Geist Mono, Fraunces, UnifrakturMaguntia and Shojumaru fonts are
licensed under the SIL Open Font License 1.1 (`assets/fonts/OFL-*.txt`). The
notification liquid glass is [hyalite](https://github.com/VII-Cae/hyalite--liquid-glass),
MIT (`js/vendor/LICENSE-hyalite.txt`). The aurora and dark veil backdrops port the
shaders of [React Bits](https://reactbits.dev) (MIT + Commons Clause); several
motions follow ideas from React Bits and [Motion](https://motion.dev) examples.
