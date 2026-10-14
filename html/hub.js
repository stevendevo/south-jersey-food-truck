'use strict';
const layout = require('./layout');
const { esc, renderTruckImage } = require('../utils');

const COUNTY_DATA = [
  {
    slug: 'camden-county',
    name: 'Camden County',
    desc: 'The most active food truck county in South Jersey. Collingswood\'s year-round Saturday farmers market runs six to eight trucks weekly, and Cherry Hill\'s commercial corridors host rotating lunch circuits five days a week. Haddonfield, Voorhees, and Moorestown add weekend foot traffic and private event demand that keeps trucks busy from spring through late fall. Camden County is where to look for cheesesteaks, wood-fired pizza, artisan tacos, and gourmet grilled cheese.'
  },
  {
    slug: 'burlington-county',
    name: 'Burlington County',
    desc: 'Burlington County\'s truck scene runs deep through Moorestown, Medford, and Mount Holly farmers markets and a strong outdoor events calendar. BBQ, mini donuts, Neapolitan pizza, and American comfort food dominate a county that has embraced the truck format for everything from corporate lunches to backyard weddings. The Moorestown and Medford market circuits are anchor stops for the region\'s best operators.'
  },
  {
    slug: 'gloucester-county',
    name: 'Gloucester County',
    desc: 'Gloucester County\'s truck culture is anchored by Rowan University\'s presence in Glassboro and a lively community events calendar in Woodbury, Deptford, and Washington Township. The county punches above its weight in culinary diversity — hot dog trucks, Korean-Jersey fusion, specialty coffee, and fusion BBQ-taco concepts all have dedicated followings here.'
  },
  {
    slug: 'atlantic-county',
    name: 'Atlantic County',
    desc: 'Atlantic County\'s hospitality infrastructure — built around Atlantic City\'s hotel, casino, and convention industry — has produced professional food truck operators who know how to feed large crowds. Galloway, Egg Harbor Township, and the Atlantic City boardwalk corridor support smash burgers, empanadas, specialty cupcakes, seafood, and more. Summer festival season here is one of the most active in South Jersey.'
  },
  {
    slug: 'cape-may-county',
    name: 'Cape May County',
    desc: 'The shore food truck capital of South Jersey. From the Wildwood boardwalk to Stone Harbor farmers markets and the Victorian resort blocks of Cape May City, mobile kitchens run Memorial Day through Labor Day serving one of the highest-traffic tourism regions on the East Coast. Asian BBQ, Thai-Mexican fusion, dumplings, lobster, and shore-style tacos define a scene that runs at full speed all summer long.'
  },
  {
    slug: 'cumberland-county',
    name: 'Cumberland County',
    desc: 'Cumberland County\'s truck scene reflects the county\'s agricultural character and cultural diversity. Millville, Vineland, and Bridgeton host Indian curries, award-winning cupcakes, gourmet catering, and BBQ built around local farms and produce. The county\'s trucks are known for generous portions, honest prices, and accommodating diverse dietary needs — making them strong choices for multicultural community events.'
  },
  {
    slug: 'salem-county',
    name: 'Salem County',
    desc: 'Salem County is South Jersey\'s most rural county and its food truck scene reflects that in the best way — farm-to-truck sourcing, community-rooted events, and operators who build genuine local relationships. Penns Grove, Salem City, and Woodstown see rotating truck appearances at community events and local markets, with operators drawing on the county\'s agricultural base for ingredients.'
  },
];

