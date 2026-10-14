'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const hubPage = require('../html/hub');
const trucks = require('../data/trucks.json');
const { COUNTY_SLUGS } = require('../taxonomy');

function render(listings) {
  return hubPage({ trucks: listings, cuisines: {} });
}

test('actual listings reconcile the overall total and retain all outside-region profile links', () => {
  const counties = Object.values(COUNTY_SLUGS);
  const outside = trucks.filter(t => !counties.includes(t.area));
  const html = render(trucks);
  assert.ok(html.includes(`total of ${trucks.length} operators includes ${trucks.length - outside.length} listed in these seven counties and ${outside.length} listed outside them`));
  const section = html.match(/<section id="outside-region"[\s\S]*?<\/section>/)[0];
  assert.equal((section.match(/href="\/trucks\//g) || []).length, outside.length);
  for (const truck of outside) assert.ok(section.includes(`href="/trucks/${truck.slug}"`));
  for (const [slug, name] of Object.entries(COUNTY_SLUGS)) {
    const count = trucks.filter(t => t.area === name).length;
    assert.ok(html.includes(`${name} Food Trucks <span style="font-size:0.85em;color:var(--muted);font-weight:400;">(${count} truck${count !== 1 ? 's' : ''})</span>`));
    assert.ok(html.includes(`href="/${slug}-food-trucks"`));
  }
});

test('empty and local-only directories do not show an empty outside-region section or jump link', () => {
  for (const listings of [[], [{ area: 'Camden County' }]]) {
    const html = render(listings);
    assert.ok(html.includes('0 listed outside them'));
    assert.ok(!html.includes('id="outside-region"'));
    assert.ok(!html.includes('href="#outside-region"'));
  }
});

test('outside-region listings are data-driven, escaped, and never added to county totals', () => {
  const html = render([{ name: 'Truck <&>', slug: 'truck', city: 'City <&>', area: 'New County' }]);
  assert.ok(html.includes('total of 1 operator includes 0 listed in these seven counties and 1 listed outside them'));
  assert.ok(html.includes('href="/trucks/truck">Truck &lt;&amp;&gt;</a>'));
  assert.ok(html.includes('Base: City &lt;&amp;&gt; — New County'));
  assert.equal((html.match(/\(0 trucks\)/g) || []).length, 7);
  assert.ok(html.includes('confirm South Jersey travel availability'));
});
