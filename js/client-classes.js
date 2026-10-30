// Production Steam clients can expose only CSS-module hashes. Aika's readable
// selectors need the export names too. Read the running client's own bundles:
// no hard-coded hashes, remote mappings, Quick CSS, or Steam file modification.
import { collectClassAliases, observeClassAliases } from './client-classes-core.js';

function sharedWindow() {
    let host = window;
    try {
        while (host.opener && host.opener !== host &&
               new URL(host.opener.document.baseURI).origin === 'https://steamloopback.host') {
            host = host.opener;
        }
    } catch { /* A cross-origin opener is not a client context. */ }
    return host;
}

export const ready = (async () => {
    if (new URL(document.baseURI).origin !== 'https://steamloopback.host') return;
    if (window.__aikaClientClasses) return window.__aikaClientClasses;
    const host = sharedWindow();
    // Popups share one fetch/parse per Steam session. Deliberately do not store
    // maps in localStorage: a Steam update must never reuse an old hash map.
    if (!host.__aikaClassMapPromise) {
        host.__aikaClassMapPromise = Promise.all(['sp.js', 'library.js'].map(async file => {
            const response = await host.fetch(`https://steamloopback.host/${file}`, { signal: AbortSignal.timeout(10000) });
            if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
            return response.text();
        })).then(sources => {
            const map = collectClassAliases(sources);
            if (!Object.values(map).some(names => names.includes('SuperNav'))) {
                throw new Error('Steam CSS module format changed; no navigation mapping found');
            }
            return map;
        }).catch(error => {
            delete host.__aikaClassMapPromise;
            throw error;
        });
    }
    try {
        const map = await host.__aikaClassMapPromise;
        // Concurrent imports are harmless; install only one observer per window.
        if (!window.__aikaClientClasses) {
            window.__aikaClientClasses = observeClassAliases(document, map);
        }
        return window.__aikaClientClasses;
    } catch (error) {
        console.warn('[Aika] Client class compatibility:', error);
        // Keep the original theme scripts functional if Valve changes its format.
    }
})();
