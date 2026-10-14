'use strict';

const http = require('http');
const posts = require('../data/posts.json');
const trucks = require('../data/trucks.json');
const { hasVerifiedTruckImage } = require('../utils');

const { getOpeningHoursSpecification } = require('../html/truck');
const layout = require('../html/layout');
const {
  COUNTY_SLUGS,
  cityPageTargets,
  cuisineSlugMap,
  countyCuisineCombos,
  countySlugForArea
} = require('../taxonomy');

const BASE_URL = process.env.DIRECTORY_URL || `http://127.0.0.1:${process.env.PORT || 22333}`;
const BASE_ORIGIN = new URL(BASE_URL).origin;
const VERIFIED_ORGANIZATION_CONTACT = layout.verifiedOrganizationContact;
const LEGACY_TRUCK_REDIRECTS = {
  '/trucks/calle-del-sabor': '/gloucester-county-food-trucks',
  '/trucks/brooklyn-burger': '/atlantic-county-food-trucks',
  '/trucks/whirly-pig': '/burlington-county-food-trucks',
  '/trucks/the-meat-wagon': '/burlington-county-food-trucks',
  '/trucks/sweet-lavender': '/burlington-county-food-trucks',
  '/trucks/the-halal-guys': '/gloucester-county-food-trucks',
  '/trucks/brother-bears-bbq': '/south-jersey-bbq-food-trucks',
  '/trucks/forge-wood-fired-pizza': '/south-jersey-wood-fired-pizza-food-trucks'
};
const LEGACY_TRACKING_PARAMETERS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content'
];

function fail(message) {
  console.error(`SEO validation failed: ${message}`);
  process.exit(1);
}

function request(pathname, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request(`${BASE_URL}${pathname}`, { method }, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

function get(pathname) {
  return request(pathname);
}

async function validateBrandAssets(homeHtml) {
  const assets = [
    ['/brand/south-jersey-food-truck-mark.webp', 'image/webp'],
    ['/favicon.svg', 'image/svg+xml'],
    ['/brand/favicon-16.png', 'image/png'],
    ['/brand/favicon-32.png', 'image/png'],
    ['/brand/apple-touch-icon.png', 'image/png'],
    ['/brand/mark-on-light.svg', 'image/svg+xml'],
    ['/brand/mark-on-dark.svg', 'image/svg+xml'],
    ['/brand/wordmark-on-light.svg', 'image/svg+xml'],
    ['/brand/wordmark-on-dark.svg', 'image/svg+xml'],
    ['/brand/mark-on-light.png', 'image/png'],
    ['/brand/mark-on-dark.png', 'image/png'],
    ['/brand/wordmark-on-light.png', 'image/png'],
    ['/brand/wordmark-on-dark.png', 'image/png'],
    ['/south-jersey-food-truck-logo.png', 'image/png'],
    ['/opengraph.jpg', 'image/jpeg']
  ];

  for (const [pathname, expectedType] of assets) {
    const response = await get(pathname);
    if (response.status !== 200 || !response.headers['content-type']?.includes(expectedType)) {
      fail(`brand asset is missing or served with the wrong content type: ${pathname} (${response.status}, ${response.headers['content-type'] || 'no content type'})`);
    }
  }

  for (const requiredTag of [
    'href="/favicon.svg"',
    'href="/brand/favicon-16.png"',
    'href="/brand/favicon-32.png"',
    'href="/brand/apple-touch-icon.png"',
    'href="/brand-refresh.css"',
    'src="/brand/south-jersey-food-truck-mark.webp"',
    'aria-controls="navMobile"',
    'content="https://southjerseyfoodtruck.com/opengraph.jpg"',
    'South Jersey Food Truck brand preview'
  ]) {
    if (!homeHtml.includes(requiredTag)) {
      fail(`homepage is missing the final brand asset reference: ${requiredTag}`);
    }
  }

  const about = await get('/about');
  if (!about.body.includes('src="/brand/south-jersey-food-truck-mark.webp"')) {
    fail('About page does not use the refreshed brand mark');
  }
}

function schemas(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map(match => JSON.parse(match[1]));
}

function hasTrustedOrganizationContact(schema) {
  const contactPoint = schema?.contactPoint || {};
  const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  return ['telephone', 'email'].every(property => {
    const expected = VERIFIED_ORGANIZATION_CONTACT[property];
    const organizationValue = schema?.[property];
    const contactPointValue = contactPoint[property];

    if (expected === null) {
      return !hasOwn(schema || {}, property) && !hasOwn(contactPoint, property);
    }
    if (typeof expected !== 'string' || organizationValue !== expected || contactPointValue !== expected) {
      return false;
    }
    if (property === 'telephone') {
      const digits = expected.replace(/^\+/, '');
      const nationalNumber = digits.startsWith('1') ? digits.slice(1) : digits;
      return /^\+[1-9]\d{7,14}$/.test(expected) && !/^\d{3}555\d{4}$/.test(nationalNumber);
    }
    return /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,63}$/i.test(expected)
      && !/(?:@example\.(?:com|net|org)|@(?:invalid|test)\.|^(?:test|sample|placeholder)@)/i.test(expected);
  });
}

function validateOrganizationContactRules() {
  const unverifiedSamples = [
    { telephone: '(856) 555-0100', description: 'formatted form placeholder phone' },
    { telephone: '+18565550100', description: 'E.164 555 placeholder phone' },
    { telephone: '+18444745591', description: 'sponsor phone' },
    { email: 'not-an-email', description: 'malformed email' },
    { email: 'owner@example.com', description: 'example email' },
    { email: 'placeholder@invalid.test', description: 'placeholder email' }
  ];

  for (const { description, ...contact } of unverifiedSamples) {
    const schema = {
      ...contact,
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'Customer Support',
        url: 'https://southjerseyfoodtruck.com/contact',
        ...contact
      }
    };
    if (hasTrustedOrganizationContact(schema)) {
      fail(`organization contact validation accepted an unverified or malformed sample: ${description}`);
    }
  }
}

