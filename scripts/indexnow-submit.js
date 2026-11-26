'use strict';

// Notify IndexNow-participating search engines (Bing, Yandex, Seznam, Naver…)
// that the sitemap URLs changed. Bing's index also feeds Copilot and other AI
// answer engines, so this shortens the delay before new listings can be cited.
//
// Usage (after deploying with INDEXNOW_KEY set on the server):
//   INDEXNOW_KEY=<same key> node scripts/indexnow-submit.js            # dry run
//   INDEXNOW_KEY=<same key> node scripts/indexnow-submit.js --submit   # send
//   ... --since=2026-11-01   only URLs whose sitemap lastmod is on/after a date
//
// The key is not secret: the server publishes it at /<key>.txt so engines can
// confirm the submitter controls the site. Generate one with
//   node -e "console.log(require('crypto').randomUUID().replace(/-/g,''))"

const SITE = process.env.SITE_URL || 'https://southjerseyfoodtruck.com';
const SITEMAP_URL = process.env.SITEMAP_URL || `${SITE}/sitemap.xml`; // override to dry-run locally
const ENDPOINT = process.env.INDEXNOW_ENDPOINT || 'https://api.indexnow.org/indexnow';
const KEY = process.env.INDEXNOW_KEY || '';
const submit = process.argv.includes('--submit');
const sinceArg = process.argv.find(arg => arg.startsWith('--since='));
const since = sinceArg ? new Date(sinceArg.slice('--since='.length)) : null;

async function main() {
  if (!/^[A-Za-z0-9-]{8,128}$/.test(KEY)) {
    throw new Error('Set INDEXNOW_KEY (8-128 letters, digits or hyphens), matching the deployed server.');
  }
  if (since && Number.isNaN(since.getTime())) throw new Error('--since must be a date such as 2026-11-01');

  const host = new URL(SITE).host;
  const sitemap = await (await fetch(SITEMAP_URL)).text();
  const urls = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)]
    .map(match => ({
      loc: /<loc>([^<]+)<\/loc>/.exec(match[1])?.[1],
      lastmod: /<lastmod>([^<]+)<\/lastmod>/.exec(match[1])?.[1]
    }))
    .filter(entry => entry.loc && new URL(entry.loc).host === host)
    .filter(entry => !since || (entry.lastmod && new Date(entry.lastmod) >= since))
    .map(entry => entry.loc.replace(/&amp;/g, '&'));

  if (!urls.length) {
    console.log('No matching sitemap URLs to submit.');
    return;
  }

  const keyLocation = `${SITE}/${KEY}.txt`;
  if (submit) {
    const keyCheck = await fetch(keyLocation);
    if (!keyCheck.ok || (await keyCheck.text()).trim() !== KEY) {
      throw new Error(`${keyLocation} does not serve the key. Deploy with INDEXNOW_KEY set first.`);
    }
  }

  console.log(`${urls.length} URL(s) from ${SITEMAP_URL}${since ? ` changed since ${sinceArg.slice(8)}` : ''}.`);
  if (!submit) {
    urls.slice(0, 10).forEach(url => console.log(`  ${url}`));
    if (urls.length > 10) console.log(`  … and ${urls.length - 10} more`);
    console.log('Dry run only. Re-run with --submit to notify IndexNow.');
    return;
  }

  // The protocol accepts up to 10,000 URLs per request.
  for (let i = 0; i < urls.length; i += 10000) {
    const urlList = urls.slice(i, i + 10000);
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host, key: KEY, keyLocation, urlList })
    });
    if (![200, 202].includes(response.status)) {
      throw new Error(`IndexNow rejected the batch: HTTP ${response.status} ${await response.text()}`);
    }
    console.log(`Submitted ${urlList.length} URL(s): HTTP ${response.status}.`);
  }
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
