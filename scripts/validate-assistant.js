'use strict';

const fs = require('fs');
const path = require('path');
const trucks = require('../data/trucks.json');
const posts = require('../data/posts.json');
const layout = require('../html/layout');
const contactPage = require('../html/contact');
const submitPage = require('../html/submit');
const verifyRequestPage = require('../html/verify-request');
const reportUpdatePage = require('../html/report-update');
const { createMathChallenge, verifyMathChallengeToken } = require('../html/captcha');
const { createAssistantService } = require('../assistant');
const { looksAutomated } = require('../form-protection');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const service = createAssistantService({ trucks, posts });
const tacoSources = service.selectSources('Which taco trucks are listed in Camden County?').selected;
const tacoUrls = tacoSources.map(source => source.url);
assert(tacoUrls.includes('/trucks/dos-hermanos-tacos'), 'assistant retrieval should directly cite Dos Hermanos Tacos');
assert(tacoUrls.includes('/trucks/taco-angeleno'), 'assistant retrieval should directly cite Taco Angeleno');
assert(!tacoUrls.includes('/trucks/revolution-taco'), 'county-specific retrieval should not cite an out-of-county truck');
const sushiSources = service.selectSources('Which sushi trucks are listed in Camden County?').selected;
assert(!sushiSources.some(source => source.type === 'truck'), 'nonexistent county/cuisine matches should not cite unrelated trucks');
const followUpSources = service.selectSources('What is their phone number?', [
  { role: 'user', content: 'Tell me about Grilly Cheese.' },
  { role: 'assistant', content: 'Grilly Cheese is a grilled cheese truck listed on this site.' }
]);
assert(followUpSources.wantsContact, 'a follow-up phone question should allow public contact details');
assert(followUpSources.selected.some(source => source.url === '/trucks/grilly-cheese'), 'follow-up retrieval should use recent chat context');
assert(followUpSources.context.startsWith('[SOURCE: Grilly Cheese'), 'history-resolved truck should be prioritized in the final context');
assert(followUpSources.context.includes('Phone:'), 'explicit contact follow-up should retain the requested contact field in context');

const scheduleSelection = service.selectSources('Where is a truck operating tonight?');
assert(!scheduleSelection.wantsContact, 'schedule questions should not automatically expose public contact details');
const contactSelection = service.selectSources('How can I contact Grilly Cheese?');
assert(contactSelection.wantsContact, 'explicit contact questions should allow public contact details');
assert(contactSelection.context.includes('Website:'), 'explicit contact questions should include available public contact context');

assert(looksAutomated(['/**/AND/**/(1452560072=1452560072)']), 'SQL injection probe should be rejected');
assert(looksAutomated(['UNION ALL SELECT NULL,NULL']), 'UNION SELECT probe should be rejected');
assert(!looksAutomated(['Planning a graduation event for 100 guests']), 'normal event details should not be rejected');

const sampleTruck = trucks.find(truck => truck.slug === 'grilly-cheese');
const pages = [
  ['contact', contactPage({})],
  ['submit_truck', submitPage({})],
  ['verify_listing', verifyRequestPage({ truck: sampleTruck })],
  ['report_update', reportUpdatePage({ truck: sampleTruck })]
];
for (const [action, html] of pages) {
  assert(html.includes('Spam check: What is'), `${action} page should render a math challenge`);
  assert(html.includes('name="_captcha_token"'), `${action} page should include a signed challenge token`);
  assert(html.includes('name="captcha_answer"'), `${action} page should require a challenge answer`);
  assert(html.includes('name="_company_url"'), `${action} page should include the honeypot`);
}

const challenge = createMathChallenge('contact');
const challengeParts = challenge.question.match(/(\d+) \+ (\d+)/);
const challengeAnswer = String(Number(challengeParts[1]) + Number(challengeParts[2]));
assert(verifyMathChallengeToken(challenge.token, 'contact', challengeAnswer).ok, 'correct math answer should verify');
assert(!verifyMathChallengeToken(challenge.token, 'contact', '99').ok, 'incorrect math answer should fail');
assert(!verifyMathChallengeToken(challenge.token, 'submit_truck', challengeAnswer).ok, 'challenge should be bound to one form');
const encryptedTokenParts = challenge.token.split('.');
assert(encryptedTokenParts.length === 3, 'challenge token should use encrypted payload and authentication-tag segments');
assert(!encryptedTokenParts.some(part => Buffer.from(part, 'base64url').toString('utf8').includes('"answer":')), 'challenge token should not contain a readable answer field');

const shell = layout({ title: 'Test', desc: 'Test', content: '<p>Test</p>' });
assert(shell.includes('id="assistantLauncher"'), 'shared layout should include the assistant launcher');
assert(shell.includes('id="assistantPanel"'), 'shared layout should include the assistant panel');
assert(shell.includes('data-nosnippet'), 'assistant shell should be excluded from search snippets');

const browserScript = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');
assert(browserScript.includes("fetch('/api/assistant'"), 'browser widget should call the assistant endpoint');
assert(browserScript.includes('copy.textContent = text'), 'assistant answers should be rendered as text, not raw HTML');

console.log(`Assistant and form-protection validation passed: ${sourcesSummary(tacoSources)}, 4 protected forms.`);

function sourcesSummary(sources) {
  return `${sources.length} grounded sources including direct truck profiles`;
}