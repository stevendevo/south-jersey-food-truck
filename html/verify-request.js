'use strict';
const layout = require('./layout');
const { esc } = require('../utils');
const { captchaMarkup } = require('./captcha');

module.exports = function verifyRequestPage({ truck, success = false, emailSent = false, emailError = '', formError = '' }) {
  const heading = `Verify Listing: ${esc(truck.name)}`;
  const content = `
<div class="contact-page">
  <span class="section-label">Owner Verification</span>
  <h1>${heading}</h1>
  <p style="color:var(--muted);">Are you the owner or operator of <strong>${esc(truck.name)}</strong>? Confirm your listing is still active and we&rsquo;ll update the verification badge on your page.</p>

  ${success ? `<div class="success-box">&#10003; Verification request submitted. Our team will review and update your listing within 1&ndash;2 business days.${emailSent ? '<p style="margin-top:0.5rem;font-size:0.85rem;color:#2d7a3e;">Email notification sent successfully.</p>' : ''}${emailError ? `<p style="margin-top:0.5rem;font-size:0.85rem;color:#b85900;">Note: Email delivery issue &mdash; ${esc(emailError)}</p>` : ''}</div>` : ''}
  ${formError ? `<div class="error-box" role="alert">${esc(formError)}</div>` : ''}

  ${success ? '' : `
  <form method="POST" action="/verify/${esc(truck.slug)}">
    <input type="hidden" name="truckName" value="${esc(truck.name)}" />
    <input type="hidden" name="truckSlug" value="${esc(truck.slug)}" />

    <div class="form-group">
      <label class="form-label" for="ownerName">Your Name <span style="color:var(--primary)">*</span></label>
      <input class="form-input" type="text" id="ownerName" name="ownerName" required minlength="2" maxlength="100" autocomplete="name" placeholder="Jane Smith" />
    </div>

    <div class="form-group">
      <label class="form-label" for="email">Email Address <span style="color:var(--primary)">*</span></label>
      <input class="form-input" type="email" id="email" name="email" required maxlength="254" autocomplete="email" placeholder="jane@example.com" />
    </div>

    <div class="form-group">
      <label class="form-label" for="phone">Phone Number <span style="color:var(--primary)">*</span></label>
      <input class="form-input" type="tel" id="phone" name="phone" required minlength="7" maxlength="30" autocomplete="tel" placeholder="(856) 555-0100" />
    </div>

    <div class="form-group">
      <label class="form-label" for="message">Anything we should know? (optional)</label>
      <textarea class="form-textarea" id="message" name="message" maxlength="2000" style="height:80px;" placeholder="Schedule changes, new menu items, updated contact info, etc."></textarea>
    </div>

    <div class="form-group">
      <label class="form-label" for="operatorQuote">Optional operator quote</label>
      <textarea class="form-textarea" id="operatorQuote" name="operatorQuote" maxlength="1200" style="height:100px;" placeholder="Tell event planners what makes your truck a good fit. Quotes are reviewed before publication."></textarea>
      <p style="margin-top:0.4rem;color:var(--muted);font-size:0.82rem;">By submitting a quote, you give South Jersey Food Truck permission to publish it with your listing if approved.</p>
    </div>

    <div style="margin:1.5rem 0;padding:1.25rem;background:rgba(45,122,62,0.06);border:1px solid rgba(45,122,62,0.2);border-radius:var(--radius);">
      <h2 style="font-size:1.15rem;margin:0 0 0.5rem;">Submit a truck photo or logo (optional)</h2>
      <p style="color:var(--muted);font-size:0.88rem;margin:0 0 1rem;">Share an HTTPS link to a photo of your actual truck or your official logo. We review every asset before it appears publicly; the current image stays in place until approval.</p>
      <div class="form-group">
        <label class="form-label" for="assetUrl">Photo or logo URL</label>
        <input class="form-input" type="url" id="assetUrl" name="assetUrl" maxlength="1000" autocomplete="url" placeholder="https://yourwebsite.com/images/your-truck.jpg" />
      </div>
      <div class="form-group">
        <label class="form-label" for="assetType">Asset type</label>
        <select class="form-input" id="assetType" name="assetType">
          <option value="">Choose one</option>
          <option value="truck-photo">Photo of my actual truck</option>
          <option value="official-logo">Official logo or brand mark</option>
        </select>
      </div>
      <label class="radio-label" style="display:flex;align-items:flex-start;gap:0.5rem;">
        <input type="checkbox" name="assetPermission" value="yes" style="margin-top:0.15rem;" />
        <span>I confirm I own or am authorized to submit this asset and allow South Jersey Food Truck to display it with this listing if approved.</span>
      </label>
    </div>

    <div class="form-group">
      <label class="radio-label" style="display:flex;align-items:flex-start;gap:0.5rem;">
        <input type="checkbox" name="confirmOwner" value="yes" required style="margin-top:0.15rem;" />
        <span>I confirm I am the owner or authorized representative of ${esc(truck.name)} and this listing is currently active.</span>
      </label>
    </div>

    ${captchaMarkup('verify_listing')}
    <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center;">Submit Verification Request</button>
  </form>
  `}

  <div style="margin-top:2rem;padding-top:1.5rem;border-top:1px solid var(--border);">
    <p style="color:var(--muted);font-size:0.85rem;"><a href="/trucks/${esc(truck.slug)}" style="color:var(--primary);">&larr; Back to ${esc(truck.name)}</a></p>
  </div>
</div>`;

  return layout({
    title: `Verify Listing — ${truck.name}`,
    desc: `Verify your food truck listing for ${truck.name} on South Jersey Food Truck.`,
    canonical: `/verify/${truck.slug}`,
    robots: 'noindex, follow',
    content
  });
};
