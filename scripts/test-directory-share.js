'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const app = fs.readFileSync(require.resolve('../public/app.js'), 'utf8');
const directoryCode = app.slice(app.indexOf('/* ---- Directory search & filter ---- */'),
  app.indexOf('  // Hero search redirect')) + '})();';

function element(dataset = {}) {
  return {
    dataset, value: '', textContent: '', hidden: false, disabled: false,
    listeners: {}, classList: { toggle() {}, add() {}, remove() {} },
    addEventListener(type, callback) { this.listeners[type] = callback; },
    setAttribute() {}, insertBefore() {},
    focus() { this.focused = true; },
    select() { this.selected = true; }
  };
}

function setup(query = '', clipboard) {
  const ids = {};
  ['dirSearch', 'truckGrid', 'dirCount', 'clearDirFilters', 'copyDirLink',
    'dirShareStatus', 'dirShareFallback', 'dirShareUrl', 'noResults']
    .forEach(id => { ids[id] = element(); });
  const county = element({ county: 'Camden County' });
  const cuisine = element({ cuisine: 'Tacos' });
  const sorts = [element({ sort: 'default' }), element({ sort: 'recently-verified' })];
  const location = new URL('https://example.com/directory' + query);
  const listeners = {};
  const window = {
    location, addEventListener(type, callback) { listeners[type] = callback; },
    setTimeout() { return 1; }, clearTimeout() {},
    history: {
      pushState(_state, _title, url) { location.href = new URL(url, location).href; },
      replaceState(_state, _title, url) { location.href = new URL(url, location).href; }
    }
  };
  vm.runInNewContext(directoryCode, {
    window, navigator: { clipboard }, URL, URLSearchParams,
    document: {
      getElementById(id) { return ids[id]; },
      querySelectorAll(selector) {
        if (selector.includes('data-county')) return [county];
        if (selector.includes('data-cuisine')) return [cuisine];
        if (selector.includes('data-sort')) return sorts;
        return [];
      }
    }
  });
  return { ids, county, cuisine, sorts, location, listeners };
}

test('copy action follows search, county, cuisine, sort, clear, and back navigation', () => {
  const { ids, county, cuisine, sorts, location, listeners } = setup();
  assert.equal(ids.copyDirLink.hidden, true);
  for (const button of [county, cuisine, sorts[1]]) {
    button.listeners.click();
    assert.equal(ids.copyDirLink.hidden, false);
    ids.clearDirFilters.listeners.click();
    assert.equal(ids.copyDirLink.hidden, true);
  }
  ids.dirSearch.value = 'pizza';
  ids.dirSearch.listeners.input();
  assert.equal(ids.copyDirLink.hidden, false);
  location.search = '';
  listeners.popstate();
  assert.equal(ids.copyDirLink.hidden, true);
  location.search = '?q=tacos';
  listeners.popstate();
  assert.equal(ids.copyDirLink.hidden, false);
});

test('copies the full current filtered URL and announces success', async () => {
  let copied;
  const { ids, location } = setup('?q=fish%20%26%20chips&county=Camden+County&cuisine=Tacos&sort=recently-verified&utm_source=test#results',
    { async writeText(url) { copied = url; } });
  await ids.copyDirLink.listeners.click();
  const url = new URL(copied);
  assert.equal(url.origin + url.pathname, location.origin + location.pathname);
  assert.equal(url.searchParams.get('q'), 'fish & chips');
  assert.equal(url.searchParams.get('county'), 'Camden County');
  assert.equal(url.searchParams.get('cuisine'), 'Tacos');
  assert.equal(url.searchParams.get('sort'), 'recently-verified');
  assert.equal(url.searchParams.get('utm_source'), 'test');
  assert.equal(url.hash, '#results');
  assert.equal(ids.dirShareStatus.textContent, 'Link copied!');
  assert.equal(ids.dirShareFallback.hidden, true);
  assert.equal(ids.copyDirLink.disabled, false);
});

test('missing or denied clipboard provides a focused selected manual-copy link', async () => {
  for (const clipboard of [undefined, { async writeText() { throw new Error('Denied'); } }]) {
    const { ids, location } = setup('?q=tacos', clipboard);
    await ids.copyDirLink.listeners.click();
    assert.equal(ids.dirShareFallback.hidden, false);
    assert.equal(ids.dirShareUrl.value, location.href);
    assert.equal(ids.dirShareUrl.focused, true);
    assert.equal(ids.dirShareUrl.selected, true);
    assert.match(ids.dirShareStatus.textContent, /Copy the selected link/);
    assert.equal(ids.copyDirLink.disabled, false);
    ids.clearDirFilters.listeners.click();
    assert.equal(ids.dirShareFallback.hidden, true);
    assert.equal(ids.dirShareStatus.textContent, '');
  }
});

test('changing filters while a copy is pending does not show stale feedback', async () => {
  for (const rejects of [false, true]) {
    let resolve, reject;
    const { ids, county } = setup('?q=tacos', {
      writeText() { return new Promise((yes, no) => { resolve = yes; reject = no; }); }
    });
    const copying = ids.copyDirLink.listeners.click();
    assert.equal(ids.copyDirLink.disabled, true);
    county.listeners.click();
    if (rejects) reject(new Error('Denied'));
    else resolve();
    await copying;
    assert.equal(ids.dirShareStatus.textContent, '');
    assert.equal(ids.dirShareFallback.hidden, true);
    assert.equal(ids.copyDirLink.disabled, false);
  }
});
