'use strict';
const layout = require('./layout');
const { esc } = require('../utils');

module.exports = function comparisonsPage({ trucks = [], posts = [] } = {}) {
  const postBySlug = new Map(posts.map(post => [post.slug, post]));
  const traditionalPost = postBySlug.get('food-truck-catering-vs-traditional-catering');
  const numberPost = postBySlug.get('how-many-food-trucks-for-an-event-south-jersey');
  const entityId = 'https://southjerseyfoodtruck.com/food-truck-comparisons#comparison-guide';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': entityId,
    name: 'South Jersey Food Truck Comparisons',
    description: 'Practical comparisons for choosing food truck catering, traditional catering, and the right number of trucks for a South Jersey event.',
    url: 'https://southjerseyfoodtruck.com/food-truck-comparisons',
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: [traditionalPost, numberPost].filter(Boolean).map((post, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `https://southjerseyfoodtruck.com/blog/${post.slug}`,
        name: post.title
      }))
    }
  };

  const comparisonRows = [
    ['Guest experience', 'A visible, social food service with guests ordering from a truck', 'A more traditional seated or buffet-style service'],
    ['Menu flexibility', 'Choose one or more operators by cuisine and event fit', 'Usually plan through one caterer’s menu and service model'],
    ['Event flow', 'Plan for ordering windows, lines, parking, power, and service timing', 'Plan for buffet or plated-service timing, staffing, and tables'],
    ['Space and logistics', 'Confirm truck access, setup area, permits, utilities, and travel radius', 'Confirm kitchen access, staging, tables, serving equipment, and staffing'],
    ['Cost questions', 'Ask about minimums, travel fees, service fees, guest counts, and menu choices', 'Ask about per-person pricing, staffing, rentals, service fees, and minimums']
  ];

  const content = `
<div class="container" style="padding-top:3rem;padding-bottom:5rem;">
  <span class="section-label">Make the Call</span>
  <h1>South Jersey Food Truck Comparisons</h1>
  <p style="max-width:760px;line-height:1.8;"><strong>The right catering choice depends on your guest experience, menu goals, venue logistics, and budget questions.</strong> Use this guide to compare food trucks with traditional catering and decide whether one truck or multiple trucks makes sense for your event. The directory currently includes ${trucks.length} listed operators across seven counties.</p>

  <h2>Food truck catering vs. traditional catering</h2>
  <div style="overflow-x:auto;">
    <table style="width:100%;border-collapse:collapse;margin:1rem 0 1.5rem;">
      <thead><tr><th style="text-align:left;padding:0.8rem;border-bottom:2px solid var(--border);">Planning factor</th><th style="text-align:left;padding:0.8rem;border-bottom:2px solid var(--border);">Food truck catering</th><th style="text-align:left;padding:0.8rem;border-bottom:2px solid var(--border);">Traditional catering</th></tr></thead>
      <tbody>${comparisonRows.map(row => `<tr>${row.map(cell => `<td style="padding:0.8rem;border-bottom:1px solid var(--border);vertical-align:top;">${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>
  </div>
  <p style="color:var(--muted);">Neither option is automatically better. Ask each provider for a written quote that explains menu scope, staffing, travel, setup, service timing, taxes, fees, and cancellation terms.</p>
  ${traditionalPost ? `<p><a href="/blog/${esc(traditionalPost.slug)}" style="color:var(--primary);">Read the full food truck vs. traditional catering guide &rarr;</a></p>` : ''}

  <h2>Should you book one truck or multiple trucks?</h2>
  <p>Start with the guest count, service window, menu complexity, and whether guests need choices. Multiple trucks can add variety, but they also require more coordination around parking, arrival times, power, permits, lines, and communication. Confirm the recommended service plan directly with the operators.</p>
  ${numberPost ? `<p><a href="/blog/${esc(numberPost.slug)}" style="color:var(--primary);">Read the South Jersey guest-count planning guide &rarr;</a></p>` : ''}

  <h2>Questions to ask before choosing</h2>
  <ol style="line-height:1.9;padding-left:1.25rem;">
    <li>What service style will work best for the venue and guest flow?</li>
    <li>How much space, access, parking, power, and setup time does the operator need?</li>
    <li>Are menu, dietary, allergy, and beverage needs covered?</li>
    <li>What is included in the quote, and which fees or minimums are separate?</li>
    <li>Who is the day-of contact if the schedule or weather changes?</li>
  </ol>

  <p style="margin-top:2rem;"><a href="/directory" class="btn btn-primary">Compare local trucks</a> <a href="/food-truck-events" class="btn btn-outline">Browse event guides</a></p>
</div>`;

  return layout({
    title: 'Food Truck Catering Comparisons for South Jersey Events',
    desc: 'Compare food truck catering with traditional catering and learn how to think about one truck versus multiple trucks for a South Jersey event.',
    canonical: '/food-truck-comparisons',
    mainEntity: entityId,
    about: { '@type': 'Thing', name: 'Food truck event planning comparisons' },
    jsonLd,
    content
  });
};