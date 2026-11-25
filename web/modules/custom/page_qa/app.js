const API = '/canvas/api/v0';
const $ = (id) => document.getElementById(id);

// Small helper: GET a Canvas API URL and return JSON (or throw a readable error).
async function getJson(path) {
  const res = await fetch(path, { credentials: 'same-origin', headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${path}`);
  return res.json();
}

function showError(err) {
  console.error(err);
   $('status').className = 'error';
  $('status').textContent = `Couldn't check the page: ${err.message}`;
}

// Step 4.2: list Canvas pages in the dropdown.
async function loadPageList() {
  const { data } = await getJson(`${API}/content/canvas_page`);
  const select = $('page-select');
  select.replaceChildren(new Option('— Choose a page —', ''));
  for (const page of data) {
       const label = page.path ? `${page.title} — ${page.path} (#${page.id})` : `${page.title} (#${page.id})`;
    select.add(new Option(label, page.id));

  }
}

// Step 4.3a: friendly component names, e.g. "sdc.spectrum.image-content" → "Image content".
let componentLabels = {};

async function loadComponentLabels() {
  try {
    const data = await getJson(`${API}/config/component`);
    for (const [id, c] of Object.entries(data)) componentLabels[id] = c.name;
  } catch (err) {
    // Not fatal: fall back to names built from the machine name.
    console.warn('Component names unavailable, using machine names', err);
  }
}

function prettyType(type) {
  const id = type.split('@')[0];                 // "js.qa_card@6a5c…" → "js.qa_card"
  if (componentLabels[id]) return componentLabels[id];
  const last = id.split('.').pop().replace(/[-_]/g, ' ');   // "image-content" → "image content"
  return last.charAt(0).toUpperCase() + last.slice(1);      // → "Image content"
}

// Step 4.3b: walk the layout tree and build { uuid: "readable name" }.
// Regions and slots hold "components", and components hold "slots",
// so one recursive function covers every nesting level.
function indexComponents(nodes, out = {}) {
  for (const node of nodes ?? []) {
    if (node.nodeType === 'component') out[node.uuid] = node.name || prettyType(node.type);
    indexComponents(node.components, out);
    indexComponents(node.slots, out);
  }
  return out;
}

// Step 4.4a: load the preview HTML into a hidden iframe so code components
// (<canvas-island client="only">) actually run and render their <img>/<h3>.
// We consider rendering "done" once the DOM has been quiet for 500 ms (max 5 s).
function renderOffscreen(html) {
  return new Promise((resolve) => {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.tabIndex = -1;
    // Off-screen but still laid out, so components render normally.
    frame.style.cssText = 'position:absolute;left:-10000px;top:0;width:1280px;height:900px;border:0;';

    frame.addEventListener('load', () => {
      const doc = frame.contentDocument;
      let quietTimer;
      let finished = false;

      const done = () => {
        if (finished) return;            // done() can be called by either timer, so only run once
        finished = true;
        observer.disconnect();
        resolve({ doc, frame });
      };

      // Every DOM change (e.g. Preact rendering the QA Card) restarts the 500 ms "quiet" timer.
      const observer = new MutationObserver(() => {
        clearTimeout(quietTimer);
        quietTimer = setTimeout(done, 500);
      });
      observer.observe(doc, { childList: true, subtree: true, attributes: true });

      quietTimer = setTimeout(done, 500);  // in case nothing changes at all
      setTimeout(done, 5000);              // hard cap, never wait forever
    }, { once: true });

    frame.srcdoc = html;
    document.body.append(frame);
  });
}

// Step 4.4b: each component is wrapped in
//   <!-- canvas-start-UUID --> … <!-- canvas-end-UUID -->
// Walk every element and comment in page order with a stack:
//   start comment → push uuid, end comment → pop,
//   element → its owner is whatever uuid is on top of the stack.
function buildOwnerMap(doc) {
  const owners = new Map();
  const stack = [];
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT);

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.nodeType === Node.COMMENT_NODE) {
      const match = node.data.trim().match(/^canvas-(start|end)-(.+)$/);
      if (match?.[1] === 'start') stack.push(match[2]);
      if (match?.[1] === 'end') stack.pop();
    } else {
      owners.set(node, stack.at(-1)); // undefined = outside any component (header/footer)
    }
  }
  return owners;
}
// "/sites/.../All-articles.webp?alternateWidths=..." → "All-articles.webp"
const fileName = (src = '') => src.split('?')[0].split('/').pop();

