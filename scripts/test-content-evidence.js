'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const directoryPage = require('../html/directory');
const cuisinePage = require('../html/cuisine');
const truckPage = require('../html/truck');
const postPage = require('../html/post');
const snapshotPage = require('../html/snapshot');
const trucks = require('../data/trucks.json');
const posts = require('../data/posts.json');

function schemas(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .flatMap(match => {
      const data = JSON.parse(match[1]);
      return [data, ...(data['@graph'] || [])];
    });
}

test('directory schema covers every visible record and preserves out-of-state home bases', () => {
  const html = directoryPage({ trucks });
  const list = schemas(html).find(schema => schema['@type'] === 'ItemList');
  assert.equal(list.numberOfItems, trucks.length);
  assert.equal(list.itemListElement.length, trucks.length);
  for (const [index, listing] of trucks.entries()) {
    const item = list.itemListElement[index].item;
    assert.equal(item['@id'], `https://southjerseyfoodtruck.com/trucks/${listing.slug}#food-establishment`);
    assert.ok(html.includes(`href="/trucks/${listing.slug}"`));
    if (listing.area.endsWith(', PA')) assert.equal(item.address.addressRegion, 'PA');
  }
  const grilly = trucks.find(truck => truck.slug === 'grilly-cheese');
  const cuisine = schemas(cuisinePage({ trucks, cuisine: grilly.cuisine, slug: 'gourmet-grilled-cheese' })).find(schema => schema['@type'] === 'ItemList');
  assert.equal(cuisine.itemListElement.find(item => item.item.name === grilly.name).item.address.addressRegion, 'PA');
});

test('all recorded operator websites are available visibly and absent contacts are disclosed', () => {
  for (const truck of trucks) {
    const html = truckPage({ truck });
    const contactSection = html.match(/Contact &amp; Booking[\s\S]*?<\/div>\s*<\/div>/)?.[0] || html;
    if (truck.website) {
      assert.ok(contactSection.includes(`href="${truck.website.replace(/&/g, '&amp;')}"`), truck.name);
    } else if (!truck.phone && !truck.email && !truck.instagram && !truck.facebook) {
      assert.match(contactSection, /No direct operator contact is recorded/);
    }
    assert.match(html, /not independent confirmation of licensing/);
    assert.doesNotMatch(html, />[^<]*Verified Active</);
  }
});

test('article modification date is visible and external sources become citations without invented credentials', () => {
  const source = posts.find(post => /\]\(https:\/\//.test(post.content));
  const post = { ...source, updated_at: '2026-01-01T00:00:00Z', guidance_reviewed_at: '2026-05-01' };
  const html = postPage({ post, posts: [] });
  const article = schemas(html).find(schema => schema['@type'] === 'BlogPosting');
  assert.equal(article.dateModified, '2026-05-01T00:00:00.000Z');
  assert.ok(html.includes('datetime="2026-05-01T00:00:00.000Z"'));
  assert.ok(article.citation.length > 0);
  for (const url of article.citation) assert.ok(html.includes(`href="${url.replace(/&/g, '&amp;')}"`));
  const named = schemas(postPage({ post: { ...post, author: 'Named Writer' } })).find(schema => schema['@type'] === 'BlogPosting');
  assert.deepEqual(named.author, { '@type': 'Person', name: 'Named Writer' });
});

test('snapshot retrieval does not manufacture a content-modification date', () => {
  const html = snapshotPage({ trucks });
  const dataset = schemas(html).find(schema => schema['@type'] === 'Dataset');
  assert.equal(dataset.dateModified, undefined);
  assert.match(html, /Retrieval date means the date this page was generated/);
  assert.match(html, /assigned elsewhere/);
  assert.match(html, /not a census/);
});
