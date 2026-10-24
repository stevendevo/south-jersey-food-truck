'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { createAssistantService } = require('./assistant');
const {
  captchaSiteKeyForRequest,
  verifyPublicForm,
  formSendAllowed,
  safeString,
  isValidEmail,
  isValidPhone,
  looksAutomated
} = require('./form-protection');
const { deliverEventInquiry } = require('./event-inquiry-delivery');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;
const DOMAIN = 'https://southjerseyfoodtruck.com';

function xmlEscape(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ── Data ──────────────────────────────────────────────────────────────────────
// DATA_DIR lets production keep editable JSON on a persistent volume (Railway).
// On first boot the bundled ./data files are copied in; after that the volume wins.
const BUNDLED_DATA_DIR = path.join(__dirname, 'data');
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : BUNDLED_DATA_DIR;
if (DATA_DIR !== BUNDLED_DATA_DIR) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  for (const file of fs.readdirSync(BUNDLED_DATA_DIR)) {
    const target = path.join(DATA_DIR, file);
    if (!fs.existsSync(target)) fs.copyFileSync(path.join(BUNDLED_DATA_DIR, file), target);
  }
}
const readJsonData = (filename) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, filename), 'utf8'));
const trucks = readJsonData('trucks.json');
// Drafts and scheduled posts must not leak through routes, feeds, or AI context.
const posts = readJsonData('posts.json').filter(post =>
  post.slug && post.published_at && new Date(post.published_at).getTime() <= Date.now()
);
const imageSubmissions = readJsonData('image-submissions.json');
const assistantService = createAssistantService({ trucks, posts });
const assistantRate = new Map();
const ASSISTANT_RATE_WINDOW_MS = 5 * 60 * 1000;
const ASSISTANT_RATE_LIMIT = 12;

// ── Templates ─────────────────────────────────────────────────────────────────
const homePage = require('./html/home');
const directoryPage = require('./html/directory');
const truckPage = require('./html/truck');
const blogPage = require('./html/blog');
const postPage = require('./html/post');
const aboutPage = require('./html/about');
const snapshotPage = require('./html/snapshot');
const mapPage = require('./html/map');
const eventsPage = require('./html/events');
const comparisonsPage = require('./html/comparisons');
const faqPage = require('./html/faq');
const contactPage = require('./html/contact');
const submitPage = require('./html/submit');
const verifyRequestPage = require('./html/verify-request');
const reportUpdatePage = require('./html/report-update');
const adminPage = require('./html/admin');
const notFoundPage = require('./html/not-found');
const countyPage = require('./html/county');
const cuisinePage = require('./html/cuisine');
const countyCuisinePage = require('./html/county-cuisine');
const cityPage = require('./html/city');
const hubPage = require('./html/hub');
const checklistPage = require('./html/checklist');
const { hasVerifiedTruckImage } = require('./utils');
const {
  COUNTY_SLUGS,
  cuisineSlug,
  cuisineSlugMap,
  countyCuisineCombos,
  cityPageTargets,
} = require('./taxonomy');

const CITY_PAGE_TARGETS = cityPageTargets(trucks);

function sendFreshHtml(res, html, lastModified) {
  if (lastModified) {
    const date = new Date(lastModified);
    if (!Number.isNaN(date.getTime())) res.set('Last-Modified', date.toUTCString());
  }
  res.set('Cache-Control', 'public, max-age=0, must-revalidate');
  res.send(html);
}

function sendNotFound(res) {
  res.status(404).set('X-Robots-Tag', 'noindex, follow').send(notFoundPage());
}

function saveJsonData(filename, data) {
  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2), 'utf8');
}

// Retired truck detail URLs remain useful entry points for bookmarks and search
// results. Keep each one pointed at the closest current landing page instead
// of allowing a removed listing to become a dead end.
const LEGACY_TRUCK_REDIRECTS = Object.freeze({
  '/trucks/calle-del-sabor': '/gloucester-county-food-trucks',
  '/trucks/brooklyn-burger': '/atlantic-county-food-trucks',
  '/trucks/whirly-pig': '/burlington-county-food-trucks',
  '/trucks/the-meat-wagon': '/burlington-county-food-trucks',
  '/trucks/sweet-lavender': '/burlington-county-food-trucks',
  '/trucks/the-halal-guys': '/gloucester-county-food-trucks',
  '/trucks/brother-bears-bbq': '/south-jersey-bbq-food-trucks',
  '/trucks/forge-wood-fired-pizza': '/south-jersey-wood-fired-pizza-food-trucks'
});
// No active site code consumes vendor click IDs. Retain the standard UTM
// campaign fields for downstream attribution, without forwarding arbitrary
// query parameters from retired URLs.
const LEGACY_TRACKING_PARAMETERS = Object.freeze([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content'
]);

function legacyTruckTrackingQuery(requestUrl) {
  const incoming = new URL(requestUrl, DOMAIN);
  const tracking = new URLSearchParams();
  for (const parameter of LEGACY_TRACKING_PARAMETERS) {
    const value = incoming.searchParams.get(parameter);
    if (value && value.length <= 200) tracking.set(parameter, value);
  }
  return tracking.toString();
}

function legacyTruckRedirectLocation(destination, requestUrl) {
  const target = new URL(destination, DOMAIN);
  const trackingQuery = legacyTruckTrackingQuery(requestUrl);
  return `${target.pathname}${trackingQuery ? `?${trackingQuery}` : ''}`;
}

