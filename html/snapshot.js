'use strict';
const layout = require('./layout');
const { esc } = require('../utils');

const COUNTY_NAMES = ['Camden County', 'Burlington County', 'Gloucester County', 'Atlantic County', 'Cape May County', 'Cumberland County', 'Salem County'];

module.exports = function snapshotPage({ trucks = [] } = {}) {
  const snapshotDate = new Date().toISOString().slice(0, 10);
  const counties = COUNTY_NAMES.map(name => ({
    name,
    trucks: trucks.filter(t => t.area === name)
  }));
  const cuisines = [...new Set(trucks.map(t => t.cuisine).filter(Boolean))]
    .map(name => ({ name, count: trucks.filter(t => t.cuisine === name).length }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const verified = trucks.filter(t => t.verified).length;
  const entityId = 'https://southjerseyfoodtruck.com/directory-snapshot#dataset';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    '@id': entityId,
    name: 'South Jersey Food Truck Directory Snapshot',
    description: `A current snapshot of ${trucks.length} food truck listings across seven South Jersey counties, organized by county and cuisine.`,
    url: 'https://southjerseyfoodtruck.com/directory-snapshot',
    dateModified: snapshotDate,
    citation: `South Jersey Food Truck Directory Snapshot, updated ${snapshotDate}.`,
    creator: { '@id': 'https://southjerseyfoodtruck.com/#organization' },
    spatialCoverage: { '@type': 'Place', name: 'South Jersey, New Jersey' },
    variableMeasured: [
      { '@type': 'PropertyValue', name: 'Listed food trucks', value: trucks.length },
      { '@type': 'PropertyValue', name: 'Counties covered', value: counties.length },
      { '@type': 'PropertyValue', name: 'Verified active listings', value: verified }
    ]
  };

  const content = `
<div class="about-page">
  <span class="section-label">Directory Data</span>
  <h1>South Jersey Food Truck Directory Snapshot</h1>
  <p class="about-lead"><strong>As of ${esc(snapshotDate)}, this directory includes ${trucks.length} food trucks across all seven South Jersey counties.</strong> This page summarizes the current directory records so event planners, local writers, and food truck fans can quickly understand the region's mobile food scene.</p>

  <div class="counties-grid" style="margin:1.5rem 0 2.5rem;">
    <div class="county-card"><strong>${trucks.length}</strong><span>listed food trucks</span></div>
    <div class="county-card"><strong>${counties.length}</strong><span>counties covered</span></div>
    <div class="county-card"><strong>${verified}</strong><span>verified active listings</span></div>
    <div class="county-card"><strong>${cuisines.length}</strong><span>cuisine categories</span></div>
  </div>

  <h2>How many food trucks are in each South Jersey county?</h2>
  <div class="counties-grid">
    ${counties.map(c => `<a class="county-card" href="/${c.name.toLowerCase().replace(/ /g, '-').replace('county', 'county')}-food-trucks">
      <strong>${esc(c.name)}</strong>
      <span>${c.trucks.length} truck${c.trucks.length === 1 ? '' : 's'} listed</span>
    </a>`).join('\n    ')}
  </div>

  <h2>Which cuisines are represented?</h2>
  <div class="counties-grid">
    ${cuisines.map(c => `<div class="county-card">
      <strong>${esc(c.name)}</strong>
      <span>${c.count} listing${c.count === 1 ? '' : 's'}</span>
    </div>`).join('\n    ')}
  </div>

  <h2>What does “verified active” mean?</h2>
  <p>A verified active listing has a recorded verification date in the directory data. Verification does not guarantee a truck's current menu, pricing, schedule, or availability, so customers should confirm those details directly with the operator before booking.</p>

  <h2>How this snapshot is calculated</h2>
  <p>Counts are calculated from the live JSON-backed directory records at page render time. Each truck is counted once, using its recorded county and cuisine category. The directory is free for operators and guests, and food trucks can request a listing or submit corrections through the <a href="/submit-truck" style="color:var(--primary);">Submit Your Truck</a> page.</p>
  <h2>How to cite this snapshot</h2>
  <blockquote style="margin:1rem 0;padding:1rem 1.25rem;border-left:3px solid var(--primary);background:rgba(216,72,15,0.05);">
    <p style="margin:0 0 0.5rem;">“South Jersey Food Truck listed ${trucks.length} food trucks across seven South Jersey counties as of ${esc(snapshotDate)}.”</p>
    <cite style="font-size:0.9rem;color:var(--muted);">Source: <a href="https://southjerseyfoodtruck.com/directory-snapshot" style="color:var(--primary);">South Jersey Food Truck Directory Snapshot</a></cite>
  </blockquote>
  <p><a href="/directory" class="btn btn-primary">Browse all food trucks</a> <a href="/food-truck-map" class="btn btn-outline">Explore the county map</a></p>
</div>`;

  return layout({
    title: 'South Jersey Food Truck Directory Snapshot — Current Counts',
    desc: `Current South Jersey food truck directory data: ${trucks.length} listings across seven counties and ${cuisines.length} cuisine categories, updated ${snapshotDate}.`,
    canonical: '/directory-snapshot',
    mainEntity: entityId,
    about: { '@type': 'Dataset', name: 'South Jersey food truck directory data' },
    jsonLd,
    content
  });
};