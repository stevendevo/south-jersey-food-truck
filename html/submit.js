'use strict';
const layout = require('./layout');
const { esc } = require('../utils');
const { captchaMarkup } = require('./captcha');

module.exports = function submitPage({ success = false, emailSent = false, emailError = '', formError = '' }) {
  const content = `
<div class="contact-page">
  <span class="section-label">Food Truck Owners</span>
  <h1>Submit Your Truck</h1>
  <p>Get your food truck in front of thousands of South Jersey event planners and hungry locals. Basic listings are free.</p>

  ${success ? `<div class="success-box">&#10003; Thanks for submitting! We'll review your listing and publish it within 1–2 business days.${emailError ? `<p style="margin-top:0.5rem;font-size:0.85rem;color:#b85900;">Note: Email delivery issue — ${esc(emailError)}</p>` : ''}${emailSent ? '<p style="margin-top:0.5rem;font-size:0.85rem;color:#2d7a3e;">Email notification sent successfully.</p>' : ''}</div>` : ''}
  ${formError ? `<div class="error-box" role="alert">${esc(formError)}</div>` : ''}

  <form method="POST" action="/submit-truck">
    <div class="form-group">
      <label class="form-label" for="truckName">Truck Name <span style="color:var(--primary)">*</span></label>
      <input class="form-input" type="text" id="truckName" name="truckName" required minlength="2" maxlength="120" placeholder="Your Truck Name" />
    </div>

    <div class="form-group">
      <label class="form-label" for="ownerName">Your Name <span style="color:var(--primary)">*</span></label>
      <input class="form-input" type="text" id="ownerName" name="ownerName" required minlength="2" maxlength="100" autocomplete="name" placeholder="Owner / Contact Name" />
    </div>

    <div class="form-group">
      <label class="form-label" for="email">Email Address <span style="color:var(--primary)">*</span></label>
      <input class="form-input" type="email" id="email" name="email" required maxlength="254" autocomplete="email" placeholder="your@email.com" />
    </div>

    <div class="form-group">
      <label class="form-label" for="phone">Phone Number</label>
      <input class="form-input" type="tel" id="phone" name="phone" maxlength="30" autocomplete="tel" placeholder="(856) 555-0100" />
    </div>

    <div class="form-group">
      <label class="form-label" for="cuisine">Cuisine Type <span style="color:var(--primary)">*</span></label>
      <input class="form-input" type="text" id="cuisine" name="cuisine" required minlength="2" maxlength="100" placeholder="e.g. BBQ, Tacos, Pizza, Desserts" />
    </div>

    <div class="form-group">
      <label class="form-label" for="area">Primary Service Area <span style="color:var(--primary)">*</span></label>
      <select class="form-select" id="area" name="area" required>
        <option value="">Select a county…</option>
        <option>Camden County</option>
        <option>Burlington County</option>
        <option>Gloucester County</option>
        <option>Atlantic County</option>
        <option>Cape May County</option>
        <option>Cumberland County</option>
        <option>Salem County</option>
        <option>Multiple Counties</option>
      </select>
    </div>

    <div class="form-group">
      <label class="form-label" for="website">Website</label>
      <input class="form-input" type="url" id="website" name="website" maxlength="500" autocomplete="url" placeholder="https://yourtruck.com" />
    </div>

    <div class="form-group">
      <label class="form-label" for="instagram">Instagram Handle</label>
      <input class="form-input" type="text" id="instagram" name="instagram" maxlength="100" placeholder="@yourtruck" />
    </div>

    <div class="form-group">
      <label class="form-label" for="description">Tell Us About Your Truck</label>
      <textarea class="form-textarea" id="description" name="description" maxlength="3000" style="height:120px;" placeholder="What makes your truck special? What do you serve? Where do you operate?"></textarea>
    </div>

    ${captchaMarkup('submit_truck')}
    <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center;">Submit My Truck — Free</button>
  </form>
</div>`;

  return layout({
    title: 'Submit Your Food Truck — South Jersey Food Truck Directory',
    desc: 'Add your South Jersey food truck to the directory for free. Reach event planners and food fans across Camden, Burlington, Gloucester, Atlantic, Cape May, Cumberland, and Salem counties.',
    canonical: '/submit-truck',
    content
  });
};
