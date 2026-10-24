'use strict';

const http = require('http');
const assert = require('node:assert/strict');
const trucks = require('../data/trucks.json');
const hubPage = require('../html/hub');

const BASE_URL = process.env.DIRECTORY_URL || `http://127.0.0.1:${process.env.PORT || 22333}`;
const COUNTIES = [
  ['Camden County', 'camden-county'],
  ['Burlington County', 'burlington-county'],
  ['Gloucester County', 'gloucester-county'],
  ['Atlantic County', 'atlantic-county'],
  ['Cape May County', 'cape-may-county'],
  ['Cumberland County', 'cumberland-county'],
  ['Salem County', 'salem-county']
];

function fail(message) {
  console.error(`Directory validation failed: ${message}`);
  process.exit(1);
}

function get(pathname) {
  return new Promise((resolve, reject) => {
    http.get(`${BASE_URL}${pathname}`, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => resolve({ status: response.statusCode, body }));
    }).on('error', reject);
  });
}

function jsonLd(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map(match => JSON.parse(match[1]));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function assertHubCountyCounts(hubHtml, hubTrucks, fixtureName) {
  const countySection = hubHtml.match(/<section\b[^>]*\bid="browse-by-county"[^>]*>([\s\S]*?)<\/section>/)?.[1];
  if (!countySection) {
    throw new Error(`${fixtureName} hub county summary is missing`);
  }
  // Count headings, not every county link: each entry also has a Browse CTA.
  const entries = [...countySection.matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>/g)].map(match => {
    const link = match[1].match(/<a\b[^>]*\bhref="([^"]*)"[^>]*>([\s\S]*?)<\/a>/);
    return {
      href: link?.[1],
      name: link?.[2].replace(/<span\b[^>]*>[\s\S]*?<\/span>/g, '').trim(),
      html: match[1]
    };
  });
  if (entries.length !== COUNTIES.length) {
    throw new Error(`${fixtureName} hub county summary has ${entries.length} entries; expected ${COUNTIES.length}`);
  }
  for (const [name, slug] of COUNTIES) {
    const matches = entries.filter(entry => entry.name === `${name} Food Trucks`);
    if (matches.length !== 1) {
      throw new Error(`${fixtureName} hub county summary must contain ${name} exactly once; found ${matches.length}`);
    }
    if (matches[0].href !== `/${slug}-food-trucks`) {
      throw new Error(`${fixtureName} hub county summary has the wrong slug for ${name}: ${matches[0].href}`);
    }
    const expectedCount = hubTrucks.filter(truck => truck.area === name).length;
    const expectedWord = expectedCount === 1 ? 'truck' : 'trucks';
    const countyEntry = new RegExp(
      `<a href="/${slug}-food-trucks">${escapeRegExp(name)} Food Trucks <span[^>]*>\\(${expectedCount} ${expectedWord}\\)</span></a>`
    );
    if (!countyEntry.test(matches[0].html)) {
      throw new Error(`${fixtureName} hub count is incorrect for ${name}: expected ${expectedCount} ${expectedWord}`);
    }
  }
}

function assertHubCountyRegressionFixtures() {
  const fixtureTrucks = [{ area: 'Camden County' }];
  const html = hubPage({ trucks: fixtureTrucks, cuisines: {}, countyCuisineCombos: [] });
  const heading = name => html.match(new RegExp(
    `<h3\\b[^>]*><a[^>]*>${escapeRegExp(name)} Food Trucks [\\s\\S]*?</h3>`
  ))[0];
  const camden = heading('Camden County');
  const salem = heading('Salem County');
  const cases = [
    ['missing county', html.replace(camden, ''), /has 6 entries; expected 7/],
    ['duplicate county', html.replace(camden, camden + camden), /has 8 entries; expected 7/],
    // Preserve the total to prove that cardinality alone cannot hide a duplicate.
    ['duplicate replacing county', html.replace(salem, camden), /Camden County exactly once; found 2/],
    ['wrong county slug', html.replace(camden, camden.replace('/camden-county-food-trucks', '/salem-county-food-trucks')), /wrong slug for Camden County/],
    // A matching heading elsewhere on the page must not mask an omitted summary entry.
    ['county outside summary', html.replace(camden, '') + camden, /has 6 entries; expected 7/],
    ['wrong county count', html.replace(camden, camden.replace('(1 truck)', '(2 trucks)')), /count is incorrect for Camden County/]
  ];
  for (const [name, mutatedHtml, expectedError] of cases) {
    assert.throws(
      () => assertHubCountyCounts(mutatedHtml, fixtureTrucks, name),
      expectedError,
      `hub validator must reject the ${name} fixture`
    );
  }
}

