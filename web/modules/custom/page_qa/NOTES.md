# Phase 3 findings

## APIs
- Page list: GET /canvas/api/v0/content/canvas_page → data[] {id, title, status, path}
- Page data: GET /canvas/api/v0/layout/canvas_page/{id} → layout (tree), model (props), html (preview)

## Findings
- Same internal API the Canvas editor uses (seen in Network tab). It's v0 / internal, so it may change.
- Iframe fetch works (status 200): same origin, so the session cookie is sent.
- Returns the auto-save DRAFT, not the published page.
- Components are wrapped in <!-- canvas-start/end-{uuid} --> comments.
- Code components: <img> not in server HTML (rendered client-side); props are in <canvas-island props="...">.
- Header/footer in html: yes (logo ×2 with alt, no headings)

## Decision
Use BOTH: layout+model for component names and image props; html rendered in a hidden iframe
for real <img> and heading order (covers code components after hydration).

- layout `name` is null unless renamed in Layers → fall back to component type.
- Headings also come from props (image-content heading_level), so read rendered HTML, not just heading components.
- html includes site header + footer (logo ×2, alt "SpectraTech home", no headings).
- DOMParser misses code components (no JS run): QA Card's h3 + img absent; data only in <canvas-island props>.


## Draft vs published
- The layout API returns the auto-save DRAFT, so Page QA checks what the editor shows, not what is live.
- Tested: changed "Sub-section" H3 → H4 on QA – Clean without publishing → Page QA reported the skip,
  while the live /qa-clean page still had H3.
- Good for "check before publish". But a published page with unpublished edits is checked in its edited state.
- The page list API returns the SAVED title/path, so an unpublished page shows as "Untitled page — /page/19"
  in the dropdown, while the check itself uses the draft content.
## Real pages (stretch: running on Spectrum content)
- Decorative images: cta-banner, page-banner and contact-section hardcode alt="" because their images
  are background decoration. alt="" is correct for decorative images, so reporting them was a false positive.
  Fix: templates now add role="presentation"; Page QA skips alt="" images marked role="presentation"/"none"
  or aria-hidden="true". A plain alt="" is still reported (it may be a mistake).
- Page template components: the site header/footer come from the Canvas page template (page_variant "default"),
  not the page. Their canvas-start/end markers are in the preview html, but their uuids are not in the
  layout API response, so names can't be looked up → shown as "Page template (header/footer)".
- Real findings on Spectrum pages (left unfixed on purpose: the ticket is the checker, not the site):
  - Homepage: H1 (hero) → H3 (stat-card), no H2.
  - News & Events: H1 (page banner) → H3 (news-card titles), no H2.
  - Leadership: H1 → H3 (product-card), no H2.
  - Sample Gallery: H1 → H3 (news-card), no H2.
  - Contact: no H1 (contact-section heading is a fixed H2).
  - About: correct (H1 → H2 → H3).
  Cause: stat-card, news-card and product-card hardcode <h3>, contact-section hardcodes <h2>. Whether H3 is
  right depends on what's above the card, so the proper fix is a "heading level" prop on those components.
  CSS is class-based, so changing the tag would not change the design.
