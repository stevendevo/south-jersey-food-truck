'use strict';
const layout = require('./layout');
const { truckEntity } = require('./truck-entity');
const { esc, renderTruckImage } = require('../utils');
const { cuisineSlug, countySlugForArea, COUNTY_SLUGS } = require('../taxonomy');

function truckCard(t) {
  return `<a href="/trucks/${esc(t.slug)}" class="truck-card">
    <div class="truck-card-img-wrap">
      ${renderTruckImage(t, { context: `food truck in ${t.city}` })}
    </div>
    <div class="truck-card-body">
      <div class="truck-card-badges">
        ${t.featured ? '<span class="badge badge-featured">&#9733; Featured</span>' : ''}
        ${t.verified ? '<span class="badge badge-verified">&#10003; Recorded active check</span>' : ''}
        <span class="badge badge-cuisine">${esc(t.cuisine)}</span>
        <span class="badge badge-price">${esc(t.price_range || '$$')}</span>
      </div>
      <div class="truck-card-name">${esc(t.name)}</div>
      <p class="truck-card-desc">${esc(t.short_description)}</p>
      <div class="truck-card-footer"><span class="truck-card-city">&#128205; ${esc(t.city)}</span><span class="truck-card-arrow">&#8594;</span></div>
    </div>
  </a>`;
}

