'use strict';

const assert = require('node:assert/strict');
const http = require('node:http');
const https = require('node:https');
const trucks = require('../data/trucks.json');
const posts = require('../data/posts.json');

const BASE_URL = process.env.DIRECTORY_URL || `http://127.0.0.1:${process.env.PORT || 22333}`;
const DOMAIN = 'https://southjerseyfoodtruck.com';
const issues = [];
let requests = 0;

function check(condition, message) {
  if (!condition) issues.push(message);
}

function request(pathname, method = 'GET', body) {
  const url = new URL(pathname, BASE_URL);
  const transport = url.protocol === 'https:' ? https : http;
  requests += 1;
  return new Promise((resolve, reject) => {
    const req = transport.request(url, {
      method,
      headers: body === undefined ? {} : { 'content-type': 'application/json' }
    }, response => {
      let text = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { text += chunk; });
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body: text }));
    });
    req.setTimeout(15000, () => req.destroy(new Error(`request timed out: ${pathname}`)));
    req.on('error', reject);
    req.end(body);
  });
}

function decode(value = '') {
  return value.replace(/&(?:amp|quot|lt|gt|apos|#39);/g, entity => ({
    '&amp;': '&', '&quot;': '"', '&lt;': '<', '&gt;': '>', '&apos;': "'", '&#39;': "'"
  })[entity]);
}

function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(["'])([\s\S]*?)\2/g)]
    .map(match => [match[1].toLowerCase(), decode(match[3])]));
}

function metadata(html, key) {
  return [...html.matchAll(/<meta\b[^>]*>/gi)]
    .map(match => attributes(match[0]))
    .filter(attrs => attrs.name === key || attrs.property === key)
    .map(attrs => attrs.content);
}

function canonical(html) {
  return [...html.matchAll(/<link\b[^>]*>/gi)]
    .map(match => attributes(match[0]))
    .filter(attrs => attrs.rel === 'canonical')
    .map(attrs => attrs.href);
}

function schemaNodes(html, pathname) {
  const nodes = [];
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    if (attributes(match[1]).type !== 'application/ld+json') continue;
    try {
      const schema = JSON.parse(match[2]);
      check(schema['@context'] === 'https://schema.org', `${pathname}: JSON-LD must declare schema.org context`);
      nodes.push(...(Array.isArray(schema['@graph']) ? schema['@graph'] : [schema]));
    } catch (error) {
      issues.push(`${pathname}: invalid JSON-LD: ${error.message}`);
    }
  }
  check(nodes.length > 0, `${pathname}: no JSON-LD found`);
  return nodes;
}

