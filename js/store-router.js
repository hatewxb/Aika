// Steam's React store can enter/leave the wishlist without a document load.
// Millennium's URL patches only run on full loads, so also follow SPA routes.
(() => {
  if (location.hostname !== 'store.steampowered.com' || window.__aikaStoreRouter) return;
  window.__aikaStoreRouter = true;
  let generation = 0;
  const wishlist = () => /^\/wishlist(?:\/|$)/.test(location.pathname);
  const route = async () => {
    const current = ++generation;
    if (!wishlist()) { window.__aikaStoreWishlist?.destroy(); return; }
    try {
      const module = await import('./store-wishlist.js');
      if (current === generation && wishlist()) module.startWishlist();
    } catch (error) { console.warn('[Aika] Wishlist route:', error); }
  };
  if (window.navigation) {
    navigation.addEventListener('currententrychange', route);
  } else {
    for (const name of ['pushState', 'replaceState']) {
      const original = history[name];
      history[name] = function (...args) {
        const result = original.apply(this, args);
        route();
        return result;
      };
    }
    addEventListener('popstate', route);
  }
  route();
})();
