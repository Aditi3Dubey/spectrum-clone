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
  $('status').textContent = `Error: ${err.message}`;
}

// Step 4.2: list Canvas pages in the dropdown.
async function loadPageList() {
  const { data } = await getJson(`${API}/content/canvas_page`);
  const select = $('page-select');
  select.replaceChildren(new Option('— Choose a page —', ''));
  for (const page of data) {
    select.add(new Option(`${page.title} (#${page.id})`, page.id));
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
$('page-select').addEventListener('change', (e) => {
  $('run').disabled = !e.target.value;
});

const labelsReady = loadComponentLabels();   // remember the promise so the button can wait for it
loadPageList().catch(showError);