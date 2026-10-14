'use strict';
const layout = require('./layout');
const { esc, renderTruckImage } = require('../utils');
const { COUNTY_SLUGS } = require('../taxonomy');

function countySlug(area) {
  return area.toLowerCase().replace(/\s+/g, '-');
}

function cuisineSlugFn(c) {
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
        ${t.verified ? '<span class="badge badge-verified">&#10003; Verified Active</span>' : ''}
        <span class="badge badge-county">${esc(t.area)}</span>
        <span class="badge badge-price">${esc(t.price_range || '$$')}</span>
      </div>
      <div class="truck-card-name">${esc(t.name)}</div>
      <p class="truck-card-desc">${esc(t.short_description)}</p>
      <div class="truck-card-footer"><span class="truck-card-city">&#128205; ${esc(t.city)}, ${esc(t.area)}</span><span class="truck-card-arrow">&#8594;</span></div>
    </div>
  </a>`;
}

module.exports = function cuisinePage({ cuisine, slug, trucks }) {
  const cuisineTrucks = trucks.filter(t => t.cuisine === cuisine);
  const areas = [...new Set(cuisineTrucks.map(t => t.area).filter(Boolean))].sort();
  const total = cuisineTrucks.length;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `https://southjerseyfoodtruck.com/south-jersey-${slug}-food-trucks#item-list`,
    name: `${cuisine} Food Trucks in South Jersey`,
    description: `Find ${total} ${cuisine} food trucks serving South Jersey — available for events, catering, weddings, and corporate parties.`,
    numberOfItems: total,
    itemListElement: cuisineTrucks.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'FoodEstablishment',
        name: t.name,
        url: `https://southjerseyfoodtruck.com/trucks/${t.slug}`,
        servesCuisine: t.cuisine,
        address: { '@type': 'PostalAddress', addressLocality: t.city, addressRegion: 'NJ', addressCountry: 'US' }
      }
    }))
  };

  const title = `${cuisine} Food Trucks in South Jersey — Find & Book | South Jersey Food Truck`;
  const desc = `Browse ${total} ${cuisine} food truck${total !== 1 ? 's' : ''} serving South Jersey, NJ — available in ${areas.slice(0, 3).join(', ')}${areas.length > 3 ? ' and more' : ''}. Book for weddings, corporate events, and private parties.`;

  const countyLinks = areas
    .filter(a => Object.values(COUNTY_SLUGS).includes(a))
    .map(a => `<a href="/${countySlug(a)}-${cuisineSlugFn(cuisine)}-food-trucks" style="color:var(--primary);white-space:nowrap;">${esc(cuisine)} in ${esc(a)}</a>`)
    .join(' &middot; ');

  const content = `
<div class="directory-top">
  <div class="container">
    <nav class="breadcrumb" aria-label="Breadcrumb" style="padding-top:1.5rem;">
      <a href="/">Home</a><span>/</span>
      <a href="/directory">Directory</a><span>/</span>
      <span>${esc(cuisine)}</span>
    </nav>
    <h1 style="margin-bottom:0.3rem;">${esc(cuisine)} Food Trucks in South Jersey</h1>
    <p style="color:var(--muted);margin-bottom:${countyLinks ? '0.75rem' : '1.5rem'};">${total} ${esc(cuisine)} food truck${total !== 1 ? 's' : ''} available across South Jersey &mdash; for events, catering, and private parties.</p>
    ${countyLinks ? `<p style="font-size:0.9rem;color:var(--muted);margin-bottom:0.75rem;">Also browse by county: ${countyLinks}</p>` : ''}
    <p style="font-size:0.9rem;color:var(--muted);margin-bottom:1.5rem;">Part of the <a href="/food-trucks-in-south-jersey" style="color:var(--primary);">South Jersey food truck guide</a>.</p>
  </div>
</div>

<div class="container" style="padding-top:1.5rem;padding-bottom:4rem;">
  ${total > 0 ? `<div class="truck-grid">
    ${cuisineTrucks.map(truckCard).join('\n    ')}
  </div>` : `<p style="color:var(--muted);text-align:center;padding:3rem 0;">No ${esc(cuisine)} trucks listed yet. <a href="/submit-truck" style="color:var(--primary);">Submit your truck</a> to get listed.</p>`}
</div>

<div class="cta-band">
  <div class="container">
    <h2>Rent a ${esc(cuisine)} Food Truck</h2>
    <p>Looking for ${esc(cuisine)} catering for your South Jersey event? Get a free quote today.</p>
    <div class="cta-actions">
      <a href="/contact" class="btn btn-white">Request a Quote &mdash; Free</a>
      <a href="/directory" class="btn btn-outline" style="border-color:rgba(255,255,255,0.6);color:#fff;">Browse All Trucks</a>
    </div>
  </div>
</div>`;

  return layout({
    title,
    desc,
    canonical: `/south-jersey-${slug}-food-trucks`,
    mainEntity: `https://southjerseyfoodtruck.com/south-jersey-${slug}-food-trucks#item-list`,
    about: { '@type': 'Thing', name: `${cuisine} food trucks` },
    breadcrumb: [
      { name: 'Home', url: '/' },
      { name: 'Directory', url: '/directory' },
      { name: cuisine, url: `/south-jersey-${slug}-food-trucks` }
    ],
    jsonLd,
    content
  });
};
