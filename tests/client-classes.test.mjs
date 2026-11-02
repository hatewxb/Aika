import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectClassAliases } from '../js/client-classes-core.js';

const hash = '_123456789012345678901';
test('reads literal CSS exports, deduplicates and merges bundles', () => {
    const map = collectClassAliases([
        `e.exports={HomeBox:"${hash}","SuperNav":"${hash}",narrowWidth:"500px"}`,
        `x.exports={HomeBox:"${hash}"}`,
    ]);
    assert.deepEqual(map[hash], ['HomeBox', 'SuperNav']);
    assert.equal(Object.keys(map).length, 1);
    assert.equal(Object.getPrototypeOf(map), null);
});
test('handles readable Windows classes alongside hashes', () => {
    assert.deepEqual(collectClassAliases([`x.exports={HomeBox:"${hash} HomeBox"}`])[hash], ['HomeBox']);
});
test('ignores non-class values and prototype keys without executing code', () => {
    const map = collectClassAliases([
        `x.exports={width:"500px",color:"#abcdef",constructor:"${hash}",__proto__:"${hash}"};throw Error("not executed")`,
    ]);
    assert.equal(Object.keys(map).length, 0);
});
test('recognizes new hashes after a Steam update without a stored table', () => {
    const next = '_abcdefghijklmnopqrstu';
    assert.deepEqual(collectClassAliases([`e.exports={HomeBox:"${next}"}`])[next], ['HomeBox']);
    assert.equal(collectClassAliases([`e.exports={HomeBox:"${next}"}`])[hash], undefined);
});