function locationPath(response) {
  if (!response.headers.location) return null;
  const location = new URL(response.headers.location, BASE_URL);
  return `${location.pathname}${location.search}`;
}

function expectedApprovedTrackingQuery(requestPath) {
  const incoming = new URL(requestPath, BASE_URL);
  const tracking = new URLSearchParams();
  for (const parameter of LEGACY_TRACKING_PARAMETERS) {
    const value = incoming.searchParams.get(parameter);
    if (value && value.length <= 200) tracking.set(parameter, value);
  }
  return tracking.toString();
}

function expectedLegacyTrackingLocation(destination, requestPath) {
  const target = new URL(destination, BASE_URL);
  const trackingQuery = expectedApprovedTrackingQuery(requestPath);
  return `${target.pathname}${trackingQuery ? `?${trackingQuery}` : ''}`;
}

async function followRedirects(pathname, method, expectedStatuses, expectedFirstLocation, destination) {
  let currentPath = pathname;
  const visited = new Set();
  let response;

  for (let step = 0; step <= expectedStatuses.length; step += 1) {
    if (visited.has(currentPath)) {
      fail(`${method} redirect loop detected for ${pathname}: ${currentPath}`);
    }
    visited.add(currentPath);
    response = await request(currentPath, method);
    const expectedStatus = expectedStatuses[step] ?? 200;
    if (response.status !== expectedStatus) {
      fail(`${method} ${pathname} returned ${response.status} at redirect step ${step + 1}; expected ${expectedStatus}`);
    }

    if (step === expectedStatuses.length) {
      if (locationPath(response)) {
        fail(`${method} ${pathname} continued redirecting after reaching its final response`);
      }
      return response;
    }

    const nextLocation = locationPath(response);
    const expectedLocation = step === 0 ? expectedFirstLocation : destination;
    if (nextLocation !== expectedLocation) {
      fail(`${method} ${pathname} redirected to ${nextLocation || 'no location'}; expected ${expectedLocation}`);
    }
    currentPath = nextLocation;
  }
}

