// Pure parsing plus a scoped DOM adapter, kept separate for regression tests.
export function collectClassAliases(sources) {
    const map = Object.create(null);
    for (const source of sources) {
        // Parse literal CSS-module exports, never eval() a Steam bundle. Both
        // quoted and unquoted identifier keys occur in minified client builds.
        for (const [, body] of source.matchAll(/\b\w+\.exports\s*=\s*\{([^{}]+)\}/g)) {
            const pairs = /(?:^|,)\s*(?:"([A-Za-z_$][\w$]*)"|([A-Za-z_$][\w$]*))\s*:\s*"([^"\\]*)"/g;
            for (const [, quoted, bare, value] of body.matchAll(pairs)) {
                const name = quoted || bare;
                if (['__proto__', 'prototype', 'constructor'].includes(name)) continue;
                for (const hash of value.split(/\s+/)) {
                    if (!/^[A-Za-z_][\w-]{19,25}$/.test(hash) || hash === name) continue;
                    const names = map[hash] ||= [];
                    if (!names.includes(name)) names.push(name);
                }
            }
        }
    }
    return map;
}

export function observeClassAliases(document, map) {
    const owned = new WeakMap();
    const state = { version: 2, mappedElements: 0 };

    function update(element) {
        if (!element.classList) return;
        const previous = owned.get(element) || new Set();
        const wanted = new Set();
        for (const token of element.classList) {
            if (Object.hasOwn(map, token)) {
                for (const alias of map[token]) wanted.add(alias);
            }
        }
        // Remove only names we added when their source hash disappears. Never
        // remove readable classes originally supplied by Steam (e.g. Windows).
        for (const alias of previous) {
            if (!wanted.has(alias)) element.classList.remove(alias);
        }
        const next = new Set();
        for (const alias of wanted) {
            if (previous.has(alias) || !element.classList.contains(alias)) {
                next.add(alias);
                if (!element.classList.contains(alias)) element.classList.add(alias);
            }
        }
        if (next.size) owned.set(element, next);
        else owned.delete(element);
        if (!previous.size && next.size) state.mappedElements++;
    }

    function scan(root) {
        update(root);
        for (const element of root.querySelectorAll?.('[class]') || []) update(element);
    }

    scan(document.documentElement);
    const observer = new document.defaultView.MutationObserver(records => {
        const roots = new Set();
        const changed = new Set();
        for (const record of records) {
            if (record.type === 'attributes') changed.add(record.target);
            else for (const node of record.addedNodes) {
                if (node.nodeType === 1) roots.add(node);
            }
        }
        // Only scan added subtrees and changed elements, not the entire library
        // every frame. Idempotence prevents MutationObserver feedback loops.
        for (const root of roots) if (root.isConnected) scan(root);
        for (const element of changed) if (element.isConnected) update(element);
    });
    observer.observe(document.documentElement, {
        subtree: true, childList: true, attributes: true, attributeFilter: ['class']
    });
    document.defaultView.addEventListener('pagehide', () => observer.disconnect(), { once: true });
    return state;
}
