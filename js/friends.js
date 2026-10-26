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

  // Newer games keep their images under a hashed folder (…/apps/<id>/<hash>/
  // header.jpg) — both plain addresses fail (WARDOGS, 2026-10-26). Then the
  // store's appdetails gives the real header address; one request per game,
  // remembered for the window's life.
  const fixed = new Map();   // appid → a css url(), or "" while it is checked
  const loads = (url) => new Promise((ok) => {
    const img = new Image();
    img.onload = () => ok(true);
    img.onerror = () => ok(false);
    img.src = url;
  });
  const checkArt = async (appid) => {
    if (fixed.has(appid)) return;
    fixed.set(appid, "");
    if (await loads(`${CDN}${appid}/library_hero.jpg`) || await loads(`${CDN}${appid}/header.jpg`)) return;
    try {
      const r = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appid}&filters=basic`);
      const url = (await r.json())?.[appid]?.data?.header_image;
      if (!url) return;
      fixed.set(appid, `url("${url}")`);
      queue();
    } catch { /* offline or the API changed — the card keeps the preset's light */ }
  };
  const artOf = (appid) => { checkArt(appid); return fixed.get(appid) || ART(appid); };

  // Party size: Steam shows a party ("+1 With 1 more player") only in a game's
  // own group, not in the mixed "In game" one. The friends store lives in the
  // opener (SharedJSContext); a row has no steamid, so the persona is found by
  // its avatar hash in the row's avatar address.
  const partyOf = (row) => {
    try {
      const src = row.querySelector("img.avatar")?.getAttribute("src") || "";
      const cache = window.opener?.g_FriendsUIApp?.FriendStore?.m_mapPlayerCache;
      if (!src || !cache) return 0;
      for (const player of cache.values()) {
        const p = player.m_persona;
        if (p?.m_strAvatarHash && src.includes(p.m_strAvatarHash)) {
          return parseInt(p.m_mapRichPresence?.get("steam_player_group_size"), 10) || 0;
        }
      }
    } catch { /* the store's shape changed — no party mark */ }
    return 0;
  };

  const paint = (root) => {
    // a friend in game: the icon sits in the row
    for (const row of root.querySelectorAll(".friend.ingame")) {
      const id = appidOf(row.querySelector(".FriendInGameIcon img.gameIcon"));
      if (id) {
        const art = artOf(id);
        if (row.dataset.aikaArt !== id || row.style.getPropertyValue("--aika-fl-art") !== art) {
          row.dataset.aikaArt = id;
          row.style.setProperty("--aika-fl-art", art);
        }
      }
      // the game's name for the title on the art (the CSS draws it from the
      // attribute — Steam's own label stays in the flow as the status line
      // when there is no rich presence)
      const game = row.querySelector(".richPresenceLabel.gameName")?.textContent.trim() || "";
      if (row.dataset.aikaGame !== game) row.dataset.aikaGame = game;
      // "+N" — the others in their party, as Steam counts it; on the label
      // block, drawn to the right of the name and the status
      const status = row.querySelector(".labelHolder");
      if (status && row.closest(".OtherGamesGroup")) {
        const size = partyOf(row);
        const mark = size > 1 ? "+" + (size - 1) : "";
        if ((status.dataset.aikaParty || "") !== mark) {
          if (mark) status.dataset.aikaParty = mark;
          else delete status.dataset.aikaParty;
        }
      }
    }
    // A lobby as a squad capsule (concept D, author 2026-10-27). Steam marks
    // the friends of one party .firstInGroup / .inGroup / .lastInGroup and adds
    // a footer "+N with N more players" for the members who aren't friends.
    // When a game group holds exactly one lobby and nobody else, its
    // container gets the lobby's activity (the first status line that isn't
    // the game's name), the others' count and the total — the CSS draws the
    // capsule from them. Attributes only: Steam's rows stay as they are.
    for (const box of root.querySelectorAll(".friendGroup.gameGroup:not(.OtherGamesGroup) > .friendsContainer")) {
      const rows = [...box.querySelectorAll(":scope > .friend")];
      const lobby = rows.filter((r) => r.matches(".firstInGroup, .inGroup, .lastInGroup"));
      const one = lobby.length >= 2 && lobby.length === rows.length && box.querySelectorAll(":scope > .friend.firstInGroup").length === 1;
      if (!one) {
        if (box.dataset.aikaLobby !== undefined) {
          delete box.dataset.aikaLobby;
          delete box.dataset.aikaLobbyExtra;
          delete box.dataset.aikaLobbySize;
        }
        continue;
      }
      const label = [...rows[0].querySelectorAll(".richPresenceLabel")].find((l) => !l.classList.contains("gameName"));
      const mode = (label || rows[0].querySelector(".richPresenceLabel"))?.textContent.trim() || "";
      const extra = parseInt(box.querySelector(".SteamPlayerGroupFooter .count")?.textContent.replace(/\D/g, ""), 10) || 0;
      const size = String(rows.length + extra);
      if (box.dataset.aikaLobby !== mode) box.dataset.aikaLobby = mode;
      const more = extra ? "+" + extra : "";
      if ((box.dataset.aikaLobbyExtra || "") !== more) {
        if (more) box.dataset.aikaLobbyExtra = more;
        else delete box.dataset.aikaLobbyExtra;
      }
      // on the first face too — the count pill is drawn from it
      if (box.dataset.aikaLobbySize !== size) box.dataset.aikaLobbySize = size;
      if (rows[0].dataset.aikaLobbySize !== size) rows[0].dataset.aikaLobbySize = size;
    }

    // a game group (two friends or more in one game): the icon in its header
    for (const group of root.querySelectorAll(".friendGroup.gameGroup:not(.OtherGamesGroup)")) {
      const id = appidOf(group.querySelector(".groupName img"));
      if (id) {
        const art = artOf(id);
        if (group.dataset.aikaArt !== id || group.style.getPropertyValue("--aika-fl-art") !== art) {
          group.dataset.aikaArt = id;
          group.style.setProperty("--aika-fl-art", art);
        }
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
    // a party grows and shrinks without the list changing shape
    setInterval(queue, 5000);
    return true;
  };

  // "Group chats": Steam toggles the section only by its 17 px double arrow;
  // the caption is the drag bar that resizes the section. A click on the
  // caption that didn't drag (moved under 4 px) toggles it too.
  let down = null;
  document.addEventListener("mousedown", (e) => {
    down = e.target.closest?.(".FriendsListChatSection .voiceRoomDragBar") ? [e.clientX, e.clientY] : null;
  }, true);
  document.addEventListener("click", (e) => {
    if (!down || !e.target.closest?.(".FriendsListChatSection .voiceRoomDragBar")) return;
    const moved = Math.hypot(e.clientX - down[0], e.clientY - down[1]);
    down = null;
    if (moved < 4) document.querySelector(".FriendsListChatSection .ToggleGroupChatList")?.click();
  }, true);

  // the list mounts after the window; give it a few seconds, then give up
  // (a chat window has none)
  if (!start()) {
    let tries = 0;
    const t = setInterval(() => { if (start() || ++tries > 20) clearInterval(t); }, 500);
  }
})();
