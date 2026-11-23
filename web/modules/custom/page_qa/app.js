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

$('page-select').addEventListener('change', (e) => {
  $('run').disabled = !e.target.value;
});

loadPageList().catch(showError);
