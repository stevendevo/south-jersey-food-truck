'use strict';

const DOMAIN = 'https://southjerseyfoodtruck.com';

// County-based records in this directory are in New Jersey; explicit state
// suffixes describe out-of-state home bases. A home base is not a service radius.
function truckAddress(truck) {
  const region = /,\s*([A-Z]{2})$/.exec(truck.area || '')?.[1] ||
    (/ County$/.test(truck.area || '') ? 'NJ' : undefined);
  return {
    '@type': 'PostalAddress',
    ...(truck.city ? { addressLocality: truck.city } : {}),
    ...(region ? { addressRegion: region } : {}),
    addressCountry: 'US'
  };
}

function truckEntity(truck) {
  const url = `${DOMAIN}/trucks/${truck.slug}`;
  return {
    '@type': 'FoodEstablishment',
    '@id': `${url}#food-establishment`,
    name: truck.name,
    url,
    servesCuisine: truck.cuisine,
    address: truckAddress(truck)
  };
}

module.exports = { truckAddress, truckEntity };
