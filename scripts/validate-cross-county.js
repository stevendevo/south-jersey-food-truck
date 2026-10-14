'use strict';

const http = require('http');
const trucks = require('../data/trucks.json');
const { esc } = require('../utils');
const { countyCuisineCombos, COUNTY_SLUGS } = require('../taxonomy');

const BASE_URL = process.env.DIRECTORY_URL || `http://127.0.0.1:${process.env.PORT || 22333}`;
const ROUTE_SUFFIX = '-food-trucks';

function fail(message) {
  console.error(`Cross-county validation failed: ${message}`);
  process.exit(1);
}

function get(pathname) {
  return new Promise((resolve, reject) => {
    const request = http.get(`${BASE_URL}${pathname}`, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => resolve({ status: response.statusCode, body }));
    });
    request.on('error', reject);
    request.setTimeout(10000, () => {
      request.destroy(new Error(`request timed out for ${pathname}`));
    });
  });
}

function relatedCountyLinks(html, cuisine) {
  const heading = `Other counties for ${esc(cuisine)}`;
  const headingIndex = html.indexOf(heading);
  if (headingIndex === -1) return null;

  const sectionStart = html.lastIndexOf('<div', headingIndex);
  const sectionEnd = html.indexOf('</div>', headingIndex);
  if (sectionStart === -1 || sectionEnd === -1) return [];

  const section = html.slice(sectionStart, sectionEnd);
  return [...section.matchAll(/<a href="([^"]+)"/g)].map(match => match[1]);
}

function expectedRelatedCounties(trucksForPage, county, cuisine) {
  return new Set(
    trucksForPage
      .filter(truck =>
        truck.area &&
        truck.area !== county &&
        Object.values(COUNTY_SLUGS).includes(truck.area) &&
        truck.cuisine === cuisine
      )
      .map(truck => truck.area)
  );
}

async function main() {
  const combos = countyCuisineCombos(trucks);
  const generatedRoutes = new Set(
    combos.map(({ ctySlug, cSlug }) => `/${ctySlug}-${cSlug}${ROUTE_SUFFIX}`)
  );
  const pagesWithRelatedCounties = combos.filter(({ county, cuisine }) =>
    expectedRelatedCounties(trucks, county, cuisine).size > 0
  );

  let checkedLinks = 0;
  for (const { ctySlug, county, cSlug, cuisine } of pagesWithRelatedCounties) {
    const source = `/${ctySlug}-${cSlug}${ROUTE_SUFFIX}`;
    const response = await get(source);
    if (response.status !== 200) {
      fail(`${source} returned HTTP ${response.status}; cannot inspect its related-county section`);
    }

    const links = relatedCountyLinks(response.body, cuisine);
    if (links === null) {
      fail(`${source} is missing the "Other counties for ${cuisine}" section`);
    }

    const expectedCounties = expectedRelatedCounties(trucks, county, cuisine);
    if (links.length !== expectedCounties.size) {
      fail(`${source} lists ${links.length} related counties, expected ${expectedCounties.size}`);
    }

    for (const target of links) {
      checkedLinks += 1;
      if (!generatedRoutes.has(target)) {
        fail(`${source} -> ${target}: missing generated intersection route`);
      }
    }
  }

  console.log(
    `Cross-county validation passed: rendered ${pagesWithRelatedCounties.length} intersection pages and checked ${checkedLinks} related-county links.`
  );
}

main().catch(error => fail(error.message));