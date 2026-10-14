'use strict';

const crypto = require('crypto');

const CHALLENGE_LIFETIME_MS = 30 * 60 * 1000;

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function encryptionKey() {
  const secret = String(process.env.SESSION_SECRET || '');
  if (secret) return crypto.createHash('sha256').update(secret).digest();
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET is required to protect form challenges');
  }
  return crypto.createHash('sha256').update('south-jersey-food-truck-local-development-only').digest();
}

function createMathChallenge(action) {
  const first = crypto.randomInt(2, 10);
  const second = crypto.randomInt(2, 10);
  const issuedAt = Date.now();
  const payload = JSON.stringify({
    action,
    answer: first + second,
    issuedAt,
    expiresAt: issuedAt + CHALLENGE_LIFETIME_MS
  });
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()]);
  const authenticationTag = cipher.getAuthTag();
  return {
    question: `${first} + ${second}`,
    token: [iv, encrypted, authenticationTag].map(part => part.toString('base64url')).join('.')
  };
}

function verifyMathChallengeToken(token, action, answer) {
  try {
    const parts = String(token || '').split('.');
    if (parts.length !== 3) return { ok: false };
    const [iv, encrypted, authenticationTag] = parts.map(part => Buffer.from(part, 'base64url'));
    if (iv.length !== 12 || authenticationTag.length !== 16 || !encrypted.length) return { ok: false };
    const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), iv);
    decipher.setAuthTag(authenticationTag);
    const payload = JSON.parse(Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8'));
    const now = Date.now();
    const valid = payload.action === action
      && Number.isFinite(payload.issuedAt)
      && Number.isFinite(payload.expiresAt)
      && payload.issuedAt <= now
      && payload.expiresAt >= now
      && String(payload.answer) === String(answer);
    return valid
      ? { ok: true, issuedAt: payload.issuedAt, expiresAt: payload.expiresAt }
      : { ok: false };
  } catch (error) {
    return { ok: false };
  }
}

function captchaMarkup(action) {
  const challenge = createMathChallenge(action);
  return `<div class="form-honeypot" aria-hidden="true">
    <label for="${esc(action)}CompanyUrl">Leave this field empty</label>
    <input id="${esc(action)}CompanyUrl" type="text" name="_company_url" tabindex="-1" autocomplete="off">
  </div>
  <input type="hidden" name="_captcha_token" value="${esc(challenge.token)}">
  <div class="captcha-field">
    <label for="${esc(action)}Captcha">Spam check: What is ${esc(challenge.question)}? <span aria-hidden="true">*</span></label>
    <input id="${esc(action)}Captcha" type="text" name="captcha_answer" inputmode="numeric" pattern="[0-9]{1,3}" maxlength="3" autocomplete="off" required aria-describedby="${esc(action)}CaptchaHelp">
    <p id="${esc(action)}CaptchaHelp">Enter the number to confirm you are a person.</p>
  </div>`;
}

function captchaScript() {
  return '';
}

module.exports = { captchaMarkup, captchaScript, createMathChallenge, verifyMathChallengeToken };