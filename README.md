# SpectraTech – Spectrum Technologies clone (Drupal 11 + Canvas)

Training project for ticket **JSIN-435**. The site copies the look and structure of
[spectrumtech.com](https://www.spectrumtech.com/) using **Single Directory Components (SDC)**
placed with **Drupal Canvas**. "SpectraTech" is a fictional company. All text is written
for this project, and every image is CC0, public domain or made for this project
(see [Image credits](#image-credits)).

## Tech stack

| | Version |
|---|---|
| Drupal core | 11.4 |
| PHP / MySQL | 8.3 / 8.0 (Lando `drupal11` recipe) |
| Drush | 13 |
| Canvas | 1.12 |

Contributed modules:

- `canvas`: page building and content templates
- `easy_breadcrumb`: breadcrumbs built from the URL
- `pathauto`: URL aliases for News and Wire Samples
- `webform`: contact form
- `better_exposed_filters`: auto-submit filters on the Wire Sample Gallery
- `admin_navigation`

Core modules enabled on top of the standard install: `media`, `media_library`, `taxonomy`,
`inline_form_errors` and `path`.

## Local setup

```bash
git clone <repo-url> spectrum-sdc-canvas
cd spectrum-sdc-canvas
lando start
lando composer install
```

`web/sites/default/settings.php` is ignored by git, so point it at the exported
configuration yourself. Add (or change) this line in your `settings.php`:

```php
$settings['config_sync_directory'] = '../config/sync';
```

The path is relative to `web/`, so it resolves to `config/sync` in the project root.
Check it with `lando drush status --field=config-sync`. If Drupal has already made
`settings.php` read-only, run `chmod u+w web/sites/default/settings.php` before editing
and `chmod u-w` afterwards.

Then choose one option:

```bash
# Option A: full site with content.
# Import the database dump shared with this ticket and unzip the shared
# files archive into web/sites/default/files (images, video, credits.json).
lando db-import spectrum.sql.gz

# Option B: structure only, no content.
lando drush site:install --existing-config -y

lando drush cr
```

The site runs at <http://spectrum-sdc-canvas.lndo.site>. Log in with `lando drush uli`.

After changing configuration in the admin UI, export it with `lando drush cex -y` and
commit the changes in `config/sync`.

> **Configuration vs content.** Content types, fields, views, taxonomies, menus, the
> webform, Canvas components, the page template and content templates are configuration,
> stored in `config/sync`. Canvas pages, News items, Wire Samples, media files and menu
> links are **content**. They live in the database and `web/sites/default/files`, so
> share them with a database dump and a copy of the files folder, not through git.

## Theme: `spectrum`

`web/themes/custom/spectrum`, with no base theme.

- `css/base/variables.css`: design tokens (colours, container width 1320px, gutter,
  transition) taken from the reference site's CSS.
- `css/base/base.css`: reset, `.container`, `.btn`, `.visually-hidden`, Drupal status messages.
- `css/components/news-listing.css`: layout for the Views blocks (News listing, Wire Sample
  Gallery) and the exposed filter form. Views output is not an SDC, so this file is part
  of the global library.

Every component has its own `.component.yml`, `.twig` and `.css` (and `.js` where needed),
so CSS and JS load only on pages that use the component.

### Components

| Component | Group | What it is |
|---|---|---|
| Site Header | Global | Logo, Main Menu, search, contact icon (`site-header.js`) |
| Main Menu | Global | Dropdown main navigation, keyboard accessible (`main-menu.js`) |
| Site Footer | Global | Footer menu columns, social links, legal menu |
| Breadcrumb | Global | Styles the Easy Breadcrumb block (hidden below 1200px, like the reference) |
| Hero Banner | Sections | Homepage video hero with poster image, heading and button |
| Page Banner | Sections | Inner-page banner: H1 on a darkened photo |
| Intro Text | Sections | Large centred intro paragraph |
| Text Block | Sections | Heading (H1/H2, red/dark) + formatted text |
| Image + Content | Sections | Image left/right with label, heading (H1/H2), text and link. Centres vertically when there is no text |
| Stat Card Grid + Stat Card | Sections | Row of figure cards with an optional link |
| Industries Slider + Industry Card | Sections | Full-width slider (`industries-slider.js`) |
| Product Card Grid | Sections | Heading with a red highlighted word, intro text and a slot of Product Cards |
| Product Card | Cards | Image, heading, short text, "View Product" link |
| News Card | Cards | Image, red badge, date, title. Used by the News and Wire Sample teaser templates |
| FAQ Accordion + FAQ Item | Sections / Cards | Native `<details>`/`<summary>` accordion |
| Contact Section | Sections | Form box with a slot for a Webform and an image side panel |
| CTA Banner | Sections | Closing call to action with two buttons |

Canvas prop conventions used throughout:

- Images use `$ref: json-schema-definitions://canvas.module/image` and render a responsive
  AVIF `srcset` via `image.src|toSrcSet(image.width)`.
- Links use `format: uri-reference`.
- Rich text uses `contentMediaType: text/html` with `x-formatting-context: block`. This is
  the `canvas_html_block` format, which allows bold, italic, underline, links and lists.
- Variants use `enum` with `meta:enum` labels.

## Content model

### News (`news`)
Fields: Title, Image (media), Body (formatted long text). Not promoted. Author and date are hidden.

- **URL:** `/news-and-events/[node:title]` (Pathauto)
- **Canvas Teaser template:** News Card (image, title, link, date from *Authored on*)
- **Canvas Full template:** Image + Content (grey, H1 title), Body, "Latest News" and CTA
- **View `news`:**
  - *Latest News* block: 3 items, used on the homepage, About and News detail pages
  - *All news* block: 9 items per page with a pager, used on `/news-and-events`
  - Both are a responsive grid with 3 columns

### Wire Sample (`wire_sample`)
Fields: Title, Image (shared `field_image`), Process (taxonomy), Industry (taxonomy).

- **Taxonomies:**
  - `process`: Laser Wire Marking, Laser Wire Stripping
  - `industry`: Aviation, Defence, Space, Medical, Rail, Automotive, Telecoms and Data, Electronics
- **URL:** `/resources/sample-gallery/[node:title]`
- **Canvas Teaser template:** News Card, with the badge taken from the Process term name
- **Canvas Full template:** Image + Content, "Want to see your own wire?" text and CTA
- **View `wire_samples`:** block with exposed **Search** (title contains), **Process** and
  **Industry** filters. Uses Better Exposed Filters with auto-submit (no submit button), AJAX
  and a Reset button. Used on `/resources/sample-gallery`

### Contact webform (`contact`)
First and last name, email, phone, industry, company, country and message. All fields are
required. The confirmation message is shown inline. Email handlers are disabled in this
environment.

## Pages (all built in Canvas)

| Page | URL |
|---|---|
| Homepage | `/` (`/homepage`) |
| About | `/about` |
| Leadership | `/about/leadership` |
| Products | `/products` |
| Laser Wire Markers | `/products/laser-wire-markers` |
| LX 500 Series | `/products/laser-wire-markers/lx-500-series` |
| Industries | `/industries` |
| Defence | `/industries/defence` |
| Contract Manufacturing | `/contract-manufacturing` |
| Wire Sample Gallery (listing) | `/resources/sample-gallery` |
| News & Events (listing) | `/news-and-events` |
| Support (FAQ) | `/support` |
| Contact | `/contact` |
| Terms & Conditions | `/terms-and-conditions` |
| Privacy Notice | `/privacy-notice` |
| Image Credits | `/image-credits` |

The global layout (header, breadcrumbs, status messages, footer) comes from the Canvas page
template, so every page and every content template shares it.

Menus:

- **Main navigation:** dropdowns
- **Footer:** link columns
- **Legal:** Terms, Privacy, Cookie Policy, Image Credits

## Accessibility and performance

- One H1 per page. Heading levels can be chosen on Text Block and Image + Content so that
  banners and sections do not create a second H1.
- Visible `:focus-visible` outlines. Cards use a single link that covers the whole card,
  and the duplicate "View Product" text is `aria-hidden`.
- Keyboard-operable menu dropdowns, native `<details>` FAQ, labelled form fields, and inline
  form errors (`inline_form_errors`).
- Responsive AVIF images via Canvas image styles. `loading="lazy"` is used below the fold,
  and the banner image uses `fetchpriority="high"`.
- `prefers-reduced-motion` is respected by animated components.

## Image credits

Each image folder in `web/sites/default/files` has a `credits.json` file listing the title,
creator, licence and source URL of every image in it. The folders are:

- `home`
- `products`
- `industries`
- `news`
- `leadership`
- `samples`

The `/image-credits` page lists these credits on the site.

- Photos come from Wikimedia Commons and rawpixel, and are CC0 or public domain.
- The Leadership initials images and the Wire Sample images were generated for this project.
- Leadership names are fictional, so no real person's photo or name is used.

