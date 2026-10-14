'use strict';
const layout = require('./layout');
const { esc, formatDate, renderMarkdown, seoDescription } = require('../utils');

function authorSchema(author) {
  if (author === 'Editorial Team') {
    return { '@id': 'https://southjerseyfoodtruck.com/#organization' };
  }
  const slug = String(author || 'editorial-team').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return {
    '@type': 'Person',
    '@id': `https://southjerseyfoodtruck.com/about#author-${slug}`,
    name: author,
    worksFor: { '@id': 'https://southjerseyfoodtruck.com/#organization' }
  };
}

module.exports = function postPage({ post: p, posts = [] }) {
  const tags = Array.isArray(p.tags) ? p.tags : (p.tags ? JSON.parse(p.tags) : []);
  const faqs = Array.isArray(p.faqs) ? p.faqs : [];
  const relatedCandidates = posts
    .filter(post => post.slug && post.slug !== p.slug)
    .map(post => {
      const postTags = Array.isArray(post.tags) ? post.tags : (post.tags ? JSON.parse(post.tags) : []);
      const sharedTags = tags.filter(tag => postTags.includes(tag)).length;
      return { post, sharedTags };
    });
  const related = (relatedCandidates.some(item => item.sharedTags > 0)
    ? relatedCandidates.filter(item => item.sharedTags > 0)
    : relatedCandidates)
    .sort((a, b) => b.sharedTags - a.sharedTags || new Date(b.post.published_at) - new Date(a.post.published_at))
    .slice(0, 3)
    .map(item => item.post);
  const pubDate = p.published_at ? new Date(p.published_at).toISOString() : undefined;
  const modDate = [p.updated_at, p.guidance_reviewed_at]
    .filter(Boolean)
    .map(value => new Date(value))
    .filter(date => !Number.isNaN(date.getTime()))
    .sort((a, b) => b - a)
    .map(date => date.toISOString())[0] || pubDate;
  const canonicalUrl = `https://southjerseyfoodtruck.com/blog/${p.slug}`;
  const metaDescription = seoDescription(p.seo_description, p.excerpt);
  const articleId = `${canonicalUrl}#article`;
  const imageUrl = p.cover_image_url ? `https://southjerseyfoodtruck.com${p.cover_image_url}` : null;
  const wordCount = String(p.content || '').trim().split(/\s+/).filter(Boolean).length;
  const readingMinutes = Math.max(1, Math.ceil(wordCount / 220));

  const blogPosting = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': articleId,
    headline: p.title,
    description: metaDescription,
    url: canonicalUrl,
    image: imageUrl || undefined,
    datePublished: pubDate,
    dateModified: modDate,
    author: authorSchema(p.author),
    articleSection: tags[0] || 'Food Truck Guides',
    keywords: tags,
    inLanguage: 'en-US',
    isAccessibleForFree: true,
    wordCount,
    timeRequired: `PT${readingMinutes}M`,
    publisher: {
      '@type': 'Organization',
      '@id': 'https://southjerseyfoodtruck.com/#organization',
      name: 'South Jersey Food Truck',
      url: 'https://southjerseyfoodtruck.com'
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${canonicalUrl}#webpage` }
  };
  const jsonLd = faqs.length > 0
    ? [blogPosting, {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map(faq => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: { '@type': 'Answer', text: faq.answer }
        }))
      }]
    : blogPosting;
  const faqContent = faqs.length > 0 ? `
    <section class="post-faq" aria-labelledby="article-faq-heading">
      <h2 id="article-faq-heading">Frequently asked questions</h2>
      ${faqs.map(faq => `<div style="margin:1.25rem 0;">
        <h3 style="margin-bottom:0.4rem;">${esc(faq.question)}</h3>
        <p>${esc(faq.answer)}</p>
      </div>`).join('')}
    </section>` : '';
  const relatedContent = related.length > 0 ? `
    <section class="post-related" aria-labelledby="related-articles-heading">
      <h2 id="related-articles-heading">More South Jersey planning guides</h2>
      <div style="display:grid;gap:1rem;">
        ${related.map(post => `<a href="/blog/${esc(post.slug)}" style="display:block;padding:1rem;border:1px solid var(--border);border-radius:0.5rem;text-decoration:none;">
          <strong style="color:var(--text);">${esc(post.title)}</strong>
          <span style="display:block;margin-top:0.35rem;color:var(--muted);">${esc(post.excerpt || '')}</span>
        </a>`).join('')}
      </div>
    </section>` : '';
  const guidanceReviewContent = p.guidance_reviewed_at ? `
    <aside class="guidance-review-note" aria-label="Official guidance review">
      <strong>Official guidance last reviewed ${esc(formatDate(`${p.guidance_reviewed_at}T12:00:00`))}</strong>
      <span>Sources were checked for this guide, but municipal and local-health requirements take precedence over general information here. Confirm current rules with the authority responsible for your event location.</span>
    </aside>` : '';
  const renderedPostContent = renderMarkdown(p.content);
  const postContentWithReview = guidanceReviewContent && /<h3>Sources<\/h3>/i.test(renderedPostContent)
    ? renderedPostContent.replace(/<h3>Sources<\/h3>/i, `${guidanceReviewContent}<h3>Sources</h3>`)
    : `${renderedPostContent}${guidanceReviewContent}`;

  const content = `
<img class="post-hero-img" src="${esc(p.cover_image_url || '/seed/blog_summer_guide.png')}" alt="${esc(p.cover_image_alt || p.title)}" width="1200" height="480" fetchpriority="high" decoding="async" />

<div class="post-header">
  <nav class="breadcrumb" aria-label="Breadcrumb">
    <a href="/">Home</a><span>/</span>
    <a href="/blog">Blog</a><span>/</span>
    <span>${esc(p.title)}</span>
  </nav>

  <div class="post-tags">
    ${tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}
  </div>

  <h1 class="post-title">${esc(p.title)}</h1>

  <div class="post-meta">
    <span>By ${esc(p.author)}</span>
    <span>&middot;</span>
    <time datetime="${esc(pubDate || '')}">${formatDate(p.published_at)}</time>
    <span>&middot;</span>
    <span>${readingMinutes} min read</span>
    ${modDate && modDate !== pubDate ? `<span>&middot; Updated ${formatDate(p.updated_at)}</span>` : ''}
  </div>
</div>

<article class="post-body">
  ${postContentWithReview}
  ${faqContent}
  ${relatedContent}
</article>

<div class="container" style="max-width:720px;padding-bottom:3rem;">
  <hr class="divider" style="margin-bottom:2rem;" />
  <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;">
    <a href="/blog" class="post-back">&larr; Back to Blog</a>
    <a href="/directory" class="btn btn-primary btn-sm">Browse Food Trucks &rarr;</a>
  </div>
</div>`;

  return layout({
    title: p.seo_title || `${p.title} — South Jersey Food Truck`,
    desc: metaDescription,
    canonical: `/blog/${p.slug}`,
    og: {
      image: p.cover_image_url ? `https://southjerseyfoodtruck.com${p.cover_image_url}` : undefined,
      imageAlt: p.cover_image_alt || p.title,
      type: 'article'
    },
    articleMeta: {
      publishedTime: pubDate,
      modifiedTime: modDate,
      section: tags[0] || 'Food Truck Guides',
      tags,
      author: p.author
    },
    mainEntity: articleId,
    ...(imageUrl ? {
      imageObject: {
        id: `${canonicalUrl}#primary-image`,
        url: imageUrl,
        caption: p.cover_image_alt || p.title
      }
    } : {}),
    breadcrumb: [
      { name: 'Home', url: '/' },
      { name: 'Blog', url: '/blog' },
      { name: p.title, url: `/blog/${p.slug}` }
    ],
    extraHead: imageUrl ? `<link rel="preload" as="image" href="${imageUrl}" fetchpriority="high" />` : '',
    jsonLd,
    content
  });
};
