'use strict';
const layout = require('./layout');
const { esc, formatDateShort } = require('../utils');

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

module.exports = function blogPage({ posts }) {
  const sortedPosts = posts.slice().sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': ['Blog', 'CollectionPage'],
    '@id': 'https://southjerseyfoodtruck.com/blog#blog',
    name: 'South Jersey Food Truck Blog',
    url: 'https://southjerseyfoodtruck.com/blog',
    description: 'Guides, truck profiles, event recaps, and tips for food truck fans and event planners in South Jersey.',
    mainEntity: {
      '@type': 'ItemList',
      '@id': 'https://southjerseyfoodtruck.com/blog#article-list',
      numberOfItems: sortedPosts.length,
      itemListElement: sortedPosts.map((p, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `https://southjerseyfoodtruck.com/blog/${p.slug}`,
        name: p.title
      }))
    },
    blogPost: sortedPosts.map(p => ({
      '@type': 'BlogPosting',
      headline: p.title,
      description: p.seo_description || p.excerpt,
      url: `https://southjerseyfoodtruck.com/blog/${p.slug}`,
      image: p.cover_image_url ? `https://southjerseyfoodtruck.com${p.cover_image_url}` : undefined,
      datePublished: new Date(p.published_at).toISOString(),
      dateModified: new Date(p.updated_at || p.published_at).toISOString(),
      author: { '@type': 'Person', name: p.author },
      mainEntityOfPage: { '@type': 'WebPage', '@id': `https://southjerseyfoodtruck.com/blog/${p.slug}` }
    }))
  };

  const content = `
<div class="container" style="padding-top:3rem;padding-bottom:5rem;">
  <nav class="breadcrumb" aria-label="Breadcrumb">
    <a href="/">Home</a><span>/</span><span>Blog</span>
  </nav>
  <div class="section-header" style="max-width:620px;">
    <span class="section-label">Blog &amp; Guides</span>
    <h1>South Jersey Food Truck Blog</h1>
    <p>Guides, truck profiles, event recaps, and tips for food truck fans and event planners across South Jersey. <a href="/food-truck-events" style="color:var(--primary);">Browse event guides by occasion &rarr;</a></p>
  </div>
  <div class="blog-grid">
    ${sortedPosts.map(blogCard).join('\n    ')}
  </div>
</div>`;

  return layout({
    title: 'South Jersey Food Truck Blog — Guides, Profiles & Event Recaps',
    desc: 'Food truck guides, operator profiles, festival recaps, and booking tips for South Jersey. Updated regularly with local content across Camden, Burlington, Cape May, and Atlantic counties.',
    canonical: '/blog',
    mainEntity: 'https://southjerseyfoodtruck.com/blog#blog',
    about: { '@type': 'Thing', name: 'South Jersey food truck guides and articles' },
    breadcrumb: [
      { name: 'Home', url: '/' },
      { name: 'Blog', url: '/blog' }
    ],
    jsonLd,
    content
  });
};
