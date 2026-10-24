'use strict';
const { esc } = require('../utils');
const trucks = require('../data/trucks.json');
const { cityPageTargets } = require('../taxonomy');

const DOMAIN = 'https://southjerseyfoodtruck.com';
const FOOTER_CITY_PAGES = cityPageTargets(trucks).slice(0, 6);
const ORGANIZATION_ID = `${DOMAIN}/#organization`;
// Add a value only after the organization confirms it is public and maintained.
const VERIFIED_ORGANIZATION_CONTACT = Object.freeze({
  telephone: null,
  email: null
});
const VERIFIED_ORGANIZATION = Object.freeze({
  name: 'South Jersey Food Truck',
  url: DOMAIN,
  logo: `${DOMAIN}/brand/south-jersey-food-truck-mark.webp`,
  sameAs: Object.freeze([
    'https://twitter.com/sjfoodtruck'
  ]),
  contactPoint: Object.freeze({
    '@type': 'ContactPoint',
    contactType: 'Customer Support',
    url: `${DOMAIN}/contact`
  })
});

function organizationSchema(type = 'Organization', extra = {}) {
  const verifiedContact = Object.fromEntries(
    Object.entries(VERIFIED_ORGANIZATION_CONTACT).filter(([, value]) => value !== null)
  );
  return {
    '@type': type,
    '@id': ORGANIZATION_ID,
    ...VERIFIED_ORGANIZATION,
    ...verifiedContact,
    sameAs: [...VERIFIED_ORGANIZATION.sameAs],
    contactPoint: { ...VERIFIED_ORGANIZATION.contactPoint, ...verifiedContact },
    ...extra
  };
}