async function validateLegacyTruckRedirects() {
  const query = '?source=legacy-redirect-check';
  const trackingQuery = '?utm_source=newsletter&utm_medium=email&utm_campaign=fall+festival'
    + '&utm_term=food-truck&utm_content=legacy%26card&utm_content=duplicate'
    + '&gclid=discard-this&source=discard-this';

  for (const [legacyPath, destination] of Object.entries(LEGACY_TRUCK_REDIRECTS)) {
    const trackingDestination = expectedLegacyTrackingLocation(destination, trackingQuery);
    const expectedSlashTrackingQuery = expectedApprovedTrackingQuery(`${legacyPath}/${trackingQuery}`);
    const expectedSlashTrackingLocation = `${legacyPath}${expectedSlashTrackingQuery ? `?${expectedSlashTrackingQuery}` : ''}`;
    const variants = [
      { path: legacyPath, statuses: [301], firstLocation: destination },
      { path: `${legacyPath}/`, statuses: [301, 301], firstLocation: legacyPath },
      { path: `${legacyPath}${query}`, statuses: [301], firstLocation: destination },
      { path: `${legacyPath}/${query}`, statuses: [301, 301], firstLocation: legacyPath },
      { path: `${legacyPath}${trackingQuery}`, statuses: [301], firstLocation: trackingDestination },
      {
        path: `${legacyPath}/${trackingQuery}`,
        statuses: [301, 301],
        firstLocation: expectedSlashTrackingLocation,
        destination: trackingDestination
      }
    ];

    for (const variant of variants) {
      const expectedDestination = variant.destination || destination;
      const getResponse = await followRedirects(
        variant.path,
        'GET',
        variant.statuses,
        variant.firstLocation,
        expectedDestination
      );
      if (getResponse.status !== 200) {
        fail(`legacy truck URL did not reach a working destination: ${variant.path}`);
      }

      const headResponse = await followRedirects(
        variant.path,
        'HEAD',
        variant.statuses,
        variant.firstLocation,
        expectedDestination
      );
      if (headResponse.status !== getResponse.status) {
        fail(`HEAD ${variant.path} did not reach the same final status as GET`);
      }
    }
  }

  const unknownSlug = '/trucks/not-a-real-legacy-slug';
  for (const variant of [unknownSlug, `${unknownSlug}${query}`]) {
    const getResponse = await request(variant, 'GET');
    const headResponse = await request(variant, 'HEAD');
    if (
      getResponse.status !== 404 ||
      headResponse.status !== getResponse.status ||
      locationPath(getResponse) ||
      locationPath(headResponse)
    ) {
      fail(`unknown truck URL must remain a 404 without redirecting: ${variant}`);
    }
  }

  for (const variant of [`${unknownSlug}/`, `${unknownSlug}/${query}`]) {
    const expectedCanonical = variant.includes('?')
      ? `${unknownSlug}${query}`
      : unknownSlug;
    const getRedirect = await request(variant, 'GET');
    const headRedirect = await request(variant, 'HEAD');
    if (
      getRedirect.status !== 301 ||
      headRedirect.status !== getRedirect.status ||
      locationPath(getRedirect) !== expectedCanonical ||
      locationPath(headRedirect) !== expectedCanonical
    ) {
      fail(`unknown truck trailing-slash URL did not normalize consistently: ${variant}`);
    }
    const getFinal = await request(expectedCanonical, 'GET');
    const headFinal = await request(expectedCanonical, 'HEAD');
    if (getFinal.status !== 404 || headFinal.status !== getFinal.status) {
      fail(`unknown truck URL became a redirect or non-404 after slash normalization: ${variant}`);
    }
  }
}

function directoryRouteSources() {
  const cuisines = cuisineSlugMap(trucks);
  const countyCuisinePages = countyCuisineCombos(trucks);
  const cityPages = cityPageTargets(trucks);
  return [...new Set([
    '/',
    '/directory',
    '/food-trucks-in-south-jersey',
    ...Object.keys(COUNTY_SLUGS).map(slug => `/${slug}-food-trucks`),
    ...Object.keys(cuisines).map(slug => `/south-jersey-${slug}-food-trucks`),
    ...countyCuisinePages.map(({ ctySlug, cSlug }) => `/${ctySlug}-${cSlug}-food-trucks`),
    ...cityPages.map(({ slug }) => `/food-trucks-in-${slug}`),
    ...trucks.filter(truck => truck.slug).map(truck => `/trucks/${truck.slug}`)
  ])];
}

