'use strict';

const trucks = require('../data/trucks.json');
const countyPage = require('../html/county');
const { COUNTY_SLUGS, cuisineSlug } = require('../taxonomy');
const { esc } = require('../utils');

function fail(message) {
  console.error(`County cuisine validation failed: ${message}`);
  process.exit(1);
}

function cuisineLinks(html, county, slug) {
  const section = html.match(/Cuisines available: ([\s\S]*?)<\/p>/);
  if (!section) return [];

  return [...section[1].matchAll(/<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)]
    .map(([, href, label]) => ({ href, label }));
}

function validateCounty(county, slug) {
  const countyTrucks = trucks.filter(truck => truck.area === county);
  const cuisines = [...new Set(countyTrucks.map(truck => truck.cuisine).filter(Boolean))].sort();
  const html = countyPage({ county, slug, trucks });
  const links = cuisineLinks(html, county, slug);

  if (links.length !== cuisines.length) {
    fail(`${county} rendered ${links.length} cuisine links; expected ${cuisines.length}`);
  }

  for (const cuisine of cuisines) {
    const expectedCount = countyTrucks.filter(truck => truck.cuisine === cuisine).length;
    const expectedHref = `/${slug}-${cuisineSlug(cuisine)}-food-trucks`;
    const expectedLabel = `${esc(cuisine)} (${expectedCount})`;
    const matches = links.filter(link => link.href === expectedHref);

    if (matches.length !== 1) {
      fail(`${county} must link to ${expectedHref} exactly once; found ${matches.length}`);
    }
    if (matches[0].label !== expectedLabel) {
      fail(`${county} ${cuisine} link should display "${expectedLabel}", got "${matches[0].label}"`);
    }
  }

  for (const link of links) {
    if (!cuisines.some(cuisine => link.href === `/${slug}-${cuisineSlug(cuisine)}-food-trucks`)) {
      fail(`${county} contains an unexpected cuisine link: ${link.href}`);
    }
  }

  return { county, cuisines: cuisines.length, links: links.length };
}

const results = Object.entries(COUNTY_SLUGS)
  .map(([slug, county]) => validateCounty(county, slug));
const emptyCounty = results.find(result => result.cuisines === 0);

if (!emptyCounty) {
  fail('expected at least one county with no cuisine links');
}

const checkedLinks = results.reduce((total, result) => total + result.links, 0);
console.log(
  `County cuisine validation passed: rendered ${results.length} county pages, checked ${checkedLinks} cuisine links, and confirmed ${emptyCounty.county} has none.`
);
