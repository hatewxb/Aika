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
    // Lobbies as squad capsules (concept D, author 2026-10-27). Steam marks the
    // friends of one party .firstInGroup / .inGroup / .lastInGroup; when the
    // party has members who aren't friends, a footer (.SteamPlayerGroupFooter
    // .lastInGroup, "+N with N more players") closes it instead of the last
    // friend. Every lobby of a game group — one friend with strangers too —
    // gets: on each face data-aika-lobby-tile and its row (--aika-lobby-row,
    // one row per lobby); on the first face the activity (the first status
    // line that isn't the game's name, data-aika-lobby-mode and the quoted
    // --aika-lobby-mode for the CSS's content) and the capsule's
    // size (--aika-lobby-n, the faces plus "+N"); on the last face
    // data-aika-lobby-end — "+N", or "0" for no strangers (no link out of
    // it). Friends outside a lobby stay rows under the capsules. Attributes
    // and custom properties only: Steam's rows stay as they are.
    const mark = (el, key, value) => {
      if ((el.dataset[key] ?? null) === (value || null)) return;
      if (value) el.dataset[key] = value;
      else delete el.dataset[key];
    };
    const prop = (el, key, value) => {
      if (el.style.getPropertyValue(key) === value) return;
      if (value) el.style.setProperty(key, value);
      else el.style.removeProperty(key);
    };
    for (const box of root.querySelectorAll(".friendGroup.gameGroup:not(.OtherGamesGroup) > .friendsContainer")) {
      const lobbies = [];
      let cur = null;
      for (const el of box.children) {
        if (el.matches(".friend.firstInGroup")) {
          cur = { faces: [el], extra: 0 };
          lobbies.push(cur);
          if (el.classList.contains("lastInGroup")) cur = null;
        } else if (cur && el.matches(".friend:is(.inGroup, .lastInGroup)")) {
          cur.faces.push(el);
          if (el.classList.contains("lastInGroup")) cur = null;
        } else if (cur && el.matches(".SteamPlayerGroupFooter")) {
          cur.extra = parseInt(el.querySelector(".count")?.textContent.replace(/\D/g, ""), 10) || 0;
          cur = null;
        } else cur = null;
      }
      // one friend alone (no strangers) is no lobby — a plain row
      const real = lobbies.filter((l) => l.faces.length > 1 || l.extra);
      const want = new Map();   // face → [row, mode, n, end]
      real.forEach((l, i) => {
        const first = l.faces[0];
        const label = [...first.querySelectorAll(".richPresenceLabel")].find((x) => !x.classList.contains("gameName"));
        const mode = (label || first.querySelector(".richPresenceLabel"))?.textContent.trim() || " ";
        const n = String(l.faces.length + (l.extra ? 1 : 0));
        l.faces.forEach((f, k) => want.set(f, [String(i + 1), k ? "" : mode, k ? "" : n, k === l.faces.length - 1 ? (l.extra ? "+" + l.extra : "0") : ""]));
      });
      mark(box, "aikaLobbies", real.length ? String(real.length) : "");
      for (const f of box.querySelectorAll(":scope > .friend")) {
        const [row = "", mode = "", n = "", end = ""] = want.get(f) || [];
        mark(f, "aikaLobbyTile", row ? "1" : "");
        mark(f, "aikaLobbyMode", mode);
        mark(f, "aikaLobbyEnd", end);
        prop(f, "--aika-lobby-row", row);
        prop(f, "--aika-lobby-n", n);
        // the CSS draws it with content: var() — a quoted string
        prop(f, "--aika-lobby-mode", mode ? JSON.stringify(mode) : "");
      }
    }

    // "Unread messages" as one notice (concept B, author 2026-10-27): Steam's
    // header of the group gets the senders' faces, their names and the total
    // count; a click on it is Steam's own collapse. Collapsed, Steam drops the
    // rows, so the senders come from the chat store in the opener.
    const unread = root.querySelector(".unreadChatsGroup > .friendGroup");
    const head = unread?.querySelector(":scope > .groupName");
    if (head) {
      let chats = [];
      try { chats = window.opener.g_FriendsUIApp.ChatStore.FriendChatStore.GetFriendsWithUnreadMessages() || []; } catch { /* the store's shape changed — Steam's plain header */ }
      const total = chats.reduce((n, c) => n + (c.unread_message_count || 0), 0);
      const faces = chats.slice(0, 3).map((c) => c.chat_partner?.persona?.avatar_url_medium || "");
      const names = chats.map((c) => c.name).join(" · ");
      const sign = total ? [total, names, ...faces].join("|") : "";
      // (React may rebuild the header and drop the added parts)
      if ((unread.dataset.aikaUnread || "") !== sign || (sign && !head.querySelector(":scope > .aika-unread-total"))) {
        head.querySelectorAll(":scope > [class^='aika-unread-']").forEach((el) => el.remove());
        if (sign) {
          const add = (cls, text) => {
            const el = document.createElement("span");
            el.className = cls;
            if (text) el.textContent = text;
            head.append(el);
            return el;
          };
          const stack = add("aika-unread-faces");
          for (const src of faces) {
            const img = document.createElement("img");
            img.src = src;
            img.alt = "";
            stack.append(img);
          }
          add("aika-unread-names", names);
          add("aika-unread-total", String(total));
        }
        mark(unread, "aikaUnread", sign);
      }
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

  // The window's background pattern (author 2026-10-27, after React Bits
  // "Halftone Wave" / "Blinking Squares"): the "Friends background" setting
  // puts --aika-fl-bg (halftone | squares) on :root, the opacity slider
  // --aika-setting-fl-bg-opacity. Drawn on a canvas at a fraction of the
  // window's size and stretched by CSS — the smoothing is the blur, nothing
  // to filter. Few frames (setTimeout, not rAF: at 165 Hz rAF would wake the
  // thread for nothing), none while the window is hidden; one still frame
  // with --aika-motion: 0 (Performance: Low, reduced motion).
  const bg = (() => {
    const FPS = 12;
    let canvas = null, ctx = null, kind = "", timer = 0, colors = ["#8b7ff0", "#c792ea"], still = false;
    const cell = { halftone: 16, squares: 22 };   // the grid step, CSS px
    const scale = { halftone: 0.4, squares: 0.25 };
    const seed = [];
    const read = () => {
      const css = getComputedStyle(document.documentElement);
      colors = [css.getPropertyValue("--aika-accent").trim() || colors[0], css.getPropertyValue("--aika-light-2").trim() || colors[1]];
      still = css.getPropertyValue("--aika-motion").trim() === "0";
      return css.getPropertyValue("--aika-fl-bg").trim();
    };
    const size = () => {
      const s = scale[kind];
      canvas.width = Math.ceil(innerWidth * s);
      canvas.height = Math.ceil(innerHeight * s);
    };
    const draw = (t) => {
      const { width: w, height: h } = canvas;
      const s = scale[kind], step = cell[kind] * s;
      ctx.clearRect(0, 0, w, h);
      const cols = Math.ceil(w / step) + 1, rows = Math.ceil(h / step) + 1;
      if (kind === "halftone") {
        // dots grow and shrink in a wave running from the bottom left
        ctx.fillStyle = colors[0];
        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            const wave = Math.sin(x * 0.35 - y * 0.22 - t * 1.3) * 0.5 + 0.5;
            const r = step * 0.34 * wave * wave;
            if (r < 0.3) continue;
            ctx.beginPath();
            ctx.arc(x * step, y * step, r, 0, 6.2832);
            ctx.fill();
          }
        }
      } else {
        // a few squares light up and fade, each on its own beat
        while (seed.length < cols * rows) seed.push([Math.random() * 40, 4 + Math.random() * 6, Math.random() < 0.5 ? 0 : 1]);
        const side = step - Math.max(1, step * 0.18);
        for (let i = 0; i < cols * rows; i++) {
          const [phase, period, tone] = seed[i];
          const p = ((t + phase) % period) / period;            // 0..1 within its beat
          const a = p < 0.12 ? Math.sin(p / 0.12 * Math.PI) : 0;   // a short blink
          if (a < 0.02) continue;
          ctx.globalAlpha = a;
          ctx.fillStyle = colors[tone];
          ctx.fillRect((i % cols) * step, Math.floor(i / cols) * step, side, side);
        }
        ctx.globalAlpha = 1;
      }
    };
    const tick = () => {
      timer = 0;
      if (!canvas || document.hidden) return;   // visibilitychange starts it again
      draw(performance.now() / 1000);
      if (!still) timer = setTimeout(tick, 1000 / FPS);
    };
    // "Friends list layout": Steam's own compact list setting, set from the
    // theme's settings (--aika-fl-density: compact | normal); "As in Steam"
    // leaves it alone, so Steam's own switch keeps working
    const density = () => {
      const want = getComputedStyle(document.documentElement).getPropertyValue("--aika-fl-density").trim();
      if (want !== "compact" && want !== "normal") return;
      try {
        const store = window.opener.g_FriendsUIApp.SettingsStore;
        const s = store.FriendsSettings;
        if (s && s.bCompactFriendsList !== (want === "compact")) store.BUpdateFriendsSettings({ ...s, bCompactFriendsList: want === "compact" });
      } catch { /* the store's shape changed — Steam's setting stays as it is */ }
    };
    // "Friend search: Command line" — a class for the CSS, and the found count
    // next to the field (the rows Steam shows in the search results)
    const FOUND = (() => {
      try { return /^russian/i.test(new URLSearchParams(window.opener.location.search).get("LANGUAGE")) ? "найдено" : "found"; } catch { return "found"; }
    })();
    const search = () => {
      const cmd = getComputedStyle(document.documentElement).getPropertyValue("--aika-fl-search").trim() === "cmd";
      document.documentElement.classList.toggle("aika-fl-search-cmd", cmd);
      const box = document.querySelector(".TabSearchButton .inputContainer");
      const input = box?.querySelector("input.friendSearchInput");
      const text = cmd && input?.value.trim() ? `${document.querySelectorAll(".friendlistListContainer:not(.rcp-list) .friend").length} ${FOUND}` : "";
      if (box && (box.dataset.aikaFound || "") !== text) {
        if (text) box.dataset.aikaFound = text;
        else delete box.dataset.aikaFound;
      }
    };
    document.addEventListener("input", (e) => { if (e.target.matches?.("input.friendSearchInput")) requestAnimationFrame(search); }, true);
    let state = "";
    const sync = () => {
      density();
      search();
      const want = read();
      const next = cell[want] ? want : "";
      const key = [next, still, ...colors].join("|");
      if (key === state) return;
      state = key;
      clearTimeout(timer);
      timer = 0;
      kind = next;
      document.documentElement.classList.toggle("aika-fl-pattern", !!kind);
      if (!kind) { canvas?.remove(); canvas = ctx = null; return; }
      if (!canvas) {
        canvas = document.createElement("canvas");
        canvas.className = "aika-fl-bg";
        canvas.setAttribute("aria-hidden", "true");
        document.body.prepend(canvas);
        ctx = canvas.getContext("2d");
      }
      size();
      tick();
    };
    // only the friends list window calls this (the chat windows load the script too)
    return () => {
      sync();
      addEventListener("resize", () => { if (canvas) { size(); draw(performance.now() / 1000); } });
      // the setting, the preset's colors and Performance change without a reload
      setInterval(sync, 1000);
      document.addEventListener("visibilitychange", () => { if (!document.hidden && canvas && !timer && !still) tick(); });
    };
  })();

  let frame = 0;
  const queue = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; paint(document); }); };

  const start = () => {
    if (!document.querySelector(".FriendsListContent")) return false;
    paint(document);
    bg();
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
