'use strict';
const layout = require('./layout');
const { esc, formatDateShort, hasVerifiedTruckImage, renderTruckImage } = require('../utils');

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
  const tags = Array.isArray(p.tags) ? p.tags : (p.tags ? JSON.parse(p.tags) : []);
  return `<a href="/blog/${esc(p.slug)}" class="blog-card">
    <img class="blog-card-img" src="${esc(p.cover_image_url || '/seed/blog_summer_guide.png')}" alt="${esc(p.cover_image_alt || p.title)}" loading="lazy" width="400" height="195" />
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
  const featuredTruckList = {
    '@type': 'ItemList',
    '@id': 'https://southjerseyfoodtruck.com/#featured-trucks',
    name: 'Food Trucks to Explore in South Jersey',
    description: 'A selection of food trucks to explore in South Jersey.',
    numberOfItems: homeTrucks.length,
    itemListElement: homeTrucks.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'FoodEstablishment',
        name: t.name,
        url: `https://southjerseyfoodtruck.com/trucks/${t.slug}`,
        servesCuisine: t.cuisine,
        address: {
          '@type': 'PostalAddress',
          addressLocality: t.city,
          addressRegion: t.area?.includes('County') ? 'NJ' : (t.area?.split(', ')[1] || 'NJ'),
          addressCountry: 'US'
        }
      }
    }))
  };

  const faqs = [
    { q: 'How do I rent a food truck in South Jersey?', a: 'Browse our directory to find trucks that match your cuisine and location. Click any truck to see their contact details, then reach out directly by phone, email, or their website. For larger events, use our contact form and we\'ll connect you with available trucks.' },
    { q: 'How far in advance should I rent a food truck?', a: 'For weekends and summer events, aim to rent 8–12 weeks in advance. Popular trucks fill their calendars quickly between May and September. For weekday corporate lunches or smaller gatherings, 3–4 weeks is usually enough.' },
    { q: 'How much does it cost to hire a food truck in South Jersey?', a: 'Most trucks charge a minimum (typically $500–$1,500) and then bill per guest or per hour beyond that. High-end catering trucks or specialty options like lobster may run higher. Street-style trucks at festivals often have no hire fee.' },
    { q: 'What areas of South Jersey do food trucks serve?', a: 'Our directory covers all seven South Jersey counties: Camden, Burlington, Gloucester, Atlantic, Cape May, Cumberland, and Salem. Most trucks will travel within a 30–60 mile radius of their home base.' },
    { q: 'Do food trucks cater private events like weddings and parties?', a: 'Yes — private event catering is one of the fastest-growing parts of the South Jersey truck scene. Trucks regularly cater weddings, graduation parties, birthday celebrations, baby showers, and block parties. Many offer customized menus, tasting options, and staffed service.' },
    { q: 'Can I hire a food truck for a corporate event?', a: 'Absolutely. Food trucks are popular for employee appreciation days, product launches, office lunches, and trade shows. They\'re self-contained — no rental kitchen needed — and they create a memorable experience that a traditional caterer can\'t match. Ask trucks about corporate packages and invoicing procedures.' },
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        ...layout.organizationSchema('LocalBusiness'),
        description: 'The complete directory for finding, booking, and hiring food trucks across all seven South Jersey counties.',
        areaServed: COUNTIES.map(c => ({ '@type': 'AdministrativeArea', name: `${c}, New Jersey` })),
        address: { '@type': 'PostalAddress', addressRegion: 'NJ', addressCountry: 'US' }
      },
      featuredTruckList,
      {
        '@type': 'FAQPage',
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
      <h1>Find your next<br /><span>favorite</span> truck.</h1>
      <p class="brand-home-lead">South Jersey&rsquo;s rolling kitchens, in one sharp little directory.</p>
      <form class="hero-search" id="heroSearchForm" action="/directory" method="get">
        <label class="sr-only" for="heroSearchInput">Search trucks, cuisines, or counties</label>
        <input type="search" id="heroSearchInput" name="q" placeholder="Search trucks, cuisines, or counties" autocomplete="off" />
        <button type="submit">Start exploring <span aria-hidden="true">&rarr;</span></button>
      </form>
      <div class="brand-home-stats" aria-label="Directory summary">
        <div class="brand-home-stat"><strong>${totalTrucks}+</strong><span>Trucks</span></div>
        <div class="brand-home-stat"><strong>${COUNTIES.length}</strong><span>Counties</span></div>
        <div class="brand-home-stat"><strong>20+</strong><span>Cuisines</span></div>
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
      <p>Food trucks in South Jersey have grown from a handful of cheesesteak carts into one of the most dynamic mobile dining scenes on the East Coast. Across seven counties &mdash; Camden, Burlington, Gloucester, Atlantic, Cape May, Cumberland, and Salem &mdash; more than ${totalTrucks} operators now serve everything from hand-pressed corn tortillas to certified Neapolitan pizza to Maine lobster rolls, all from purpose-built kitchens on wheels.</p>
      <p>What makes South Jersey&rsquo;s food truck culture distinctive is how deeply it has woven itself into the region&rsquo;s community life. The Collingswood Saturday farmers market runs six to eight trucks every week year-round. Wildwood&rsquo;s boardwalk hosts trucks nightly from June through September. Cherry Hill&rsquo;s corporate parks see rotating lunch circuits five days a week. From Cape May City in the south to Mount Holly and Moorestown in the north, food trucks in South Jersey show up wherever people gather &mdash; and they keep coming back because the quality has risen dramatically.</p>
      <p>The use cases have expanded just as fast. Hiring a food truck for a wedding is now commonplace across Camden and Burlington counties, where couples choose wood-fired pizza, gourmet grilled cheese, or smash burgers as their catering anchor instead of a conventional caterer. Corporate events throughout South Jersey &mdash; employee appreciation days, product launches, office lunches &mdash; book trucks months in advance because the guest experience simply can&rsquo;t be matched at the same price point. Festivals and farmers markets from Atlantic City to Vineland fill their lineups with local operators who bring serious culinary craft to every service window.</p>
      <p>Want to rent a food truck in South Jersey for your next event? Browse the directory by cuisine or county, check individual listings for contact details, and reach out directly. For larger events or help matching the right truck to your guest count and budget, use the contact form and we&rsquo;ll point you in the right direction.</p>
      <p>The cuisine range across South Jersey&rsquo;s food truck scene covers virtually every category: authentic Mexican street food, Texas-style BBQ, Korean-Jersey fusion, gourmet grilled cheese, fresh seafood, Neapolitan pizza, Indian curries, artisan desserts, and specialty coffee. Whatever your event needs, there are food trucks in South Jersey ready to serve it.</p>
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
        <button class="faq-question" aria-expanded="false">
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
    title: `Food Trucks in South Jersey — Directory of ${totalTrucks}+ Local Trucks`,
    desc: `Find, book, rent, or hire food trucks in South Jersey for weddings, parties, and events. Browse ${totalTrucks}+ local NJ food trucks across Camden, Burlington, Gloucester, Atlantic, Cape May, Cumberland & Salem counties.`,
    canonical: '/',
    mainEntity: 'https://southjerseyfoodtruck.com/#organization',
    websiteSearchAction: true,
    jsonLd,
    bodyClass: 'brand-home',
    content
  });
};