// Step 4.5a: Check 1, images with missing or empty alt.
// Source 1: image props in the model (works even if the image isn't rendered).
// Source 2: real <img> tags in the rendered page (catches images hardcoded in templates).
// The same image usually shows up in both, so de-duplicate by component + file name.
function checkImages(doc, owners, model) {
  const issues = [];
  const seen = new Set();

  for (const [uuid, entry] of Object.entries(model ?? {})) {
    for (const [prop, value] of Object.entries(entry.resolved ?? {})) {
      const isImage = value && typeof value === 'object' && 'src' in value;
      if (isImage && !value.alt?.trim()) {
        seen.add(`${uuid}|${fileName(value.src)}`);
        issues.push({ uuid, text: `Image prop "${prop}" (${fileName(value.src)}) has no alt text` });
      }
    }
  }

  for (const img of doc.querySelectorAll('img')) {
    const alt = img.getAttribute('alt');
    if (alt !== null && alt.trim() !== '') continue;          // has real alt text → fine
    const decorative = alt === '' &&
      (['presentation', 'none'].includes(img.getAttribute('role')) || img.getAttribute('aria-hidden') === 'true');
    if (decorative) continue;                                  // empty alt on purpose → fine
    const uuid = owners.get(img);
    const key = `${uuid}|${fileName(img.getAttribute('src'))}`;
    if (seen.has(key)) continue;                               // already reported via props
    seen.add(key);
    issues.push({
      uuid,
      text: `<img> ${fileName(img.getAttribute('src'))} has ${alt === null ? 'no alt attribute' : 'empty alt'}`,
    });
  }
  return issues;
}

// Step 4.5b: Check 2, skipped heading levels and H1 count.
// Going DOWN more than one level (H2 → H4) is an issue. Going back UP (H4 → H2) is fine.
function checkHeadings(doc, owners) {
  const issues = [];
  const headings = [...doc.body.querySelectorAll('h1, h2, h3, h4, h5, h6')];

  let previous = 0;
  for (const h of headings) {
    const level = Number(h.tagName[1]);                        // "H4" → 4
    if (previous && level > previous + 1) {
      issues.push({
        uuid: owners.get(h),
        text: `H${previous} → H${level} skips H${previous + 1}: "${h.textContent.trim()}"`,
      });
    }
    previous = level;
  }

  const h1s = headings.filter((h) => h.tagName === 'H1');
  if (h1s.length === 0) {
    issues.push({ uuid: undefined, text: 'Page has no H1' });
  }
  if (h1s.length > 1) {
    for (const h of h1s) {
      issues.push({ uuid: owners.get(h), text: `One of ${h1s.length} H1s: "${h.textContent.trim()}"` });
    }
  }
  return issues;
}

// Step 6: Check 3 (stretch), links with no accessible text.
// Returns the text a screen reader would announce for a link ('' = nothing).
function linkName(a) {
  const label = a.getAttribute('aria-label')?.trim();
  if (label) return label;

  const ids = a.getAttribute('aria-labelledby');
  if (ids) {
    const text = ids.split(/\s+/)
      .map((id) => a.ownerDocument.getElementById(id)?.textContent.trim() ?? '')
      .join(' ').trim();
    if (text) return text;
  }

  const text = a.textContent.trim();                      // visible text (also SVG <title>)
  if (text) return text;

  const alts = [...a.querySelectorAll('img')].map((img) => img.getAttribute('alt')?.trim() ?? '').join(' ').trim();
  if (alts) return alts;                                   // image link with real alt

  return a.getAttribute('title')?.trim() ?? '';
}