// JSON-LD is raw script text, so HTML escaping alone does not prevent a stored
// </script> sequence from ending the element before the JSON parser sees it.
function serializeSchema(schema) {
  return JSON.stringify(schema).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

function pageUrl(pathname = '/') {
  const candidate = new URL(pathname || '/', DOMAIN);
  if (candidate.origin !== DOMAIN) throw new Error('Canonical URLs must use the site origin');
  candidate.search = '';
  candidate.hash = '';
  candidate.pathname = candidate.pathname.replace(/\/+$/, '') || '/';
  return candidate.href;
}

function imageUrl(value) {
  if (!value) return null;
  try {
    const candidate = new URL(value, DOMAIN);
    return candidate.protocol === 'https:' && !candidate.username && !candidate.password ? candidate.href : null;
  } catch {
    return null;
  }
}

function layout({ title, desc, canonical, og = {}, articleMeta = {}, robots = 'index, follow', jsonLd, breadcrumb, mainEntity, about, imageObject, websiteSearchAction = false, content, bodyClass = '', extraHead = '' }) {
  const canonUrl = pageUrl(canonical);
  const defaultImage = `${DOMAIN}/opengraph.jpg`;
  const ogImg = imageUrl(og.image) || defaultImage;
  const ogImageAlt = og.imageAlt || (ogImg === defaultImage ? 'South Jersey Food Truck brand preview' : title);
  const ogWidth = og.width || (ogImg === defaultImage ? 1200 : null);
  const ogHeight = og.height || (ogImg === defaultImage ? 630 : null);
  const robotsContent = /(?:^|[,\s])noindex(?:$|[,\s])/i.test(robots)
    ? robots : `${robots}, max-image-preview:large, max-snippet:-1, max-video-preview:-1`;
  const siteSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${DOMAIN}/#website`,
        name: 'South Jersey Food Truck',
        url: DOMAIN,
        description: 'A directory for finding and contacting food trucks in South Jersey and nearby areas.',
        publisher: { '@id': ORGANIZATION_ID },
        inLanguage: 'en-US',
        ...(websiteSearchAction ? {
          potentialAction: {
            '@type': 'SearchAction',
            target: `${DOMAIN}/directory?q={search_term_string}`,
            'query-input': 'required name=search_term_string'
          }
        } : {})
      },
      {
        ...organizationSchema(),
        areaServed: [
          'Camden County, New Jersey',
          'Burlington County, New Jersey',
          'Gloucester County, New Jersey',
          'Atlantic County, New Jersey',
          'Cape May County, New Jersey',
          'Cumberland County, New Jersey',
          'Salem County, New Jersey'
        ],
        knowsAbout: [
          'South Jersey food trucks',
          'food truck catering',
          'wedding food trucks',
          'corporate food truck catering',
          'food truck festivals',
          'mobile food vendors'
        ]
      }
    ]
  };
  const breadcrumbSchema = breadcrumb && breadcrumb.length > 1 ? {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `${canonUrl}#breadcrumb`,
    itemListElement: breadcrumb.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: pageUrl(item.url)
    }))
  } : null;
  const pageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${canonUrl}#webpage`,
    url: canonUrl,
    name: title,
    description: desc,
    isPartOf: { '@id': `${DOMAIN}/#website` },
    publisher: { '@id': ORGANIZATION_ID },
    inLanguage: 'en-US',
    ...(breadcrumbSchema ? { breadcrumb: { '@id': breadcrumbSchema['@id'] } } : {}),
    ...(mainEntity ? { mainEntity: { '@id': mainEntity } } : {}),
    ...(articleMeta.publishedTime ? { datePublished: articleMeta.publishedTime } : {}),
    ...(articleMeta.modifiedTime ? { dateModified: articleMeta.modifiedTime } : {}),
    ...(articleMeta.author ? { author: { name: articleMeta.author } } : {}),
    ...(about ? { about } : {}),
    ...(imageObject ? { primaryImageOfPage: { '@id': imageObject.id } } : {})
  };
  const imageSchema = imageObject ? {
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    '@id': imageObject.id,
    url: imageObject.url,
    contentUrl: imageObject.url,
    caption: imageObject.caption,
    representativeOfPage: true
  } : null;
  const schemas = [siteSchema, pageSchema, breadcrumbSchema, imageSchema, ...(Array.isArray(jsonLd) ? jsonLd : [jsonLd])].filter(Boolean);
  const ldStr = schemas.map(schema => `<script type="application/ld+json">${serializeSchema(schema)}</script>`).join('\n  ');
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}" />
  <link rel="canonical" href="${esc(canonUrl)}" />
  <meta property="og:title" content="${esc(og.title || title)}" />
  <meta property="og:description" content="${esc(og.desc || desc)}" />
  <meta property="og:url" content="${esc(canonUrl)}" />
  <meta property="og:type" content="${esc(og.type || 'website')}" />
  <meta property="og:site_name" content="South Jersey Food Truck" />
  <meta property="og:locale" content="en_US" />
  <meta property="og:image" content="${esc(ogImg)}" />
  ${ogImageAlt ? `<meta property="og:image:alt" content="${esc(ogImageAlt)}" />` : ''}
  ${ogWidth && ogHeight ? `<meta property="og:image:width" content="${esc(ogWidth)}" />\n  <meta property="og:image:height" content="${esc(ogHeight)}" />` : ''}
  ${articleMeta.publishedTime ? `<meta property="article:published_time" content="${esc(articleMeta.publishedTime)}" />` : ''}
  ${articleMeta.modifiedTime ? `<meta property="article:modified_time" content="${esc(articleMeta.modifiedTime)}" />` : ''}
  ${articleMeta.section ? `<meta property="article:section" content="${esc(articleMeta.section)}" />` : ''}
  ${(articleMeta.tags || []).map(tag => `<meta property="article:tag" content="${esc(tag)}" />`).join('\n  ')}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@sjfoodtruck" />
  <meta name="twitter:title" content="${esc(og.title || title)}" />
  <meta name="twitter:description" content="${esc(og.desc || desc)}" />
  <meta name="twitter:image" content="${esc(ogImg)}" />
  ${ogImageAlt ? `<meta name="twitter:image:alt" content="${esc(ogImageAlt)}" />` : ''}
  <meta name="theme-color" content="#0b1020" />
  <meta name="robots" content="${esc(robotsContent)}" />
  ${articleMeta.author ? `<meta name="author" content="${esc(articleMeta.author)}" />` : ''}
  <link rel="alternate" type="application/rss+xml" title="South Jersey Food Truck Blog" href="${DOMAIN}/blog.xml" />
  ${ldStr}
  ${extraHead}
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="icon" href="/brand/favicon-16.png" sizes="16x16" type="image/png" />
  <link rel="icon" href="/brand/favicon-32.png" sizes="32x32" type="image/png" />
  <link rel="apple-touch-icon" href="/brand/apple-touch-icon.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/style.css" />
  <link rel="stylesheet" href="/brand-refresh.css" />
