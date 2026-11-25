# Page QA: write-up

**Registration.** A `page_qa.canvas_extension.yml` file with `type: page`, `url: index.html`, `icon`,
`api_version: "1.0"` and `permissions: [edit canvas_page]`. Canvas discovers it (after `drush cr`), shows it
as its own icon in the side menu (page extensions are not listed in the Extensions panel), and loads
`index.html` in a sandboxed, same-origin iframe at `/canvas/app/page_qa`.

**Getting the data.** I used two sources together:
- `GET /canvas/api/v0/layout/canvas_page/{id}` returns the component tree (`layout`), resolved props (`model`)
  and the full preview `html`. The tree gives component names; the props catch image alt even if not rendered.
- The `html` is rendered in a hidden iframe, because code components (`<canvas-island client="only">`) have no
  server HTML. DOMParser found 5 headings / 3 images; the rendered iframe found all 6 / 4.
- Each component is wrapped in `<!-- canvas-start-{uuid} -->` comments, so a TreeWalker maps every
  element back to its component.

Same-origin means the editor's session cookie just works. The page list comes from `/content/canvas_page`.

**What was hard or undocumented.**
- No docs for page extensions; I learned from the Canvas source and its test module.
- The `@drupal-canvas/extensions` helpers only work in the editor, not on a full page.
- The layout API returns the **draft**, while the list API returns the **saved** title, so an unpublished
  page shows as "Untitled page" in the dropdown.
- Site header/footer come from the page template; their markers are in the html but not in `layout`.
- `alt=""` is correct for decorative images, so "empty alt = error" gave false positives on real pages.
- The iframe sandbox is `allow-scripts allow-same-origin allow-downloads` (no `allow-top-navigation` or
  `allow-popups`), so linking from an issue to the component in the editor is probably not possible.

**Likely to change.** Everything under `/canvas/api/v0` is internal; the extension interface is `@internal`
and `api_version` is "1.0". The comment markers and the `layout`/`model` shape are implementation details.
A stable extensions API for page extensions would replace most of this.

**Result.** All planted issues are found with no false positives, the clean page shows "No issues found", and it
found 5 real heading issues on Spectrum pages.
