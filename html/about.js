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
      description: 'A directory for researching food trucks in South Jersey and nearby areas, with county pages covering the seven-county region.',
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
  <p class="about-lead">Research local food trucks, compare cuisines, and plan the questions to ask before booking.</p>
  <p><strong>South Jersey Food Truck is a free directory for finding, comparing, and contacting food trucks in South Jersey and nearby areas. County pages cover Camden, Burlington, Gloucester, Atlantic, Cape May, Cumberland, and Salem counties.</strong> We organize local operators by county and cuisine so guests and event planners can make a faster, better-informed choice.</p>

  <div class="counties-grid" style="margin:1.5rem 0 2.5rem;">
    <div class="county-card"><strong>${totalTrucks}</strong><span>listed food trucks</span></div>
    <div class="county-card"><strong>7</strong><span>South Jersey counties</span></div>
    <div class="county-card"><strong>${verifiedTrucks}</strong><span>records marked checked</span></div>
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
  <p>The directory groups operators by cuisine, city, and recorded county. It is a research tool rather than a census of every truck in the region, a real-time location service, or a guarantee of event availability.</p>

  <h2>How the Directory Works</h2>
  <p>Profiles include the details held in the directory record. Where a website, social profile, telephone number, or email address is recorded, the profile links to it. Some records do not have direct contact information; the event-inquiry form is a separate way to ask for planning help.</p>
  <p>If you own a food truck and want to be listed, it's free. Use the <a href="/submit-truck" style="color:var(--primary);">Submit Your Truck</a> page to send us your details. Submissions are reviewed before publication.</p>

  <section id="editorial-policy" aria-labelledby="editorial-policy-heading">
    <h2 id="editorial-policy-heading">Listing sources and editorial policy</h2>
    <p>Directory records and planning guides are starting points for research. A recorded active check is a field in the directory data, not independent confirmation of a business license, inspection, current operation, or availability. Check dates are shown on profiles when present; an older check does not establish that details are current.</p>
    <p>Articles display the byline and publication or update dates stored with the guide. An Editorial Team byline identifies site editorial content. Named bylines identify the author recorded for an article; they do not imply an independently verified credential or professional qualification. Official-guidance links appear in guides where sources are recorded, and local authorities remain responsible for current permit and health requirements.</p>
    <p>Grilly Cheese is identified on the site as the presenting sponsor. Featured placement is a directory designation, not a scored review or a promise that a truck is the best option. The event-inquiry form is presented by Grilly Cheese; submitting it does not contact every listed operator or confirm a booking.</p>
    <p>For a correction, open the relevant truck profile and choose “Report outdated information.” Operators can use “Verify this listing” to submit details for review. Confirm menus, prices, dietary accommodations, service radius, insurance, permits, and event availability with the operator before making a booking.</p>
  </section>

  <div class="about-org" style="margin-top:2.5rem;">
    <h3 style="margin-bottom:0.75rem;">Get in Touch</h3>
    <p style="margin-bottom:1.25rem;color:var(--muted);">Questions, corrections, or just want to say hello? We'd love to hear from you.</p>
    <a href="/contact" class="btn btn-primary">Contact Us</a>
  </div>
</div>`;

  return layout({
    title: 'About — South Jersey Food Truck Directory',
    desc: 'Learn how South Jersey Food Truck organizes local listings, records checks, identifies sponsored placement, and handles editorial content and corrections.',
    canonical: '/about',
    mainEntity: 'https://southjerseyfoodtruck.com/#organization',
    jsonLd,
    content
  });
};
