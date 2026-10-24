'use strict';
const layout = require('./layout');
const { esc, formatDateShort, hasVerifiedTruckImage, renderTruckImage, imageAsset } = require('../utils');
const { truckEntity } = require('./truck-entity');

const COUNTIES = ['Camden County', 'Burlington County', 'Atlantic County', 'Cape May County', 'Gloucester County', 'Cumberland County', 'Salem County'];

function truckCard(t) {
  const cuisine = t.cuisine || 'Local favorite';
  const description = t.short_description || `${cuisine} in ${t.city}, ${t.area}.`;
  return `<a href="/trucks/${esc(t.slug)}" class="truck-card"
    data-name="${esc(t.name)}" data-county="${esc(t.area)}" data-cuisine="${esc(cuisine)}" data-city="${esc(t.city)}" data-image-type="${esc((t.image_asset_type || '').toLowerCase())}">
    <div class="brand-truck-image-wrap">
      ${renderTruckImage(t, { className: 'brand-truck-photo', width: 700, height: 390, context: 'food truck' })}
    </div>
    <div class="brand-truck-card-body">
      <div class="brand-truck-card-meta"><span>${esc(cuisine)}</span><span>${esc(t.area)}</span></div>
      <h3 class="brand-truck-card-title">${esc(t.name)}</h3>
      <p class="brand-truck-card-description">${esc(description)}</p>
      <span class="brand-truck-card-link">Explore listing <span aria-hidden="true">&rarr;</span></span>
    </div>
  </a>`;
}

function blogCard(p) {
  const image = imageAsset(p.cover_image_url || '/seed/blog_summer_guide.png');
  const tags = Array.isArray(p.tags) ? p.tags : (p.tags ? JSON.parse(p.tags) : []);
  return `<a href="/blog/${esc(p.slug)}" class="blog-card">
    <img class="blog-card-img" src="${esc(image.url)}" alt="${esc(p.cover_image_alt || p.title)}" loading="lazy" decoding="async" width="${image.width || 400}" height="${image.height || 195}" />
    <div class="blog-card-body">
      <div class="blog-card-meta">${formatDateShort(p.published_at)} &middot; ${esc(p.author)}</div>
      <div class="blog-card-title">${esc(p.title)}</div>
      <p class="blog-card-excerpt">${esc(p.excerpt)}</p>
      <div class="blog-card-tags">${tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
    </div>
  </a>`;
}

