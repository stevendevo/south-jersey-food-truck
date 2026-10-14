'use strict';
const layout = require('./layout');
const { esc } = require('../utils');
const { captchaMarkup } = require('./captcha');

module.exports = function contactPage({ success = false, values = {}, formError = '' }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'Contact South Jersey Food Truck',
    url: 'https://southjerseyfoodtruck.com/contact'
  };

  const heading = 'Rent a Food Truck';
  const sub = 'Fill out the details below and we&rsquo;ll help match you with the right food truck for your event.';

  const content = `
<div class="contact-page">
  <span class="section-label">Event Inquiry</span>
  <h1>${heading}</h1>
  <p>${sub}</p>

  ${success ? '<div class="success-box" role="status">&#10003; Thanks! We received your event inquiry and will get back to you within 1–2 business days.</div>' : ''}
  ${formError ? `<div class="error-box" role="alert">${esc(formError)}</div>` : ''}

  <form method="POST" action="/contact">

    <div class="form-row">
      <div class="form-group">
        <label class="form-label" for="eventDate">Event Date <span style="color:var(--primary)">*</span></label>
        <input class="form-input" type="date" id="eventDate" name="eventDate" required value="${esc(values.eventDate || '')}" />
      </div>
      <div class="form-group">
        <label class="form-label" for="eventTime">Time <span style="color:var(--primary)">*</span></label>
        <input class="form-input" type="time" id="eventTime" name="eventTime" required value="${esc(values.eventTime || '')}" />
      </div>
    </div>

    <div class="form-group">
      <label class="form-label" for="zipCode">Zip Code <span style="color:var(--primary)">*</span></label>
      <input class="form-input" type="text" id="zipCode" name="zipCode" required pattern="[0-9]{5}" maxlength="5" placeholder="08033" value="${esc(values.zipCode || '')}" />
    </div>

    <div class="form-group">
      <label class="form-label">Who is paying for the food? <span style="color:var(--primary)">*</span></label>
      <div class="radio-group">
        <label class="radio-label">
          <input type="radio" name="payer" value="Attendees" required ${values.payer === 'Attendees' ? 'checked' : ''} />
          <span>Attendees</span>
        </label>
        <label class="radio-label">
          <input type="radio" name="payer" value="Event Host" required ${values.payer === 'Event Host' ? 'checked' : ''} />
          <span>Event Host</span>
        </label>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label" for="budget">Budget (optional)</label>
      <input class="form-input" type="text" id="budget" name="budget" placeholder="e.g. $500 – $2,000" value="${esc(values.budget || '')}" />
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label" for="name">Your Name <span style="color:var(--primary)">*</span></label>
        <input class="form-input" type="text" id="name" name="name" required minlength="2" maxlength="100" autocomplete="name" placeholder="Jane Smith" value="${esc(values.name || '')}" />
      </div>
      <div class="form-group">
        <label class="form-label" for="phone">Phone <span style="color:var(--primary)">*</span></label>
        <input class="form-input" type="tel" id="phone" name="phone" required minlength="7" maxlength="30" autocomplete="tel" placeholder="(856) 555-0100" value="${esc(values.phone || '')}" />
      </div>
    </div>

    <div class="form-group">
      <label class="form-label" for="email">Email Address <span style="color:var(--primary)">*</span></label>
      <input class="form-input" type="email" id="email" name="email" required maxlength="254" autocomplete="email" placeholder="jane@example.com" value="${esc(values.email || '')}" />
    </div>

    <div class="form-group">
      <label class="form-label" for="message">Additional Details (optional)</label>
      <textarea class="form-textarea" id="message" name="message" maxlength="2000" style="height:100px;" placeholder="Number of guests, event type, dietary restrictions, etc.">${esc(values.message || '')}</textarea>
    </div>

    ${captchaMarkup('contact')}
    <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center;">Send Event Inquiry</button>
  </form>

  <div style="margin-top:2.5rem;padding-top:2rem;border-top:1px solid var(--border);">
    <h3 style="margin-bottom:0.75rem;">Other ways to reach us</h3>
    <p style="color:var(--muted);font-size:0.9rem;">For truck owners looking to add or update a listing, visit our <a href="/submit-truck" style="color:var(--primary);">Submit Your Truck</a> page.</p>
  </div>
</div>`;

  return layout({
    title: 'Rent a Food Truck — South Jersey Food Truck',
    desc: 'Rent a food truck for your wedding, corporate event, or private party across South Jersey.',
    canonical: '/contact',
    jsonLd,
    content
  });
};