async function validateSitemap() {
  const response = await request('/sitemap.xml');
  assert.equal(response.status, 200, 'sitemap must return 200');
  assert.match(response.headers['content-type'], /application\/xml/, 'sitemap MIME type');
  assert.match(response.body, /xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9"/);
  const entries = [...response.body.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(match => {
    const loc = decode(match[1].match(/<loc>([\s\S]*?)<\/loc>/)?.[1]);
    const lastmod = match[1].match(/<lastmod>([\s\S]*?)<\/lastmod>/)?.[1];
    check(Boolean(loc), 'sitemap entry has no location');
    if (lastmod !== undefined) {
      const date = new Date(lastmod);
      check(/^\d{4}-\d{2}-\d{2}$/.test(lastmod) && !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === lastmod,
        `${loc}: invalid sitemap lastmod ${lastmod}`);
    }
    return loc;
  });
  assert.ok(entries.length > 0, 'sitemap must contain URLs');
  check(new Set(entries).size === entries.length, 'sitemap contains duplicate URLs');
  const titles = new Map();
  const descriptions = new Map();
  let schemaCount = 0;
  for (let index = 0; index < entries.length; index += 6) {
    await Promise.all(entries.slice(index, index + 6).map(async location => {
      const url = new URL(location);
      check(url.origin === DOMAIN && !url.search && !url.hash, `noncanonical sitemap location: ${location}`);
      check(!/^\/(?:admin|api|healthz|verify|report-update)(?:\/|$)/.test(url.pathname), `operational URL in sitemap: ${location}`);
      const page = await request(url.pathname);
      check(page.status === 200, `${url.pathname}: sitemap URL returned ${page.status}`);
      check(/text\/html/.test(page.headers['content-type']), `${url.pathname}: sitemap URL is not HTML`);
      check(!/noindex/i.test(page.headers['x-robots-tag'] || ''), `${url.pathname}: sitemap URL has noindex header`);
      check(!metadata(page.body, 'robots').some(value => /noindex/i.test(value)), `${url.pathname}: sitemap URL has noindex meta`);
      check(JSON.stringify(canonical(page.body)) === JSON.stringify([location]), `${url.pathname}: expected exactly one self canonical`);
      const title = decode(page.body.match(/<title>([\s\S]*?)<\/title>/i)?.[1]).trim();
      const description = metadata(page.body, 'description');
      check(Boolean(title), `${url.pathname}: missing title`);
      check(description.length === 1 && Boolean(description[0]?.trim()), `${url.pathname}: expected one nonempty description`);
      check(!titles.has(title), `${url.pathname}: duplicate title with ${titles.get(title)}`);
      check(!descriptions.has(description[0]), `${url.pathname}: duplicate description with ${descriptions.get(description[0])}`);
      titles.set(title, url.pathname);
      descriptions.set(description[0], url.pathname);
      check((page.body.match(/<h1(?:\s|>)/gi) || []).length === 1, `${url.pathname}: expected one H1`);
      check(JSON.stringify(metadata(page.body, 'og:url')) === JSON.stringify([location]), `${url.pathname}: og:url differs from canonical`);
      const nodes = schemaNodes(page.body, url.pathname);
      schemaCount += nodes.length;
      const webpage = nodes.find(node => node['@type'] === 'WebPage' && node.url === location);
      check(Boolean(webpage), `${url.pathname}: no matching WebPage entity`);
      if (webpage?.mainEntity?.['@id']) {
        check(nodes.some(node => node['@id'] === webpage.mainEntity['@id']), `${url.pathname}: WebPage mainEntity reference does not resolve`);
      }
      for (const node of nodes.filter(node => node['@type'] === 'ItemList')) {
        if (!Array.isArray(node.itemListElement)) continue;
        check(node.numberOfItems === undefined || node.numberOfItems === node.itemListElement.length,
          `${url.pathname}: ItemList count does not match listed entities`);
        check(node.itemListElement.every((item, position) => item.position === position + 1), `${url.pathname}: invalid ItemList positions`);
      }
    }));
  }
  return { pages: entries.length, schemaCount };
}

async function validateDiscovery() {
  const robots = await request('/robots.txt');
  check(robots.status === 200 && /text\/plain/.test(robots.headers['content-type']), 'robots must be successful plain text');
  check(/^User-agent:\s*\*\s*$/mi.test(robots.body), 'robots missing wildcard user agent');
  check(/^Allow:\s*\/\s*$/mi.test(robots.body), 'robots must allow public content');
  check(robots.body.includes(`Sitemap: ${DOMAIN}/sitemap.xml`), 'robots missing canonical sitemap');
  for (const pathname of ['/admin', '/api/', '/healthz']) {
    check(robots.body.includes(`Disallow: ${pathname}`), `robots missing ${pathname} exclusion`);
  }
  check(!/^https?:\/\//m.test(robots.body), 'robots contains a bare URL instead of a directive/comment');
  const rss = await request('/blog.xml');
  check(rss.status === 200 && /application\/rss\+xml/.test(rss.headers['content-type']), 'RSS must return successful RSS XML');
  const rssItems = [...rss.body.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(match => match[1]);
  const publishedPosts = posts.filter(post => post.published_at && new Date(post.published_at).getTime() <= Date.now());
  check(rssItems.length === publishedPosts.length, 'RSS item count differs from published posts');
  for (const post of publishedPosts) {
    check(rssItems.some(item => item.includes(`<link>${DOMAIN}/blog/${post.slug}</link>`)), `RSS omits ${post.slug}`);
  }
  check(!/Invalid Date|undefined|NaN/.test(rss.body), 'RSS contains invalid metadata');
  const llms = await request('/llms.txt');
  check(llms.status === 200 && /text\/(?:plain|markdown)/.test(llms.headers['content-type']), 'llms.txt must return successful text');
  check(/^# South Jersey Food Truck\s*$/m.test(llms.body), 'llms guide missing site name');
  const llmsUrls = [...llms.body.matchAll(/\]\((https:\/\/[^)\s]+)\)/g)].map(match => match[1]);
  check(llmsUrls.length >= 5, 'llms guide must link to canonical content and trust pages');
  for (const url of llmsUrls) {
    const parsed = new URL(url);
    check(parsed.origin === DOMAIN, `llms guide links to unexpected origin: ${url}`);
    const target = await request(`${parsed.pathname}${parsed.search}`);
    check(target.status === 200, `llms guide target failed: ${url} (${target.status})`);
  }
}

async function validateIndexControls() {
  const truck = trucks.find(item => item.slug);
  for (const pathname of ['/admin', '/healthz', `/verify/${truck.slug}`, `/report-update/${truck.slug}`]) {
    const page = await request(pathname);
    check(/noindex/i.test(page.headers['x-robots-tag'] || ''), `${pathname}: operational response missing noindex header`);
    check(/no-store/i.test(page.headers['cache-control'] || ''), `${pathname}: operational response must not be stored`);
    check(page.headers['referrer-policy'] === 'no-referrer', `${pathname}: operational response missing no-referrer`);
  }
  const api = await request('/api/assistant', 'POST', '{}');
  check(api.status === 400, `invalid assistant request should return 400, got ${api.status}`);
  check(/noindex/i.test(api.headers['x-robots-tag'] || ''), 'assistant API missing noindex header');
  const contact = await request('/contact', 'POST', '{}');
  check(contact.status >= 400 && contact.status < 500, 'invalid contact submission must be rejected');
  check(/noindex/i.test(contact.headers['x-robots-tag'] || ''), 'form POST response missing noindex');
  for (const pathname of ['/no-such-search-audit-page', '/trucks/no-such-truck', '/blog/no-such-post']) {
    const page = await request(pathname);
    check(page.status === 404, `${pathname}: missing content must return 404`);
    check(/noindex/i.test(page.headers['x-robots-tag'] || ''), `${pathname}: 404 missing noindex header`);
  }
  const filtered = await request('/directory?q=tacos');
  check(filtered.status === 200, 'directory filters must remain accessible');
  check(/noindex/i.test(filtered.headers['x-robots-tag'] || ''), 'directory filter results must be noindex');
  check(JSON.stringify(canonical(filtered.body)) === JSON.stringify([`${DOMAIN}/directory`]), 'filtered directory must use clean canonical');
  const tracked = await request('/about?utm_source=audit');
  check(tracked.status === 200 && JSON.stringify(canonical(tracked.body)) === JSON.stringify([`${DOMAIN}/about`]), 'tracking query must retain clean about canonical');
  for (const [pathname, destination] of [['/Directory', '/directory'], ['/about///', '/about'], ['/Directory?utm_source=audit', '/directory?utm_source=audit'], ['/about///?utm_source=audit', '/about?utm_source=audit']]) {
    for (const method of ['GET', 'HEAD']) {
      const response = await request(pathname, method);
      check(response.status === 301 && response.headers.location === destination, `${method} ${pathname}: expected one permanent redirect to ${destination}`);
      const final = await request(destination, method);
      check(final.status === 200, `${method} redirect target ${destination} must return 200`);
    }
  }
}

async function main() {
  const result = await validateSitemap();
  await validateDiscovery();
  await validateIndexControls();
  if (issues.length) {
    for (const issue of issues) console.error(`FAIL ${issue}`);
    throw new Error(`${issues.length} search readiness checks failed`);
  }
  console.log(`Search readiness passed: ${result.pages} sitemap pages, ${result.schemaCount} schema entities, canonical metadata, index controls, redirects, RSS, robots, and AI discovery (${requests} HTTP requests).`);
}

main().catch(error => {
  console.error(`Search readiness validation failed: ${error.message}`);
  process.exitCode = 1;
});
