import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { isLinuxClient, collectClassAliases } from '../js/client-classes-core.js';

test('platform gate honors Steam and never affects Windows or web pages', () => {
    assert.equal(isLinuxClient('https://steamloopback.host/index.html?PLATFORM=windows', 'Linux'), false);
    assert.equal(isLinuxClient('https://steamloopback.host/index.html?PLATFORM=linux', 'Win32'), true);
    assert.equal(isLinuxClient('https://steamloopback.host/index.html', 'Linux x86_64'), true);
    assert.equal(isLinuxClient('https://steamloopback.host/index.html', 'Win32'), false);
    assert.equal(isLinuxClient('https://store.steampowered.com/?PLATFORM=linux', 'Linux'), false);
    assert.equal(isLinuxClient('about:blank', 'Linux'), false);
});

async function startup(platform, fail = false) {
    const state = { fetches: 0, observers: 0, warnings: 0, markers: [] };
    const document = {
        baseURI: `https://steamloopback.host/index.html?PLATFORM=${platform}`,
        documentElement: { classList: { add: name => state.markers.push(name) } },
    };
    const window = { fetch: async () => {
        state.fetches++;
        if (fail) throw Error('test unavailable bundle');
        return { ok: true, text: async () => 'x.exports={SuperNav:"_123456789012345678901"}' };
    } };
    const context = vm.createContext({ window, document, URL, AbortSignal,
        navigator: {platform: platform === 'windows' ? 'Win32' : 'Linux x86_64'},
        console: {warn: () => state.warnings++}, collectClassAliases, isLinuxClient,
        observeClassAliases: () => {state.observers++; return {version: 2};},
    });
    const source = fs.readFileSync(new URL('../js/client-classes.js', import.meta.url), 'utf8')
        .replace(/^import .*;\r?\n/m, '').replace('export const ready', 'globalThis.ready');
    vm.runInContext(source, context); await context.ready;
    return state;
}

test('actual adapter startup on Windows has no fetch, observer or Linux marker', async () => {
    assert.deepEqual(await startup('windows'), {fetches: 0, observers: 0, warnings: 0, markers: []});
});
test('Linux startup fetches local bundles and installs one adapter', async () => {
    assert.deepEqual(await startup('linux'), {fetches: 2, observers: 1, warnings: 0, markers: ['aika-linux']});
});
test('Linux bundle failure resolves ready so original entry scripts can start', async () => {
    const state = await startup('linux', true);
    assert.equal(state.fetches, 2); assert.equal(state.observers, 0); assert.equal(state.warnings, 1);
});

test('merged manifest retains scroll defaults, localization and Linux window options', () => {
    const skin = JSON.parse(fs.readFileSync(new URL('../skin.json', import.meta.url)));
    assert.equal(skin.Conditions['Library scrolling'].default, 'Standard');
    for (const mode of ['Soft', 'Cinematic']) {
        const affects = skin.Conditions['Library scrolling'].values[mode].TargetCss.affects;
        for (const title of ['Steam', 'Steam Games List']) assert(affects.some(s => new RegExp(s).test(title)));
    }
    const patch = skin.Patches.find(p => p.TargetJs === 'js/client-main.js');
    assert(new RegExp(patch.MatchRegexString).test('Steam Games List'));
    assert.match(fs.readFileSync(new URL('../js/main.js', import.meta.url), 'utf8'), /import "\.\/library-scroll.js"/);
    assert.match(fs.readFileSync(new URL('../js/store-hero.js', import.meta.url), 'utf8'), /store-l10n.js/);
    assert.doesNotMatch(fs.readFileSync(new URL('../background.css', import.meta.url), 'utf8'), /^html:has\(> body\.OverlayPopupBody\)/m);
    const library = fs.readFileSync(new URL('../sections/library.css', import.meta.url), 'utf8');
    assert.match(library, /aika-scroll-trails/); assert.match(library, /GamePlaySummaryContainer/);
});
