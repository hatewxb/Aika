const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function harness({modern = true, hostname = 'store.steampowered.com'} = {}) {
  const listeners = {}, location = {hostname, pathname: '/personalcalendar/'};
  const state = {loads: 0, starts: 0, stops: 0};
  const window = {};
  const module = {startWishlist() {
    if (window.__aikaStoreWishlist) return;
    state.starts++;
    window.__aikaStoreWishlist = {destroy() {state.stops++; delete window.__aikaStoreWishlist;}};
  }};
  const navigation = {addEventListener(name, fn) {listeners[name] = fn;}};
  window.navigation = modern ? navigation : undefined;
  let release;
  const context = vm.createContext({window, location, navigation, console,
    history: {pushState() {}, replaceState() {}},
    addEventListener(name, fn) {listeners[name] = fn;},
    loadWishlist: () => {state.loads++; return new Promise(r => {release = () => r(module);});},
  });
  const source = fs.readFileSync('js/store-router.js', 'utf8')
    .replace("import('./store-wishlist.js')", 'loadWishlist()');
  vm.runInContext(source, context);
  return {state, window, context, release: () => release(),
    async go(path) {
      location.pathname = path;
      const result = modern ? listeners.currententrychange() : context.history.pushState({}, '', path);
      await Promise.resolve();
      return result;
    },
  };
}

test('SPA wishlist starts once, stops on exit, and can start again', async () => {
  const h = harness();
  const first = h.go('/wishlist/id/example/'); h.release(); await first;
  assert.equal(h.state.starts, 1);
  const same = h.go('/wishlist/id/example/'); h.release(); await same;
  assert.equal(h.state.starts, 1);
  await h.go('/personalcalendar/'); assert.equal(h.state.stops, 1);
  const second = h.go('/wishlist/'); h.release(); await second;
  assert.equal(h.state.starts, 2);
});

test('late import cannot start effects after leaving the wishlist', async () => {
  const h = harness();
  const pending = h.go('/wishlist/');
  await h.go('/personalcalendar/'); h.release(); await pending;
  assert.equal(h.state.starts, 0);
});

test('older history API navigation also starts and stops the effect', async () => {
  const h = harness({modern: false});
  await h.go('/wishlist/'); h.release(); await new Promise(setImmediate);
  assert.equal(h.state.starts, 1);
  await h.go('/personalcalendar/'); assert.equal(h.state.stops, 1);
});

test('community pages do not install a store router', () => {
  const h = harness({hostname: 'steamcommunity.com'});
  assert.equal(h.window.__aikaStoreRouter, undefined);
  assert.equal(h.state.loads, 0);
});
