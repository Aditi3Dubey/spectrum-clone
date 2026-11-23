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


$('page-select').addEventListener('change', (e) => {
  $('run').disabled = !e.target.value;
});

Promise.all([loadPageList(), loadComponentLabels()]).catch(showError);

