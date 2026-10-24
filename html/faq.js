'use strict';
const layout = require('./layout');
const { esc } = require('../utils');

const FAQS = [
  { q: 'How do I rent a food truck in South Jersey?', a: 'Browse the directory by cuisine and county, then open a profile for the operator links held in its record. Confirm your date, venue, menu, and service needs directly. The event-inquiry form is presented by Grilly Cheese; it does not send your request to every listed operator or confirm a booking.' },
  { q: 'How far in advance should I rent a food truck?', a: 'Contact operators when you have a date, venue, estimated headcount, and service window. Booking lead times vary by operator, season, and event type. Ask for written confirmation of availability before making plans around a particular truck.' },
  { q: 'How much does it cost to hire a food truck in South Jersey?', a: 'There is no directory-wide price. Request an event-specific quote covering the menu, guest count, service window, minimum spend, travel, taxes, gratuity, deposit, and cancellation terms. The listed price symbols are not binding catering quotes.' },
  { q: 'What areas of South Jersey do food trucks serve?', a: 'County pages cover Camden, Burlington, Gloucester, Atlantic, Cape May, Cumberland, and Salem. The directory also includes records based elsewhere. A recorded home base is not a service radius: ask the operator whether they can travel to your venue and whether travel charges apply.' },
  { q: 'Do food trucks cater private events like weddings and parties?', a: 'Some operators accept private-event bookings. Ask each operator about your event type, menu, guest count, service window, setup, and availability. A directory listing does not establish that a truck offers every type of catering.' },
  { q: 'Can I hire a food truck for a corporate event?', a: 'Ask operators about corporate lunches, employee events, or trade-show service. Share the site rules, parking and access details, service window, guest count, payment method, and any power or water available so the operator can confirm requirements.' },
  { q: 'How many people can a food truck serve?', a: 'Capacity depends on the menu, staffing, equipment, ordering method, and length of service. Share your guest count and serving window, and ask the operator how many meals they can serve in that period and whether additional vendors are needed.' },
  { q: 'Do food trucks require a deposit?', a: 'Deposit amounts and booking contracts vary. Ask what holds your date, when the balance is due, and how cancellation, refunds, weather, and rescheduling are handled. Review the written terms before paying.' },
  { q: 'What cuisines are available in South Jersey?', a: 'South Jersey\'s truck scene covers an impressive range: BBQ, tacos, cheesesteaks, pizza, burgers, lobster rolls, Korean-fusion, Vietnamese, Indian, Mediterranean, sushi burritos, vegan comfort food, gourmet grilled cheese, empanadas, and much more.' },
  { q: 'Do food trucks need a permit to operate at my event?', a: 'Requirements depend on the event location, venue, food operation, and local authorities. Contact the municipality and local health or fire authority responsible for your site. Ask the operator and venue which approvals and insurance documents are needed; a directory check is not proof of permit or inspection status.' },
  { q: 'How do I submit my food truck to the directory?', a: 'Use the Submit Your Truck page with your business name, official contact links, cuisine, home base, and service details. Submissions are reviewed before publication. The basic listing is free.' },
  { q: 'Is it free to list a food truck on this site?', a: 'Yes — the basic directory listing is free for all South Jersey food truck operators. Submit your truck using the form and we\'ll get your listing live as quickly as possible.' },
];

module.exports = function faqPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a }
    }))
  };

  const content = `
<div class="faq-page">
  <span class="section-label">FAQs</span>
  <h1>Frequently Asked Questions</h1>
  <p>Everything you need to know about finding, booking, and hiring food trucks across South Jersey.</p>

  <div class="faq-list">
    ${FAQS.map(f => `<div class="faq-item">
      <button class="faq-question" aria-expanded="true">
        <span>${esc(f.q)}</span>
        <svg class="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <div class="faq-answer">${esc(f.a)}</div>
    </div>`).join('\n    ')}
  </div>

  <div class="faq-cta">
    <h3>Still have questions?</h3>
    <p>Reach out directly — we&rsquo;re happy to help you find the right truck for your event.</p>
    <a href="/contact" class="btn btn-primary">Contact Us</a>
  </div>
</div>`;

  return layout({
    title: 'FAQ — Hiring & Booking Food Trucks in South Jersey',
    desc: 'Answers to the most common questions about booking, hiring, and renting food trucks in South Jersey for weddings, parties, corporate events, and more.',
    canonical: '/faq',
    jsonLd,
    content
  });
};
