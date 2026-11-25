# Test pages (answer key)

Both pages are unpublished; all content lives in the Canvas auto-save draft.
The site header and footer are part of the checked HTML (logo × 2, alt "SpectraTech home", no headings).




## QA – Broken (id: 17)

Rendered heading order:
H1 Main title → H1 Second main title → H2 Section A → H4 Jumped sub-heading
→ H2 Built for precision, made to scale (image-content) → H3 Card without alt (QA Card, client-side)

Expected issues: 4

Images without alt (2):
- Image content: All-articles.webp has empty alt
- QA Card: All-articles.webp has empty alt

Heading structure (2):
- More than one H1: "Main title", "Second main title"
- H2 → H4 skips H3: "Jumped sub-heading"

Not issues (must NOT be reported):
- H4 → H2 (going back up a level is allowed)
- Header logo and footer logo (have alt text)

## QA – Clean (id: 18)

Rendered heading order:
H1 Main title → H2 Section A → H2 (image-content) → H3 Sub-section → H3 (QA Card)

Expected: "No issues found"

## QA – No H1 (id: 19)
Headings: H2 "Only an H2" → H3 "Then an H3"
Expected: 1 issue — "Page has no H1" (Page, outside components). Images: 0.
Note: while unpublished, the dropdown shows "Untitled page — /page/19"
because the list API returns the saved title, not the draft.
