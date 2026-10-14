'use strict';
const layout = require('./layout');
const { truckCard } = require('./directory');
const { esc, hasVerifiedTruckImage, renderTruckImage } = require('../utils');
const { cuisineSlug, COUNTY_SLUGS } = require('../taxonomy');

const EVENT_CONTEXTS = [
  { label: 'Weddings', pattern: /\bwedding/i },
  { label: 'Corporate events', pattern: /\bcorporate/i },
  { label: 'Private parties', pattern: /\bprivate (party|parties|event)/i },
  { label: 'Festivals', pattern: /\bfestival/i },
  { label: 'Farmers markets', pattern: /\bfarmers? market/i },
  { label: 'School events', pattern: /\b(school|PTA|fundraiser)/i },
  { label: 'Birthday parties', pattern: /\bbirthday/i },
  { label: 'Brunch events', pattern: /\bbrunch/i },
  { label: 'Shore events', pattern: /\b(boardwalk|shore|beach) event/i }
];

const OPENING_HOUR_DAYS = new Set([
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
]);
const OPENING_HOUR_TIME = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

/**
 * Convert only complete, explicitly reviewed operating-hour data into the
 * Schema.org shape. The public schedule text is intentionally not a source
 * for this structured data because it may describe events or locations.
 */
function getOpeningHoursSpecification(truck) {
  if (truck?.operating_hours_reviewed !== true || !Array.isArray(truck.operating_hours) || !truck.operating_hours.length) {
    return null;
  }

  const specifications = truck.operating_hours.map(range => {
    if (!range || typeof range !== 'object' || !Array.isArray(range.days) || !range.days.length) {
      return null;
    }

    const days = [...new Set(range.days)];
    if (
      days.some(day => !OPENING_HOUR_DAYS.has(day)) ||
      typeof range.opens !== 'string' ||
      typeof range.closes !== 'string' ||
      !OPENING_HOUR_TIME.test(range.opens) ||
      !OPENING_HOUR_TIME.test(range.closes)
    ) {
      return null;
    }

    return {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: days,
      opens: range.opens,
      closes: range.closes
    };
  });

  return specifications.every(Boolean) ? specifications : null;
}

function validVerificationDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const date = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : value;
}

