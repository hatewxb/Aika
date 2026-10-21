// friends.js — the friends list window (Patch ".friendsui-container" in
// skin.json; the chat windows share the class — the script works only where
// the friends list is). Concept B (author 2026-10-21): friends in game are
// cards with the game's art; sections/friends-list.css draws them from
// --aika-fl-art.
//
// Steam gives a friend in game only a small game icon
// (.FriendInGameIcon img.gameIcon, …/apps/<appid>/<hash>.jpg) and a game
// group only its icon in the header. The appid in that address gives the
// store header image (header.jpg, 460×215) — set as --aika-fl-art on the
// friend row / the group. A non-Steam game has no appid: no art, the card
// keeps its plain background.
(() => {
  "use strict";
  if (window.__aikaFriends) return;
  window.__aikaFriends = true;

  const ART = (appid) => `url("https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appid}/header.jpg")`;
  const appidOf = (img) => img?.getAttribute("src")?.match(/\/apps\/(\d+)\//)?.[1];

  const paint = (root) => {
    // a friend in game: the icon sits in the row
    for (const row of root.querySelectorAll(".friend.ingame")) {
      const id = appidOf(row.querySelector(".FriendInGameIcon img.gameIcon"));
      if (id && row.dataset.aikaArt !== id) {
        row.dataset.aikaArt = id;
        row.style.setProperty("--aika-fl-art", ART(id));
      }
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
    const list = document.querySelector(".friendlistListContainer");
    if (!list) return false;
    paint(document);
    // rows come and go as friends start and stop playing; only structure
    // (childList) is watched — the inline style set here doesn't retrigger
    new MutationObserver(queue).observe(list, { childList: true, subtree: true });
    return true;
  };

  // the list mounts after the window; give it a few seconds, then give up
  // (a chat window has none)
  if (!start()) {
    let tries = 0;
    const t = setInterval(() => { if (start() || ++tries > 20) clearInterval(t); }, 500);
  }
})();
