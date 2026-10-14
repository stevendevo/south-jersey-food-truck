'use strict';
const layout = require('./layout');

module.exports = function notFoundPage() {
  const content = `
<div class="not-found">
  <h1>404</h1>
  <h2>Page Not Found</h2>
  <p>We couldn't find that page. Try browsing the directory or head back home.</p>
  <div style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;">
    <a href="/" class="btn btn-primary">Go Home</a>
    <a href="/directory" class="btn btn-outline">Browse Trucks</a>
  </div>
</div>`;

  return layout({
    title: 'Page Not Found — South Jersey Food Truck',
    desc: 'Page not found.',
    canonical: '/',
    robots: 'noindex, follow',
    content
  });
};
