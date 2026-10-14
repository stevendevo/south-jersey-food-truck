'use strict';
const layout = require('./layout');
const { esc } = require('../utils');

const CHECKLIST_TITLE = 'Food Truck Event Planner Checklist';
const CHECKLIST_INTRO = 'Use this printable checklist to plan your date, compare trucks, confirm the contract, and keep event-day logistics on track.';
const PLANNING_NOTE = 'Use this as a conversation starter, not a substitute for the operator’s contract or local requirements. Confirm current permit, health, fire-safety, accessibility, weather, and recycling rules with the venue and municipality responsible for your event.';
const FINISH_TITLE = 'Ready to start?';
const FINISH_COPY = 'Browse local operators first, then send the date, guest count, location, and budget in your quote request so the right trucks can respond.';
const TOP_CTA_LINKS = Object.freeze([
  { label: 'Request a quote', href: '/contact' },
  { label: 'Browse trucks', href: '/directory' }
]);
const FINISH_CTA_LINKS = Object.freeze([
  { label: 'Find a food truck', href: '/directory' },
  { label: 'Tell us about your event', href: '/contact' }
]);

const SECTIONS = [
  {
    number: '01',
    title: 'Define your event',
    intro: 'Get the basics together before you start contacting trucks.',
    items: [
      'Choose the event date, service window, and backup date if needed.',
      'Estimate the guest count, including children, vendors, and staff.',
      'Set a realistic food budget and decide whether guests will pay individually.',
      'Confirm the venue address, access rules, and whether outside vendors are allowed.',
      'Decide whether you need a full meal, snacks, dessert, drinks, or more than one truck.'
    ]
  },
  {
    number: '02',
    title: 'Find and compare trucks',
    intro: 'Build a short list that fits your guests, location, and event style.',
    items: [
      'Browse the South Jersey directory by county and cuisine.',
      'Shortlist two or three trucks with menus that fit your crowd.',
      'Confirm each operator serves private events and your event location.',
      'Ask about availability, service capacity, and the operator’s comfortable guest maximum.',
      'Review menus and note vegetarian, vegan, allergy-friendly, and children’s options.'
    ]
  },
  {
    number: '03',
    title: 'Questions to ask before booking',
    intro: 'Get clear answers before you pay a deposit.',
    items: [
      'What is the minimum guarantee or per-person price?',
      'What does the quote include: food, staffing, travel, setup, breakdown, and gratuity?',
      'How long will service run, and how many guests can the truck serve in that window?',
      'Do you carry liability insurance, and can you provide a certificate if the venue needs one?',
      'What are the parking, space, power, water, and waste requirements?',
      'What deposit, cancellation, weather, and rescheduling terms apply?'
    ]
  },
  {
    number: '04',
    title: 'Put the agreement in writing',
    intro: 'Keep the final terms together in a signed contract or written confirmation.',
    items: [
      'Record the event date, arrival time, service window, venue, and on-site contact.',
      'Record the final headcount, menu, minimum guarantee, and total estimate.',
      'Confirm the deposit, payment schedule, taxes, gratuity, travel fees, and any add-ons.',
      'Assign responsibility for permits, insurance documents, venue approvals, and utility access.',
      'Write down cancellation, severe-weather, postponement, and refund terms.',
      'Save the operator’s contact information and the final signed documents.'
    ]
  },
  {
    number: '05',
    title: 'Prepare for event day',
    intro: 'A little coordination keeps the truck, venue, and guests moving smoothly.',
    items: [
      'Send the final headcount and menu confirmation to the operator.',
      'Share a parking map, arrival instructions, and a point-of-contact phone number.',
      'Confirm the truck has enough flat, accessible space and any agreed power connection.',
      'Plan shelter, lighting, guest lines, tables, seating, and weather contingencies.',
      'Confirm permit, health, fire-safety, accessibility, and recycling requirements with the venue and local authorities.',
      'Have someone available to meet the truck, coordinate setup, and handle final payment.'
    ]
  }
];

function checklistSection(section, sectionIndex) {
  return `<section class="checklist-section">
  <div class="checklist-section-heading">
    <span class="checklist-number">${esc(section.number)}</span>
    <div>
      <h2>${esc(section.title)}</h2>
      <p>${esc(section.intro)}</p>
    </div>
  </div>
  <ul class="checklist-items">
    ${section.items.map((item, itemIndex) => {
      const id = `checklist-${sectionIndex + 1}-${itemIndex + 1}`;
      return `<li><input type="checkbox" id="${id}" /><label for="${id}">${esc(item)}</label></li>`;
    }).join('\n    ')}
  </ul>
</section>`;
}

