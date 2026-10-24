'use strict';
const layout = require('./layout');
const { truckEntity } = require('./truck-entity');
const { esc, renderTruckImage } = require('../utils');
const { cityPageTargets, countySlugForArea } = require('../taxonomy');

const COUNTIES = ['Camden County', 'Burlington County', 'Gloucester County', 'Atlantic County', 'Cape May County', 'Cumberland County', 'Salem County'];

function getUniqueCuisines(trucks) {
  const set = new Set(trucks.map(t => t.cuisine).filter(Boolean));
  return Array.from(set).sort();
}

function truckCard(t) {
  const footer = `<span class="truck-card-city">&#128205; ${esc(t.city)}, ${esc(t.area)}</span><span class="truck-card-arrow">&#8594;</span>`;
  return `<a href="/trucks/${esc(t.slug)}" class="truck-card"
    data-name="${esc(t.name)}" data-county="${esc(t.area)}" data-cuisine="${esc(t.cuisine)}" data-city="${esc(t.city)}" data-last-verified="${esc(t.last_verified || '')}">
    <div class="truck-card-img-wrap">
      ${renderTruckImage(t, { context: `food truck in ${t.city}` })}
    </div>
    <div class="truck-card-body">
      <div class="truck-card-badges">
        ${t.featured ? '<span class="badge badge-featured">&#9733; Featured</span>' : ''}
        ${t.verified ? '<span class="badge badge-verified">&#10003; Recorded active check</span>' : ''}
        <span class="badge badge-cuisine">${esc(t.cuisine)}</span>
        <span class="badge badge-county">${esc(t.area)}</span>
        <span class="badge badge-price">${esc(t.price_range || '$$')}</span>
      </div>
      <div class="truck-card-name">${esc(t.name)}</div>
      <p class="truck-card-desc">${esc(t.short_description)}</p>
      <div class="truck-card-footer">${footer}</div>
    </div>
  </a>`;
}

