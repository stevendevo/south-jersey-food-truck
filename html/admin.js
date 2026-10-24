'use strict';
const layout = require('./layout');
const { esc } = require('../utils');

module.exports = function adminPage({ trucks, token, submissions = [], message = '', updatedSlug = '', updatedSubmissionId = '' }) {
  const verifiedCount = trucks.filter(t => t.verified).length;
  const unverifiedCount = trucks.filter(t => !t.verified).length;
  const pendingSubmissions = submissions.filter(s => s.status === 'pending');
  const submissionRows = pendingSubmissions.length ? pendingSubmissions.map(s => {
    const truck = trucks.find(t => t.slug === s.truck_slug);
    const submittedDate = s.submitted_at ? new Date(s.submitted_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Unknown';
    const isUpdated = s.id === updatedSubmissionId;
    return `
    <tr class="${isUpdated ? 'row-updated' : ''}">
      <td><a href="/trucks/${esc(s.truck_slug)}" target="_blank">${esc(truck?.name || s.truck_slug)}</a></td>
      <td>${esc(s.asset_type === 'truck-photo' ? 'Truck photo' : 'Official logo')}</td>
      <td><a href="${esc(s.asset_url)}" target="_blank" rel="noopener">View submitted asset</a></td>
      <td>${esc(s.owner_name || 'Unknown')}<br><span style="color:var(--muted);font-size:0.8rem;">${esc(s.owner_email || '')}</span></td>
      <td>${submittedDate}</td>
      <td>
        <form method="POST" action="/admin/image-review" style="display:inline;">
          <input type="hidden" name="token" value="${esc(token)}" />
          <input type="hidden" name="submissionId" value="${esc(s.id)}" />
          <input type="hidden" name="action" value="approve" />
          <button type="submit" class="btn btn-sm btn-primary" style="padding:0.35rem 0.75rem;font-size:0.8rem;">Approve</button>
        </form>
        <form method="POST" action="/admin/image-review" style="display:inline;margin-left:0.35rem;">
          <input type="hidden" name="token" value="${esc(token)}" />
          <input type="hidden" name="submissionId" value="${esc(s.id)}" />
          <input type="hidden" name="action" value="reject" />
          <button type="submit" class="btn btn-sm btn-outline" style="padding:0.35rem 0.75rem;font-size:0.8rem;">Reject</button>
        </form>
      </td>
    </tr>`;
  }).join('') : '<tr><td colspan="6" style="color:var(--muted);">No pending photo or logo submissions.</td></tr>';

  const rows = trucks.map(t => {
    const verifiedDate = t.last_verified
      ? new Date(t.last_verified + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'Never';
    const isUpdated = t.slug === updatedSlug;
    return `
    <tr class="${isUpdated ? 'row-updated' : ''}">
      <td><a href="/trucks/${esc(t.slug)}" target="_blank">${esc(t.name)}</a></td>
      <td>${esc(t.cuisine)}</td>
      <td>${esc(t.area)}</td>
      <td>${t.verified ? '<span class="badge badge-verified">&#10003; Verified</span>' : '<span style="color:var(--muted);font-size:0.85rem;">Unverified</span>'}</td>
      <td>${verifiedDate}</td>
      <td>
        <form method="POST" action="/admin/verify" style="display:inline;">
          <input type="hidden" name="token" value="${esc(token)}" />
          <input type="hidden" name="slug" value="${esc(t.slug)}" />
          <button type="submit" class="btn btn-sm btn-outline" style="padding:0.35rem 0.75rem;font-size:0.8rem;">Verify Now</button>
        </form>
      </td>
    </tr>`;
  }).join('');

  const content = `
<div class="contact-page">
  <span class="section-label">Admin</span>
  <h1>Truck Verification Dashboard</h1>
  <p style="color:var(--muted);">${verifiedCount} verified &middot; ${unverifiedCount} unverified &middot; ${trucks.length} total</p>

  ${message ? `<div class="success-box">${esc(message)}</div>` : ''}

  <h2 style="margin:2rem 0 1rem;">Pending photo and logo submissions (${pendingSubmissions.length})</h2>
  <div style="overflow-x:auto;">
    <table class="admin-table">
      <thead><tr><th>Truck</th><th>Type</th><th>Asset</th><th>Submitted by</th><th>Date</th><th>Review</th></tr></thead>
      <tbody>${submissionRows}</tbody>
    </table>
  </div>

  <h2 style="margin:2.5rem 0 1rem;">Listing verification</h2>
  <div style="overflow-x:auto;">
    <table class="admin-table">
      <thead>
        <tr>
          <th>Truck</th>
          <th>Cuisine</th>
          <th>Area</th>
          <th>Status</th>
          <th>Last Verified</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  </div>
</div>

<style>
.admin-table { width:100%; border-collapse:collapse; font-size:0.92rem; }
.admin-table th { text-align:left; padding:0.75rem 0.5rem; border-bottom:2px solid var(--border); font-weight:600; color:var(--muted); font-size:0.8rem; text-transform:uppercase; letter-spacing:0.03em; }
.admin-table td { padding:0.6rem 0.5rem; border-bottom:1px solid var(--border); vertical-align:middle; }
.admin-table a { color:var(--primary); text-decoration:none; }
.admin-table a:hover { text-decoration:underline; }
.row-updated { background:rgba(45,122,62,0.08); }
.row-updated td { border-bottom:2px solid #2d7a3e; }
</style>`;

  return layout({
    title: 'Admin — Truck Verification',
    desc: 'South Jersey Food Truck admin verification dashboard.',
    canonical: '/admin',
    robots: 'noindex, nofollow',
    content
  });
};