// ── Auto-link truck names in blog post content ────────────────────────────────
function autoLinkTrucks(post, truckList) {
  let content = post.content;
  const sortedTrucks = truckList
    .filter(t => t.slug && t.name)
    .slice()
    .sort((a, b) => b.name.length - a.name.length);

  for (const t of sortedTrucks) {
    const escaped = t.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(?<!\\[|/trucks/${t.slug}[^)]*\\)\\s*)\\b(${escaped})\\b`, '');
    if (!re.test(content)) continue;
    const mdLinkRe = new RegExp(`\\[${escaped}\\]`, '');
    if (mdLinkRe.test(content)) continue;
    content = content.replace(new RegExp(`\\b(${escaped})\\b`), `[$1](/trucks/${t.slug})`);
  }
  return Object.assign({}, post, { content });
}

// Keep these dates tied to actual editorial reviews. Do not replace them with
// the request date: a sitemap request does not mean the page content changed.
const STATIC_SITEMAP_LASTMOD = {
  '/': '2026-08-19',
  '/food-trucks-in-south-jersey': '2026-09-05',
  '/directory': '2026-09-05',
  '/blog': '2026-08-19',
  '/about': '2026-08-19',
  '/directory-snapshot': '2026-08-19',
  '/food-truck-map': '2026-08-19',
  '/food-truck-events': '2026-08-19',
  '/food-truck-event-checklist': '2026-09-05',
  '/food-truck-comparisons': '2026-08-19',
  '/faq': '2026-08-19',
  '/contact': '2026-05-31',
  '/submit-truck': '2026-05-26',
  '/privacy': '2026-10-24',
  '/terms': '2026-05-26',
};

function latestRecordDate(records, field) {
  return records
    .map(record => record[field])
    .filter(value => value && Number.isFinite(new Date(value).getTime()) && new Date(value).getTime() <= Date.now())
    .sort((a, b) => new Date(b) - new Date(a))[0] || null;
}

function postModifiedDate(post) {
  return latestRecordDate([
    { date: post.published_at }, { date: post.updated_at }, { date: post.guidance_reviewed_at }
  ], 'date');
}

// Resolve case variants only for known HTML routes. Asset paths are case sensitive.
const CANONICAL_PAGE_PATHS = new Set([
  ...Object.keys(STATIC_SITEMAP_LASTMOD),
  ...trucks.filter(truck => truck.slug).map(truck => `/trucks/${truck.slug}`),
  ...posts.map(post => `/blog/${post.slug}`),
  ...Object.keys(COUNTY_SLUGS).map(slug => `/${slug}-food-trucks`),
  ...Object.keys(cuisineSlugMap(trucks)).map(slug => `/south-jersey-${slug}-food-trucks`),
  ...countyCuisineCombos(trucks).map(({ ctySlug, cSlug }) => `/${ctySlug}-${cSlug}-food-trucks`),
  ...CITY_PAGE_TARGETS.map(({ slug }) => `/food-trucks-in-${slug}`)
]);

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.urlencoded({ extended: false, limit: '32kb', parameterLimit: 40 }));
app.use(express.json({ limit: '32kb' }));
app.use((req, res, next) => {
  const operational = /^\/(?:admin|api|healthz|verify|report-update)(?:\/|$)/i.test(req.path);
  const submission = !['GET', 'HEAD'].includes(req.method);
  if (operational || submission) {
    res.set('X-Robots-Tag', /^\/(?:admin|api|healthz)(?:\/|$)/i.test(req.path)
      ? 'noindex, nofollow' : 'noindex, follow');
    res.set('Cache-Control', 'private, no-store');
    res.set('Referrer-Policy', 'no-referrer');
  }
  if (req.path.toLowerCase() === '/directory' && ['q', 'county', 'cuisine', 'sort'].some(key => key in req.query)) {
    res.set('X-Robots-Tag', 'noindex, follow');
  }
  const trimmedPath = req.path.replace(/^\/+/, '/').replace(/\/+$/, '') || '/';
  const canonicalPath = CANONICAL_PAGE_PATHS.has(trimmedPath.toLowerCase())
    ? trimmedPath.toLowerCase() : trimmedPath;
  if (['GET', 'HEAD'].includes(req.method) && canonicalPath !== req.path) {
    const isLegacyTruckPath = Object.prototype.hasOwnProperty.call(LEGACY_TRUCK_REDIRECTS, canonicalPath);
    const query = isLegacyTruckPath
      ? legacyTruckTrackingQuery(req.originalUrl)
      : req.url.slice(req.path.length);
    const querySuffix = isLegacyTruckPath
      ? (query ? `?${query}` : '')
      : query;
    return res.redirect(301, `${canonicalPath}${querySuffix}`);
  }
  next();
});
app.get('/healthz', (req, res) => res.type('text').send('ok'));
app.use(express.static(path.join(__dirname, 'public')));

function isSameOriginRequest(req) {
  const origin = req.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).host === req.get('host');
  } catch (error) {
    return false;
  }
}

function assistantRateAllowed(req) {
  const now = Date.now();
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  const recent = (assistantRate.get(key) || []).filter(timestamp => now - timestamp < ASSISTANT_RATE_WINDOW_MS);
  if (recent.length >= ASSISTANT_RATE_LIMIT) {
    assistantRate.set(key, recent);
    return false;
  }
  recent.push(now);
  assistantRate.set(key, recent);
  return true;
}

app.post('/api/assistant', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (!isSameOriginRequest(req) || req.get('sec-fetch-site') === 'cross-site') {
    return res.status(403).json({ error: 'This assistant only accepts requests from the site.' });
  }
  if (!assistantRateAllowed(req)) {
    return res.status(429).set('Retry-After', '300').json({ error: 'Please wait a few minutes before asking again.' });
  }

  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (!message || message.length > 1200) {
    return res.status(400).json({ error: 'Please enter a question up to 1,200 characters.' });
  }
  const history = Array.isArray(req.body?.history) ? req.body.history : [];

  try {
    const result = await assistantService.answerQuestion(message, history);
    res.json(result);
  } catch (error) {
    const status = error.code === 'AI_NOT_CONFIGURED'
      ? 503
      : error.code === 'AI_TIMEOUT'
        ? 504
        : 502;
    console.warn('Assistant request failed:', error.code || error.status || error.name || 'unknown_error');
    res.status(status).json({
      error: status === 504
        ? 'The assistant took too long to respond. Please try again.'
        : 'The assistant is unavailable right now. Please try again in a moment.'
    });
  }
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.send(homePage({ trucks, posts }));
});

app.get('/directory', (req, res) => {
  res.send(directoryPage({ trucks }));
});

function compareNearbyTrucks(a, b) {
  const verifiedDifference = Number(Boolean(b.verified)) - Number(Boolean(a.verified));
  if (verifiedDifference !== 0) return verifiedDifference;

  const featuredDifference = Number(Boolean(b.featured)) - Number(Boolean(a.featured));
  if (featuredDifference !== 0) return featuredDifference;

  const aKey = String(a.slug || a.name || a.id || '');
  const bKey = String(b.slug || b.name || b.id || '');
  return aKey < bKey ? -1 : aKey > bKey ? 1 : 0;
}

app.get('/trucks/:slug', (req, res) => {
  const legacyDestination = LEGACY_TRUCK_REDIRECTS[`/trucks/${req.params.slug}`];
  if (legacyDestination) {
    return res.redirect(301, legacyTruckRedirectLocation(legacyDestination, req.originalUrl));
  }

  const truck = trucks.find(t => t.slug === req.params.slug);
  if (!truck) return sendNotFound(res);
  const nearbyTrucks = trucks
    .filter(candidate => candidate.area === truck.area && candidate.slug !== truck.slug)
    .sort(compareNearbyTrucks)
    .slice(0, 4);
  const cityPageTarget = CITY_PAGE_TARGETS.find(page => page.city === truck.city && page.county === truck.area) || null;
  sendFreshHtml(res, truckPage({ truck, nearbyTrucks, cityPageTarget }), truck.last_verified);
});

app.get('/blog', (req, res) => {
  const latest = posts
    .map(post => new Date(post.updated_at || post.published_at))
    .sort((a, b) => b - a)[0];
  sendFreshHtml(res, blogPage({ posts }), latest);
});

app.get('/blog/:slug', (req, res) => {
  const post = posts.find(p => p.slug === req.params.slug);
  if (!post) return sendNotFound(res);
  sendFreshHtml(res, postPage({ post: autoLinkTrucks(post, trucks), posts }), postModifiedDate(post));
});

app.get('/about', (req, res) => {
  res.send(aboutPage({ trucks }));
});

app.get('/directory-snapshot', (req, res) => {
  res.send(snapshotPage({ trucks }));
});

app.get('/food-truck-map', (req, res) => {
  res.send(mapPage({ trucks }));
});

app.get('/food-truck-events', (req, res) => {
  res.send(eventsPage({ posts, trucks }));
});

app.get('/food-truck-event-checklist', (req, res) => {
  res.send(checklistPage());
});

app.get('/food-truck-event-checklist.pdf', (req, res) => {
  const pdf = checklistPage.createPdf();
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': 'attachment; filename="south-jersey-food-truck-event-checklist.pdf"',
    'Content-Length': pdf.length,
    'Cache-Control': 'public, max-age=0, must-revalidate'
  });
  res.send(pdf);
});

app.get('/food-truck-comparisons', (req, res) => {
  res.send(comparisonsPage({ posts, trucks }));
});

app.get('/faq', (req, res) => {
  res.send(faqPage());
});

app.get('/contact', (req, res) => {
  res.send(contactPage({ success: false, captchaSiteKey: captchaSiteKeyForRequest(req) }));
});

function readEventInquiryValues(body = {}) {
  return {
    name: safeString(body.name, 100),
    email: safeString(body.email, 254),
    phone: safeString(body.phone, 30),
    eventDate: safeString(body.eventDate, 10),
    eventTime: safeString(body.eventTime, 5),
    zipCode: safeString(body.zipCode, 5),
    payer: safeString(body.payer, 20),
    budget: safeString(body.budget, 100),
    message: safeString(body.message, 2000)
  };
}

app.post('/contact', async (req, res) => {
  const captchaSiteKey = captchaSiteKeyForRequest(req);
  const values = readEventInquiryValues(req.body);
  const protection = await verifyPublicForm(req, 'contact');
  if (!protection.ok) {
    return res.status(protection.status).send(contactPage({
      success: false,
      formError: protection.message,
      values,
      captchaSiteKey
    }));
  }
  const { name, email, phone, eventDate, eventTime, zipCode, payer, budget, message } = values;
  const invalid = name.length < 2
    || !isValidEmail(email)
    || !isValidPhone(phone, true)
    || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)
    || !/^\d{2}:\d{2}$/.test(eventTime)
    || !/^\d{5}$/.test(zipCode)
    || !['Attendees', 'Event Host'].includes(payer)
    || looksAutomated([name, email, phone, budget, message]);
  if (invalid) {
    return res.status(400).send(contactPage({
      success: false,
      formError: 'Please check the required fields and enter normal contact and event details.',
      values,
      captchaSiteKey
    }));
  }
  if (!formSendAllowed(req, 'contact')) {
    return res.status(429).send(contactPage({
      success: false,
      formError: 'Too many event inquiries were submitted from this connection. Please try again later.',
      values,
      captchaSiteKey
    }));
  }

  const apiKey = process.env.RESEND_API_KEY;
  const sendEmail = apiKey
    ? payload => {
      const { Resend } = require('resend');
      const resend = new Resend(apiKey);
      return resend.emails.send(payload);
    }
    : null;
  const delivery = await deliverEventInquiry({
    recipient: process.env.EVENT_INQUIRY_RECIPIENT,
    sendEmail,
    inquiry: values
  });

  if (!delivery.ok) {
    console.error('Event inquiry delivery failed:', delivery.reason);
    const configurationFailure = [
      'mail_not_configured',
      'recipient_not_configured'
    ].includes(delivery.reason);
    const formError = configurationFailure
      ? 'We could not send your inquiry because email delivery is not configured. Your entries are still in this form; please try again later.'
      : 'We could not confirm that your inquiry was sent. Your entries are still in this form; please try again.';
    return res.status(503).send(contactPage({
      success: false,
      formError,
      values,
      captchaSiteKey
    }));
  }

  console.log('Event inquiry email accepted by the provider');
  return res.send(contactPage({ success: true, captchaSiteKey }));
});

app.get('/verify/:slug', (req, res) => {
  const truck = trucks.find(t => t.slug === req.params.slug);
  if (!truck) return sendNotFound(res);
  res.send(verifyRequestPage({ truck, success: false, captchaSiteKey: captchaSiteKeyForRequest(req) }));
});

app.post('/verify/:slug', async (req, res) => {
  const truck = trucks.find(t => t.slug === req.params.slug);
  if (!truck) return sendNotFound(res);

  const captchaSiteKey = captchaSiteKeyForRequest(req);
  const protection = await verifyPublicForm(req, 'verify_listing');
  if (!protection.ok) {
    return res.status(protection.status).send(verifyRequestPage({ truck, success: false, formError: protection.message, captchaSiteKey }));
  }

  const ownerName = safeString(req.body?.ownerName, 100);
  const email = safeString(req.body?.email, 254);
  const phone = safeString(req.body?.phone, 30);
  const message = safeString(req.body?.message, 2000);
  const operatorQuote = safeString(req.body?.operatorQuote, 1200);
  const confirmOwner = safeString(req.body?.confirmOwner, 10);
  const submittedAssetUrl = safeString(req.body?.assetUrl, 1000);
  const submittedAssetType = safeString(req.body?.assetType, 30);
  const assetPermission = safeString(req.body?.assetPermission, 10);
  if (ownerName.length < 2
    || !isValidEmail(email)
    || !isValidPhone(phone, true)
    || confirmOwner !== 'yes'
    || looksAutomated([ownerName, email, phone, message, operatorQuote, submittedAssetUrl])) {
    return res.status(400).send(verifyRequestPage({
      truck,
      success: false,
      formError: 'Please check the required owner and contact fields and remove any invalid text.',
      captchaSiteKey
    }));
  }
  if (submittedAssetUrl && (
    !/^https:\/\/\S+$/i.test(submittedAssetUrl) ||
    !['truck-photo', 'official-logo'].includes(submittedAssetType) ||
    assetPermission !== 'yes'
  )) {
    return res.status(400).send(verifyRequestPage({
      truck,
      success: false,
      formError: 'Please provide a valid HTTPS image link, choose whether it is a truck photo or official logo, and confirm you are authorized to submit it.',
      captchaSiteKey
    }));
  }
  if (!formSendAllowed(req, 'verify_listing')) {
    return res.status(429).send(verifyRequestPage({
      truck,
      success: false,
      formError: 'Too many verification requests were submitted from this connection. Please try again later.',
      captchaSiteKey
    }));
  }

  let assetSubmission = null;
  if (submittedAssetUrl) {
    assetSubmission = {
      id: crypto.randomUUID(),
      truck_slug: truck.slug,
      asset_url: submittedAssetUrl,
      asset_type: submittedAssetType,
      owner_name: String(ownerName || '').trim(),
      owner_email: String(email || '').trim(),
      status: 'pending',
      submitted_at: new Date().toISOString()
    };
    imageSubmissions.push(assetSubmission);
    try {
      saveJsonData('image-submissions.json', imageSubmissions);
    } catch (e) {
      imageSubmissions.pop();
      console.error('Failed to save image submission:', e.message);
      return res.status(500).send(verifyRequestPage({
        truck,
        success: false,
        formError: 'We could not save the image submission. Please try again.',
        captchaSiteKey
      }));
    }
  }

  let emailSent = false;
  let emailError = '';
  try {
    if (process.env.RESEND_API_KEY) {
      const { Resend } = require('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      const body = [
        `Verification Request for: ${truck.name}`,
        `Truck slug: ${truck.slug}`,
        ``,
        `Owner: ${ownerName || 'Not provided'}`,
        `Email: ${email || 'Not provided'}`,
        `Phone: ${phone || 'Not provided'}`,
        ``,
        `Message:`,
        message || 'None',
        ``,
        `Optional operator quote for review:`,
        operatorQuote || 'None submitted',
        ``,
        `Photo or logo submission:`,
        assetSubmission ? `${assetSubmission.asset_type} — ${assetSubmission.asset_url} (pending admin review)` : 'None submitted',
        ``,
        `To approve:`,
        `1. Visit ${DOMAIN}/admin?token=YOUR_ADMIN_TOKEN`,
        `2. Find ${truck.name} and click "Verify Now"`,
      ].join('\n');
      await resend.emails.send({
        from: 'Grilly Cheese <grillycheese@grillycheese.net>',
        to: 'grillycheese@grillycheese.net',
        subject: `[Verify] ${truck.name} — Owner Verification Request`,
        text: body,
      });
      emailSent = true;
      console.log('Validated verification request email sent for', truck.slug);
    } else {
      emailError = 'Email service not configured (RESEND_API_KEY missing)';
      console.warn(emailError);
    }
  } catch (e) {
    emailError = e.message;
    console.error('Verification email error:', e.message);
  }
  res.send(verifyRequestPage({ truck, success: true, emailSent, emailError, captchaSiteKey }));
});

app.get('/report-update/:slug', (req, res) => {
  const truck = trucks.find(t => t.slug === req.params.slug);
  if (!truck) return sendNotFound(res);
  res.send(reportUpdatePage({ truck, success: false, captchaSiteKey: captchaSiteKeyForRequest(req) }));
});

app.post('/report-update/:slug', async (req, res) => {
  const truck = trucks.find(t => t.slug === req.params.slug);
  if (!truck) return sendNotFound(res);
  const captchaSiteKey = captchaSiteKeyForRequest(req);
  const protection = await verifyPublicForm(req, 'report_update');
  if (!protection.ok) {
    return res.status(protection.status).send(reportUpdatePage({ truck, success: false, formError: protection.message, captchaSiteKey }));
  }
  const name = safeString(req.body?.name, 100);
  const email = safeString(req.body?.email, 254);
  const message = safeString(req.body?.message, 2500);
  if (name.length < 2 || !isValidEmail(email) || message.length < 10 || looksAutomated([name, email, message])) {
    return res.status(400).send(reportUpdatePage({
      truck,
      success: false,
      formError: 'Please enter a valid name, email address, and a clear description of the update.',
      captchaSiteKey
    }));
  }
  if (!formSendAllowed(req, 'report_update')) {
    return res.status(429).send(reportUpdatePage({
      truck,
      success: false,
      formError: 'Too many update reports were submitted from this connection. Please try again later.',
      captchaSiteKey
    }));
  }
  let emailSent = false;
  let emailError = '';
  try {
    if (process.env.RESEND_API_KEY) {
      const { Resend } = require('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'Grilly Cheese <grillycheese@grillycheese.net>',
        to: 'grillycheese@grillycheese.net',
        subject: `[Listing Update] ${truck.name}`,
        text: `Listing update for: ${truck.name}\nTruck slug: ${truck.slug}\n\nFrom: ${name}\nEmail: ${email}\n\nUpdate requested:\n${message}`,
      });
      emailSent = true;
      console.log('Validated listing update email sent for', truck.slug);
    } else {
      emailError = 'Email service not configured (RESEND_API_KEY missing)';
      console.warn(emailError);
    }
  } catch (e) {
    emailError = e.message;
    console.error('Listing update email error:', e.message);
  }
  res.send(reportUpdatePage({ truck, success: true, emailSent, emailError, captchaSiteKey }));
});

app.get('/admin', (req, res) => {
  const token = req.query.token || '';
  if (token !== process.env.ADMIN_TOKEN || !process.env.ADMIN_TOKEN) {
    const layout401 = require('./html/layout');
    return res.status(401).send(layout401({
      title: 'Unauthorized',
      desc: 'Admin access required.',
      content: '<div class="contact-page"><h1>Unauthorized</h1><p style="color:var(--muted);">Please provide a valid admin token in the URL: <code>/admin?token=YOUR_TOKEN</code></p></div>'
    }));
  }
  res.send(adminPage({ trucks, token, submissions: imageSubmissions }));
});

app.post('/admin/verify', (req, res) => {
  const { token, slug } = req.body || {};
  if (token !== process.env.ADMIN_TOKEN || !process.env.ADMIN_TOKEN) {
    const layout401 = require('./html/layout');
    return res.status(401).send(layout401({
      title: 'Unauthorized',
      desc: 'Admin access required.',
      content: '<div class="contact-page"><h1>Unauthorized</h1><p style="color:var(--muted);">Invalid or missing admin token.</p></div>'
    }));
  }
  const truck = trucks.find(t => t.slug === slug);
  if (!truck) return sendNotFound(res);

  truck.verified = true;
  const today = new Date().toISOString().slice(0, 10);
  truck.last_verified = today;

  // Write updated trucks.json
  try {
    const trucksPath = path.join(DATA_DIR, 'trucks.json');
    fs.writeFileSync(trucksPath, JSON.stringify(trucks, null, 2), 'utf8');
    console.log('Updated verification for', truck.name, 'to', today);
  } catch (e) {
    console.error('Failed to write trucks.json:', e.message);
  }

  res.send(adminPage({
    trucks,
    token,
    submissions: imageSubmissions,
    message: `Verified ${truck.name} — last verified updated to ${today}`,
    updatedSlug: slug
  }));
});

app.post('/admin/image-review', (req, res) => {
  const { token, submissionId, action } = req.body || {};
  if (token !== process.env.ADMIN_TOKEN || !process.env.ADMIN_TOKEN) {
    const layout401 = require('./html/layout');
    return res.status(401).send(layout401({
      title: 'Unauthorized',
      desc: 'Admin access required.',
      content: '<div class="contact-page"><h1>Unauthorized</h1><p style="color:var(--muted);">Invalid or missing admin token.</p></div>'
    }));
  }

  const submission = imageSubmissions.find(item => item.id === submissionId && item.status === 'pending');
  if (!submission || !['approve', 'reject'].includes(action)) {
    return res.status(400).send(adminPage({ trucks, token, submissions: imageSubmissions, message: 'That image submission is unavailable or the review action is invalid.' }));
  }

  const truck = trucks.find(item => item.slug === submission.truck_slug);
  if (!truck) return sendNotFound(res);

  const reviewedAt = new Date().toISOString();
  let message;
  try {
    if (action === 'approve') {
      truck.image_url = submission.asset_url;
      truck.image_alt = submission.asset_type === 'truck-photo'
        ? `${truck.name} food truck photo submitted by the operator`
        : `${truck.name} official logo submitted by the operator`;
      truck.image_asset_type = submission.asset_type === 'truck-photo' ? 'operator-submitted-truck-photo' : 'operator-submitted-logo';
      truck.image_source_url = submission.asset_url;
      truck.image_verified_at = reviewedAt;
      truck.image_verified_by = 'admin';
      message = `Approved the ${submission.asset_type === 'truck-photo' ? 'truck photo' : 'official logo'} for ${truck.name}.`;
    } else {
      message = `Rejected the image submission for ${truck.name}. The pending-image treatment remains public.`;
    }
    submission.status = action === 'approve' ? 'approved' : 'rejected';
    submission.reviewed_at = reviewedAt;
    submission.reviewed_by = 'admin';
    saveJsonData('trucks.json', trucks);
    saveJsonData('image-submissions.json', imageSubmissions);
  } catch (e) {
    console.error('Failed to review image submission:', e.message);
    return res.status(500).send(adminPage({ trucks, token, submissions: imageSubmissions, message: 'The review could not be saved. No public asset change was confirmed.' }));
  }

  res.send(adminPage({ trucks, token, submissions: imageSubmissions, message, updatedSubmissionId: submission.id }));
});

// ── County landing pages ──────────────────────────────────────────────────────
Object.entries(COUNTY_SLUGS).forEach(([slug, county]) => {
  app.get(`/${slug}-food-trucks`, (req, res) => {
    res.send(countyPage({ county, slug, trucks }));
  });
});

// ── Cuisine landing pages ─────────────────────────────────────────────────────
const ALL_CUISINE_SLUGS = cuisineSlugMap(trucks);
Object.entries(ALL_CUISINE_SLUGS).forEach(([slug, cuisine]) => {
  app.get(`/south-jersey-${slug}-food-trucks`, (req, res) => {
    res.send(cuisinePage({ cuisine, slug, trucks }));
  });
});

// ── County + cuisine intersection pages ───────────────────────────────────────
const COUNTY_CUISINE_COMBOS = countyCuisineCombos(trucks);
for (const { ctySlug, county, cSlug, cuisine } of COUNTY_CUISINE_COMBOS) {
  app.get(`/${ctySlug}-${cSlug}-food-trucks`, (req, res) => {
    res.send(countyCuisinePage({ county, countySlug: ctySlug, cuisine, cSlug, trucks }));
  });
}

for (const { city, county, slug } of CITY_PAGE_TARGETS) {
  app.get(`/food-trucks-in-${slug}`, (req, res) => {
    res.send(cityPage({ city, county, slug, trucks, cityPages: CITY_PAGE_TARGETS }));
  });
}

app.get('/food-trucks-in-south-jersey', (req, res) => {
  res.send(hubPage({
    trucks,
    cuisines: ALL_CUISINE_SLUGS,
    countyCuisineCombos: COUNTY_CUISINE_COMBOS,
    cityPages: CITY_PAGE_TARGETS
  }));
});

app.get('/submit-truck', (req, res) => {
  res.send(submitPage({ success: false, captchaSiteKey: captchaSiteKeyForRequest(req) }));
});

app.post('/submit-truck', async (req, res) => {
  const captchaSiteKey = captchaSiteKeyForRequest(req);
  const protection = await verifyPublicForm(req, 'submit_truck');
  if (!protection.ok) {
    return res.status(protection.status).send(submitPage({ success: false, formError: protection.message, captchaSiteKey }));
  }
  const truckName = safeString(req.body?.truckName, 120);
  const ownerName = safeString(req.body?.ownerName, 100);
  const email = safeString(req.body?.email, 254);
  const phone = safeString(req.body?.phone, 30);
  const cuisine = safeString(req.body?.cuisine, 100);
  const area = safeString(req.body?.area, 40);
  const website = safeString(req.body?.website, 500);
  const instagram = safeString(req.body?.instagram, 100);
  const description = safeString(req.body?.description, 3000);
  const allowedAreas = [
    'Camden County', 'Burlington County', 'Gloucester County', 'Atlantic County',
    'Cape May County', 'Cumberland County', 'Salem County', 'Multiple Counties'
  ];
  const invalidWebsite = website && !/^https?:\/\/[^\s]+$/i.test(website);
  if (truckName.length < 2
    || ownerName.length < 2
    || cuisine.length < 2
    || !allowedAreas.includes(area)
    || !isValidEmail(email)
    || !isValidPhone(phone)
    || invalidWebsite
    || looksAutomated([truckName, ownerName, email, phone, cuisine, area, website, instagram, description])) {
    return res.status(400).send(submitPage({
      success: false,
      formError: 'Please check the required truck and contact details and remove any invalid text.',
      captchaSiteKey
    }));
  }
  if (!formSendAllowed(req, 'submit_truck')) {
    return res.status(429).send(submitPage({
      success: false,
      formError: 'Too many truck submissions were received from this connection. Please try again later.',
      captchaSiteKey
    }));
  }
  let emailSent = false;
  let emailError = '';
  try {
    if (process.env.RESEND_API_KEY) {
      const { Resend } = require('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'Grilly Cheese <grillycheese@grillycheese.net>',
        to: 'grillycheese@grillycheese.net',
        subject: `[Submit Truck] ${truckName || 'New Truck'}`,
        text: `Truck: ${truckName}\nOwner: ${ownerName}\nEmail: ${email}\nPhone: ${phone}\nCuisine: ${cuisine}\nArea: ${area}\nWebsite: ${website}\nInstagram: ${instagram}\n\n${description}`,
      });
      emailSent = true;
      console.log('Validated truck submission email sent');
    } else {
      emailError = 'Email service not configured (RESEND_API_KEY missing)';
      console.warn(emailError);
    }
  } catch (e) {
    emailError = e.message;
    console.error('Email send error:', e.message);
  }
  res.send(submitPage({ success: true, emailSent, emailError, captchaSiteKey }));
});

// ── Sitemap ───────────────────────────────────────────────────────────────────
app.get('/sitemap.xml', (req, res) => {
  const latestTruckReview = latestRecordDate(trucks, 'last_verified');
  const latestPostUpdate = latestRecordDate(posts.map(post => ({ date: postModifiedDate(post) })), 'date');
  const pages = [
    { url: '/', priority: '1.0', freq: 'weekly', lastmod: STATIC_SITEMAP_LASTMOD['/'] },
    { url: '/food-trucks-in-south-jersey', priority: '0.95', freq: 'weekly', lastmod: STATIC_SITEMAP_LASTMOD['/food-trucks-in-south-jersey'] },
    { url: '/directory', priority: '0.9', freq: 'weekly', lastmod: STATIC_SITEMAP_LASTMOD['/directory'] },
    { url: '/blog', priority: '0.8', freq: 'weekly', lastmod: latestPostUpdate },
    { url: '/about', priority: '0.6', freq: 'monthly', lastmod: STATIC_SITEMAP_LASTMOD['/about'] },
    { url: '/directory-snapshot', priority: '0.75', freq: 'weekly', lastmod: latestTruckReview },
    { url: '/food-truck-map', priority: '0.75', freq: 'weekly', lastmod: latestTruckReview },
    { url: '/food-truck-events', priority: '0.8', freq: 'weekly', lastmod: latestPostUpdate },
    { url: '/food-truck-event-checklist', priority: '0.8', freq: 'monthly', lastmod: STATIC_SITEMAP_LASTMOD['/food-truck-event-checklist'] },
    { url: '/food-truck-comparisons', priority: '0.75', freq: 'weekly', lastmod: latestPostUpdate },
    { url: '/faq', priority: '0.7', freq: 'monthly', lastmod: STATIC_SITEMAP_LASTMOD['/faq'] },
    { url: '/contact', priority: '0.5', freq: 'monthly', lastmod: STATIC_SITEMAP_LASTMOD['/contact'] },
    { url: '/submit-truck', priority: '0.5', freq: 'monthly', lastmod: STATIC_SITEMAP_LASTMOD['/submit-truck'] },
    { url: '/privacy', priority: '0.3', freq: 'yearly', lastmod: STATIC_SITEMAP_LASTMOD['/privacy'] },
    { url: '/terms', priority: '0.3', freq: 'yearly', lastmod: STATIC_SITEMAP_LASTMOD['/terms'] },
    ...trucks.filter(t => t.slug).map(t => ({ url: `/trucks/${t.slug}`, priority: '0.7', freq: 'monthly', lastmod: t.last_verified, image: hasVerifiedTruckImage(t) ? t.image_url : null })),
    ...posts.map(p => ({ url: `/blog/${p.slug}`, priority: '0.7', freq: 'monthly', lastmod: postModifiedDate(p), image: p.cover_image_url })),
    ...Object.entries(COUNTY_SLUGS).map(([s, county]) => ({
      url: `/${s}-food-trucks`,
      priority: '0.8',
      freq: 'weekly',
      lastmod: latestRecordDate(trucks.filter(t => t.area === county), 'last_verified') || latestTruckReview
    })),
    ...Object.entries(ALL_CUISINE_SLUGS).map(([s, cuisine]) => ({
      url: `/south-jersey-${s}-food-trucks`,
      priority: '0.7',
      freq: 'weekly',
      lastmod: latestRecordDate(trucks.filter(t => t.cuisine === cuisine), 'last_verified') || latestTruckReview
    })),
    ...COUNTY_CUISINE_COMBOS.map(({ ctySlug, county, cSlug, cuisine }) => ({
      url: `/${ctySlug}-${cSlug}-food-trucks`,
      priority: '0.65',
      freq: 'weekly',
      lastmod: latestRecordDate(trucks.filter(t => t.area === county && t.cuisine === cuisine), 'last_verified') || latestTruckReview
    })),
    ...CITY_PAGE_TARGETS.map(({ slug, city, county }) => ({
      url: `/food-trucks-in-${slug}`,
      priority: '0.7',
      freq: 'weekly',
      lastmod: latestRecordDate(trucks.filter(t => t.city === city && t.area === county), 'last_verified') || latestTruckReview
    })),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${pages.map(p => `  <url>
    <loc>${xmlEscape(`${DOMAIN}${p.url}`)}</loc>
    ${p.lastmod && Number.isFinite(new Date(p.lastmod).getTime()) ? `<lastmod>${new Date(p.lastmod).toISOString().slice(0, 10)}</lastmod>` : ''}
    <changefreq>${p.freq}</changefreq>
    <priority>${p.priority}</priority>
    ${p.image ? `<image:image><image:loc>${xmlEscape(p.image.startsWith('http') ? p.image : `${DOMAIN}${p.image}`)}</image:loc></image:image>` : ''}
  </url>`).join('\n')}
</urlset>`;
  res.type('application/xml').send(xml);
});

