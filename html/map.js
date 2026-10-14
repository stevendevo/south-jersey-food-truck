'use strict';
const layout = require('./layout');
const { esc } = require('../utils');

const COUNTIES = [
  { name: 'Camden County', slug: 'camden-county', position: 'north' },
  { name: 'Burlington County', slug: 'burlington-county', position: 'north' },
  { name: 'Gloucester County', slug: 'gloucester-county', position: 'central' },
  { name: 'Atlantic County', slug: 'atlantic-county', position: 'central' },
  { name: 'Cumberland County', slug: 'cumberland-county', position: 'south' },
  { name: 'Cape May County', slug: 'cape-may-county', position: 'south' },
  { name: 'Salem County', slug: 'salem-county', position: 'south' }
];

module.exports = function mapPage({ trucks = [] } = {}) {
  const counties = COUNTIES.map(county => {
    const listings = trucks.filter(t => t.area === county.name);
    const cuisines = [...new Set(listings.map(t => t.cuisine).filter(Boolean))].slice(0, 3);
    return { ...county, listings, cuisines };
  });
  const entityId = 'https://southjerseyfoodtruck.com/food-truck-map#county-list';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': entityId,
    name: 'South Jersey Food Truck County Map',
    numberOfItems: counties.length,
    itemListElement: counties.map((county, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'AdministrativeArea',
        name: `${county.name}, New Jersey`,
        url: `https://southjerseyfoodtruck.com/${county.slug}-food-trucks`
      }
    }))
  };

  const content = `
<div class="about-page">
  <span class="section-label">Explore Locally</span>
  <h1>South Jersey Food Truck Map</h1>
  <p class="about-lead"><strong>Use this county map to find food trucks by service area across South Jersey.</strong> Choose a county to see current directory listings, live counts, and the cuisines represented there.</p>
  <p style="color:var(--muted);font-size:0.9rem;">This is a directory coverage map, not a real-time GPS map. Food trucks travel for events, so confirm the service area and availability directly with each operator.</p>

  <div class="counties-grid" style="margin:1.5rem 0 2.5rem;">
    ${counties.map(county => `<a class="county-card" href="/${county.slug}-food-trucks" aria-label="Browse ${esc(county.name)} food trucks">
      <strong>${esc(county.name)}</strong>
      <span>${county.listings.length} truck${county.listings.length === 1 ? '' : 's'} listed</span>
      ${county.cuisines.length ? `<small style="display:block;margin-top:0.5rem;color:var(--muted);">${county.cuisines.map(esc).join(' · ')}</small>` : '<small style="display:block;margin-top:0.5rem;color:var(--muted);">No current listings</small>'}
    </a>`).join('\n    ')}
  </div>

  <h2>How to use the map</h2>
  <ol style="line-height:1.9;padding-left:1.25rem;">
    <li>Start with the county closest to your event or home base.</li>
    <li>Open the county page to compare available trucks by cuisine.</li>
    <li>Review each truck's event contexts, verification date, and contact path.</li>
    <li>Ask the operator about travel radius, menu, pricing, setup, and availability.</li>
  </ol>

  <p style="margin-top:2rem;"><a href="/directory" class="btn btn-primary">Browse the full directory</a> <a href="/directory-snapshot" class="btn btn-outline">See current directory data</a></p>
</div>`;

  return layout({
    title: 'South Jersey Food Truck Map by County',
    desc: 'Explore South Jersey food trucks by county with live directory counts, cuisine highlights, and links to each county listing.',
    canonical: '/food-truck-map',
    mainEntity: entityId,
    about: { '@type': 'Place', name: 'South Jersey, New Jersey' },
    jsonLd,
    content
  });
};