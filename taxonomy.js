'use strict';

const COUNTY_SLUGS = {
  'camden-county': 'Camden County',
  'burlington-county': 'Burlington County',
  'gloucester-county': 'Gloucester County',
  'atlantic-county': 'Atlantic County',
  'cape-may-county': 'Cape May County',
  'cumberland-county': 'Cumberland County',
  'salem-county': 'Salem County',
};

function cuisineSlug(cuisine) {
  return cuisine.toLowerCase()
    .replace(/\//g, '-').replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function countySlugForArea(area) {
  return area.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function citySlug(city) {
  return String(city || '').toLowerCase()
    .replace(/['’]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function cuisineSlugMap(trucks) {
  const cuisines = {};
  for (const cuisine of new Set(trucks.map(truck => truck.cuisine).filter(Boolean))) {
    cuisines[cuisineSlug(cuisine)] = cuisine;
  }
  return cuisines;
}

function countyCuisineCombos(trucks) {
  const cuisines = cuisineSlugMap(trucks);
  const combos = [];
  for (const [countySlug, county] of Object.entries(COUNTY_SLUGS)) {
    for (const [cSlug, cuisine] of Object.entries(cuisines)) {
      if (trucks.some(truck => truck.area === county && truck.cuisine === cuisine)) {
        combos.push({ ctySlug: countySlug, county, cSlug, cuisine });
      }
    }
  }
  return combos;
}

function cityPageTargets(trucks, minimumListings = 2) {
  const southJerseyCounties = new Set(Object.values(COUNTY_SLUGS));
  const grouped = new Map();
  for (const truck of trucks) {
    if (!truck.city || !southJerseyCounties.has(truck.area)) continue;
    const key = `${truck.city}\u0000${truck.area}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(truck);
  }
  return [...grouped.entries()]
    .map(([key, cityTrucks]) => {
      const [city, county] = key.split('\u0000');
      return { city, county, slug: citySlug(city), trucks: cityTrucks };
    })
    .filter(target => target.slug && target.trucks.length >= minimumListings)
    .sort((a, b) => a.city.localeCompare(b.city) || a.county.localeCompare(b.county));
}

module.exports = {
  COUNTY_SLUGS,
  cuisineSlug,
  countySlugForArea,
  citySlug,
  cuisineSlugMap,
  countyCuisineCombos,
  cityPageTargets,
};