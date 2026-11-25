# Page QA (Canvas page extension)

> **Learning exercise. Not for production.** Uses internal Canvas APIs (`/canvas/api/v0`) that may change without notice.

A full-page Drupal Canvas extension that checks a Canvas page for:

1. **Images without alt text**: image props with an empty alt, and rendered `<img>` with a missing or empty alt.
   Decorative images (`alt=""` + `role="presentation"`/`"none"` or `aria-hidden="true"`) are skipped.
2. **Heading structure**: skipped levels going down (e.g. H2 → H4), no H1, or more than one H1.
3. **Links without text** (stretch): `<a href>` with no accessible name.

Each issue shows which component it belongs to.

## Requirements
- Drupal 11.3+, Canvas 1.12 (tested on 1.12.0)
- Permission: `edit canvas_page`

## Install
```bash
lando drush en page_qa -y
lando drush cr
```
Open Canvas. A **Page QA** checklist icon appears in the left side menu.
It opens at `/canvas/app/page_qa`.

## Use
1. Pick a Canvas page from the dropdown.
2. Click **Check page**.
3. Read the grouped results. A clean page shows "No issues found".

## Files
| File | Purpose |
|---|---|
| `page_qa.canvas_extension.yml` | Registers the extension (`type: page`) |
| `index.html`, `style.css` | The UI, loaded inside a Canvas iframe |
| `app.js` | Fetches page data, renders it off-screen and runs the checks |
| `icon.svg` | Side menu icon |
| `TEST-PAGES.md` | Test pages and expected results |
| `NOTES.md` | Research notes |
| `WRITEUP.md` | Short write-up |

## Known limitations
- Checks the **auto-save draft**, not the published page.
- Page template components (site header and footer) can't be named; they show as "Page template (header/footer)".
- Headings and images inside code components only appear after rendering, so each check takes about 1 second.
- No link from an issue to the component in the editor (see WRITEUP.md).
