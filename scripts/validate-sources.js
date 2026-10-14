'use strict';

const posts = require('../data/posts.json');

const REQUEST_TIMEOUT_MS = Number(process.env.SOURCE_URL_TIMEOUT_MS || 15000);
const CONCURRENCY = 4;
const LINK_PATTERN = /\]\((https?:\/\/[^)\s]+)\)/g;

function isAuthoritativeHost(hostname) {
  const host = hostname.toLowerCase().replace(/^www\./, '');
  return host.endsWith('.gov') || host.endsWith('.edu') || host.endsWith('.mil') ||
    host === 'ada.gov' || host.endsWith('.us');
}

function sourceLinks() {
  const byUrl = new Map();
  for (const post of posts.filter(post => post.published_at)) {
    for (const match of String(post.content || '').matchAll(LINK_PATTERN)) {
      const url = match[1];
      if (!byUrl.has(url)) byUrl.set(url, { url, posts: [] });
      if (!byUrl.get(url).posts.includes(post.slug)) byUrl.get(url).posts.push(post.slug);
    }
  }
  return [...byUrl.values()].map(link => {
    const parsed = new URL(link.url);
    return Object.assign(link, {
      classification: isAuthoritativeHost(parsed.hostname) ? 'authoritative' : 'external'
    });
  });
}

async function checkUrl(link) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(link.url, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'User-Agent': 'South-Jersey-Food-Truck-source-audit/1.0' },
      signal: controller.signal
    });
    const finalUrl = response.url || link.url;
    const result = {
      ...link,
      status: response.status,
      finalUrl,
      redirected: finalUrl !== link.url,
      ok: response.status >= 200 && response.status < 400
    };
    if (response.body) await response.body.cancel();
    return result;
  } catch (error) {
    return {
      ...link,
      status: null,
      finalUrl: link.url,
      redirected: false,
      ok: false,
      error: error.name === 'AbortError' ? `timed out after ${REQUEST_TIMEOUT_MS}ms` : error.message
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function checkAll(links) {
  const results = [];
  for (let index = 0; index < links.length; index += CONCURRENCY) {
    const batch = links.slice(index, index + CONCURRENCY);
    results.push(...await Promise.all(batch.map(checkUrl)));
  }
  return results;
}

async function main() {
  const links = sourceLinks();
  if (!links.length) {
    console.log(`Source validation passed: no external links found in ${posts.length} published posts.`);
    return;
  }

  const results = await checkAll(links);
  const authoritativeCount = links.filter(link => link.classification === 'authoritative').length;
  console.log(`Checked ${links.length} unique external source URLs across ${new Set(links.flatMap(link => link.posts)).size} published posts.`);
  console.log(`Classified ${authoritativeCount} authoritative government, education, military, or standards URLs and ${links.length - authoritativeCount} ordinary external URLs.`);

  for (const result of results) {
    const label = result.ok ? 'PASS' : 'FAIL';
    const status = result.status == null ? (result.error || 'request failed') : String(result.status);
    const redirectNote = result.redirected ? ` -> ${result.finalUrl}` : '';
    console.log(`${label} [${result.classification}] ${status} ${result.url}${redirectNote} (posts: ${result.posts.join(', ')})`);
  }

  const failures = results.filter(result => !result.ok);
  if (failures.length) {
    console.error(`Source validation failed: ${failures.length} URL${failures.length === 1 ? '' : 's'} returned a non-success response or could not be reached.`);
    process.exitCode = 1;
  } else {
    console.log('Source validation passed: every external source returned a success response or expected redirect.');
  }
}

main().catch(error => {
  console.error(`Source validation failed: ${error.message}`);
  process.exitCode = 1;
});