// ── Blog RSS feed ──────────────────────────────────────────────────────────────
app.get('/blog.xml', (req, res) => {
  const items = posts
    .slice()
    .sort((a, b) => new Date(b.published_at) - new Date(a.published_at))
    .map(post => `    <item>
      <title>${xmlEscape(post.title)}</title>
      <link>${DOMAIN}/blog/${xmlEscape(post.slug)}</link>
      <guid isPermaLink="true">${DOMAIN}/blog/${xmlEscape(post.slug)}</guid>
      <description>${xmlEscape(post.excerpt || post.seo_description)}</description>
      <pubDate>${new Date(post.published_at).toUTCString()}</pubDate>
    </item>`)
    .join('\n');
  const latest = posts
    .map(post => new Date(postModifiedDate(post)))
    .sort((a, b) => b - a)[0];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>South Jersey Food Truck Blog</title>
    <link>${DOMAIN}/blog</link>
    <atom:link href="${DOMAIN}/blog.xml" rel="self" type="application/rss+xml" />
    <description>Guides, event planning resources, and local food truck content for South Jersey.</description>
    <language>en-US</language>
    ${latest ? `<lastBuildDate>${latest.toUTCString()}</lastBuildDate>` : ''}
${items}
  </channel>
</rss>`;
  if (latest && !Number.isNaN(latest.getTime())) res.set('Last-Modified', latest.toUTCString());
  res.set('Cache-Control', 'public, max-age=0, must-revalidate');
  res.type('application/rss+xml').send(xml);
});

// robots.txt has one source of truth in public/robots.txt, served above.

// An optional reading guide, not an indexing directive or ranking guarantee.
app.get('/llms.txt', (req, res) => {
  const link = (name, url, description) => `- [${name}](${DOMAIN}${url}): ${description}`;
  res.type('text/plain').set('Cache-Control', 'public, max-age=0, must-revalidate').send([
    '# South Jersey Food Truck',
    '',
    '> A directory and event-planning guide for South Jersey food trucks, including nearby operators. Listings are not live schedules or confirmed booking offers.',
    '',
    '## Start here',
    link('Directory', '/directory', `${trucks.length} operator profiles with county and cuisine filters.`),
    link('South Jersey guide', '/food-trucks-in-south-jersey', 'Browse counties, cities, cuisines, and nearby operators.'),
    link('Articles', '/blog', `${posts.length} published guides. Use each article’s displayed publication and review dates.`),
    link('Frequently asked questions', '/faq', 'General directory and event-planning answers.'),
    link('Event checklist', '/food-truck-event-checklist', 'Questions to confirm with operators and venues.'),
    '',
    '## Sources and limitations',
    link('About and editorial policy', '/about#editorial-policy', 'How directory information, sponsorship, sources, and corrections are handled.'),
    link('Directory snapshot', '/directory-snapshot', 'Recorded listing counts and review dates, not real-time operating status.'),
    link('Contact', '/contact', 'Site inquiries; this is not a universal booking confirmation service.'),
    '',
    'Cite the relevant canonical truck profile or article, not assistant-generated answers. Distinguish operator home base from service area. Confirm current locations, hours, menus, prices, availability, permits, and accessibility directly with operators and authorities. A recorded active check is not a license, insurance certification, endorsement, or guarantee.',
    '',
    '## Discovery',
    link('Sitemap', '/sitemap.xml', 'Canonical public page inventory.'),
    link('RSS feed', '/blog.xml', 'Published article updates.'),
    ''
  ].join('\n'));
});

// ── Static pages ──────────────────────────────────────────────────────────────
app.get('/privacy', (req, res) => {
  const layout = require('./html/layout');
  res.send(layout({
    title: 'Privacy Policy — South Jersey Food Truck',
    desc: 'Privacy policy for South Jersey Food Truck.',
    canonical: '/privacy',
    content: `<div class="contact-page"><h1>Privacy Policy</h1><p style="color:var(--muted);margin-bottom:1.5rem;">Last updated: October 2026</p><p>South Jersey Food Truck does not sell your personal information. Contact form submissions are used solely to respond to your inquiry.</p><p style="margin-top:1rem;">When configured, the site assistant sends your question and a short recent chat history to the configured AI service to generate an answer. The site does not save chat transcripts. Do not include personal or private information in assistant messages.</p><p style="margin-top:1rem;">Public forms use an encrypted, expiring math challenge, submission timing, and standard server security logs to prevent automated abuse and support troubleshooting.</p></div>`
  }));
});

app.get('/terms', (req, res) => {
  const layout = require('./html/layout');
  res.send(layout({
    title: 'Terms of Use — South Jersey Food Truck',
    desc: 'Terms of use for South Jersey Food Truck.',
    canonical: '/terms',
    content: `<div class="contact-page"><h1>Terms of Use</h1><p style="color:var(--muted);margin-bottom:1.5rem;">Last updated: May 2026</p><p>By using this site, you agree to use it for lawful purposes only. Directory listings are provided for informational purposes. We make no guarantees about truck availability, pricing, or hours — always confirm directly with the operator.</p></div>`
  }));
});

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  sendNotFound(res);
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`South Jersey Food Truck running on port ${PORT}`);
});