module.exports = function countyCuisinePage({ county, countySlug, cuisine, cSlug, trucks }) {
  const matched = trucks.filter(t => t.area === county && t.cuisine === cuisine);
  const total = matched.length;
  const countyShort = county.replace(' County', '');
  const canonical = `/${countySlug}-${cSlug}-food-trucks`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `https://southjerseyfoodtruck.com${canonical}#item-list`,
    name: `${cuisine} Food Trucks in ${county}, NJ`,
    description: `Find ${total} ${cuisine} food truck${total !== 1 ? 's' : ''} serving ${county}, NJ — available for events, catering, weddings, and corporate parties.`,
    numberOfItems: total,
    itemListElement: matched.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: truckEntity(t)
    }))
  };

  const title = `${cuisine} Food Trucks in ${county}, NJ — Find & Book | South Jersey Food Truck`;
  const desc = `Browse ${total} ${cuisine} food truck${total !== 1 ? 's' : ''} serving ${county}, NJ. Available for weddings, corporate events, birthday parties, and private catering in ${countyShort}.`;

  const otherCuisines = [...new Set(
    trucks.filter(t => t.area === county && t.cuisine && t.cuisine !== cuisine).map(t => t.cuisine)
  )].sort();

  const otherCuisinesHtml = otherCuisines.length > 0 ? `
<div class="container" style="padding-bottom:2.5rem;">
  <h2 style="font-size:1.2rem;margin-bottom:1rem;">Other cuisines in ${esc(countyShort)}</h2>
  <ul style="list-style:none;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:0.5rem;">
    ${otherCuisines.map(c => {
      const cs = cuisineSlug(c);
      const count = trucks.filter(t => t.area === county && t.cuisine === c).length;
      return `<li><a href="/${countySlug}-${cs}-food-trucks" style="display:inline-block;padding:0.35rem 0.85rem;background:var(--surface,#f5f5f5);border:1px solid var(--border,#e0e0e0);border-radius:999px;color:var(--primary);text-decoration:none;font-size:0.9rem;">${esc(c)} &middot; ${count}</a></li>`;
    }).join('\n    ')}
  </ul>
</div>` : '';

  const otherCounties = [...new Set(
    trucks
      .filter(t => t.area && t.area !== county && t.area.endsWith(' County') && t.cuisine === cuisine)
      .filter(t => Object.values(COUNTY_SLUGS).includes(t.area))
      .map(t => t.area)
  )].sort();

  const otherCountiesHtml = otherCounties.length > 0 ? `
<div class="container" style="padding-bottom:2.5rem;">
  <h2 style="font-size:1.2rem;margin-bottom:1rem;">Other counties for ${esc(cuisine)}</h2>
  <ul style="list-style:none;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:0.5rem;">
    ${otherCounties.map(area => {
      const areaSlug = countySlugForArea(area);
      const count = trucks.filter(t => t.area === area && t.cuisine === cuisine).length;
      return `<li><a href="/${areaSlug}-${cSlug}-food-trucks" style="display:inline-block;padding:0.35rem 0.85rem;background:var(--surface,#f5f5f5);border:1px solid var(--border,#e0e0e0);border-radius:999px;color:var(--primary);text-decoration:none;font-size:0.9rem;">${esc(area.replace(' County', ''))} &middot; ${count} ${count === 1 ? 'truck' : 'trucks'}</a></li>`;
    }).join('\n    ')}
  </ul>
</div>` : '';

  const content = `
<div class="directory-top">
  <div class="container">
    <nav class="breadcrumb" aria-label="Breadcrumb" style="padding-top:1.5rem;">
      <a href="/">Home</a><span>/</span>
      <a href="/directory">Directory</a><span>/</span>
      <a href="/south-jersey-${cuisineSlug(cuisine)}-food-trucks">${esc(cuisine)}</a><span>/</span>
      <span>${esc(county)}</span>
    </nav>
    <h1 style="margin-bottom:0.3rem;">${esc(cuisine)} Food Trucks in ${esc(county)}, NJ</h1>
    <p style="color:var(--muted);margin-bottom:0.75rem;">${total} ${esc(cuisine)} food truck${total !== 1 ? 's' : ''} available in ${esc(county)} &mdash; for events, catering, and private parties.</p>
    <p style="font-size:0.9rem;color:var(--muted);margin-bottom:0.5rem;">
      Browse all <a href="/south-jersey-${cuisineSlug(cuisine)}-food-trucks" style="color:var(--primary);">${esc(cuisine)} trucks in South Jersey</a>
      &nbsp;&middot;&nbsp;
      All <a href="/${countySlug}-food-trucks" style="color:var(--primary);">food trucks in ${esc(county)}</a>
    </p>
    <p style="font-size:0.9rem;color:var(--muted);margin-bottom:1.5rem;">Part of the <a href="/food-trucks-in-south-jersey" style="color:var(--primary);">South Jersey food truck guide</a>.</p>
  </div>
</div>

<div class="container" style="padding-top:1.5rem;padding-bottom:4rem;">
  ${total > 0 ? `<div class="truck-grid">
    ${matched.map(truckCard).join('\n    ')}
  </div>` : `<p style="color:var(--muted);text-align:center;padding:3rem 0;">No ${esc(cuisine)} trucks listed in ${esc(county)} yet. <a href="/submit-truck" style="color:var(--primary);">Submit your truck</a> to get listed.</p>`}
</div>

${otherCuisinesHtml}
${otherCountiesHtml}
<div class="cta-band">
  <div class="container">
    <h2>Rent a ${esc(cuisine)} Food Truck in ${esc(countyShort)}</h2>
    <p>Looking for ${esc(cuisine)} catering for your ${esc(countyShort)} event? Get a free quote today.</p>
    <div class="cta-actions">
      <a href="/contact" class="btn btn-white">Request a Quote &mdash; Free</a>
      <a href="/south-jersey-${cuisineSlug(cuisine)}-food-trucks" class="btn btn-outline" style="border-color:rgba(255,255,255,0.6);color:#fff;">More ${esc(cuisine)} Trucks</a>
    </div>
  </div>
</div>`;

  return layout({
    title,
    desc,
    canonical,
    mainEntity: `https://southjerseyfoodtruck.com${canonical}#item-list`,
    about: { '@type': 'Thing', name: `${cuisine} food trucks in ${county}, New Jersey` },
    breadcrumb: [
      { name: 'Home', url: '/' },
      { name: 'Directory', url: '/directory' },
      { name: cuisine, url: `/south-jersey-${cSlug}-food-trucks` },
      { name: county, url: canonical }
    ],
    jsonLd,
    content
  });
};