function checkLinks(doc, owners) {
  const issues = [];
  for (const a of doc.body.querySelectorAll('a[href]')) {
    if (linkName(a)) continue;
    issues.push({ uuid: owners.get(a), text: `Link to ${a.getAttribute('href')} has no text` });
  }
  return issues;
}

// Step 4.6a: draw grouped results with a summary and a count per check.
// Always textContent, never innerHTML: headings/alt text come from page content (untrusted).
function renderResults(groups, names, pageLabel) {
  const root = $('results');
  root.replaceChildren();

  // Improvement 3: one summary line saying which page was checked and the total.
  const total = groups.reduce((sum, g) => sum + g.issues.length, 0);
  const summary = document.createElement('p');
  summary.className = total === 0 ? 'summary ok' : 'summary';
  summary.textContent = total === 0
    ? `✅ ${pageLabel}: No issues found`
    : `${pageLabel}: ${total} issue${total === 1 ? '' : 's'} found`;
  root.append(summary);

  for (const { title, issues } of groups) {
    const section = document.createElement('section');

    const h2 = document.createElement('h2');
    h2.textContent = title;

    // Improvement 4: the badge is visual only; screen readers get "(2 issues)" instead of "2".
    const count = document.createElement('span');
    count.className = issues.length ? 'count' : 'count zero';
    count.textContent = issues.length;
    count.setAttribute('aria-hidden', 'true');
    const srCount = document.createElement('span');
    srCount.className = 'visually-hidden';
    srCount.textContent = ` (${issues.length} issue${issues.length === 1 ? '' : 's'})`;
    h2.append(count, srCount);
    section.append(h2);

    if (issues.length === 0) {
      const p = document.createElement('p');
      p.textContent = 'No issues found';
      section.append(p);
    } else {
      const ul = document.createElement('ul');
      for (const { uuid, text } of issues) {
        const li = document.createElement('li');
        const who = document.createElement('span');
        who.className = 'component';
        // A uuid that isn't in this page's layout comes from the Canvas page template
        // (site header/footer), which the layout API doesn't describe.
        who.textContent = uuid ? (names[uuid] ?? 'Page template (header/footer)') : 'Page (outside components)';
        li.append(who, ` — ${text}`);
        ul.append(li);
      }
      section.append(ul);
    }
    root.append(section);
  }
}


$('page-select').addEventListener('change', (e) => {
  $('run').disabled = !e.target.value;
  $('results').replaceChildren();   // old results belong to the previous page
    $('status').textContent = '';
  $('status').className = '';
});

// Step 4.6b: the "Check page" button runs the whole pipeline.
$('run').addEventListener('click', async () => {
  const id = $('page-select').value;
  if (!id) return;

  $('run').disabled = true;                 // stop double-clicks while checking
  $('results').replaceChildren();
  const pageName = $('page-select').selectedOptions[0].textContent;
  $('status').className = 'loading';
  $('status').textContent = 'Checking page…';

  let frame;
  try {
    await labelsReady;                                                  // names loaded?
    const { html, layout, model } = await getJson(`${API}/layout/canvas_page/${id}`);
    const names = indexComponents(layout);                              // uuid → name
    const rendered = await renderOffscreen(html);                       // run code components
    frame = rendered.frame;
    const owners = buildOwnerMap(rendered.doc);                         // element → uuid

    renderResults([
      { title: 'Images without alt text', issues: checkImages(rendered.doc, owners, model) },
      { title: 'Heading structure',       issues: checkHeadings(rendered.doc, owners) },
      { title: 'Links without text',      issues: checkLinks(rendered.doc, owners) },
    ], names, pageName);
    $('status').textContent = '';
    $('status').className = '';
  } catch (err) {
    showError(err);
  } finally {
    frame?.remove();                        // always clean up the hidden iframe
    $('run').disabled = false;
  }
});

const labelsReady = loadComponentLabels();   // remember the promise so the button can wait for it
loadPageList().catch(showError);