function internalAnchorPath(href, sourcePath) {
  const value = href.trim().replace(/&amp;/g, '&');
  if (!value || value.startsWith('#')) return null;

  try {
    const url = new URL(value, new URL(sourcePath, `${BASE_ORIGIN}/`));
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== BASE_ORIGIN) return null;
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

function validateInternalAnchorClassification() {
  const external = new URL(BASE_URL);
  external.hostname = external.hostname === 'external.invalid' ? 'other.invalid' : 'external.invalid';
  const cases = [
    { href: '/directory', expected: '/directory' },
    { href: `${external.origin}/not-a-local-route`, expected: null },
    { href: `//${external.host}/not-a-local-route`, expected: null },
    { href: 'mailto:operator@example.invalid', expected: null }
  ];

  for (const { href, expected } of cases) {
    const actual = internalAnchorPath(href, '/directory');
    if (actual !== expected) {
      fail(`internal link classifier returned ${actual || 'no route'} for ${href}; expected ${expected || 'external/non-route'}`);
    }
  }
}

async function validateGeneratedDirectoryLinks() {
  validateInternalAnchorClassification();
  const sources = directoryRouteSources();
  const responses = new Map();
  const failures = [];
  let checkedLinks = 0;

  async function requestOnce(pathname) {
    if (!responses.has(pathname)) {
      responses.set(pathname, get(pathname).catch(error => ({ status: 0, error })));
    }
    return responses.get(pathname);
  }

  for (const sourcePath of sources) {
    const source = await requestOnce(sourcePath);
    if (!source.status || source.status >= 400) {
      const reason = source.error ? `network error: ${source.error.message}` : `HTTP ${source.status}`;
      failures.push(`${sourcePath} -> ${sourcePath} (${reason})`);
      continue;
    }

    const destinations = new Set(
      [...source.body.matchAll(/<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1/gi)]
        .map(match => internalAnchorPath(match[2], sourcePath))
        .filter(Boolean)
    );
    for (const destination of destinations) {
      checkedLinks += 1;
      const response = await requestOnce(destination);
      if (!response.status || response.status >= 400) {
        const reason = response.error ? `network error: ${response.error.message}` : `HTTP ${response.status}`;
        failures.push(`${sourcePath} -> ${destination} (${reason})`);
      }
    }
  }

  if (failures.length) {
    fail(`generated directory links failed (${failures.length}):\n${failures.map(item => `  ${item}`).join('\n')}`);
  }

  return { sourcePages: sources.length, checkedLinks, requestedUrls: responses.size };
}

async function main() {
  const home = await get('/');
  await validateBrandAssets(home.body);
  const blog = await get('/blog');
  const feed = await get('/blog.xml');
  const checklist = await get('/food-truck-event-checklist');
  const sitemap = await get('/sitemap.xml');

  if (home.status !== 200 || blog.status !== 200 || feed.status !== 200 || checklist.status !== 200 || sitemap.status !== 200) {
    fail(`hub responses were home=${home.status}, blog=${blog.status}, feed=${feed.status}, checklist=${checklist.status}, sitemap=${sitemap.status}`);
  }
  if (
    !checklist.body.includes('Food Truck Event Planner Checklist') ||
    !checklist.body.includes('id="checklist-1-1"') ||
    !checklist.body.includes('href="/contact"') ||
    !checklist.body.includes('href="/directory"') ||
    !sitemap.body.includes('https://southjerseyfoodtruck.com/food-truck-event-checklist')
  ) {
    fail('event checklist page is missing required content, CTAs, or sitemap coverage');
  }

  const homeNodes = schemas(home.body).flatMap(schema =>
    Array.isArray(schema['@graph']) ? schema['@graph'] : [schema]
  );
  const website = homeNodes.find(schema =>
    schema['@type'] === 'WebSite' &&
    schema.url === 'https://southjerseyfoodtruck.com'
  );
  const searchAction = website?.potentialAction;
  const organization = homeNodes.find(schema =>
    schema['@type'] === 'Organization' &&
    schema['@id'] === 'https://southjerseyfoodtruck.com/#organization'
  );
  const localBusiness = homeNodes.find(schema =>
    schema['@type'] === 'LocalBusiness' &&
    schema['@id'] === 'https://southjerseyfoodtruck.com/#organization'
  );
  const isHttpsUrl = value => {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && !url.username && !url.password && !url.hash;
    } catch {
      return false;
    }
  };
  const isTrustedSocialUrl = value => {
    if (!isHttpsUrl(value)) return false;
    const url = new URL(value);
    return ['twitter.com', 'x.com'].includes(url.hostname.toLowerCase())
      && /^\/sjfoodtruck\/?$/.test(url.pathname);
  };
  const hasTrustedOrganizationDetails = schema =>
    schema?.name === 'South Jersey Food Truck' &&
    schema?.url === 'https://southjerseyfoodtruck.com' &&
    schema?.logo === 'https://southjerseyfoodtruck.com/brand/south-jersey-food-truck-mark.webp' &&
    isHttpsUrl(schema.logo) &&
    Array.isArray(schema.sameAs) &&
    schema.sameAs.length === 1 &&
    schema.sameAs.every(isTrustedSocialUrl) &&
    schema.contactPoint?.['@type'] === 'ContactPoint' &&
    schema.contactPoint.contactType === 'Customer Support' &&
    schema.contactPoint.url === 'https://southjerseyfoodtruck.com/contact' &&
    isHttpsUrl(schema.contactPoint.url) &&
    hasTrustedOrganizationContact(schema);
  validateOrganizationContactRules();
  if (
    !website ||
    searchAction?.['@type'] !== 'SearchAction' ||
    searchAction.target !== 'https://southjerseyfoodtruck.com/directory?q={search_term_string}' ||
    searchAction['query-input'] !== 'required name=search_term_string' ||
    !organization ||
    !localBusiness ||
    organization.name !== localBusiness.name ||
    !hasTrustedOrganizationDetails(organization) ||
    !hasTrustedOrganizationDetails(localBusiness) ||
    !home.body.includes('<form class="hero-search" id="heroSearchForm" action="/directory" method="get">')
  ) {
    fail('homepage Organization/LocalBusiness schema is inconsistent or contains unverified, malformed, or placeholder contact details');
  }

  const featuredList = homeNodes.find(schema =>
    schema['@type'] === 'ItemList' &&
    schema['@id'] === 'https://southjerseyfoodtruck.com/#featured-trucks'
  );
  const renderedFeaturedPaths = [...home.body.matchAll(/<a href="(\/trucks\/[^"]+)" class="truck-card"/g)]
    .map(match => match[1]);
  const expectedFeaturedUrls = renderedFeaturedPaths.map(pathname => `https://southjerseyfoodtruck.com${pathname}`);
  if (
    !featuredList ||
    featuredList.numberOfItems !== renderedFeaturedPaths.length ||
    featuredList.itemListElement?.length !== renderedFeaturedPaths.length ||
    renderedFeaturedPaths.length === 0
  ) {
    fail('homepage featured ItemList count does not match the rendered truck cards');
  }
  for (const [index, pathname] of renderedFeaturedPaths.entries()) {
    const item = featuredList.itemListElement[index];
    const truck = trucks.find(candidate => `/trucks/${candidate.slug}` === pathname);
    if (
      !truck ||
      item?.position !== index + 1 ||
      item.item?.['@type'] !== 'FoodEstablishment' ||
      item.item.name !== truck.name ||
      item.item.url !== expectedFeaturedUrls[index] ||
      item.item.servesCuisine !== truck.cuisine ||
      item.item.address?.addressLocality !== truck.city ||
      item.item.address?.addressRegion !== (truck.area?.includes('County') ? 'NJ' : (truck.area?.split(', ')[1] || 'NJ')) ||
      item.item.address?.addressCountry !== 'US'
    ) {
      fail(`homepage featured ItemList item does not match the rendered truck card: ${pathname}`);
    }
  }

  const about = await get('/about');
  const featuredTruck = await get('/trucks/grilly-cheese');
  const directory = await get('/directory');
  const cityDirectory = await get('/food-trucks-in-cherry-hill');
  const aboutOrganization = schemas(about.body).find(schema =>
    schema['@type'] === 'Organization' &&
    schema['@id'] === organization['@id']
  );
  if (
    !aboutOrganization ||
    !hasTrustedOrganizationDetails(aboutOrganization) ||
    aboutOrganization.name !== organization.name ||
    aboutOrganization.logo !== organization.logo ||
    JSON.stringify(aboutOrganization.sameAs) !== JSON.stringify(organization.sameAs) ||
    JSON.stringify(aboutOrganization.contactPoint) !== JSON.stringify(organization.contactPoint)
  ) {
    fail('About page Organization schema is missing or differs from the verified homepage identity');
  }
  if (
    home.body.includes('id="featuredTruckRail"') ||
    about.body.includes('id="featuredTruckRail"') ||
    featuredTruck.body.includes('id="featuredTruckRail"') ||
    !home.body.includes('<aside class="brand-sponsored-strip"') ||
    home.body.indexOf('id="featured-truck-list"') > home.body.indexOf('<aside class="brand-sponsored-strip"') ||
    !home.body.includes('href="/trucks/grilly-cheese"') ||
    !home.body.includes('Grilly Cheese') ||
    !home.body.includes('id="navMobile" hidden') ||
    !home.body.includes('class="brand-menu-toggle" id="navToggle"') ||
    !directory.body.includes('id="directory-browse-heading"') ||
    !directory.body.includes('href="/food-trucks-in-cherry-hill"') ||
    !cityDirectory.body.includes('id="related-city-heading"') ||
    !cityDirectory.body.includes('href="/food-trucks-in-collingswood"')
  ) {
    fail('homepage sponsorship treatment, shared navigation, or directory cross-links are inconsistent');
  }

  await validateLegacyTruckRedirects();

  const cityPages = cityPageTargets(trucks);
  for (const { city, county, slug, trucks: cityTrucks } of cityPages) {
    const pathname = `/food-trucks-in-${slug}`;
    const page = await get(pathname);
    if (page.status !== 200) fail(`city page failed: ${pathname}`);
    const pageSchemas = schemas(page.body);
    const itemList = pageSchemas.find(schema =>
      schema['@type'] === 'ItemList' &&
      schema['@id'] === `https://southjerseyfoodtruck.com${pathname}#item-list`
    );
    const canonical = `<link rel="canonical" href="https://southjerseyfoodtruck.com${pathname}" />`;
    if (
      !itemList ||
      itemList.numberOfItems !== cityTrucks.length ||
      itemList.itemListElement?.length !== cityTrucks.length ||
      !page.body.includes(`<h1 style="margin-bottom:0.3rem;">Food Trucks in ${city}, NJ</h1>`) ||
      !page.body.includes(`${city}, ${county}`) ||
      !page.body.includes(canonical) ||
      !sitemap.body.includes(`https://southjerseyfoodtruck.com${pathname}`)
    ) {
      fail(`city page is missing unique listing, schema, canonical, or sitemap coverage: ${pathname}`);
    }
  }

  const blogSchemas = schemas(blog.body);
  const collection = blogSchemas.find(schema =>
    Array.isArray(schema['@type']) &&
    schema['@type'].includes('Blog') &&
    schema['@type'].includes('CollectionPage')
  );
  if (!collection || collection.mainEntity?.numberOfItems !== posts.length) {
    fail('blog collection schema does not match the post data');
  }
  if ((feed.body.match(/<item>/g) || []).length !== posts.length) {
    fail('RSS item count does not match the post data');
  }

  const titles = new Set();
  const descriptions = new Set();
  const internalLinkStatuses = new Map();
  for (const post of posts) {
    const effectiveTitle = post.seo_title || `${post.title} — South Jersey Food Truck`;
    const effectiveDescription = post.seo_description || post.excerpt;
    if (!post.slug || !post.title || !effectiveDescription) fail(`missing rendered SEO fields for post ${post.id}`);
    if (titles.has(effectiveTitle)) fail(`duplicate article title: ${post.title}`);
    if (descriptions.has(effectiveDescription)) fail(`duplicate article description: ${post.title}`);
    titles.add(effectiveTitle);
    descriptions.add(effectiveDescription);

    const page = await get(`/blog/${post.slug}`);
    if (page.status !== 200) fail(`article route failed: ${post.slug}`);
    const articleSchemas = schemas(page.body);
    const article = articleSchemas.find(schema => schema['@type'] === 'BlogPosting');
    const faq = articleSchemas.find(schema => schema['@type'] === 'FAQPage');
    const canonical = `<link rel="canonical" href="https://southjerseyfoodtruck.com/blog/${post.slug}" />`;
    if (!article || !page.body.includes(canonical)) fail(`missing article schema or canonical: ${post.slug}`);
    if ((post.faqs?.length || 0) > 0 && (!faq || faq.mainEntity?.length !== post.faqs.length)) {
      fail(`FAQ schema does not match visible FAQ data: ${post.slug}`);
    }
    if (!page.body.includes('related-articles-heading')) fail(`missing related article section: ${post.slug}`);
    if (!sitemap.body.includes(`https://southjerseyfoodtruck.com/blog/${post.slug}`)) {
      fail(`article missing from sitemap: ${post.slug}`);
    }
    if (post.slug === 'how-to-hire-a-food-truck-south-jersey' && !page.body.includes('href="/food-truck-event-checklist"')) {
      fail('hiring article does not link to the event checklist');
    }

    const internalPaths = [...page.body.matchAll(/href="(\/[^"]*)"/g)]
      .map(match => match[1])
      .filter(pathname => !pathname.startsWith('//'));
    for (const pathname of new Set(internalPaths)) {
      if (!internalLinkStatuses.has(pathname)) {
        internalLinkStatuses.set(pathname, await get(pathname));
      }
      const status = internalLinkStatuses.get(pathname).status;
      if (status >= 400) fail(`broken internal link in article ${post.slug}: ${pathname} (${status})`);
    }
  }

  for (const truck of trucks) {
    const page = await get(`/trucks/${truck.slug}`);
    if (page.status !== 200) fail(`truck route failed: ${truck.slug}`);
    const expectedDirectoryFallback = Object.values(COUNTY_SLUGS).includes(truck.area)
      ? `/${countySlugForArea(truck.area)}-food-trucks`
      : '/directory';
    const browseAllLink = page.body.match(/<a href="([^"]+)" class="btn btn-outline btn-sm">Browse all [^<]*trucks/);
    if (!browseAllLink || browseAllLink[1] !== expectedDirectoryFallback) {
      fail(`truck profile has an unsupported directory fallback: /trucks/${truck.slug} -> ${browseAllLink?.[1] || 'missing'} (expected ${expectedDirectoryFallback})`);
    }

    const truckSchemas = schemas(page.body);
    const establishment = truckSchemas.find(schema => schema['@type'] === 'FoodEstablishment');
    const breadcrumb = truckSchemas.find(schema => schema['@type'] === 'BreadcrumbList');
    const canonicalUrl = `https://southjerseyfoodtruck.com/trucks/${truck.slug}`;
    if (!establishment || !breadcrumb) {
      fail(`missing truck or breadcrumb schema: ${truck.slug}`);
    }
    if (
      establishment.name !== truck.name ||
      establishment.servesCuisine !== truck.cuisine ||
      establishment.url !== canonicalUrl ||
      establishment.address?.addressLocality !== truck.city ||
      !establishment.address?.addressRegion ||
      establishment.address?.addressCountry !== 'US'
    ) {
      fail(`incomplete truck schema fields: ${truck.slug}`);
    }

    const expectedOpeningHours = getOpeningHoursSpecification(truck);
    if (truck.operating_hours_reviewed === true && !expectedOpeningHours) {
      fail(`reviewed truck operating hours are incomplete or invalid: ${truck.slug}`);
    }
    if (expectedOpeningHours) {
      if (JSON.stringify(establishment.openingHoursSpecification) !== JSON.stringify(expectedOpeningHours)) {
        fail(`reviewed truck operating hours are missing or mismatched in schema: ${truck.slug}`);
      }
    } else if (establishment.openingHoursSpecification) {
      fail(`unreviewed or incomplete truck operating hours were exposed in schema: ${truck.slug}`);
    }

    const expectedImage = hasVerifiedTruckImage(truck)
      ? (truck.image_url.startsWith('http') ? truck.image_url : `https://southjerseyfoodtruck.com${truck.image_url}`)
      : null;
    if (expectedImage && establishment.image !== expectedImage) {
      fail(`verified truck image is missing from schema: ${truck.slug}`);
    }
    if (!expectedImage && establishment.image) {
      fail(`unverified truck image was exposed in schema: ${truck.slug}`);
    }

    const breadcrumbItems = breadcrumb.itemListElement || [];
    const lastBreadcrumb = breadcrumbItems[breadcrumbItems.length - 1];
    if (
      breadcrumbItems.length < 2 ||
      lastBreadcrumb?.item !== canonicalUrl ||
      lastBreadcrumb?.name !== truck.name
    ) {
      fail(`incomplete truck breadcrumb schema: ${truck.slug}`);
    }
  }

  const directoryLinks = await validateGeneratedDirectoryLinks();
  console.log(`SEO validation passed: homepage schema, ${posts.length} articles, ${trucks.length} truck pages, ${Object.keys(LEGACY_TRUCK_REDIRECTS).length} legacy truck redirects, RSS, sitemap, canonical URLs, and structured data. Directory link check: ${directoryLinks.sourcePages} source pages, ${directoryLinks.checkedLinks} internal links, ${directoryLinks.requestedUrls} unique URLs requested.`);
}

main().catch(error => fail(error.message));
