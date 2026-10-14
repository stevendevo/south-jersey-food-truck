'use strict';
const layout = require('./layout');
const { esc, formatDateShort } = require('../utils');

const SECTIONS = [
  {
    title: 'School, family, and milestone events',
    intro: 'Planning a graduation, school fundraiser, PTA event, or family celebration? Start with these practical guides.',
    slugs: [
      'food-trucks-graduation-parties-south-jersey',
      'food-trucks-school-pta-events-south-jersey'
    ]
  },
  {
    title: 'Weddings and corporate gatherings',
    intro: 'Use these guides to compare service styles, plan guest flow, and start the booking conversation.',
    slugs: [
      'how-to-book-a-food-truck-for-your-south-jersey-wedding',
      'corporate-event-catering-food-trucks-south-jersey',
      'how-many-food-trucks-for-an-event-south-jersey',
      'food-truck-catering-vs-traditional-catering'
    ]
  },
  {
    title: 'Markets, festivals, and shore-season events',
    intro: 'Find seasonal ideas for market organizers, festival planners, and guests heading to the South Jersey shore.',
    slugs: [
      'south-jersey-farmers-market-food-trucks',
      'fall-food-truck-events-south-jersey',
      'south-jersey-summer-truck-guide-2026',
      'food-trucks-cape-may-county-shore-guide'
    ]
  }
];

function articleCard(post) {
  return `<a href="/blog/${esc(post.slug)}" class="blog-card">
    <img class="blog-card-img" src="${esc(post.cover_image_url || '/seed/blog_summer_guide.png')}" alt="${esc(post.cover_image_alt || post.title)}" loading="lazy" width="400" height="195" />
    <div class="blog-card-body">
      <div class="blog-card-meta">${formatDateShort(post.published_at)} &middot; ${esc(post.author)}</div>
      <div class="blog-card-title">${esc(post.title)}</div>
      <p class="blog-card-excerpt">${esc(post.excerpt)}</p>
    </div>
  </a>`;
}

module.exports = function eventsPage({ posts = [], trucks = [] } = {}) {
  const postBySlug = new Map(posts.map(post => [post.slug, post]));
  const sections = SECTIONS.map(section => ({
    ...section,
    posts: section.slugs.map(slug => postBySlug.get(slug)).filter(Boolean)
  }));
  const linkedPosts = sections.flatMap(section => section.posts);
  const entityId = 'https://southjerseyfoodtruck.com/food-truck-events#event-guides';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': entityId,
    name: 'South Jersey Food Truck Event Guides',
    description: 'Seasonal and event-planning guides for weddings, corporate events, school functions, markets, festivals, and shore gatherings in South Jersey.',
    url: 'https://southjerseyfoodtruck.com/food-truck-events',
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: linkedPosts.length,
      itemListElement: linkedPosts.map((post, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `https://southjerseyfoodtruck.com/blog/${post.slug}`,
        name: post.title
      }))
    }
  };

  const content = `
<div class="container" style="padding-top:3rem;padding-bottom:5rem;">
  <span class="section-label">Plan by Occasion</span>
  <h1>South Jersey Food Truck Event Guides</h1>
  <p style="max-width:760px;line-height:1.8;"><strong>South Jersey food truck event planning starts with the occasion, guest flow, and season.</strong> Use these local guides to plan weddings, corporate gatherings, school events, graduations, farmers markets, festivals, and shore-season celebrations. The directory currently includes ${trucks.length} listed trucks across seven counties.</p>
  <p style="color:var(--muted);max-width:760px;">These guides are planning resources, not endorsements or availability guarantees. Confirm menus, pricing, travel radius, permits, and dates directly with each operator.</p>

  ${sections.map(section => `
  <section style="margin-top:3rem;">
    <h2>${esc(section.title)}</h2>
    <p style="max-width:720px;color:var(--muted);">${esc(section.intro)}</p>
    <div class="blog-grid">
      ${section.posts.map(articleCard).join('\n      ')}
    </div>
  </section>`).join('\n')}

  <p style="margin-top:3rem;"><a href="/directory" class="btn btn-primary">Browse food trucks</a> <a href="/food-truck-map" class="btn btn-outline">Explore by county</a> <a href="/food-truck-comparisons" class="btn btn-outline">Compare planning options</a></p>
</div>`;

  return layout({
    title: 'South Jersey Food Truck Event Guides by Season and Occasion',
    desc: 'Local planning guides for South Jersey food trucks at weddings, corporate events, graduations, school functions, farmers markets, festivals, and shore gatherings.',
    canonical: '/food-truck-events',
    mainEntity: entityId,
    about: { '@type': 'Thing', name: 'South Jersey food truck event planning' },
    jsonLd,
    content
  });
};