// friends.js — the friends list window (Patch ".friendsui-container" in
// skin.json; the chat windows share the class — the script works only where
// the friends list is). Concept B (author 2026-10-21): friends in game are
// cards with the game's art; sections/friends-list.css draws them from
// --aika-fl-art.
//
// Steam gives a friend in game only a small game icon
// (.FriendInGameIcon img.gameIcon, …/apps/<appid>/<hash>.jpg) and a game
// group only its icon in the header. The appid in that address gives the
// game's library background (library_hero.jpg, 3840×1240 — wide, crops well
// into a strip; author 2026-10-21) with the store header (header.jpg) under it
// for games without one — set as --aika-fl-art on the friend row / the
// group. A non-Steam game has no appid: no art, the card keeps its plain
// background.
(() => {
  "use strict";
  if (window.__aikaFriends) return;
  window.__aikaFriends = true;

  const CDN = "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/";
  const ART = (appid) => `url("${CDN}${appid}/library_hero.jpg"), url("${CDN}${appid}/header.jpg")`;
  const appidOf = (img) => img?.getAttribute("src")?.match(/\/apps\/(\d+)\//)?.[1];

  const paint = (root) => {
    // a friend in game: the icon sits in the row
    for (const row of root.querySelectorAll(".friend.ingame")) {
      const id = appidOf(row.querySelector(".FriendInGameIcon img.gameIcon"));
      if (id && row.dataset.aikaArt !== id) {
        row.dataset.aikaArt = id;
        row.style.setProperty("--aika-fl-art", ART(id));
      }
      // the game's name for the title on the art (the CSS draws it from the
      // attribute — Steam's own label stays in the flow as the status line
      // when there is no rich presence)
      const game = row.querySelector(".richPresenceLabel.gameName")?.textContent.trim() || "";
      if (row.dataset.aikaGame !== game) row.dataset.aikaGame = game;
    }
    // a game group (two friends or more in one game): the icon in its header
    for (const group of root.querySelectorAll(".friendGroup.gameGroup:not(.OtherGamesGroup)")) {
      const id = appidOf(group.querySelector(".groupName img"));
      if (id && group.dataset.aikaArt !== id) {
        group.dataset.aikaArt = id;
        group.style.setProperty("--aika-fl-art", ART(id));
      }
    }
  };

  let frame = 0;
  const queue = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; paint(document); }); };

  const start = () => {
    if (!document.querySelector(".FriendsListContent")) return false;
    paint(document);
    // rows come and go as friends start and stop playing; a search or a
    // change of the own status rebuilds whole parts of the list — the whole
    // window is watched. Only structure (childList): the attributes and the
    // inline style set here don't retrigger; a game's name changing is a
    // text node swap, so it is caught too.
    new MutationObserver(queue).observe(document.body, { childList: true, subtree: true });
    return true;
  };

  // the list mounts after the window; give it a few seconds, then give up
  // (a chat window has none)
  if (!start()) {
    let tries = 0;
    const t = setInterval(() => { if (start() || ++tries > 20) clearInterval(t); }, 500);
  }
})();
