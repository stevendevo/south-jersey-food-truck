'use strict';
const layout = require('./layout');
const { truckEntity } = require('./truck-entity');
const { esc, renderTruckImage } = require('../utils');

function cuisineSlug(c) {
  return c.toLowerCase()
    .replace(/\//g, '-').replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

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

module.exports = function countyPage({ county, slug, trucks }) {
  const countyTrucks = trucks.filter(t => t.area === county);
  const cuisines = [...new Set(countyTrucks.map(t => t.cuisine).filter(Boolean))].sort();
  const cuisineCounts = new Map();
  countyTrucks.forEach(t => cuisineCounts.set(t.cuisine, (cuisineCounts.get(t.cuisine) || 0) + 1));
  const total = countyTrucks.length;
  const countyShort = county.replace(' County', '');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `https://southjerseyfoodtruck.com/${slug}-food-trucks#item-list`,
    name: `${county} Food Trucks`,
    description: `Find ${total} food trucks serving ${county}, NJ — available for events, catering, weddings, and corporate parties.`,
    numberOfItems: total,
    itemListElement: countyTrucks.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: truckEntity(t)
    }))
  };

  const title = `${county} Food Trucks — Find & Book | South Jersey Food Truck`;
  const desc = `Browse ${total} food trucks serving ${county}, NJ — ${cuisines.slice(0, 4).join(', ')}${cuisines.length > 4 ? ' and more' : ''}. Available for weddings, corporate events, birthday parties, and private catering.`;

  const cuisineLinks = cuisines.map(c =>
    `<a href="/${slug}-${cuisineSlug(c)}-food-trucks" style="color:var(--primary);white-space:nowrap;">${esc(c)} (${cuisineCounts.get(c)})</a>`
  ).join(' &middot; ');

  const content = `
<div class="directory-top">
  <div class="container">
    <nav class="breadcrumb" aria-label="Breadcrumb" style="padding-top:1.5rem;">
      <a href="/">Home</a><span>/</span>
      <a href="/directory">Directory</a><span>/</span>
      <span>${esc(county)}</span>
    </nav>
    <h1 style="margin-bottom:0.3rem;">${esc(county)} Food Trucks</h1>
    <p style="color:var(--muted);margin-bottom:${cuisines.length ? '0.75rem' : '1.5rem'};">${total} food truck${total !== 1 ? 's' : ''} serving ${esc(county)}, New Jersey &mdash; available for events, catering, and private parties.</p>
    ${cuisines.length ? `<p style="font-size:0.9rem;color:var(--muted);margin-bottom:0.75rem;">Cuisines available: ${cuisineLinks}</p>` : ''}
    <p style="font-size:0.9rem;color:var(--muted);margin-bottom:1.5rem;">Part of the <a href="/food-trucks-in-south-jersey" style="color:var(--primary);">South Jersey food truck guide</a>.</p>
  </div>
</div>

<div class="container" style="padding-top:1.5rem;padding-bottom:4rem;">
  ${total > 0 ? `<div class="truck-grid">
    ${countyTrucks.map(truckCard).join('\n    ')}
  </div>` : `<p style="color:var(--muted);text-align:center;padding:3rem 0;">No trucks listed for ${esc(county)} yet. <a href="/submit-truck" style="color:var(--primary);">Submit your truck</a> to get listed.</p>`}
</div>

<div class="cta-band">
  <div class="container">
    <h2>Rent a Food Truck in ${esc(countyShort)}</h2>
    <p>Planning a wedding, corporate lunch, or private party in ${esc(county)}? Get a free quote from South Jersey&rsquo;s best food trucks.</p>
    <div class="cta-actions">
      <a href="/contact" class="btn btn-white">Request a Quote &mdash; Free</a>
      <a href="/directory" class="btn btn-outline" style="border-color:rgba(255,255,255,0.6);color:#fff;">Browse All Trucks</a>
    </div>
  </div>
</div>`;

  return layout({
    title,
    desc,
    canonical: `/${slug}-food-trucks`,
    mainEntity: `https://southjerseyfoodtruck.com/${slug}-food-trucks#item-list`,
    about: { '@type': 'AdministrativeArea', name: `${county}, New Jersey` },
    breadcrumb: [
      { name: 'Home', url: '/' },
      { name: 'Directory', url: '/directory' },
      { name: county, url: `/${slug}-food-trucks` }
    ],
    jsonLd,
    content
  });
};
