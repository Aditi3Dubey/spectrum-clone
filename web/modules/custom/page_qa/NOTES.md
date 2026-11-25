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