module.exports = function hubPage({ trucks, cuisines, countyCuisineCombos = [], cityPages = [] }) {
  const total = trucks.length;
  const featured = trucks.filter(t => t.featured).slice(0, 4);
  const countyNames = new Set(COUNTY_DATA.map(c => c.name));
  const outsideRegion = trucks.filter(t => !countyNames.has(t.area));
  const countyTotal = total - outsideRegion.length;

  const faqs = [
    {
      q: 'How do I find food trucks in South Jersey near me?',
      a: 'Use the directory and filter by county to narrow results to your area. Each listing includes the truck\'s home base city and the county it primarily serves. Most trucks will travel 30–60 miles for private events, so a Burlington County truck may well serve your Camden County event.'
    },
    {
      q: 'How far in advance should I hire a food truck in South Jersey?',
      a: 'For weddings and weekend summer events, aim for 12–16 weeks in advance — the best trucks fill their calendars quickly between May and September. For weekday corporate lunches or off-season gatherings, 4–6 weeks is usually enough. Always confirm availability early for holiday weekends.'
    },
    {
      q: 'What does it cost to hire a food truck in South Jersey?',
      a: 'Most food trucks in South Jersey charge a guaranteed minimum — typically $500–$1,500 depending on the truck and event type — then bill per guest or per hour beyond that. High-end catering trucks or specialty options like lobster may run higher. Many trucks offer all-inclusive flat rates for private events; ask directly for a custom quote.'
    },
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'LocalBusiness',
        '@id': 'https://southjerseyfoodtruck.com/#organization',
        name: 'South Jersey Food Truck',
        url: 'https://southjerseyfoodtruck.com',
        description: `South Jersey's largest food truck directory — find and hire ${total}+ food trucks across Camden, Burlington, Gloucester, Atlantic, Cape May, Cumberland, and Salem counties.`,
        areaServed: [
          { '@type': 'AdministrativeArea', name: 'Camden County, NJ' },
          { '@type': 'AdministrativeArea', name: 'Burlington County, NJ' },
          { '@type': 'AdministrativeArea', name: 'Gloucester County, NJ' },
          { '@type': 'AdministrativeArea', name: 'Atlantic County, NJ' },
          { '@type': 'AdministrativeArea', name: 'Cape May County, NJ' },
          { '@type': 'AdministrativeArea', name: 'Cumberland County, NJ' },
          { '@type': 'AdministrativeArea', name: 'Salem County, NJ' }
        ],
        address: {
          '@type': 'PostalAddress',
          addressRegion: 'NJ',
          addressCountry: 'US'
        }
      },
      {
        '@type': 'WebPage',
        '@id': 'https://southjerseyfoodtruck.com/food-trucks-in-south-jersey#guide',
        name: 'Food Trucks in South Jersey — The Complete Guide',
        url: 'https://southjerseyfoodtruck.com/food-trucks-in-south-jersey',
        description: `The complete guide to food trucks in South Jersey: all 7 counties, top cuisines, how to hire or rent a truck, and a directory of ${total}+ operators.`,
        breadcrumb: {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://southjerseyfoodtruck.com' },
            { '@type': 'ListItem', position: 2, name: 'Food Trucks in South Jersey', item: 'https://southjerseyfoodtruck.com/food-trucks-in-south-jersey' }
          ]
        }
      },
      ...(featured.length > 0 ? [{
        '@type': 'ItemList',
        name: 'Featured Food Trucks in South Jersey',
        description: 'A selection of standout South Jersey food trucks available for private events and catering.',
        numberOfItems: featured.length,
        itemListElement: featured.map((t, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          item: {
            '@type': 'FoodEstablishment',
            name: t.name,
            url: `https://southjerseyfoodtruck.com/trucks/${t.slug}`,
            servesCuisine: t.cuisine,
            address: {
              '@type': 'PostalAddress',
              addressLocality: t.city,
              addressRegion: 'NJ',
              addressCountry: 'US'
            }
          }
        }))
      }] : []),
      {
        '@type': 'FAQPage',
        mainEntity: faqs.map(f => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a }
        }))
      }
    ]
  };

  const content = `
<div class="hub-page">

<div class="hub-hero" style="background:var(--primary);color:#fff;padding:3.5rem 0 2.5rem;">
  <div class="container" style="max-width:860px;">
    <nav class="breadcrumb" aria-label="Breadcrumb" style="color:rgba(255,255,255,0.75);margin-bottom:1rem;">
      <a href="/" style="color:rgba(255,255,255,0.85);">Home</a><span style="margin:0 0.5rem;">/</span>
      <span>Food Trucks in South Jersey</span>
    </nav>
    <h1 style="color:#fff;margin-bottom:0.75rem;">Food Trucks in South Jersey</h1>
    <p style="font-size:1.15rem;opacity:0.92;max-width:680px;line-height:1.7;">The complete guide to finding, booking, and hiring food trucks across all seven South Jersey counties. Browse ${total}+ operators serving Camden, Burlington, Gloucester, Atlantic, Cape May, Cumberland, and Salem.</p>
    <div style="margin-top:1.5rem;display:flex;gap:1rem;flex-wrap:wrap;">
      <a href="/directory" class="btn btn-white">Browse the Directory &rarr;</a>
      <a href="/contact" class="btn btn-outline" style="border-color:rgba(255,255,255,0.6);color:#fff;">Hire a Truck</a>
    </div>
     <nav class="hub-quick-nav" aria-label="Jump to a guide section">
       <a href="#browse-by-county" class="btn btn-outline">Browse by County</a>
       <a href="#browse-by-city" class="btn btn-outline">Browse by City</a>
       <a href="#browse-by-cuisine" class="btn btn-outline">Browse by Cuisine</a>
       <a href="#how-to-hire" class="btn btn-outline">How to Hire</a>
     </nav>
  </div>
</div>

<nav class="hub-section-nav" aria-label="Guide section navigation">
  <div class="container">
    <span class="hub-section-nav-label">Browse this guide</span>
    <div class="hub-section-nav-links">
      <a href="#browse-by-county">County</a>
       <a href="#browse-by-city">City</a>
      <a href="#browse-by-cuisine">Cuisine</a>
      <a href="#how-to-hire">Hiring</a>
    </div>
  </div>
</nav>

<div class="container" style="max-width:860px;padding-top:3rem;padding-bottom:1rem;">

  <section style="margin-bottom:3rem;">
    <h2>What Are South Jersey Food Trucks?</h2>
    <p style="line-height:1.8;color:var(--text);margin-bottom:1rem;">Food trucks in South Jersey are professional, fully licensed mobile food operations that serve at farmers markets, festivals, corporate events, private parties, and street locations across the seven-county region. Unlike traditional restaurants, they move where demand is — which means the best operators appear at a farmers market in Collingswood on Saturday morning, a corporate park in Cherry Hill for lunch on Tuesday, and a wedding in Cape May on Saturday evening.</p>
    <p style="line-height:1.8;color:var(--text);margin-bottom:1rem;">South Jersey's food truck scene has matured significantly over the past decade. What began as a category dominated by hot dog carts and cheesesteak trucks has expanded into a diverse market of artisan operators — certified Neapolitan pizza, authentic al pastor carved off a trompo, Texas-style BBQ smoked 14 hours on a 1,000-gallon offset smoker, fresh Maine lobster rolls, and gourmet desserts baked fresh every morning. The standard has risen dramatically, and the best food trucks in South Jersey compete seriously with fixed-location restaurants.</p>
    <p style="line-height:1.8;color:var(--text);">The region's proximity to Philadelphia, its agricultural base in Cumberland and Salem counties, its tourism corridor in Cape May County, and its dense suburban population in Camden and Burlington counties together create a market that supports operators at every price point and cuisine category.</p>
  </section>

   <section id="browse-by-county" class="hub-anchor-section" style="margin-bottom:3rem;">
    <h2>Food Trucks by County</h2>
    <p style="line-height:1.8;color:var(--muted);margin-bottom:2rem;">South Jersey is defined by its seven counties, each with its own food truck culture, event calendar, and community character. Here's what to know about each.</p>
    <p class="hub-count-summary">The overall directory total of ${total} operator${total !== 1 ? 's' : ''} includes ${countyTotal} listed in these seven counties and ${outsideRegion.length} listed outside them. County counts below include only listings assigned to the named county, not every truck that may travel there.${outsideRegion.length ? ' <a href="#outside-region">Browse operators based outside the region &darr;</a>' : ''}</p>
    <div style="display:flex;flex-direction:column;gap:2rem;">
      ${COUNTY_DATA.map(c => {
        const countyCount = trucks.filter(t => t.area === c.name).length;
        return `<div style="border-left:3px solid var(--primary);padding-left:1.25rem;">
        <h3 style="margin-bottom:0.5rem;"><a href="/${esc(c.slug)}-food-trucks">${esc(c.name)} Food Trucks <span style="font-size:0.85em;color:var(--muted);font-weight:400;">(${countyCount} truck${countyCount !== 1 ? 's' : ''})</span></a></h3>
        <p style="line-height:1.8;color:var(--text);margin-bottom:0.5rem;">${esc(c.desc)}</p>
        <a href="/${esc(c.slug)}-food-trucks" style="color:var(--primary);font-weight:600;font-size:0.95rem;">Browse ${countyCount} ${esc(c.name)} food trucks &rarr;</a>
      </div>`;
      }).join('\n      ')}
    </div>
  </section>

  ${outsideRegion.length ? `<section id="outside-region" class="hub-anchor-section hub-outside-region" aria-labelledby="outside-region-title">
    <h2 id="outside-region-title">Operators Based Outside the Seven Counties</h2>
    <p>These ${outsideRegion.length} directory listings are included in the overall total, but not in the seven county counts above. They include operators elsewhere in New Jersey and beyond. Check each profile and confirm South Jersey travel availability, event coverage, and any travel fees directly with the operator.</p>
    <ul class="hub-outside-list">
      ${outsideRegion.map(t => `<li><a href="/trucks/${esc(t.slug)}">${esc(t.name)}</a><span>Base: ${esc([t.city, t.area].filter(Boolean).join(' — ') || 'Not listed')}</span></li>`).join('\n      ')}
    </ul>
  </section>` : ''}

   ${cityPages.length ? `<section id="browse-by-city" class="hub-anchor-section" style="margin-bottom:3rem;">
     <h2>Food Trucks by City</h2>
     <p style="line-height:1.8;color:var(--muted);margin-bottom:1.25rem;">These city pages include only South Jersey communities with at least two current directory listings, so each view gives planners a useful local comparison rather than a thin single-listing page.</p>
     <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:0.75rem;">
       ${cityPages.map(({ city, county, slug, trucks: cityTrucks }) => `<a href="/food-trucks-in-${esc(slug)}" style="display:flex;justify-content:space-between;gap:0.75rem;padding:0.8rem 1rem;border:1.5px solid var(--border);border-radius:8px;background:#fff;color:var(--text);text-decoration:none;">
         <span><strong>${esc(city)}</strong><small style="display:block;color:var(--muted);margin-top:0.2rem;">${esc(county.replace(' County', ''))}</small></span>
         <span style="color:var(--primary);font-size:0.82rem;white-space:nowrap;">${cityTrucks.length} trucks &rarr;</span>
       </a>`).join('\n      ')}
     </div>
   </section>` : ''}

   <section id="browse-by-cuisine" class="hub-anchor-section" style="margin-bottom:3rem;">
    <h2>Browse by Cuisine</h2>
    <p style="line-height:1.8;color:var(--muted);margin-bottom:1.25rem;">South Jersey food trucks cover a wide range of cuisines — from Texas-style BBQ and authentic tacos to wood-fired pizza, fresh seafood, and gourmet desserts. Browse every category below.</p>
    <div style="margin-bottom:1.25rem;">
      <input id="cuisine-search" type="search" placeholder="Search cuisines…" autocomplete="off" aria-label="Filter cuisines"
        style="width:100%;max-width:360px;padding:0.6rem 1rem;font-size:0.95rem;border:1.5px solid var(--border);border-radius:8px;outline:none;color:var(--text);background:#fff;box-sizing:border-box;"
        onfocus="this.style.borderColor='var(--primary)'" onblur="this.style.borderColor='var(--border)'" />
    </div>
    <p id="cuisine-results" aria-live="polite" aria-atomic="true" style="color:var(--muted);font-size:0.875rem;margin:0 0 1rem;">${Object.keys(cuisines).length} cuisine categories available.</p>
    <div id="cuisine-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:0.875rem;">
      ${(() => {
        const bySlug = {};
        const cuisineCounts = new Map();
        for (const truck of trucks) {
          if (truck.cuisine) {
            cuisineCounts.set(truck.cuisine, (cuisineCounts.get(truck.cuisine) || 0) + 1);
          }
        }
        for (const { cSlug, ctySlug, county } of countyCuisineCombos) {
          if (!bySlug[cSlug]) bySlug[cSlug] = [];
          bySlug[cSlug].push({ ctySlug, county });
        }
        return Object.entries(cuisines).sort((a, b) => a[1].localeCompare(b[1])).map(([slug, label]) => {
          const counties = bySlug[slug] || [];
          const cuisineCount = cuisineCounts.get(label) || 0;
          const countyLinks = counties.length > 0
            ? `<div style="margin-top:0.5rem;display:flex;flex-wrap:wrap;gap:0.3rem;">${counties.map(({ ctySlug, county }) => {
                const shortName = county.replace(' County', '');
                const countyCount = trucks.filter(t => t.cuisine === label && t.area === county).length;
                return `<a href="/${esc(ctySlug)}-${esc(slug)}-food-trucks" style="font-size:0.75rem;color:var(--primary);text-decoration:none;background:rgba(var(--primary-rgb,220,53,69),0.07);padding:0.15rem 0.45rem;border-radius:4px;white-space:nowrap;" onmouseover="this.style.background='rgba(var(--primary-rgb,220,53,69),0.15)'" onmouseout="this.style.background='rgba(var(--primary-rgb,220,53,69),0.07)'">${esc(shortName)}${countyCount > 1 ? ` <span style="opacity:0.65;">(${countyCount})</span>` : ''}</a>`;
              }).join('')}</div>`
            : '';
          return `<div class="cuisine-card" data-cuisine="${esc(label.toLowerCase())}" style="padding:0.75rem 1rem;border:1.5px solid var(--border);border-radius:8px;background:#fff;">
            <a href="/south-jersey-${esc(slug)}-food-trucks" style="display:flex;align-items:center;gap:0.6rem;color:var(--text);font-weight:600;font-size:0.9rem;text-decoration:none;">
              <span style="width:8px;height:8px;border-radius:50%;background:var(--primary);flex-shrink:0;"></span>
              ${esc(label)}
              <span style="margin-left:auto;padding:0.15rem 0.45rem;border-radius:999px;background:rgba(var(--primary-rgb,220,53,69),0.1);color:var(--primary);font-size:0.72rem;font-weight:700;white-space:nowrap;">${cuisineCount} truck${cuisineCount !== 1 ? 's' : ''}</span>
            </a>
            ${countyLinks}
          </div>`;
        }).join('\n      ');
      })()}
    </div>
    <p id="cuisine-empty" style="display:none;color:var(--muted);font-size:0.95rem;margin-top:1rem;">No cuisines match your search. <button onclick="document.getElementById('cuisine-search').value='';document.getElementById('cuisine-search').dispatchEvent(new Event('input'));" style="background:none;border:none;color:var(--primary);cursor:pointer;font-size:0.95rem;padding:0;text-decoration:underline;">Clear search</button></p>
    <script>
      (function() {
        var input = document.getElementById('cuisine-search');
        var grid = document.getElementById('cuisine-grid');
        var empty = document.getElementById('cuisine-empty');
        var summary = document.getElementById('cuisine-results');
        if (!input || !grid) return;
        var cards = grid.querySelectorAll('.cuisine-card');

        function updateSummary(visible, query) {
          if (!summary) return;
          if (!query) {
            summary.textContent = visible + ' cuisine categor' + (visible === 1 ? 'y' : 'ies') + ' available.';
          } else {
            summary.textContent = visible + ' cuisine categor' + (visible === 1 ? 'y' : 'ies') + ' match your search.';
          }
        }

        updateSummary(cards.length, '');
        input.addEventListener('input', function() {
          var q = this.value.trim().toLowerCase();
          var visible = 0;
          cards.forEach(function(card) {
            var name = card.getAttribute('data-cuisine') || '';
            var show = !q || name.indexOf(q) !== -1;
            card.style.display = show ? '' : 'none';
            if (show) visible++;
          });
          empty.style.display = visible === 0 ? '' : 'none';
          updateSummary(visible, q);
        });
      })();
    </script>
  </section>

   <section id="how-to-hire" class="hub-anchor-section" style="margin-bottom:3rem;">
    <h2>How to Hire or Rent a Food Truck in South Jersey</h2>
    <p style="line-height:1.8;color:var(--text);margin-bottom:1rem;">Hiring a food truck in South Jersey is more straightforward than most people expect. Here's the process:</p>
    <ol style="line-height:1.9;color:var(--text);padding-left:1.5rem;margin-bottom:1rem;">
      <li style="margin-bottom:0.75rem;"><strong>Browse by county or cuisine.</strong> Use the <a href="/directory">directory</a> to find trucks that operate in your area and serve the style of food you want. Filter by county to see operators near you.</li>
      <li style="margin-bottom:0.75rem;"><strong>Check the listing for contact details.</strong> Each truck listing includes phone numbers, websites, and Instagram handles. Most operators prefer Instagram DMs or contact forms on their own websites for event inquiries.</li>
      <li style="margin-bottom:0.75rem;"><strong>Reach out with event specifics.</strong> When you contact a truck, include your event date, location, expected guest count, and time window. This lets operators respond with accurate availability and pricing.</li>
      <li style="margin-bottom:0.75rem;"><strong>Get a written quote.</strong> Reputable food trucks in South Jersey will provide a written quote covering the minimum guarantee, per-guest rate (if applicable), travel fee, and cancellation policy. Review this before committing.</li>
      <li><strong>Confirm and deposit early.</strong> For peak-season dates (May through September weekends), the best trucks can book 12–16 weeks out. A deposit, typically 25–50% of the total, holds your date.</li>
    </ol>
    <p style="line-height:1.8;color:var(--text);">Not sure which truck is right for your event? <a href="/contact">Use the contact form</a> and describe your event — we'll help match you with available operators.</p>
  </section>

  ${featured.length > 0 ? `<section style="margin-bottom:3rem;">
    <h2>Featured Food Trucks</h2>
    <p style="line-height:1.8;color:var(--muted);margin-bottom:1.5rem;">A few of South Jersey's standout operators available for private events and catering.</p>
    <div class="truck-grid" style="margin-top:1rem;">
      ${featured.map(t => `<a href="/trucks/${esc(t.slug)}" class="truck-card">
        <div class="truck-card-img-wrap">
          ${renderTruckImage(t, { context: 'food truck' })}
        </div>
        <div class="truck-card-body">
          <div class="truck-card-badges">
            <span class="badge badge-cuisine">${esc(t.cuisine)}</span>
            <span class="badge badge-county">${esc(t.area)}</span>
          </div>
          <div class="truck-card-name">${esc(t.name)}</div>
          <p class="truck-card-desc">${esc(t.short_description)}</p>
          <div class="truck-card-footer"><span class="truck-card-city">&#128205; ${esc(t.city)}</span><span class="truck-card-arrow">&#8594;</span></div>
        </div>
      </a>`).join('\n      ')}
    </div>
    <div style="text-align:center;margin-top:2rem;">
      <a href="/directory" class="btn btn-primary">See all ${total} food trucks &rarr;</a>
    </div>
  </section>` : ''}

  <section style="margin-bottom:3rem;">
    <h2>Frequently Asked Questions</h2>
    <div class="faq-list" style="margin-top:1.5rem;">
      ${faqs.map(f => `<div class="faq-item">
        <button class="faq-question" aria-expanded="false">
          <span>${esc(f.q)}</span>
          <svg class="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <div class="faq-answer">${esc(f.a)}</div>
      </div>`).join('\n      ')}
    </div>
  </section>

  <div class="cta-band" style="margin:0 -1rem 2rem;border-radius:12px;">
    <div style="padding:2.5rem 2rem;text-align:center;">
      <h2 style="color:#fff;">Ready to Book a Food Truck?</h2>
      <p style="color:rgba(255,255,255,0.9);margin-bottom:1.5rem;">Browse ${total}+ food trucks in South Jersey or tell us about your event.</p>
      <div class="cta-actions">
        <a href="/directory" class="btn btn-white">Browse the Directory</a>
        <a href="/contact" class="btn btn-outline" style="border-color:rgba(255,255,255,0.6);color:#fff;">Get in Touch</a>
      </div>
    </div>
  </div>

</div>
</div>`;

  return layout({
    title: 'Food Trucks in South Jersey — Complete Guide to All 7 Counties',
    desc: `The complete guide to food trucks in South Jersey. Browse ${total}+ operators across Camden, Burlington, Gloucester, Atlantic, Cape May, Cumberland, and Salem counties. Find, hire, and rent food trucks for any event.`,
    canonical: '/food-trucks-in-south-jersey',
    mainEntity: 'https://southjerseyfoodtruck.com/food-trucks-in-south-jersey#guide',
    about: { '@type': 'Place', name: 'South Jersey, New Jersey' },
    breadcrumb: [
      { name: 'Home', url: '/' },
      { name: 'Food Trucks in South Jersey', url: '/food-trucks-in-south-jersey' }
    ],
    jsonLd,
    content
  });
};
