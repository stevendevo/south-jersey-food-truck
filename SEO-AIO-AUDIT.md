# SEO and AI search audit — October 24, 2026

The repository audit and implementation are complete. All 11 validation groups
pass against the local application. This is evidence about the code and rendered
site, not confirmation of a production deployment, search-engine index coverage,
rankings, rich-result eligibility, or AI citations.

## Scope and baseline

- Crawled all **206 sitemap pages**, including **53 truck profiles** and
  **40 published articles**, checking HTTP status, canonical URLs, metadata,
  indexing directives, H1 headings, and structured data.
- Existing pages already had unique titles/descriptions, one H1, server-rendered
  content, and parseable JSON-LD. Existing directory checks also exercise county,
  city, cuisine, and cross-county navigation.
- Inspected robots, sitemap, RSS, redirects, filters, operational routes, image
  delivery, entity relationships, source citations, sponsorship, author attribution,
  answer visibility, and the on-site assistant's grounding instructions.
- Tested representative mobile/desktop/no-JavaScript behavior in Chromium.

## Findings and implemented changes

| Priority | Finding | Implementation |
| --- | --- | --- |
| High | The publisher was described as both Organization and LocalBusiness with the same ID, without a public business address. | Use one consistent Organization identity; remove unsupported LocalBusiness declarations and connect page, website, breadcrumb, and main entities. Truck operators remain distinct FoodEstablishment entities. |
| High | Directory ItemList declared 53 records but serialized only 20. Lists could also incorrectly assign NJ to a Pennsylvania operator. | Serialize every visible listing, use stable profile entity IDs, and preserve recorded state/home-base geography across listing templates. |
| High | Admin, health, listing-maintenance, and submission responses lacked consistent indexing/cache controls. | Add noindex headers, private/no-store caching, and no-referrer on operational responses. Add template noindex for admin and listing-maintenance pages. Keep maintenance pages crawlable so crawlers can see noindex. |
| High | Static robots.txt shadowed the Express route and contained a bare RSS URL. | Make public/robots.txt the single source; keep public content crawlable, exclude admin/API/health paths, and publish valid sitemap/feed references. |
| High | Claims of verification, universal contact availability, licensing, pricing, schedules, and service radius exceeded available evidence. | Use recorded-check language, disclose missing contacts and evidence limits, expose all recorded operator contact links, qualify directory coverage, and replace unsupported universal claims with operator-confirmation guidance. |
| High | Large article PNGs increased delivery cost; one truck image used insecure HTTP. | Generate and serve 28 WebP derivatives with real dimensions; keep originals. Exclude insecure images from display and truck-image schema. Hero images receive fetch priority, while cards remain lazy loaded. |
| Medium | JSON-LD serialization could terminate a script element when stored text contained a closing script sequence. | Escape script-sensitive characters and escape metadata attribute URLs; add adversarial regression coverage. |
| Medium | Case/trailing-slash variants could serve duplicate URLs. Filter results were indexable even though their canonical is the unfiltered directory. | Permanently normalize known page paths, safely normalize repeated trailing slashes, preserve tracking queries, and noindex directory filter/search variants while retaining their clean canonical. Existing retired-profile redirects remain tested. |
| Medium | Snapshot freshness could be confused with record verification; article review dates differed across representations. | Remove request-time dateModified from snapshot schema, distinguish retrieval from record checks, and align article modification/review dates with sitemap/feed dates. Do not invent editorial updates. |
| Medium | Author and source signals were incomplete or overstated. | Identify Editorial Team with the publisher Organization, retain named bylines without invented biographies/credentials, add recorded external article URLs as citations, and publish visible editorial, sponsor, inquiry-routing, and correction policies. |
| Medium | FAQ answers required JavaScript, and expanded state remained false when open. | Render answers visibly by default; progressively enhance with synchronized hidden state, aria-expanded, aria-controls, and keyboard interaction. Add a skip-navigation link. |
| Medium | No concise reading guide explained the site's scope and limitations for AI consumers. | Add /llms.txt with canonical browse, source-policy, snapshot, and feed links. Strengthen the on-site assistant's distinction between home base, service area, recorded checks, and actual availability. |
| Low | Social metadata advertised the default card's dimensions for unrelated images. | Emit dimensions only when known, normalize secure absolute image URLs, preserve descriptive alt text, and permit large image/snippet previews on indexable pages. Add RSS self-discovery. |

