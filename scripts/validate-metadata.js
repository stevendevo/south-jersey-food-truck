'use strict';

const assert = require('node:assert/strict');
const layout = require('../html/layout');
const homePage = require('../html/home');
const trucks = require('../data/trucks.json');
const posts = require('../data/posts.json');

const options = { title: 'Food trucks', desc: 'Compare local operators.', canonical: '/directory', content: '<h1>Food trucks</h1>' };
const schemas = html => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .flatMap(match => {
    const value = JSON.parse(match[1]);
    return value['@graph'] || [value];
  });

// A data field must survive JSON parsing without breaking out of its script.
const hostileText = '</script><script>window.injected=true</script>&';
const hostileHtml = layout({ ...options, jsonLd: { '@type': 'Thing', name: hostileText } });
assert.equal(schemas(hostileHtml).find(node => node['@type'] === 'Thing').name, hostileText);
assert.ok(!hostileHtml.includes('<script>window.injected=true</script>'));

const canonicalHtml = layout({ ...options, canonical: '/directory/?q=tacos#filters' });
assert.match(canonicalHtml, /rel="canonical" href="https:\/\/southjerseyfoodtruck\.com\/directory"/);
assert.match(canonicalHtml, /property="og:url" content="https:\/\/southjerseyfoodtruck\.com\/directory"/);
assert.throws(() => layout({ ...options, canonical: 'https://other-site.example/directory' }), /site origin/);

const customImageHtml = layout({ ...options, og: { image: '/seed/test.png?label="quoted"&size=large' } });
assert.match(customImageHtml, /content="https:\/\/southjerseyfoodtruck\.com\/seed\/test\.png\?label=%22quoted%22&amp;size=large"/);
assert.ok(!customImageHtml.includes('property="og:image:width"'), 'unknown image dimensions must not claim 1200x630');
assert.match(customImageHtml, /property="og:image:alt" content="Food trucks"/);
assert.match(layout(options), /property="og:image:width" content="1200"/);
assert.match(layout(options), /max-image-preview:large/);
assert.match(layout({ ...options, robots: 'noindex, follow' }), /name="robots" content="noindex, follow"/);

const home = homePage({ trucks, posts });
const homeNodes = schemas(home);
const organizationId = 'https://southjerseyfoodtruck.com/#organization';
assert.equal(homeNodes.filter(node => node['@id'] === organizationId).length, 1, 'the directory must have one consistent organization identity');
assert.equal(homeNodes.find(node => node['@id'] === organizationId)['@type'], 'Organization');
const webpage = homeNodes.find(node => node['@type'] === 'WebPage');
assert.equal(webpage.mainEntity['@id'], 'https://southjerseyfoodtruck.com/#featured-trucks');
assert.match(home, /href="#main-content">Skip to content/);
assert.match(home, /<main id="main-content" tabindex="-1">/);
assert.match(home, new RegExp(`Browse ${trucks.length} listings`));
assert.ok(!home.includes('Replit-managed AI'));
console.log('Metadata validation passed: script-safe JSON-LD, canonical normalization, social image metadata, snippet controls, consistent homepage identity, and skip navigation.');
