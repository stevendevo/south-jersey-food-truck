'use strict';

const { verifyMathChallengeToken } = require('./html/captcha');

const ATTEMPT_WINDOW_MS = 60 * 60 * 1000;
const SEND_WINDOW_MS = 60 * 60 * 1000;
const ATTEMPT_LIMIT = 30;
const SEND_LIMIT = 5;
const MIN_FORM_AGE_MS = 2500;
const MAX_FORM_AGE_MS = 2 * 60 * 60 * 1000;
const attempts = new Map();
const sends = new Map();
const usedChallenges = new Map();

function captchaSiteKeyForRequest(req) {
  return '';
}

function rateAllowed(store, key, limit, windowMs) {
  const now = Date.now();
  const recent = (store.get(key) || []).filter(timestamp => now - timestamp < windowMs);
  if (recent.length >= limit) {
    store.set(key, recent);
    return false;
  }
  recent.push(now);
  store.set(key, recent);
  return true;
}

function clientKey(req, action) {
  return `${action}:${req.ip || req.socket.remoteAddress || 'unknown'}`;
}

function sameOrigin(req) {
  const origin = req.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).host === req.get('host');
  } catch (error) {
    return false;
  }
}

function failed(message, status = 400) {
  return { ok: false, message, status };
}

async function verifyPublicForm(req, action) {
  if (!sameOrigin(req) || req.get('sec-fetch-site') === 'cross-site') {
    return failed('This form must be submitted from the South Jersey Food Truck website.', 403);
  }
  if (!rateAllowed(attempts, clientKey(req, action), ATTEMPT_LIMIT, ATTEMPT_WINDOW_MS)) {
    return failed('Too many submission attempts were received. Please try again later.', 429);
  }
  if (String(req.body?._company_url || '').trim()) {
    return failed('We could not verify this submission. Please reload the page and try again.');
  }

  const token = String(req.body?._captcha_token || '').trim();
  const answer = String(req.body?.captcha_answer || '').trim();
  if (!token || token.length > 1024 || !/^\d{1,3}$/.test(answer)) {
    return failed('Please solve the math problem before submitting.');
  }
  try {
    const challenge = verifyMathChallengeToken(token, action, answer);
    if (!challenge.ok) {
      return failed('That math answer was not correct. Please reload the form and try again.');
    }
    const formAge = Date.now() - challenge.issuedAt;
    if (formAge < MIN_FORM_AGE_MS || formAge > MAX_FORM_AGE_MS) {
      return failed('Please wait a moment before submitting, or reload the form if it has expired.');
    }
    const now = Date.now();
    for (const [usedToken, usedUntil] of usedChallenges) {
      if (usedUntil < now) usedChallenges.delete(usedToken);
    }
    if (usedChallenges.has(token)) {
      return failed('That math problem was already submitted. Please reload the form and try again.');
    }
    usedChallenges.set(token, challenge.expiresAt);
    return { ok: true };
  } catch (error) {
    return failed('The math problem could not be verified. Please reload the form and try again.');
  }
}

function formSendAllowed(req, action) {
  return rateAllowed(sends, clientKey(req, action), SEND_LIMIT, SEND_WINDOW_MS);
}

function safeString(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function isValidEmail(value) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(value);
}

function isValidPhone(value, required = false) {
  if (!value) return !required;
  const digits = value.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15 && /^[+()\d\s.-]+$/.test(value);
}

function looksAutomated(values) {
  const combined = values.map(value => String(value || '')).join(' ');
  return /(?:\/\*\*\/|union\s+(?:all\s+)?select|order\s+by\s+\d|extractvalue\s*\(|updatexml\s*\(|sleep\s*\(|benchmark\s*\(|information_schema|<script\b|javascript:|onerror\s*=)/i.test(combined);
}

module.exports = {
  captchaSiteKeyForRequest,
  verifyPublicForm,
  formSendAllowed,
  safeString,
  isValidEmail,
  isValidPhone,
  looksAutomated
};