module.exports = function truckPage({ truck: t, nearbyTrucks = [], cityPageTarget = null }) {
  const specialties = Array.isArray(t.specialties) ? t.specialties : (t.specialties ? JSON.parse(t.specialties) : []);
  const lastVerified = validVerificationDate(t.last_verified);
  const imgSrc = hasVerifiedTruckImage(t) ? t.image_url : null;
  const listingText = [t.description, t.short_description, t.schedule].filter(Boolean).join(' ');
  const eventContexts = EVENT_CONTEXTS.filter(context => context.pattern.test(listingText)).map(context => context.label);
  const operatorQuote = t.operator_quote_approved && t.operator_quote ? t.operator_quote : null;

  const isGrilly = t.slug === 'grilly-cheese';
  const isNJArea = !t.area || t.area.includes('County');
  const stateLabel = isNJArea ? 'NJ' : (t.area.split(', ')[1] || 'NJ');
  const sameAs = [
    t.website || null,
    t.instagram ? `https://www.instagram.com/${t.instagram.replace('@', '')}` : null,
    t.facebook ? `https://www.facebook.com/${t.facebook}` : null
  ].filter(Boolean);
  const imageUrl = imgSrc ? (imgSrc.startsWith('http') ? imgSrc : `https://southjerseyfoodtruck.com${imgSrc}`) : null;
  const entityId = `https://southjerseyfoodtruck.com/trucks/${t.slug}#food-establishment`;
  const openingHoursSpecification = getOpeningHoursSpecification(t);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FoodEstablishment',
    '@id': entityId,
    name: t.name,
    description: t.description || t.short_description,
    servesCuisine: t.cuisine,
    priceRange: t.price_range || '$$',
    url: `https://southjerseyfoodtruck.com/trucks/${t.slug}`,
    image: imageUrl || undefined,
    telephone: t.phone || undefined,
    email: t.email || undefined,
    address: { '@type': 'PostalAddress', addressLocality: t.city, addressRegion: stateLabel, addressCountry: 'US' },
    areaServed: { '@type': 'AdministrativeArea', name: isNJArea ? `${t.area}, New Jersey` : t.area },
    sameAs: sameAs.length ? sameAs : undefined,
    ...(openingHoursSpecification ? { openingHoursSpecification } : {})
  };

  const location = t.area && t.area.toLowerCase().startsWith(t.city.toLowerCase())
    ? t.area
    : `${t.city}, ${t.area}`;
  const metaDesc = `${t.name} is a ${t.cuisine} food truck based in ${location}. ${t.short_description}`;
  const cuisinePageHref = `/south-jersey-${cuisineSlug(t.cuisine)}-food-trucks`;
  const cityPageHref = cityPageTarget ? `/food-trucks-in-${cityPageTarget.slug}` : null;
  const countyPageHref = Object.values(COUNTY_SLUGS).includes(t.area)
    ? `/${t.area.toLowerCase().replace(/\s+/g,'-')}-food-trucks`
    : null;

  const gallery = Array.isArray(t.gallery) && t.gallery.length ? t.gallery : [];
  const content = `
${renderTruckImage(t, { className: 'truck-hero-img', wrapperClass: 'truck-brand-fallback-hero', width: 1200, height: 420, loading: 'eager', context: `food truck serving ${t.cuisine} in ${t.city}, ${t.area}` })}

<div class="truck-detail">
  <div class="truck-detail-header">
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="/">Home</a><span>/</span>
      <a href="/directory">Directory</a><span>/</span>
      <span>${esc(t.name)}</span>
    </nav>

    <div class="truck-detail-badges">
      ${t.featured ? '<span class="badge badge-featured">&#9733; Featured</span>' : ''}
      ${t.verified ? '<span class="badge badge-verified">&#10003; Verified Active</span>' : ''}
      <span class="badge badge-cuisine">${esc(t.cuisine)}</span>
      <span class="badge badge-county">${esc(t.area)}</span>
      <span class="badge badge-price">${esc(t.price_range || '$$')}</span>
    </div>
    ${t.verified && lastVerified ? `<p class="truck-verified-date">Last verified ${new Date(lastVerified + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>` : ''}

    <h1>${esc(t.name)}</h1>
    <p class="truck-short-desc">${esc(t.short_description)}</p>
  </div>

  ${gallery.length ? `
  <div class="truck-gallery">
    ${gallery.map(g => `<div class="truck-gallery-item"><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" width="400" height="267" /></div>`).join('\n    ')}
  </div>` : ''}

  <div class="truck-body">
    <p>${esc(t.description)}</p>
  </div>

  ${operatorQuote ? `
  <blockquote style="margin:1.5rem 0;padding:1.25rem 1.5rem;border-left:3px solid var(--primary);background:rgba(216,72,15,0.05);">
    <p style="margin:0 0 0.6rem;font-size:1.05rem;">&ldquo;${esc(operatorQuote)}&rdquo;</p>
    <cite style="font-size:0.9rem;color:var(--muted);">— ${esc(t.operator_quote_author || t.name)}, operator-submitted</cite>
  </blockquote>` : ''}

  <div class="truck-info-card" style="margin:1.5rem 0;">
    <div class="truck-info-title">South Jersey Food Truck directory note</div>
    <p style="margin:0 0 0.75rem;">This listing gives event planners a starting point for comparing ${esc(t.cuisine.toLowerCase())} options serving ${esc(t.area)}${specialties.length ? `, including ${esc(specialties.slice(0, 3).join(', '))}` : ''}.</p>
    <p style="margin:0;color:var(--muted);font-size:0.9rem;">Before booking, confirm the current menu, pricing, service radius, arrival and setup requirements, dietary accommodations, and date availability directly with the operator.</p>
  </div>

  <nav class="related-directory-links" aria-label="Related food truck directories">
    <strong>Explore related directories</strong>
    <a href="${cuisinePageHref}">${esc(t.cuisine)} food trucks in South Jersey</a>
    ${cityPageHref ? `<a href="${cityPageHref}">Food trucks in ${esc(t.city)}</a>` : ''}
    ${countyPageHref ? `<a href="${countyPageHref}">${esc(t.area)} food trucks</a>` : '<a href="/directory">Browse all food trucks</a>'}
  </nav>

  <div class="truck-info-grid">
    <div class="truck-info-card">
      <div class="truck-info-title">Location &amp; Schedule</div>
      <div class="truck-info-item"><strong>City:</strong> ${esc(t.city)}, ${esc(t.area)}</div>
      ${t.schedule ? `<div class="truck-info-item" style="margin-top:0.5rem;">${esc(t.schedule)}</div>` : ''}
    </div>

    <div class="truck-info-card">
      <div class="truck-info-title">Contact &amp; Booking</div>
      ${t.slug === 'grilly-cheese' ? `
        ${t.phone ? `<div class="truck-info-item"><a href="tel:${esc(t.phone)}">${esc(t.phone)}</a></div>` : ''}
        ${t.email ? `<div class="truck-info-item"><a href="mailto:${esc(t.email)}">${esc(t.email)}</a></div>` : ''}
        ${t.website ? `<div class="truck-info-item"><a href="${esc(t.website)}" target="_blank" rel="noopener">Visit Website &rarr;</a></div>` : ''}
        ${t.instagram ? `<div class="truck-info-item"><a href="https://instagram.com/${esc(t.instagram.replace('@',''))}" target="_blank" rel="noopener">${esc(t.instagram)} on Instagram</a></div>` : ''}
        ${t.facebook ? `<div class="truck-info-item"><a href="https://facebook.com/${esc(t.facebook)}" target="_blank" rel="noopener">${esc(t.facebook)} on Facebook</a></div>` : ''}
      ` : `
        <div class="truck-info-item" style="margin-bottom:0.75rem;color:var(--muted);">Looking to rent a food truck for your event? Use our contact form and we&rsquo;ll help match you with the right truck.</div>
        <a href="/contact" class="btn btn-primary btn-sm">Rent a Food Truck &rarr;</a>
      `}
    </div>

    ${eventContexts.length ? `
    <div class="truck-info-card" style="grid-column: 1 / -1;">
      <div class="truck-info-title">Event contexts mentioned in this listing</div>
      <p style="margin:0 0 0.75rem;color:var(--muted);">The listing description mentions this truck in connection with:</p>
      <div class="specialties-wrap">
        ${eventContexts.map(context => `<span class="specialty">${esc(context)}</span>`).join('')}
      </div>
      <p style="margin:0.9rem 0 0;color:var(--muted);font-size:0.9rem;">Menus, pricing, guest capacity, and availability vary by event. Confirm details directly with the operator before booking.</p>
    </div>` : ''}

    ${specialties.length ? `
    <div class="truck-info-card" style="grid-column: 1 / -1;">
      <div class="truck-info-title">Signature Items</div>
      <div class="specialties-wrap">
        ${specialties.map(s => `<span class="specialty">${esc(s)}</span>`).join('')}
      </div>
    </div>` : ''}
  </div>

  <div class="truck-cta">
    <h3>Rent a Food Truck for Your Event</h3>
    <p>Interested in hiring a food truck for a wedding, corporate event, or private party? Get in touch and we&rsquo;ll help match you with the right truck.</p>
    <a href="/contact" class="btn btn-primary">Request a Quote</a>
  </div>

  <div class="truck-verify-box" style="margin-top:2rem;padding:1.25rem;background:rgba(45,122,62,0.06);border:1px solid rgba(45,122,62,0.2);border-radius:var(--radius);">
    <p style="margin:0;font-size:0.9rem;color:var(--muted);">Last checked${lastVerified ? ` ${new Date(lastVerified + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}` : ''}. The verified badge means the listing has a recorded active check — it does not guarantee current menus, pricing, or availability.</p>
    <p style="margin:0.75rem 0 0;font-size:0.9rem;"><a href="/verify/${esc(t.slug)}" style="color:var(--primary);">Are you the owner? Verify this listing</a> <span style="color:var(--muted);">&bull;</span> <a href="/report-update/${esc(t.slug)}" style="color:var(--primary);">Report outdated information</a></p>
  </div>
</div>

<div class="container" style="padding-bottom:3rem;">
  <h2 style="margin-bottom:1.5rem;">More Food Trucks in ${esc(t.area)}</h2>
  ${nearbyTrucks.length ? `
  <p style="color:var(--muted);max-width:720px;">Compare other food trucks serving ${esc(t.area)} before you book.</p>
  <div class="truck-grid" style="margin:1.5rem 0 2rem;">
    ${nearbyTrucks.map(truckCard).join('\n    ')}
  </div>` : ''}
  <p><a href="${countyPageHref || '/directory'}" class="btn btn-outline btn-sm">Browse all ${esc(t.area)} trucks &rarr;</a></p>
</div>`;

  return layout({
    title: `${t.name} — ${t.cuisine} Food Truck in ${t.city}, ${stateLabel}`,
    desc: metaDesc,
    canonical: `/trucks/${t.slug}`,
    articleMeta: lastVerified ? { modifiedTime: lastVerified } : undefined,
    og: { image: imageUrl || undefined, imageAlt: t.image_alt || undefined, type: 'website' },
    mainEntity: entityId,
    imageObject: imageUrl ? {
      id: `https://southjerseyfoodtruck.com/trucks/${t.slug}#primary-image`,
      url: imageUrl,
      caption: t.image_alt || `${t.name} food truck serving ${t.cuisine} in ${location}`
    } : undefined,
    breadcrumb: [
      { name: 'Home', url: '/' },
      { name: 'Directory', url: '/directory' },
      { name: t.name, url: `/trucks/${t.slug}` }
    ],
    jsonLd,
    content
  });
};

module.exports.getOpeningHoursSpecification = getOpeningHoursSpecification;