</head>
<body class="${esc(['site-brand', bodyClass].filter(Boolean).join(' '))}">
<a class="skip-link" href="#main-content">Skip to content</a>

<nav class="nav" aria-label="Main navigation">
  <div class="container nav-container">
    <div class="nav-inner">
      <a href="/" class="nav-logo" aria-label="South Jersey Food Truck home">
        <img src="/brand/south-jersey-food-truck-mark.webp" alt="" width="52" height="46" />
        <span class="nav-brand-copy">
          <strong>South Jersey<br />Food Truck</strong>
          <span>Find what&rsquo;s cooking</span>
        </span>
      </a>
      <ul class="nav-links">
        <li><a href="/directory">Browse trucks</a></li>
        <li><a href="/food-trucks-in-south-jersey">The local guide</a></li>
        <li><a href="/submit-truck">For operators</a></li>
        <li><a href="/contact" class="nav-cta">Plan an event <span aria-hidden="true">&rarr;</span></a></li>
      </ul>
      <button class="brand-menu-toggle" id="navToggle" type="button" onclick="toggleNav()" aria-controls="navMobile" aria-expanded="false">
        <span class="brand-menu-toggle-label">Menu</span>
        <span class="brand-menu-toggle-icon" aria-hidden="true">+</span>
      </button>
    </div>
    <div class="nav-mobile" id="navMobile" hidden>
      <span class="nav-mobile-eyebrow">Navigate</span>
      <a href="/directory">Browse trucks <span aria-hidden="true">&rarr;</span></a>
      <a href="/food-trucks-in-south-jersey">The local guide <span aria-hidden="true">&rarr;</span></a>
      <a href="/submit-truck">For operators <span aria-hidden="true">&rarr;</span></a>
      <a href="/contact">Plan an event <span aria-hidden="true">&rarr;</span></a>
    </div>
  </div>
</nav>

<main id="main-content" tabindex="-1">
${content}
</main>