module.exports = function directoryPage({ trucks }) {
  const grilly = trucks.find(t => t.slug === 'grilly-cheese');
  const cuisines = getUniqueCuisines(trucks);
  const cityPages = cityPageTargets(trucks);
  const total = trucks.length;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': 'https://southjerseyfoodtruck.com/directory#item-list',
    name: 'South Jersey Food Truck Directory',
    description: `Directory of ${total} food truck listings in South Jersey and nearby areas.`,
    numberOfItems: total,
    itemListElement: trucks.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: truckEntity(t)
    }))
  };

  const content = `
<div class="directory-top">
  <div class="container">
    <h1 style="margin-bottom:0.75rem;">South Jersey Food Truck Directory</h1>
    <p style="color:var(--text);line-height:1.8;max-width:720px;margin-bottom:1.5rem;">Looking for food trucks in South Jersey? You're in the right place. This directory lists ${total} mobile food operators in South Jersey and nearby areas, with county pages covering Camden, Burlington, Gloucester, Atlantic, Cape May, Cumberland, and Salem. Whether you're searching for a taco truck near Haddonfield, a wood-fired pizza operation for a Burlington County wedding, or a BBQ caterer for a Cherry Hill corporate event, use the filters below to narrow by county, cuisine type, or truck name. Open each profile for available operator links and listing details. Confirm travel and date availability directly with the operator. <a href="/food-trucks-in-south-jersey">Learn more about South Jersey's food truck scene &rarr;</a></p>

    <div class="directory-search">
      <input type="text" id="dirSearch" aria-label="Search food trucks by name, cuisine, or city" placeholder="Search trucks, cuisines, cities&hellip;" autocomplete="off" />
    </div>

    <div class="filter-row">
      <span class="filter-label">County</span>
      <div class="filter-btns">
        ${COUNTIES.map(c => `<button type="button" class="filter-btn" data-county="${esc(c)}" aria-pressed="false">${esc(c.replace(' County', ''))}</button>`).join('\n        ')}
      </div>
    </div>

    <div class="filter-row">
      <span class="filter-label">Cuisine</span>
      <div class="filter-btns">
        ${cuisines.map(c => `<button type="button" class="filter-btn" data-cuisine="${esc(c)}" aria-pressed="false">${esc(c)}</button>`).join('\n        ')}
      </div>
    </div>

    <div class="filter-row">
      <span class="filter-label">Sort by</span>
      <div class="filter-btns">
        <button type="button" class="filter-btn active" id="sortDefault" data-sort="default" aria-pressed="true">Default</button>
        <button type="button" class="filter-btn" id="sortVerified" data-sort="recently-verified" aria-pressed="false">Recently Verified</button>
      </div>
    </div>
    <div class="directory-filter-actions">
      <button type="button" class="directory-clear-filters" id="clearDirFilters" hidden>Clear filters</button>
      <button type="button" class="directory-copy-link" id="copyDirLink" hidden>Copy filtered link</button>
      <span class="directory-share-status" id="dirShareStatus" role="status" aria-live="polite" aria-atomic="true"></span>
      <div class="directory-share-fallback" id="dirShareFallback" hidden>
        <label for="dirShareUrl">Filtered directory link</label>
        <input type="text" id="dirShareUrl" readonly>
      </div>
    </div>
  </div>
</div>

<section class="directory-browse-links" aria-labelledby="directory-browse-heading">
  <div class="container">
    <h2 id="directory-browse-heading">Browse South Jersey food trucks by place</h2>
    <p>Use the filters above for a quick search, or open a dedicated directory page for a county or city.</p>
    <div class="directory-link-groups">
      <div>
        <h3>Counties</h3>
        <div class="directory-link-list">
          ${COUNTIES.map(county => `<a href="/${esc(countySlugForArea(county))}-food-trucks">${esc(county)}</a>`).join('')}
        </div>
      </div>
      <div>
        <h3>Cities</h3>
        <div class="directory-link-list">
          ${cityPages.map(page => `<a href="/food-trucks-in-${esc(page.slug)}">${esc(page.city)}</a>`).join('')}
        </div>
      </div>
    </div>
  </div>
</section>

${grilly ? `<div class="container" style="padding-top:2rem;">
  <div class="dir-sponsor-banner">
    <div class="dir-sponsor-badge">&#9733; Presenting Sponsor</div>
    <div class="dir-sponsor-info">
      <a href="/trucks/grilly-cheese" class="dir-sponsor-name">Grilly Cheese</a>
      <span class="dir-sponsor-sep">&mdash;</span>
      <span class="dir-sponsor-tagline">South Jersey&rsquo;s Premier Gourmet Grilled Cheese Truck &bull; Available for events &amp; catering</span>
    </div>
    <a href="/trucks/grilly-cheese" class="dir-sponsor-cta">View Listing &rarr;</a>
  </div>
</div>` : ''}

<div class="container" style="padding-top:1.5rem;padding-bottom:4rem;">
  <p class="directory-count" id="dirCount">${total} trucks found</p>
  <div class="truck-grid" id="truckGrid">
    ${trucks.map(truckCard).join('\n    ')}
    <div class="no-results hidden" id="noResults">No trucks match your search. Try different keywords or reset filters.</div>
  </div>
</div>

<div class="cta-band">
  <div class="container">
    <h2>Own a Food Truck?</h2>
    <p>Help South Jersey guests and event planners discover your truck.</p>
    <div class="cta-actions">
      <a href="/submit-truck" class="btn btn-white">Submit Your Truck &mdash; Free</a>
      <a href="/contact" class="btn btn-outline" style="border-color:rgba(255,255,255,0.6);color:#fff;">Contact Us</a>
    </div>
  </div>
</div>`;

  return layout({
    title: `South Jersey Food Truck Directory — ${total} Listings`,
    desc: `Browse ${total} food truck listings in South Jersey and nearby areas. Compare cuisines, recorded home bases and operator links. Filter by county or truck name.`,
    canonical: '/directory',
    mainEntity: 'https://southjerseyfoodtruck.com/directory#item-list',
    about: { '@type': 'Thing', name: 'South Jersey food trucks' },
    jsonLd,
    content
  });
};

module.exports.truckCard = truckCard;
