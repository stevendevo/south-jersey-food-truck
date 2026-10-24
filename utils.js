'use strict';

const optimizedImages = require('./public/optimized/manifest.json');

function imageAsset(source) {
  return optimizedImages[source] || { url: source };
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
}

function formatDateShort(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}

function seoDescription(text, fallback = '') {
  const source = String(text || fallback || '').replace(/\s+/g, ' ').trim();
  if (!source) return '';
  const callToAction = ' Read the full South Jersey food truck guide.';
  const expanded = source.length < 120 && !source.endsWith('.') ? `${source}.${callToAction}` : source;
  if (expanded.length <= 160) return expanded;
  return `${expanded.slice(0, 157).replace(/\s+\S*$/, '')}...`;
}

function renderMarkdown(text) {
  if (!text) return '';
  const paras = text.split(/\n\n+/);
  return paras.map(p => {
    p = p.trim();
    if (!p) return '';
    if (p.startsWith('# ')) return `<h1>${inlineMd(p.slice(2))}</h1>`;
    if (p.startsWith('## ')) return `<h2>${inlineMd(p.slice(3))}</h2>`;
    if (p.startsWith('### ')) return `<h3>${inlineMd(p.slice(4))}</h3>`;
    // A paragraph that is ONLY bold (e.g. **Heading**) becomes an H3
    if (/^\*\*[^*]+\*\*$/.test(p)) return `<h3>${inlineMd(p.slice(2, -2))}</h3>`;
    if (/^[-*] /.test(p)) {
      const items = p.split('\n').filter(Boolean).map(l => `<li>${inlineMd(l.replace(/^[-*] /, ''))}</li>`).join('');
      return `<ul>${items}</ul>`;
    }
    if (/^\d+\. /.test(p)) {
      const items = p.split('\n').filter(Boolean).map(l => `<li>${inlineMd(l.replace(/^\d+\. /, ''))}</li>`).join('');
      return `<ol>${items}</ol>`;
    }
    return `<p>${inlineMd(p.replace(/\n/g, ' '))}</p>`;
  }).join('\n');
}

function inlineMd(text) {
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+?)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" rel="noopener">$1</a>');
}

function hasVerifiedTruckImage(truck) {
  const url = truck?.image_url;
  return typeof url === 'string' && !url.startsWith('/seed/cat_')
    && (/^\/(?!\/)/.test(url) || /^https:\/\//i.test(url));
}

function truckImageAlt(truck, context = '') {
  if (truck.image_alt) return truck.image_alt;
  return `${truck.name} ${context}`.trim();
}

function renderTruckImage(truck, { className = 'truck-card-img', wrapperClass = '', width = 400, height = 175, loading = 'lazy', context = '' } = {}) {
  if (hasVerifiedTruckImage(truck)) {
    const asset = imageAsset(truck.image_url);
    const assetLabel = /logo/i.test(truck.image_asset_type || '') ? 'Official logo'
      : truck.image_verified_at ? 'Reviewed truck photo' : 'Listing image';
    return `<div class="truck-image-frame"><img class="${esc(className)}" src="${esc(asset.url)}" alt="${esc(truckImageAlt(truck, context))}" loading="${esc(loading)}" decoding="async"${loading === 'eager' ? ' fetchpriority="high"' : ''} width="${asset.width || width}" height="${asset.height || height}" /><span class="truck-image-label">${assetLabel}</span></div>`;
  }

  return `<div class="${esc(className)} truck-brand-fallback ${esc(wrapperClass)}" role="img" aria-label="${esc(`${truck.name}: official image pending verification`)}">
    <span class="truck-brand-fallback-eyebrow">Image pending verification</span>
    <strong>${esc(truck.name)}</strong>
    <span>${esc(truck.cuisine || 'Food truck')}</span>
  </div>`;
}

module.exports = { esc, formatDate, formatDateShort, seoDescription, renderMarkdown, hasVerifiedTruckImage, renderTruckImage, truckImageAlt, imageAsset };