function nearbyCards(html) {
  return [...html.matchAll(/<a href="\/trucks\/([^"]+)" class="truck-card"\s+([^>]+)>/g)]
    .map(match => ({
      slug: match[1],
      area: match[2].match(/\bdata-county="([^"]*)"/)?.[1] || ''
    }));
}

function assertNearbyTruckCards(detailHtml, truck, allTrucks) {
  const cards = nearbyCards(detailHtml);
  const expectedCount = Math.min(
    4,
    allTrucks.filter(candidate => candidate.area === truck.area && candidate.slug !== truck.slug).length
  );
  const knownSlugs = new Set(allTrucks.map(candidate => candidate.slug));

  if (cards.length > 4) {
    fail(`${truck.slug} has ${cards.length} nearby truck cards; expected no more than four`);
  }
  if (cards.length !== expectedCount) {
    fail(`${truck.slug} has ${cards.length} nearby truck cards; expected ${expectedCount}`);
  }
  for (const card of cards) {
    if (card.slug === truck.slug) {
      fail(`${truck.slug} links to itself in its nearby truck cards`);
    }
    if (!knownSlugs.has(card.slug)) {
      fail(`${truck.slug} has a nearby card with an unknown truck slug: ${card.slug}`);
    }
    if (card.area !== truck.area) {
      fail(`${truck.slug} has a nearby card for ${card.slug} in ${card.area || 'an unknown area'}, expected ${truck.area}`);
    }
  }
}