<footer class="footer">
  <div class="container">
    <div class="footer-grid">
      <div class="footer-brand">
        <a href="/" class="footer-brand-link" aria-label="South Jersey Food Truck home">
          <img src="/brand/south-jersey-food-truck-mark.webp" alt="" width="52" height="46" />
          <span><strong>South Jersey<br />Food Truck</strong><em>Find what&rsquo;s cooking</em></span>
        </a>
        <p class="footer-tagline">A better way to find, book, and eat local across South Jersey.</p>
      </div>
      <div>
        <div class="footer-heading">Browse trucks</div>
        <ul class="footer-links">
          <li><a href="/directory">All Food Trucks</a></li>
          <li><a href="/camden-county-food-trucks">Camden County</a></li>
          <li><a href="/burlington-county-food-trucks">Burlington County</a></li>
          <li><a href="/atlantic-county-food-trucks">Atlantic County</a></li>
          <li><a href="/cape-may-county-food-trucks">Cape May County</a></li>
          <li><a href="/gloucester-county-food-trucks">Gloucester County</a></li>
          <li><a href="/cumberland-county-food-trucks">Cumberland County</a></li>
          <li><a href="/salem-county-food-trucks">Salem County</a></li>
        </ul>
      </div>
      <div>
        <div class="footer-heading">Local favorites</div>
        <div class="footer-subheading">By city</div>
        <ul class="footer-links">
          ${FOOTER_CITY_PAGES.map(page => `<li><a href="/food-trucks-in-${esc(page.slug)}">${esc(page.city)}</a></li>`).join('\n          ')}
        </ul>
        <div class="footer-subheading">By craving</div>
        <ul class="footer-links">
          <li><a href="/south-jersey-bbq-food-trucks">BBQ</a></li>
          <li><a href="/south-jersey-tacos-food-trucks">Tacos</a></li>
          <li><a href="/south-jersey-cheesesteaks-food-trucks">Cheesesteaks</a></li>
          <li><a href="/south-jersey-seafood-food-trucks">Seafood</a></li>
          <li><a href="/south-jersey-wood-fired-pizza-food-trucks">Wood-Fired Pizza</a></li>
          <li><a href="/south-jersey-desserts-food-trucks">Desserts &amp; Ice Cream</a></li>
        </ul>
      </div>
      <div>
        <div class="footer-heading">Plan &amp; connect</div>
        <ul class="footer-links">
          <li><a href="/food-trucks-in-south-jersey">South Jersey Guide</a></li>
          <li><a href="/blog">Blog &amp; Guides</a></li>
          <li><a href="/faq">FAQ</a></li>
          <li><a href="/about">About Us</a></li>
          <li><a href="/contact">Contact &amp; Book</a></li>
          <li><a href="/submit-truck">Submit Your Truck</a></li>
          <li><a href="/directory">Verify Your Truck</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <span>&copy; ${year} South Jersey Food Truck. All rights reserved.</span>
      <span>
        <a href="/privacy">Privacy Policy</a> &middot;
        <a href="/terms">Terms</a> &middot;
        <a href="/sitemap.xml">Sitemap</a>
      </span>
    </div>
  </div>
</footer>

<div class="assistant-widget" id="assistantWidget" data-nosnippet>
  <button class="assistant-launcher" id="assistantLauncher" type="button" aria-label="Ask the guide" aria-controls="assistantPanel" aria-expanded="false">
    <span class="assistant-launcher-icon" aria-hidden="true">?</span>
    <span class="assistant-launcher-text">Ask the guide</span>
  </button>
  <section class="assistant-panel" id="assistantPanel" role="dialog" aria-modal="false" aria-labelledby="assistantTitle" aria-describedby="assistantDescription" hidden>
    <div class="assistant-panel-header">
      <div>
        <span class="assistant-eyebrow">South Jersey Food Truck</span>
        <h2 id="assistantTitle">Ask the guide</h2>
      </div>
      <button class="assistant-close" id="assistantClose" type="button" aria-label="Close assistant">&times;</button>
    </div>
    <p class="assistant-description" id="assistantDescription">Ask about trucks, cuisines, counties, hiring, or event planning. Answers use this site’s content and AI. Check the linked sources and confirm details with operators. Do not include personal or private information.</p>
    <div class="assistant-messages" id="assistantMessages" role="log" aria-live="polite" aria-relevant="additions"></div>
    <p class="assistant-status sr-only" id="assistantStatus" aria-live="polite"></p>
    <form class="assistant-form" id="assistantForm">
      <label class="sr-only" for="assistantInput">Your question</label>
      <textarea id="assistantInput" name="message" rows="2" maxlength="1200" placeholder="Which trucks serve tacos in Camden County?" required></textarea>
      <div class="assistant-form-actions">
        <button class="assistant-clear" id="assistantClear" type="button">Clear chat</button>
        <button class="assistant-send" id="assistantSend" type="submit">Send</button>
      </div>
    </form>
  </section>
</div>

<script src="/app.js"></script>
</body>
</html>`;
}

layout.organizationSchema = organizationSchema;
layout.organizationId = ORGANIZATION_ID;
layout.verifiedOrganizationContact = VERIFIED_ORGANIZATION_CONTACT;
module.exports = layout;
