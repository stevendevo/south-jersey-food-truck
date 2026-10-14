'use strict';
const layout = require('./layout');

const COUNTY_NAMES = ['Camden County', 'Burlington County', 'Gloucester County', 'Atlantic County', 'Cape May County', 'Cumberland County', 'Salem County'];

module.exports = function aboutPage({ trucks = [] } = {}) {
  const totalTrucks = trucks.length;
  const verifiedTrucks = trucks.filter(t => t.verified).length;
  const counties = COUNTY_NAMES.map(name => ({
    name,
    count: trucks.filter(t => t.area === name).length
  }));
  const jsonLd = {
    '@context': 'https://schema.org',
    ...layout.organizationSchema('Organization', {
      description: 'The complete directory for finding and booking food trucks across all seven South Jersey counties.',
      areaServed: counties.map(c => ({ '@type': 'AdministrativeArea', name: `${c.name}, New Jersey` }))
    })
  };

  const content = `
<div class="about-page">
  <div class="about-banner-wrap">
    <img src="/brand/wordmark-on-light.svg" alt="South Jersey Food Truck" width="470" height="92" class="about-banner-img" />
  </div>
  <span class="section-label">About Us</span>
  <h1>About South Jersey Food Truck</h1>
  <p class="about-lead">We built the directory we always wanted — comprehensive, honest, and focused exclusively on South Jersey's rolling kitchen scene.</p>
  <p><strong>South Jersey Food Truck is a free directory for finding, comparing, and contacting food trucks across all seven South Jersey counties.</strong> We organize local operators by county and cuisine so guests and event planners can make a faster, better-informed choice.</p>

  <div class="counties-grid" style="margin:1.5rem 0 2.5rem;">
    <div class="county-card"><strong>${totalTrucks}</strong><span>listed food trucks</span></div>
    <div class="county-card"><strong>7</strong><span>South Jersey counties</span></div>
    <div class="county-card"><strong>${verifiedTrucks}</strong><span>verified active listings</span></div>
    <div class="county-card"><strong>Free</strong><span>for guests and operators</span></div>
  </div>
  <p><a href="/directory-snapshot" style="color:var(--primary);">View the current directory snapshot with county and cuisine counts &rarr;</a></p>

  <h2>Our Mission</h2>
  <p>South Jersey Food Truck is the region's dedicated food truck directory, connecting hungry guests with the trucks they'll love and helping event planners find the right fit for every occasion. We cover every corner of the seven-county South Jersey region, from the farmers markets of Collingswood to the boardwalks of Wildwood.</p>
  <p>We don't charge food trucks to be listed, and we don't take commissions on bookings. Our goal is simple: make it easier to find great food on wheels in South Jersey.</p>

  <h2>The Seven Counties We Cover</h2>
  <p>We cover every county in South Jersey — each with its own character, its own event calendar, and its own community of operators.</p>

  <div class="counties-grid">
    ${counties.map(c => `<div class="county-card">
      <strong>${c.name}</strong>
      <span>${c.count} truck${c.count === 1 ? '' : 's'} listed</span>
    </div>`).join('\n    ')}
  </div>

  <h2>Why Food Trucks for Your Event?</h2>
  <p>Food trucks bring something traditional catering can't: energy. A well-chosen truck becomes a focal point for your event, sparks conversation, and delivers food that guests actually remember. Whether you're planning a wedding reception, a corporate picnic, a birthday party, or a block party, there's a South Jersey food truck that's the right fit.</p>
  <p>The truck scene here has grown dramatically over the past five years. What was once a handful of roving cheesesteak operations has become a full ecosystem of specialty operators — wood-fired pizza, lobster rolls, Korean-fusion tacos, artisan donuts, French pastries, craft ice cream, and much more. Our directory captures all of it.</p>

  <h2>How the Directory Works</h2>
  <p>Every listing in our directory includes the truck's cuisine, service area, typical schedule, contact information, and a full description of what makes them worth hiring. We use operator-submitted details and directory reviews to keep listings useful, and the verified badge marks listings with a recorded active check. Always confirm menus, schedules, pricing, and availability directly with the truck.</p>
  <p>If you own a food truck and want to be listed, it's free. Use the <a href="/submit-truck" style="color:var(--primary);">Submit Your Truck</a> page to send us your details. We'll review and publish your listing within a few business days.</p>

  <div class="about-org" style="margin-top:2.5rem;">
    <h3 style="margin-bottom:0.75rem;">Get in Touch</h3>
    <p style="margin-bottom:1.25rem;color:var(--muted);">Questions, corrections, or just want to say hello? We'd love to hear from you.</p>
    <a href="/contact" class="btn btn-primary">Contact Us</a>
  </div>
</div>`;

  return layout({
    title: 'About — South Jersey Food Truck Directory',
    desc: 'Learn about South Jersey Food Truck — the dedicated directory connecting food truck fans and event planners with the best rolling kitchens across all seven South Jersey counties.',
    canonical: '/about',
    jsonLd,
    content
  });
};
