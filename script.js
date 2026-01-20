// Theme toggle (persisted)
const themeBtn = document.getElementById('themeBtn');
const storedTheme = localStorage.getItem('theme');
if (storedTheme) document.documentElement.setAttribute('data-theme', storedTheme);

themeBtn.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'light' ? 'dark' : 'light';

  if (!current) {
    // Default is dark; first click goes to light.
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('theme', 'light');
    return;
  }

  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
});

// Footer year
document.getElementById('year').textContent = String(new Date().getFullYear());

// Projects filter + search
const chips = Array.from(document.querySelectorAll('.chip'));
const projects = Array.from(document.querySelectorAll('.project'));
const searchInput = document.getElementById('projectSearch');
const noResults = document.getElementById('noResults');

let activeFilter = 'all';

function normalize(str){
  return (str || '').toLowerCase().trim();
}
function matchesFilter(project){
  if (activeFilter === 'all') return true;
  const tags = normalize(project.getAttribute('data-tags')).split(/\s+/);
  return tags.includes(activeFilter);
}
function matchesSearch(project){
  const q = normalize(searchInput.value);
  if (!q) return true;
  return normalize(project.textContent).includes(q);
}
function applyFilters(){
  let visible = 0;
  for (const p of projects){
    const ok = matchesFilter(p) && matchesSearch(p);
    p.style.display = ok ? '' : 'none';
    if (ok) visible++;
  }
  noResults.style.display = visible === 0 ? '' : 'none';
}

chips.forEach(chip => {
  chip.addEventListener('click', () => {
    chips.forEach(c => c.setAttribute('aria-pressed', 'false'));
    chip.setAttribute('aria-pressed', 'true');
    activeFilter = chip.getAttribute('data-filter') || 'all';
    applyFilters();
  });
});

let searchTimer = null;
searchInput.addEventListener('input', () => {
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(applyFilters, 60);
});

applyFilters();