async function main() {
  const slugs = trucks.map(truck => truck.slug).filter(Boolean);
  if (slugs.length !== trucks.length || new Set(slugs).size !== slugs.length) {
    fail('truck slugs must be present and unique');
  }

  const total = trucks.length;
  const verified = trucks.filter(truck => truck.verified).length;
  const cuisineCounts = new Map();
  for (const truck of trucks) {
    if (truck.cuisine) cuisineCounts.set(truck.cuisine, (cuisineCounts.get(truck.cuisine) || 0) + 1);
  }
  const snapshot = await get('/directory-snapshot');
  const map = await get('/food-truck-map');
  const hub = await get('/food-trucks-in-south-jersey');
  const sitemap = await get('/sitemap.xml');
  const robots = await get('/robots.txt');
  const truckDetails = await Promise.all(
    trucks.map(async truck => ({
      truck,
      response: await get(`/trucks/${encodeURIComponent(truck.slug)}`)
    }))
  );

  if (snapshot.status !== 200 || map.status !== 200 || hub.status !== 200 || sitemap.status !== 200 || robots.status !== 200) {
    fail(`expected 200 responses, got snapshot=${snapshot.status}, map=${map.status}, hub=${hub.status}, sitemap=${sitemap.status}, robots=${robots.status}`);
  }
  for (const { truck, response } of truckDetails) {
    if (response.status !== 200) {
      fail(`truck detail page returned HTTP ${response.status}: ${truck.slug}`);
    }
    assertNearbyTruckCards(response.body, truck, trucks);
  }
  if (!snapshot.body.includes(`contains ${total} food truck records`) || !snapshot.body.includes(`<strong>${verified}</strong>`)) {
    fail(`snapshot totals do not match ${total} listings and ${verified} recorded checks`);
  }
  if (!map.body.includes('South Jersey Food Truck Map')) {
    fail('map page is missing its title');
  }
  if (!sitemap.body.startsWith('<?xml version="1.0" encoding="UTF-8"?>') ||
      !sitemap.body.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')) {
    fail('sitemap is missing its XML declaration or urlset namespace');
  }
  for (const truck of trucks) {
    const truckUrl = `https://southjerseyfoodtruck.com/trucks/${truck.slug}`;
    if (!sitemap.body.includes(`<loc>${truckUrl}</loc>`)) {
      fail(`truck detail page is missing from the sitemap: ${truck.slug}`);
    }
  }
  for (const page of ['/', '/directory', '/blog', '/faq', '/about']) {
    if (!sitemap.body.includes(`<loc>https://southjerseyfoodtruck.com${page}</loc>`)) {
      fail(`required top-level page is missing from the sitemap: ${page}`);
    }
  }
  if (!robots.body.includes('Sitemap: https://southjerseyfoodtruck.com/sitemap.xml')) {
    fail('robots.txt does not reference the sitemap URL');
  }

  const snapshotSchemas = jsonLd(snapshot.body);
  const dataset = snapshotSchemas.find(schema => schema['@type'] === 'Dataset');
  if (!dataset || dataset.variableMeasured?.[0]?.value !== total) {
    fail('snapshot Dataset schema does not match the live truck total');
  }

  const mapSchemas = jsonLd(map.body);
  const countyList = mapSchemas.find(schema => schema['@type'] === 'ItemList' && schema['@id']?.endsWith('#county-list'));
  if (!countyList || countyList.numberOfItems !== COUNTIES.length) {
    fail('map ItemList schema does not contain all seven counties');
  }

  for (const [name, slug] of COUNTIES) {
    const countyCount = trucks.filter(truck => truck.area === name).length;
    if (!map.body.includes(`/${slug}-food-trucks`) || !map.body.includes(`${countyCount} truck`)) {
      fail(`${name} map link or live count is missing`);
    }
    if (!sitemap.body.includes(`https://southjerseyfoodtruck.com/${slug}-food-trucks`)) {
      fail(`${name} county page is missing from the sitemap`);
    }
  }

  const renderedHub = hubPage({ trucks, cuisines: {}, countyCuisineCombos: [] });
  assertHubCountyCounts(hub.body, trucks, 'served hub');
  assertHubCountyCounts(renderedHub, trucks, 'current fixture');
  assertHubCountyCounts(
    hubPage({ trucks: [{ area: 'Camden County' }], cuisines: {}, countyCuisineCombos: [] }),
    [{ area: 'Camden County' }],
    'single-count fixture'
  );
  assertHubCountyCounts(
    hubPage({ trucks: [], cuisines: {}, countyCuisineCombos: [] }),
    [],
    'zero-count fixture'
  );
  assertHubCountyRegressionFixtures();

  for (const [cuisine, cuisineCount] of cuisineCounts) {
    const countWord = cuisineCount === 1 ? 'truck' : 'trucks';
    const cuisineEntry = new RegExp(
      `<a href="/south-jersey-[^"]+-food-trucks"[^>]*>[\\s\\S]*?\\s${escapeRegExp(cuisine)}\\s*<span[^>]*>${cuisineCount} ${countWord}</span>\\s*</a>`
    );
    if (!cuisineEntry.test(hub.body)) {
      fail(`hub cuisine count is incorrect for ${cuisine}: expected ${cuisineCount} ${countWord}`);
    }
  }

  if (!sitemap.body.includes('https://southjerseyfoodtruck.com/directory-snapshot') ||
      !sitemap.body.includes('https://southjerseyfoodtruck.com/food-truck-map')) {
    fail('snapshot or map page is missing from the sitemap');
  }

  console.log(`Directory validation passed: ${total} listings, ${verified} verified, ${COUNTIES.length} counties, ${cuisineCounts.size} cuisine counts, ${truckDetails.length} nearby-truck pages.`);
}

main().catch(error => fail(error.message));