const PDF = Object.freeze({
  width: 612,
  height: 792,
  margin: 48,
  bottom: 48,
  navy: '#173f35',
  orange: '#d8480f',
  text: '#24312d',
  muted: '#63716b',
  border: '#e4ddd2',
  warm: '#fff7ed'
});

function pdfSafeText(value) {
  return String(value == null ? '' : value)
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/[^\x20-\x7e]/g, '');
}

function pdfEscape(value) {
  return pdfSafeText(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function pdfColor(hex) {
  const value = hex.replace('#', '');
  return [0, 2, 4].map(index => (parseInt(value.slice(index, index + 2), 16) / 255).toFixed(3)).join(' ');
}

function wrapPdfText(value, fontSize, maxWidth) {
  const words = pdfSafeText(value).split(/\s+/).filter(Boolean);
  const maxCharacters = Math.max(1, Math.floor(maxWidth / (fontSize * 0.49)));
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && candidate.length > maxCharacters) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function createChecklistPdf() {
  const pages = [];
  let page;
  let y;

  function newPage() {
    page = { commands: [], links: [] };
    pages.push(page);
    y = PDF.margin;
  }

  function text(value, x, top, size, color = PDF.text, font = 'F1') {
    const baseline = PDF.height - top - size;
    page.commands.push(`BT /${font} ${size} Tf ${pdfColor(color)} rg 1 0 0 1 ${x.toFixed(2)} ${baseline.toFixed(2)} Tm (${pdfEscape(value)}) Tj ET`);
  }

  function line(x1, top, x2, color = PDF.border, width = 1) {
    const yPosition = PDF.height - top;
    page.commands.push(`${pdfColor(color)} RG ${width} w ${x1.toFixed(2)} ${yPosition.toFixed(2)} m ${x2.toFixed(2)} ${yPosition.toFixed(2)} l S`);
  }

  function rect(x, top, width, height, fill, stroke = null, strokeWidth = 1) {
    const bottom = PDF.height - top - height;
    if (fill) page.commands.push(`${pdfColor(fill)} rg ${x.toFixed(2)} ${bottom.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re f`);
    if (stroke) page.commands.push(`${pdfColor(stroke)} RG ${strokeWidth} w ${x.toFixed(2)} ${bottom.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re S`);
  }

  function addLink(url, x, top, width, height) {
    page.links.push({ url, x, top, width, height });
  }

  function linkText(item, x, top, size, color = PDF.orange) {
    text(item.label, x, top, size, color, 'F2');
    addLink(`https://southjerseyfoodtruck.com${item.href}`, x, top - 2, item.label.length * size * 0.52, size + 5);
  }

  function footer() {
    line(PDF.margin, PDF.height - 31, PDF.width - PDF.margin, PDF.border);
    text('South Jersey Food Truck  |  southjerseyfoodtruck.com/food-truck-event-checklist', PDF.margin, PDF.height - 25, 7, PDF.muted);
    text(`${pages.length}`, PDF.width - PDF.margin - 8, PDF.height - 25, 7, PDF.muted);
  }

  function sectionMetrics(section) {
    const contentWidth = PDF.width - (PDF.margin * 2) - 56;
    const introLines = wrapPdfText(section.intro, 9, contentWidth);
    const itemLines = section.items.map(item => wrapPdfText(item, 9, contentWidth));
    const itemsHeight = itemLines.reduce((total, lines) => total + (lines.length * 13) + 8, 0);
    return {
      introLines,
      itemLines,
      height: 36 + (introLines.length * 13) + 12 + itemsHeight + 14
    };
  }

  function renderSection(section) {
    const metrics = sectionMetrics(section);
    const sectionWidth = PDF.width - (PDF.margin * 2);
    if (y + metrics.height > PDF.height - PDF.bottom) {
      footer();
      newPage();
    }

    const top = y;
    rect(PDF.margin, top, sectionWidth, metrics.height, '#ffffff', PDF.border);
    text(section.number, PDF.margin + 16, top + 16, 8, PDF.orange, 'F2');
    text(section.title, PDF.margin + 55, top + 14, 13, PDF.navy, 'F2');
    metrics.introLines.forEach((introLine, index) => {
      text(introLine, PDF.margin + 55, top + 33 + (index * 13), 9, PDF.muted);
    });

    let itemTop = top + 38 + (metrics.introLines.length * 13) + 12;
    metrics.itemLines.forEach(lines => {
      rect(PDF.margin + 17, itemTop + 1, 10, 10, '#ffffff', PDF.orange, 1.2);
      lines.forEach((itemLine, index) => {
        text(itemLine, PDF.margin + 36, itemTop + (index * 13), 9, PDF.text);
      });
      itemTop += (lines.length * 13) + 8;
    });
    y = top + metrics.height + 14;
  }

  newPage();
  rect(0, 0, PDF.width, 108, PDF.navy);
  text('SOUTH JERSEY FOOD TRUCK', PDF.margin, 22, 9, '#f6b44b', 'F2');
  text(CHECKLIST_TITLE, PDF.margin, 43, 22, '#ffffff', 'F2');
  wrapPdfText(CHECKLIST_INTRO, 10, PDF.width - (PDF.margin * 2)).forEach((introLine, index) => {
    text(introLine, PDF.margin, 77 + (index * 13), 10, '#ffffff');
  });
  y = 130;

  const noteLines = wrapPdfText(PLANNING_NOTE, 9, PDF.width - (PDF.margin * 2) - 30);
  const noteHeight = 27 + (noteLines.length * 13);
  rect(PDF.margin, y, PDF.width - (PDF.margin * 2), noteHeight, PDF.warm);
  rect(PDF.margin, y, 4, noteHeight, PDF.orange);
  text('PLANNING NOTE', PDF.margin + 16, y + 11, 8, PDF.orange, 'F2');
  noteLines.forEach((noteLine, index) => {
    text(noteLine, PDF.margin + 16, y + 25 + (index * 13), 9, PDF.text);
  });
  y += noteHeight + 18;

  SECTIONS.forEach(renderSection);

  const finishWidth = PDF.width - (PDF.margin * 2);
  const finishCopyLines = wrapPdfText(FINISH_COPY, 9, finishWidth - 34);
  const finishHeight = 46 + (finishCopyLines.length * 13) + 39;
  if (y + finishHeight > PDF.height - PDF.bottom) {
    footer();
    newPage();
  }
  rect(PDF.margin, y, finishWidth, finishHeight, PDF.navy);
  text(FINISH_TITLE, PDF.margin + 17, y + 15, 15, '#ffffff', 'F2');
  finishCopyLines.forEach((copyLine, index) => {
    text(copyLine, PDF.margin + 17, y + 37 + (index * 13), 9, '#ffffff');
  });

  const ctaTop = y + 46 + (finishCopyLines.length * 13);
  linkText(TOP_CTA_LINKS[1], PDF.margin + 17, ctaTop, 9, '#f6b44b');
  text('Source: South Jersey directory', PDF.margin + 17, ctaTop + 14, 7, '#ffffff');
  linkText(TOP_CTA_LINKS[0], PDF.margin + 310, ctaTop, 9, '#f6b44b');
  text('Booking: request an event quote', PDF.margin + 310, ctaTop + 14, 7, '#ffffff');
  y += finishHeight + 14;
  footer();

  const objects = [];
  const addObject = value => {
    objects.push(value);
    return objects.length;
  };
  const pagesRef = addObject('');
  const fontRef = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const boldFontRef = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const pageRefs = [];

  for (const documentPage of pages) {
    const content = `${documentPage.commands.join('\n')}\n`;
    const contentRef = addObject(`<< /Length ${Buffer.byteLength(content, 'ascii')} >>\nstream\n${content}endstream`);
    const annotationRefs = documentPage.links.map(link => addObject(`<< /Type /Annot /Subtype /Link /Rect [${link.x.toFixed(2)} ${ (PDF.height - link.top - link.height).toFixed(2)} ${(link.x + link.width).toFixed(2)} ${(PDF.height - link.top).toFixed(2)}] /Border [0 0 0] /A << /S /URI /URI (${pdfEscape(link.url)}) >> >>`));
    const annots = annotationRefs.length ? ` /Annots [${annotationRefs.map(ref => `${ref} 0 R`).join(' ')}]` : '';
    pageRefs.push(addObject(`<< /Type /Page /Parent ${pagesRef} 0 R /MediaBox [0 0 ${PDF.width} ${PDF.height}] /Resources << /Font << /F1 ${fontRef} 0 R /F2 ${boldFontRef} 0 R >> >> /Contents ${contentRef} 0 R${annots} >>`));
  }

  objects[pagesRef - 1] = `<< /Type /Pages /Kids [${pageRefs.map(ref => `${ref} 0 R`).join(' ')}] /Count ${pageRefs.length} >>`;
  const catalogRef = addObject(`<< /Type /Catalog /Pages ${pagesRef} 0 R >>`);
  const header = Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', 'binary');
  const chunks = [header];
  const offsets = [0];
  let byteOffset = header.length;
  objects.forEach((object, index) => {
    const objectBuffer = Buffer.from(`${index + 1} 0 obj\n${object}\nendobj\n`, 'ascii');
    offsets.push(byteOffset);
    chunks.push(objectBuffer);
    byteOffset += objectBuffer.length;
  });
  const xrefOffset = byteOffset;
  const xref = [`xref`, `0 ${objects.length + 1}`, `0000000000 65535 f `];
  offsets.slice(1).forEach(offset => xref.push(`${String(offset).padStart(10, '0')} 00000 n `));
  xref.push(`trailer`, `<< /Size ${objects.length + 1} /Root ${catalogRef} 0 R >>`, `startxref`, `${xrefOffset}`, `%%EOF`);
  chunks.push(Buffer.from(`${xref.join('\n')}\n`, 'ascii'));
  return Buffer.concat(chunks);
}

module.exports = function checklistPage() {
  const entityId = 'https://southjerseyfoodtruck.com/food-truck-event-checklist#checklist';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    '@id': entityId,
    name: CHECKLIST_TITLE,
    description: 'A printable checklist for planning, booking, contracting, and coordinating a food truck event in South Jersey.',
    totalTime: 'PT30M',
    step: SECTIONS.map(section => ({
      '@type': 'HowToSection',
      name: section.title,
      itemListElement: section.items.map((item, index) => ({
        '@type': 'HowToStep',
        position: index + 1,
        name: item
      }))
    }))
  };

  const content = `
<div class="checklist-page">
  <div class="checklist-hero">
    <span class="section-label">Free planning tool</span>
    <h1>${esc(CHECKLIST_TITLE)}</h1>
    <p>${esc(CHECKLIST_INTRO)}</p>
    <div class="checklist-actions">
      <button type="button" class="btn btn-primary" onclick="window.print()">Print this checklist</button>
      <a href="/food-truck-event-checklist.pdf" class="btn btn-outline checklist-pdf-link" download="south-jersey-food-truck-event-checklist.pdf">Download PDF</a>
      <button type="button" class="btn btn-outline checklist-reset" id="resetChecklist">Reset checklist</button>
      ${TOP_CTA_LINKS.map(link => `<a href="${esc(link.href)}" class="btn btn-outline">${esc(link.label)}</a>`).join('\n      ')}
    </div>
    <div class="checklist-progress-row">
      <p class="checklist-progress" id="checklistProgress" aria-live="polite">0 of ${SECTIONS.reduce((total, section) => total + section.items.length, 0)} items complete</p>
      <p class="checklist-save-status" id="checklistSaveStatus">Progress saves on this device only.</p>
    </div>
  </div>

  <div class="checklist-note">
    <strong>Planning note:</strong> ${esc(PLANNING_NOTE)}
  </div>

  ${SECTIONS.map(checklistSection).join('\n')}

  <div class="checklist-finish">
    <h2>${esc(FINISH_TITLE)}</h2>
    <p>${esc(FINISH_COPY)}</p>
    ${FINISH_CTA_LINKS.map((link, index) => `<a href="${esc(link.href)}" class="btn ${index === 0 ? 'btn-primary' : 'btn-outline'}">${esc(link.label)}</a>`).join('\n    ')}
  </div>
</div>`;

  return layout({
    title: 'Food Truck Event Planner Checklist — South Jersey',
    desc: 'Print or share this South Jersey food truck event planner checklist covering budgets, truck selection, questions, contracts, and day-of logistics.',
    canonical: '/food-truck-event-checklist',
    mainEntity: entityId,
    about: { '@type': 'Thing', name: 'Food truck event planning checklist' },
    jsonLd,
    content
  });
};

module.exports.createPdf = createChecklistPdf;