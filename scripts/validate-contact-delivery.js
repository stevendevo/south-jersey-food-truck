'use strict';

const assert = require('node:assert/strict');
const { deliverEventInquiry } = require('../event-inquiry-delivery');
const contactPage = require('../html/contact');

const inquiry = {
  name: 'Taylor Guest',
  email: 'taylor@example.com',
  phone: '(856) 555-0101',
  eventDate: '2027-06-19',
  eventTime: '16:30',
  zipCode: '08033',
  payer: 'Event Host',
  budget: '$1,000',
  message: 'Outdoor graduation party'
};

async function validateUnavailableMailRoute() {
  const baseUrl = process.env.DIRECTORY_URL;
  if (!baseUrl || process.env.RESEND_API_KEY) return;

  const formResponse = await fetch(`${baseUrl}/contact`);
  assert.equal(formResponse.status, 200, 'contact form should be available before the test submission');
  const formHtml = await formResponse.text();
  const token = formHtml.match(/name="_captcha_token" value="([^"]+)"/)?.[1];
  const question = formHtml.match(/Spam check: What is (\d+) \+ (\d+)\?/);
  assert.ok(token, 'contact form should render a one-time math challenge');
  assert.ok(question, 'contact form should render a parseable math challenge for validation');

  await new Promise(resolve => setTimeout(resolve, 2600));
  const values = new URLSearchParams({
    eventDate: inquiry.eventDate,
    eventTime: inquiry.eventTime,
    zipCode: inquiry.zipCode,
    payer: inquiry.payer,
    budget: inquiry.budget,
    name: inquiry.name,
    phone: inquiry.phone,
    email: inquiry.email,
    message: inquiry.message,
    _captcha_token: token,
    captcha_answer: String(Number(question[1]) + Number(question[2]))
  });
  const response = await fetch(`${baseUrl}/contact`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      origin: baseUrl
    },
    body: values.toString()
  });
  const responseHtml = await response.text();

  assert.equal(response.status, 503, 'missing mail configuration should return a service-unavailable response');
  assert.match(responseHtml, /email delivery is not configured/i, 'the visitor should see a clear configuration error');
  assert.match(responseHtml, /value="Taylor Guest"/, 'the error response should retain the submitted name');
  assert.match(responseHtml, /Outdoor graduation party/, 'the error response should retain the submitted details');
  assert.doesNotMatch(responseHtml, /We received your event inquiry/, 'the error response must not claim success');
  assert.doesNotMatch(responseHtml, /validation-only@example\.invalid/i, 'the private delivery address must not appear in the public page');
}

async function main() {
  let sentMessage;
  const accepted = await deliverEventInquiry({
    recipient: 'events@example.com',
    inquiry,
    sendEmail: async message => {
      sentMessage = message;
      return { data: { id: 'mock-email-id' }, error: null };
    }
  });
  assert.equal(accepted.ok, true, 'provider acceptance should allow confirmation');
  assert.equal(sentMessage.to, 'events@example.com', 'inquiry should reach the approved destination');
  assert.match(sentMessage.text, /Outdoor graduation party/, 'inquiry details should be included in the message');

  const rejected = await deliverEventInquiry({
    recipient: 'events@example.com',
    inquiry,
    sendEmail: async () => ({ data: null, error: { message: 'provider rejected request' } })
  });
  assert.equal(rejected.ok, false, 'a provider error must not be treated as successful delivery');
  assert.equal(rejected.reason, 'provider_rejected');

  const thrown = await deliverEventInquiry({
    recipient: 'events@example.com',
    inquiry,
    sendEmail: async () => { throw new Error('network unavailable'); }
  });
  assert.equal(thrown.ok, false, 'a provider exception must not be treated as successful delivery');
  assert.equal(thrown.reason, 'provider_error');

  const unconfirmed = await deliverEventInquiry({
    recipient: 'events@example.com',
    inquiry,
    sendEmail: async () => ({ data: null, error: null })
  });
  assert.equal(unconfirmed.ok, false, 'a provider response without a message ID must remain unconfirmed');
  assert.equal(unconfirmed.reason, 'provider_unconfirmed');

  const missingMail = await deliverEventInquiry({ recipient: 'events@example.com', inquiry, sendEmail: null });
  assert.equal(missingMail.ok, false, 'missing mail configuration must fail explicitly');
  assert.equal(missingMail.reason, 'mail_not_configured');

  const missingRecipient = await deliverEventInquiry({
    recipient: '',
    inquiry,
    sendEmail: async () => ({ data: { id: 'unexpected' }, error: null })
  });
  assert.equal(missingRecipient.ok, false, 'missing recipient configuration must fail explicitly');
  assert.equal(missingRecipient.reason, 'recipient_not_configured');

  const failedPage = contactPage({
    formError: 'We could not confirm that your inquiry was sent. Your entries are still in this form; please try again.',
    values: inquiry
  });
  assert.match(failedPage, /role="alert"/, 'delivery failure should be announced accessibly');
  assert.match(failedPage, /value="Taylor Guest"/, 'failed submissions should retain entered values');
  assert.match(failedPage, /Outdoor graduation party/, 'failed submissions should retain the inquiry message');
  assert.doesNotMatch(failedPage, /We received your event inquiry/, 'failure UI must not claim the inquiry was received');

  const successPage = contactPage({ success: true });
  assert.match(successPage, /We received your event inquiry/, 'success UI should confirm an accepted delivery');
  assert.match(successPage, /role="status"/, 'successful delivery confirmation should be announced accessibly');

  await validateUnavailableMailRoute();

  console.log('Contact delivery validation passed: accepted, rejected, thrown, unconfirmed, missing configuration, retry-state retention, and honest confirmation cases.');
}

main().catch(error => {
  console.error(`Contact delivery validation failed: ${error.message}`);
  process.exitCode = 1;
});
