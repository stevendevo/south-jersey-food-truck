'use strict';
const layout = require('./layout');
const { truckEntity } = require('./truck-entity');
const { esc, renderTruckImage } = require('../utils');
const { cuisineSlug, countySlugForArea } = require('../taxonomy');

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
      <div class="truck-card-footer"><span class="truck-card-city">&#128205; ${esc(t.city)}, ${esc(t.area)}</span><span class="truck-card-arrow">&#8594;</span></div>
    </div>
  </a>`;
}

module.exports = function cityPage({ city, county, slug, trucks, cityPages = [] }) {
  const cityTrucks = trucks.filter(t => t.city === city && t.area === county);
  const cuisines = [...new Set(cityTrucks.map(t => t.cuisine).filter(Boolean))].sort();
  const cuisineCounts = new Map();
  cityTrucks.forEach(t => cuisineCounts.set(t.cuisine, (cuisineCounts.get(t.cuisine) || 0) + 1));
  const verifiedCount = cityTrucks.filter(t => t.verified).length;
  const total = cityTrucks.length;
  const countySlug = countySlugForArea(county);
  const relatedCities = cityPages.filter(page => page.county === county && page.slug !== slug);
  const canonical = `/food-trucks-in-${slug}`;
  const cuisineLinks = cuisines.map(c =>
    `<a href="/south-jersey-${cuisineSlug(c)}-food-trucks" style="color:var(--primary);white-space:nowrap;">${esc(c)} (${cuisineCounts.get(c)})</a>`
  ).join(' &middot; ');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `https://southjerseyfoodtruck.com${canonical}#item-list`,
    name: `Food Trucks in ${city}, New Jersey`,
    description: `Directory of ${total} food trucks based in ${city}, ${county}, New Jersey, with cuisine and event-planning details.`,
    numberOfItems: total,
    itemListElement: cityTrucks.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: truckEntity(t)
    }))
  };

  const title = `Food Trucks in ${city}, NJ — Find & Book | South Jersey Food Truck`;
  const desc = `Browse ${total} food trucks based in ${city}, ${county}, NJ — ${cuisines.slice(0, 4).join(', ')}${cuisines.length > 4 ? ' and more' : ''}. Compare local operators for events, catering, and private parties.`;

  const content = `
<div class="directory-top">
  <div class="container">
    <nav class="breadcrumb" aria-label="Breadcrumb" style="padding-top:1.5rem;">
      <a href="/">Home</a><span>/</span>
      <a href="/directory">Directory</a><span>/</span>
      <span>${esc(city)}</span>
    </nav>
    <h1 style="margin-bottom:0.3rem;">Food Trucks in ${esc(city)}, NJ</h1>
    <p style="color:var(--muted);margin-bottom:${cuisines.length ? '0.75rem' : '1.5rem'};">${total} food truck${total !== 1 ? 's' : ''} based in ${esc(city)}, ${esc(county)} &mdash; available for events, catering, and private parties.</p>
    ${cuisines.length ? `<p style="font-size:0.9rem;color:var(--muted);margin-bottom:0.75rem;">Cuisines represented: ${cuisineLinks}</p>` : ''}
    <p style="font-size:0.9rem;color:var(--muted);margin-bottom:1.5rem;">This city directory currently includes ${verifiedCount} recorded active check${verifiedCount !== 1 ? 's' : ''}. Check each operator&rsquo;s profile for contact details and confirm availability directly.</p>
  </div>
</div>

<div class="container" style="padding-top:1.5rem;padding-bottom:2.5rem;">
  <div class="truck-grid">
    ${cityTrucks.map(truckCard).join('\n    ')}
  </div>
</div>

<div class="container" style="padding-bottom:2.5rem;">
  <h2 style="font-size:1.2rem;margin-bottom:1rem;">Plan an event in ${esc(city)}</h2>
  <p style="line-height:1.8;color:var(--text);">These listings are organized by home base, not a promise that an operator is available on a specific date. For a ${esc(city)} event, share the venue, date, guest count, and service window when requesting a quote so each truck can confirm travel and availability.</p>
  <p style="font-size:0.95rem;color:var(--muted);">Browse more <a href="/${esc(countySlug)}-food-trucks" style="color:var(--primary);">${esc(county)} food trucks</a> or explore the <a href="/food-trucks-in-south-jersey" style="color:var(--primary);">South Jersey food truck guide</a>.</p>
</div>

${relatedCities.length ? `<section class="directory-browse-links city-related-links" aria-labelledby="related-city-heading">
  <div class="container">
    <h2 id="related-city-heading">More ${esc(county)} city directories</h2>
    <div class="directory-link-list">
      ${relatedCities.map(page => `<a href="/food-trucks-in-${esc(page.slug)}">${esc(page.city)} food trucks</a>`).join('')}
    </div>
  </div>
</section>` : ''}

<div class="cta-band">
  <div class="container">
    <h2>Rent a Food Truck in ${esc(city)}</h2>
    <p>Tell us about your ${esc(city)} event and we&rsquo;ll help you compare the right food truck options.</p>
    <div class="cta-actions">
      <a href="/contact" class="btn btn-white">Request a Quote &mdash; Free</a>
      <a href="/directory" class="btn btn-outline" style="border-color:rgba(255,255,255,0.6);color:#fff;">Browse All Trucks</a>
    </div>
  </div>
</div>`;

  return layout({
    title,
    desc,
    canonical,
    mainEntity: `https://southjerseyfoodtruck.com${canonical}#item-list`,
    about: { '@type': 'City', name: `${city}, New Jersey` },
    breadcrumb: [
      { name: 'Home', url: '/' },
      { name: 'Directory', url: '/directory' },
      { name: city, url: canonical }
    ],
    jsonLd,
    content
  });
};