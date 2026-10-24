'use strict';
const layout = require('./layout');
const { esc } = require('../utils');
const { captchaMarkup } = require('./captcha');

module.exports = function reportUpdatePage({ truck, success = false, emailSent = false, emailError = '', formError = '' }) {
  const content = `
<div class="contact-page">
  <span class="section-label">Directory Correction</span>
  <h1>Report an Update for ${esc(truck.name)}</h1>
  <p style="color:var(--muted);">Help us keep this listing accurate. Tell us what changed about the menu, service area, schedule, contact details, or availability.</p>

  ${success ? `<div class="success-box">&#10003; Thanks! We received your correction request and will review the listing.${emailSent ? '<p style="margin-top:0.5rem;font-size:0.85rem;color:#2d7a3e;">Email notification sent successfully.</p>' : ''}${emailError ? `<p style="margin-top:0.5rem;font-size:0.85rem;color:#b85900;">Note: Email delivery issue — ${esc(emailError)}</p>` : ''}</div>` : `
  ${formError ? `<div class="error-box" role="alert">${esc(formError)}</div>` : ''}
  <form method="POST" action="/report-update/${esc(truck.slug)}">
    <input type="hidden" name="truckName" value="${esc(truck.name)}" />
    <div class="form-group">
      <label class="form-label" for="name">Your Name</label>
      <input class="form-input" type="text" id="name" name="name" required minlength="2" maxlength="100" autocomplete="name" />
    </div>
    <div class="form-group">
      <label class="form-label" for="email">Email Address</label>
      <input class="form-input" type="email" id="email" name="email" required maxlength="254" autocomplete="email" />
    </div>
    <div class="form-group">
      <label class="form-label" for="message">What should we update?</label>
      <textarea class="form-textarea" id="message" name="message" required minlength="10" maxlength="2500" style="height:140px;" placeholder="Example: The truck no longer serves this county, or the Instagram link has changed."></textarea>
    </div>
    ${captchaMarkup('report_update')}
    <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center;">Send Listing Update</button>
  </form>
  `}

  <div style="margin-top:2rem;padding-top:1.5rem;border-top:1px solid var(--border);">
    <p style="color:var(--muted);font-size:0.85rem;"><a href="/trucks/${esc(truck.slug)}" style="color:var(--primary);">&larr; Back to ${esc(truck.name)}</a></p>
  </div>
</div>`;

  return layout({
    title: `Report an Update — ${truck.name}`,
    desc: `Report an outdated detail on the ${truck.name} food truck listing.`,
    canonical: `/report-update/${truck.slug}`,
    robots: 'noindex, follow',
    content
  });
};