module.exports = function homePage({ trucks, posts }) {
  const grilly = trucks.find(t => t.slug === 'grilly-cheese');
  const eligibleHomeTrucks = trucks.filter(t => t.slug !== 'grilly-cheese');
  const homeTrucks = [
    ...eligibleHomeTrucks.filter(hasVerifiedTruckImage),
    ...eligibleHomeTrucks.filter(t => !hasVerifiedTruckImage(t))
  ].slice(0, 3);
  const recentPosts = posts.slice().sort((a, b) => new Date(b.published_at) - new Date(a.published_at)).slice(0, 3);
  const totalTrucks = trucks.length;
  const localTrucks = trucks.filter(t => COUNTIES.includes(t.area)).length;
  const cuisineCount = new Set(trucks.map(t => t.cuisine).filter(Boolean)).size;
  const featuredTruckList = {
    '@type': 'ItemList',
    '@id': 'https://southjerseyfoodtruck.com/#featured-trucks',
    name: 'Food Trucks to Explore in South Jersey',
    description: 'A selection of food trucks to explore in South Jersey.',
    numberOfItems: homeTrucks.length,
    itemListElement: homeTrucks.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: truckEntity(t)
    }))
  };

  const faqs = [
    { q: 'How do I rent a food truck in South Jersey?', a: 'Browse the directory by county or cuisine, open a truck profile, and contact the operator using its listed website, phone, or email. Confirm the event date, service location, menu, guest count, and written quote directly. The site lists independent businesses; an inquiry does not confirm a booking.' },
    { q: 'How far in advance should I rent a food truck?', a: 'Ask operators as soon as your date and venue are set, especially for weekends, weddings, and seasonal events. Availability varies by truck. Check directly rather than relying on a directory listing as a live calendar.' },
    { q: 'How much does it cost to hire a food truck in South Jersey?', a: 'Request a written quote from the operator. Costs depend on the menu, guest count, service duration, travel, staffing, and any minimum spend. Ask whether tax, gratuity, power, and travel charges are included; this directory does not provide live prices.' },
    { q: 'What areas of South Jersey do food trucks serve?', a: 'Browse county pages for Camden, Burlington, Gloucester, Atlantic, Cape May, Cumberland, and Salem. The directory also includes nearby operators outside those counties. A home location does not guarantee service to your venue; confirm travel and availability with each truck.' },
    { q: 'Do food trucks cater private events like weddings and parties?', a: 'Some listed operators offer private catering. Review their profiles, then ask about your event type, dietary needs, guest count, venue requirements, and cancellation terms before booking.' },
    { q: 'Can I hire a food truck for a corporate event?', a: 'Contact operators about office lunches, employee events, or other corporate catering. Confirm service capacity, payment arrangements, insurance, site access, and power requirements with the truck and venue.' },
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      featuredTruckList,
      {
        '@type': 'FAQPage',
        '@id': 'https://southjerseyfoodtruck.com/#faq',
        isPartOf: { '@id': 'https://southjerseyfoodtruck.com/#webpage' },
        mainEntity: faqs.map(f => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a }
        }))
      }
    ]
  };

  const content = `
<section class="brand-home-hero">
  <div class="container brand-home-hero-inner">
    <div class="brand-home-copy">
      <p class="brand-home-eyebrow">A better way to eat local <span aria-hidden="true">&middot;</span> NJ</p>
      <h1>Find <span>food trucks</span><br />in South Jersey.</h1>
      <p class="brand-home-lead">South Jersey&rsquo;s rolling kitchens, in one sharp little directory.</p>
      <form class="hero-search" id="heroSearchForm" action="/directory" method="get">
        <label class="sr-only" for="heroSearchInput">Search trucks, cuisines, or counties</label>
        <input type="search" id="heroSearchInput" name="q" placeholder="Search trucks, cuisines, or counties" autocomplete="off" />
        <button type="submit">Start exploring <span aria-hidden="true">&rarr;</span></button>
      </form>
      <div class="brand-home-stats" aria-label="Directory summary">
        <div class="brand-home-stat"><strong>${totalTrucks}</strong><span>Listings</span></div>
        <div class="brand-home-stat"><strong>${COUNTIES.length}</strong><span>Counties</span></div>
        <div class="brand-home-stat"><strong>${cuisineCount}</strong><span>Cuisine categories</span></div>
      </div>
    </div>
  </div>
</section>

<section class="brand-home-listings" aria-labelledby="brandHomeListingsTitle">
  <div class="container">
    <div class="brand-home-section-heading">
      <div>
        <span class="brand-home-section-label">Start here</span>
        <h2 id="brandHomeListingsTitle">What are you hungry for?</h2>
      </div>
      <a href="/directory" class="brand-home-view-all">See all ${totalTrucks} trucks <span aria-hidden="true">&rarr;</span></a>
    </div>
    <div class="brand-home-card-grid" id="featured-truck-list">
      ${homeTrucks.map(truckCard).join('\n      ')}
    </div>
    ${grilly ? `<aside class="brand-sponsored-strip" aria-label="Sponsored listing">
      <span class="brand-sponsored-label">Sponsored</span>
      <div class="brand-sponsored-copy">
        <strong>${esc(grilly.name)}</strong>
        <span>${esc(grilly.cuisine || 'Gourmet grilled cheese')} &middot; Philadelphia, PA</span>
      </div>
      <a href="/trucks/${esc(grilly.slug)}" class="brand-sponsored-link">View listing <span aria-hidden="true">&rarr;</span></a>
    </aside>` : ''}
  </div>
</section>

<section class="brand-home-editorial brand-home-blog" aria-labelledby="brandHomeBlogTitle">
  <div class="container">
    <div class="brand-home-section-heading">
      <div>
        <span class="brand-home-section-label">The local guide</span>
        <h2 id="brandHomeBlogTitle">Good food, good stories.</h2>
      </div>
      <a href="/blog" class="brand-home-view-all">All articles <span aria-hidden="true">&rarr;</span></a>
    </div>
    <div class="blog-grid">
      ${recentPosts.map(blogCard).join('\n      ')}
    </div>
  </div>
</section>

<section class="brand-home-about" aria-labelledby="brandHomeAboutTitle">
  <div class="container brand-home-about-inner">
    <div class="brand-home-about-heading">
      <span class="brand-home-section-label">About the scene</span>
      <h2 id="brandHomeAboutTitle">South Jersey&rsquo;s food truck scene.</h2>
    </div>
    <div class="brand-home-about-copy">
      <p><strong>South Jersey Food Truck is a directory of independent food truck operators.</strong> Browse ${totalTrucks} listings, including ${localTrucks} based in the seven-county South Jersey area, plus nearby operators. County pages cover Camden, Burlington, Gloucester, Atlantic, Cape May, Cumberland, and Salem; listing counts vary by county.</p>
      <p>Use the <a href="/directory">food truck directory</a> to compare cuisine categories and locations, then open a profile for the operator&rsquo;s website and available contact details. Directory locations describe home bases or listed service areas, not a live schedule or a guarantee that a truck can travel to your event.</p>
      <p>For weddings, parties, and corporate events, confirm availability, guest capacity, menu, minimum spend, and venue requirements directly with the operator. Read the <a href="/food-truck-event-checklist">event planning checklist</a> before requesting a quote. Event inquiries through this site are presented by Grilly Cheese, as disclosed on the <a href="/contact">inquiry form</a>.</p>
      <p>For current county and cuisine totals, see the <a href="/directory-snapshot">directory snapshot</a>. Learn how listing information is reviewed on our <a href="/about#editorial-policy">editorial policy</a>, and use a profile&rsquo;s correction link to report details that need updating.</p>
      <div class="brand-home-county-links">
        ${COUNTIES.map(c => `<a href="/${c.toLowerCase().replace(/\s+/g, '-')}-food-trucks">${esc(c.replace(' County', ''))}</a>`).join('\n        ')}
        <a class="brand-home-county-all" href="/directory">Browse all trucks <span aria-hidden="true">&rarr;</span></a>
      </div>
    </div>
  </div>
</section>

<section class="brand-home-editorial brand-home-faq-section" aria-labelledby="brandHomeFaqTitle">
  <div class="container brand-home-faq-inner">
    <div class="brand-home-faq-heading">
      <span class="brand-home-section-label">Common questions</span>
      <h2 id="brandHomeFaqTitle">Frequently asked questions.</h2>
      <p>Everything you need to know about booking food trucks in South Jersey.</p>
    </div>
    <div class="faq-list">
      ${faqs.map(f => `<div class="faq-item">
        <button class="faq-question" type="button" aria-expanded="false">
          <span>${esc(f.q)}</span>
          <svg class="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <div class="faq-answer">${esc(f.a)}</div>
      </div>`).join('\n      ')}
    </div>
    <a href="/faq" class="brand-home-faq-link">See all FAQs <span aria-hidden="true">&rarr;</span></a>
  </div>
</section>

<section class="brand-home-cta">
  <div class="container brand-home-cta-inner">
    <div>
      <span class="brand-home-section-label">Plan something good</span>
      <h2>Bring a great truck to your next event.</h2>
      <p>Tell us about your plans and we&rsquo;ll help you find the right fit.</p>
    </div>
    <div class="brand-home-cta-actions">
      <a href="/contact" class="brand-button">Plan an event <span aria-hidden="true">&rarr;</span></a>
      <a href="/directory" class="brand-home-cta-secondary">Browse trucks</a>
    </div>
  </div>
</section>`;

  return layout({
    title: `Food Trucks in South Jersey — ${totalTrucks} Listings & Catering`,
    desc: `Find food trucks in South Jersey and nearby areas. Compare ${totalTrucks} listings by county and cuisine, contact operators, and plan catering for your event.`,
    canonical: '/',
    mainEntity: 'https://southjerseyfoodtruck.com/#featured-trucks',
    websiteSearchAction: true,
    jsonLd,
    bodyClass: 'brand-home',
    content
  });
};