`llms.txt` is an optional emerging convention. It is not a recognized guarantee of
indexing, ranking, crawler behavior, or inclusion in an AI answer. Structured data
describes visible content; FAQ and business markup do not guarantee Google rich
results. No ratings, reviews, opening hours, author credentials, business addresses,
or verification evidence were invented.

## Validation evidence

- `NODE_USE_ENV_PROXY=1 DATA_DIR=/workspace/.local/share/south-jersey-food-truck/test-data npm test`:
  **11 of 11 groups passed** on Node 24.19.0. The external-fetch proxy flag is
  needed in this managed environment; it is not an application requirement.
- Search-readiness crawl: **206 pages, 1,094 schema entities, 247 HTTP requests**;
  all sitemap pages returned 200 with one clean self-canonical, unique title and
  description, one H1, valid JSON-LD, and no unintended noindex.
- Existing SEO checks: **154 directory source pages, 5,712 internal links,
  273 distinct requested URLs**; also 8 retired-profile redirect mappings.
- External source audit: **11 unique official URLs across 6 articles passed**
  with successful responses/redirects. A reachable page alone does not establish
  the accuracy or completeness of the article's interpretation.
- Metadata checks cover script-delimiter injection, canonical origin restrictions,
  social-image metadata, snippet controls, and publisher consistency.
- Content evidence regressions cover complete directory markup, PA geography,
  visible contacts, recorded source/review dates, and snapshot freshness.
- Image checks confirm source hashes, output lengths and WebP file headers.
  **39,417,467 → 3,936,710 bytes**, a **90.0% reduction** over the 28 optimized
  source files. This is aggregate asset size, not measured page-load time or CWV.
- Optional Chromium smoke test: **15 page renders** across 390px, 1440px, and
  JavaScript-disabled contexts. Navigation, focus/Escape, FAQ keyboard/ARIA state,
  directory filter restoration, copy fallback, and clearing filters passed. No
  horizontal overflow, console errors, or JavaScript exceptions were found in
  those representative renders. External resources were stubbed, so external
  image/font availability and live integration behavior were not measured.
- Existing assistant/form-protection tests passed. Live OpenAI output and actual
  email delivery were not exercised; they are separate from public-page indexing.

## Remaining evidence and production work

These findings require factual evidence or production observations rather than
additional markup:

1. **Listing provenance:** all 53 records have a verified flag, but **42 have no
   direct operator contact field**. There are **11 official research source
   records**, primarily supporting 10 newer operators, plus image-source metadata
   on 21 listings. The public wording now exposes these limits. Obtain and record
   operator-confirmed business identity, official URL, service area, and dated
   supporting evidence before making stronger verification claims. Original data
   records were preserved; an existing flag is not proof of present operation.
2. **Editorial sourcing:** **34 of 40 articles lack external official-source
   links**. Not every food guide needs regulatory references, but claims about
   permits, costs, schedules, accessibility, dietary suitability, and specific
   businesses need appropriate supporting evidence. Eight named bylines have no
   independently established author biography in this repository; none was invented.
3. **Production indexing:** inspect Search Console/Bing coverage and canonical
   selection after deployment; submit the canonical sitemap through existing
   verified properties. Production redirects, DNS/TLS, CDN/cache policy, and
   live crawler access were not validated by this local code audit.
4. **Field performance:** measure production mobile LCP, INP, and CLS using
   PageSpeed/CrUX or real-user data. Image byte savings do not establish a CWV pass.
   Remote operator images and external fonts remain potential performance and
   availability dependencies. Smaller responsive image variants can be added if
   field measurements justify them.
5. **Search/AI outcomes:** establish query, conversion, referral, and citation
   baselines before evaluating improvement. No ranking, traffic, backlink, or
   AI-answer visibility measurements were available. No production deployment,
   search-console submission, or external publication was performed in this task.

## Repeating the checks

`npm test` starts and stops its own validation server. Use an external writable
DATA_DIR when testing admin or mutable-data workflows to protect bundled data.

For focused checks against an already running server, set DIRECTORY_URL and run
`npm run validate:search-readiness`. For the optional UI checks run
`npm run validate:browser`; this requires Playwright and a Chromium binary
(`CHROMIUM_PATH`, default `/usr/bin/chromium`). Browser tooling is not a production
dependency and is not required by `npm test`.

Generated image files and their manifest are included as normal application
assets. Rebuild after changing source images with
`python scripts/optimize-images.py` (Pillow with WebP support; validated with
Pillow 12.3.0). Originals remain untouched. Review the output, then run
`npm run validate:images` and the full suite. Production startup needs only Node.
