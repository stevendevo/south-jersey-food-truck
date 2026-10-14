'use strict';
const layout = require('./layout');
const { esc } = require('../utils');

const FAQS = [
  { q: 'How do I rent a food truck in South Jersey?', a: 'Browse our directory to find trucks that match your cuisine and location. Click any truck to see their contact details, then reach out directly by phone, email, or their website. For larger events, use our Quote Request feature — fill in your event date, headcount, and location and we\'ll connect you with available trucks.' },
  { q: 'How far in advance should I rent a food truck?', a: 'For weekends and summer events, aim to rent 8–12 weeks in advance. Popular trucks fill their calendars quickly between May and September. For weekday corporate lunches or smaller gatherings, 3–4 weeks is usually enough. If your date is less than two weeks out, contact us and we\'ll do our best to find an available truck.' },
  { q: 'How much does it cost to hire a food truck in South Jersey?', a: 'Pricing depends on the truck, event size, and duration. Most trucks charge a minimum (typically $500–$1,500) and then bill per guest or per hour beyond that. High-end catering trucks or specialty options like lobster and sushi may run higher. Street-style trucks at festivals or markets often have no hire fee and earn revenue from individual sales.' },
  { q: 'What areas of South Jersey do food trucks serve?', a: 'Our directory covers all seven South Jersey counties: Camden, Burlington, Gloucester, Atlantic, Cape May, Cumberland, and Salem. Most trucks will travel within a 30–60 mile radius of their home base. If your event is outside South Jersey, many trucks will still travel for the right event — ask about travel fees when you reach out.' },
  { q: 'Do food trucks cater private events like weddings and parties?', a: 'Yes — private event catering is one of the fastest-growing parts of the South Jersey truck scene. Trucks regularly cater weddings, graduation parties, birthday celebrations, baby showers, and block parties. Many offer customized menus, tasting options, and staffed service.' },
  { q: 'Can I hire a food truck for a corporate event?', a: 'Absolutely. Food trucks are popular for employee appreciation days, product launches, office lunches, and trade shows. They\'re self-contained — no rental kitchen needed — and they create a memorable experience that a traditional caterer can\'t match.' },
  { q: 'How many people can a food truck serve?', a: 'Most trucks can comfortably serve 150–300 guests over a standard 2-3 hour window. High-volume trucks set up for festivals can handle more. For events over 200 guests, some operators recommend adding a second truck to keep wait times short.' },
  { q: 'Do food trucks require a deposit?', a: 'Most trucks ask for a deposit of 25–50% to hold your date, with the balance due on the event day. Some use a signed contract in lieu of or in addition to a deposit. Always confirm cancellation and refund policies before you pay — policies vary significantly between operators.' },
  { q: 'What cuisines are available in South Jersey?', a: 'South Jersey\'s truck scene covers an impressive range: BBQ, tacos, cheesesteaks, pizza, burgers, lobster rolls, Korean-fusion, Vietnamese, Indian, Mediterranean, sushi burritos, vegan comfort food, gourmet grilled cheese, empanadas, and much more.' },
  { q: 'Do food trucks need a permit to operate at my event?', a: 'In most South Jersey municipalities, food trucks need a temporary food vendor permit or a health department inspection approval to operate at private events. Requirements vary by county and township. A reputable truck will handle their own permits — ask them to confirm they have everything in order for your location when you book.' },
  { q: 'How do I submit my food truck to the directory?', a: 'Use our Submit Your Truck page. Fill in your truck\'s name, contact info, cuisine type, and service area and we\'ll review your listing within a few business days. The basic listing is free.' },
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
      <button class="faq-question" aria-expanded="false">
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
