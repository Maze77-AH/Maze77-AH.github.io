/* ==========================================================================
   Nicholas Lasagna — Portfolio JS
   ========================================================================== */

(() => {
  'use strict';

  /* -----------------------------
     Utilities
  ------------------------------ */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  const normalize = (str) =>
    (str ?? '')
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');

  const safeFocus = (el) => {
    if (!el) return;
    try {
      el.focus({ preventScroll: true });
    } catch {
      el.focus();
    }
  };

  const prefersReducedMotion = () =>
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const debounce = (fn, wait = 120) => {
    let t = null;
    return (...args) => {
      window.clearTimeout(t);
      t = window.setTimeout(() => fn(...args), wait);
    };
  };

  /* Hash param helpers: supports URLs like:
     - #projects
     - #projects?tag=systems&query=ocr
     - #projects?tag=all
  */
  function readHashParams() {
    const raw = window.location.hash || '';
    const [anchor, query] = raw.split('?');
    const params = new URLSearchParams(query || '');
    return { anchor: anchor || '', params };
  }

  function writeHashParams(anchor, kv = {}) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(kv)) {
      if (v === undefined || v === null) continue;
      const s = String(v).trim();
      if (!s) continue;
      params.set(k, s);
    }
    const q = params.toString();
    const next = q ? `${anchor}?${q}` : `${anchor}`;
    // replaceState to avoid polluting history with every keystroke
    history.replaceState(null, '', next);
  }

  /* -----------------------------
     Theme (persisted + system aware)
  ------------------------------ */
  const themeBtn = $('#themeBtn');

  function getSystemTheme() {
    // Only used when user has not picked a theme yet.
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches
      ? 'light'
      : 'dark';
  }

  function getStoredTheme() {
    try {
      return localStorage.getItem('theme');
    } catch {
      return null;
    }
  }

  function setStoredTheme(theme) {
    try {
      localStorage.setItem('theme', theme);
    } catch {
      /* ignore */
    }
  }

  function applyTheme(theme) {
    // "dark" = default (no attribute) OR explicit "dark"
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else if (theme === 'dark') {
      // You can either remove the attr or set to dark; either is fine.
      // We set explicitly for clarity / debugging.
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }

    if (themeBtn) {
      const label = theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme';
      themeBtn.setAttribute('aria-label', label);
    }
  }

  function initTheme() {
    const stored = getStoredTheme();
    const initial = stored || getSystemTheme();
    applyTheme(initial);

    // If user never stored a preference, keep synced with system changes.
    // Once they click the button, stored preference wins.
    const mq = window.matchMedia?.('(prefers-color-scheme: light)');
    if (mq && !stored) {
      const onChange = () => applyTheme(getSystemTheme());
      // Safari older uses addListener
      mq.addEventListener?.('change', onChange);
      mq.addListener?.(onChange);
    }

    if (!themeBtn) return;

    themeBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = current === 'light' ? 'dark' : 'light';
      applyTheme(next);
      setStoredTheme(next);

      // Tiny “pressed” affordance for screen readers
      themeBtn.setAttribute('aria-pressed', next === 'light' ? 'true' : 'false');
    });
  }

  /* -----------------------------
     Footer year
  ------------------------------ */
  function initFooterYear() {
    const year = $('#year');
    if (!year) return;
    year.textContent = String(new Date().getFullYear());
  }

  /* -----------------------------
     Active nav section highlighting
     Adds aria-current="page" to the nav link for the section in view.
  ------------------------------ */
  function initActiveSectionNav() {
    const navLinks = $$('header nav a[href^="#"]');
    if (!navLinks.length) return;

    const idToLink = new Map();
    for (const a of navLinks) {
      const id = (a.getAttribute('href') || '').slice(1);
      if (!id) continue;
      idToLink.set(id, a);
    }

    const sections = Array.from(idToLink.keys())
      .map((id) => document.getElementById(id))
      .filter(Boolean);

    if (!sections.length) return;

    const setCurrent = (id) => {
      for (const [sid, link] of idToLink.entries()) {
        if (sid === id) {
          link.setAttribute('aria-current', 'page');
        } else {
          link.removeAttribute('aria-current');
        }
      }
    };

    // IntersectionObserver gives a clean + efficient solution.
    const obs = new IntersectionObserver(
      (entries) => {
        // Pick the most visible section
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible?.target?.id) setCurrent(visible.target.id);
      },
      {
        root: null,
        // Trigger when section is meaningfully within viewport
        threshold: [0.2, 0.35, 0.5, 0.65],
        rootMargin: '-18% 0px -70% 0px',
      }
    );

    sections.forEach((s) => obs.observe(s));
  }

  /* -----------------------------
     Projects: filter + search (fast + accessible)
  ------------------------------ */
  function initProjects() {
    const chips = $$('.chip');
    const projects = $$('.project');
    const searchInput = $('#projectSearch');
    const noResults = $('#noResults');

    if (!projects.length) return;

    // Build an index so search is fast and consistent.
    // We include title, tags, text content, and data- attributes if present.
    const index = projects.map((el) => {
      const title = normalize($('h3', el)?.textContent || '');
      const tagsRaw = normalize(el.getAttribute('data-tags') || '');
      const tags = tagsRaw ? tagsRaw.split(/\s+/).filter(Boolean) : [];
      const text = normalize(el.textContent || '');
      const role = normalize(el.getAttribute('data-role') || ''); // optional future field
      return { el, title, tags, text, role };
    });

    let activeFilter = 'all';
    let activeQuery = '';

    function setChipPressed(chipEl) {
      chips.forEach((c) => c.setAttribute('aria-pressed', 'false'));
      if (chipEl) chipEl.setAttribute('aria-pressed', 'true');
    }

    function matchesFilter(item) {
      if (activeFilter === 'all') return true;
      return item.tags.includes(activeFilter);
    }

    function matchesSearch(item) {
      if (!activeQuery) return true;
      // Simple includes is good here; index is small and normalized.
      return item.text.includes(activeQuery);
    }

    function applyFilters({ updateUrl = true } = {}) {
      let visible = 0;

      for (const item of index) {
        const ok = matchesFilter(item) && matchesSearch(item);
        item.el.style.display = ok ? '' : 'none';
        if (ok) visible++;
      }

      if (noResults) {
        noResults.style.display = visible === 0 ? '' : 'none';
      }

      // Update hash params only when we are in projects or user interacts.
      if (updateUrl) {
        const { anchor } = readHashParams();
        const atProjects = anchor === '#projects' || window.location.hash.startsWith('#projects');
        if (atProjects || !anchor) {
          writeHashParams('#projects', {
            tag: activeFilter !== 'all' ? activeFilter : '',
            query: activeQuery || '',
          });
        }
      }
    }

    function setFilter(next) {
      activeFilter = next || 'all';

      // Reflect chip state
      const targetChip = chips.find((c) => (c.getAttribute('data-filter') || 'all') === activeFilter);
      setChipPressed(targetChip);

      applyFilters();
    }

    function setQuery(q) {
      activeQuery = normalize(q);
      applyFilters();
    }

    // Chip click handlers
    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const next = chip.getAttribute('data-filter') || 'all';
        setFilter(next);
      });

      // Keyboard nicety: Enter/Space triggers click
      chip.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          chip.click();
        }
      });
    });

    // Search handlers
    if (searchInput) {
      const onSearch = debounce(() => setQuery(searchInput.value), 80);
      searchInput.addEventListener('input', onSearch);

      // Escape clears input quickly
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          searchInput.value = '';
          setQuery('');
          searchInput.blur();
        }
      });
    }

    // Initialize from hash params if present
    const { anchor, params } = readHashParams();
    if (anchor === '#projects' || window.location.hash.startsWith('#projects')) {
      const tag = normalize(params.get('tag') || '');
      const query = params.get('query') || '';

      if (tag) setFilter(tag);
      else setFilter('all');

      if (searchInput && query) {
        searchInput.value = query;
        setQuery(query);
      } else {
        applyFilters({ updateUrl: false });
      }
    } else {
      // Default initial render
      applyFilters({ updateUrl: false });
    }

    // Expose a small API for other components (modal)
    return {
      getVisibleProjects: () => index.filter((i) => i.el.style.display !== 'none'),
      getAllProjects: () => index,
      setFilter,
      setQuery,
    };
  }

  /* -----------------------------
     Optional: Project details modal
     Activates if HTML contains #projectModal structure from the upgraded markup.
     - Click a project card to open modal (ignores clicking links inside card)
     - Escape closes
     - Focus trap inside modal
  ------------------------------ */
  function initProjectModal(projectAPI) {
    const modal = $('#projectModal');
    if (!modal) return;

    const backdrop = $('.modal-backdrop', modal);
    const closeBtn = $('#modalClose', modal);

    const titleEl = $('#modalTitle', modal);
    const summaryEl = $('#modalSummary', modal);
    const tagsEl = $('#modalTags', modal);
    const linksEl = $('#modalLinks', modal);

    // Track focus
    let lastFocused = null;

    const focusableSelector =
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

    function setModalOpen(open) {
      if (open) {
        lastFocused = document.activeElement;
        modal.setAttribute('aria-hidden', 'false');
        modal.setAttribute('aria-modal', 'true');
        document.body.style.overflow = 'hidden';

        // Focus the close button or modal title
        safeFocus(closeBtn || titleEl || modal);
      } else {
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        safeFocus(lastFocused);
      }
    }

    function clearModalContent() {
      if (titleEl) titleEl.textContent = '';
      if (summaryEl) summaryEl.textContent = '';
      if (tagsEl) tagsEl.innerHTML = '';
      if (linksEl) linksEl.innerHTML = '';
    }

    function buildTag(tagText) {
      const span = document.createElement('span');
      span.className = 'tag';
      span.textContent = tagText;
      return span;
    }

    function buildLink(label, href) {
      const a = document.createElement('a');
      a.className = 'btn';
      a.href = href;
      a.target = '_blank';
      a.rel = 'noreferrer';
      a.textContent = label;
      return a;
    }

    function openFromProject(projectEl) {
      clearModalContent();

      const h3 = $('h3', projectEl)?.textContent?.trim() || 'Project';
      const p = $('p', projectEl)?.textContent?.trim() || '';
      const tags = $$('.tag', projectEl).map((t) => t.textContent.trim()).filter(Boolean);

      if (titleEl) titleEl.textContent = h3;
      if (summaryEl) summaryEl.textContent = p;

      if (tagsEl && tags.length) {
        tags.forEach((t) => tagsEl.appendChild(buildTag(t)));
      }

      // Grab links inside the card
      const links = $$('.links a', projectEl)
        .map((a) => ({
          label: a.textContent.trim() || 'Link',
          href: a.getAttribute('href') || '#',
        }))
        .filter((x) => x.href && x.href !== '#');

      if (linksEl) {
        if (links.length) {
          links.forEach((l) => linksEl.appendChild(buildLink(l.label, l.href)));
        } else {
          // If none, show nothing (keeps it clean).
        }
      }

      setModalOpen(true);
    }

    // Click outside closes
    backdrop?.addEventListener('click', () => setModalOpen(false));
    closeBtn?.addEventListener('click', () => setModalOpen(false));

    // Escape + focus trap
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setModalOpen(false);
        return;
      }

      if (e.key !== 'Tab') return;

      const focusables = $$(focusableSelector, modal).filter((el) => el.offsetParent !== null);
      if (!focusables.length) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        safeFocus(last);
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        safeFocus(first);
      }
    });

    // Attach click handlers to project cards (only if the API exists)
    const projects = projectAPI?.getAllProjects?.() || [];
    projects.forEach(({ el }) => {
      el.style.cursor = 'pointer';

      el.addEventListener('click', (e) => {
        // Don’t open modal if user clicked a link/button inside the card
        const target = e.target;
        if (target instanceof Element) {
          if (target.closest('a, button, input, textarea, select')) return;
        }
        openFromProject(el);
      });

      // Keyboard open (Enter/Space) if focused
      el.setAttribute('tabindex', '0');
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openFromProject(el);
        }
      });
    });

    // Ensure initial state is hidden
    modal.setAttribute('aria-hidden', modal.getAttribute('aria-hidden') || 'true');
  }

  /* -----------------------------
     Optional: Scroll reveal
     Adds .show to .reveal elements when they enter viewport.
  ------------------------------ */
  function initScrollReveal() {
    const items = $$('.reveal');
    if (!items.length) return;

    if (prefersReducedMotion()) {
      items.forEach((el) => el.classList.add('show'));
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('show');
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -10% 0px' }
    );

    items.forEach((el) => obs.observe(el));
  }

  /* -----------------------------
     Small UX polish: smooth anchor scrolling offset
     (Because header is sticky.)
     - If user clicks #something, we scroll slightly above it.
  ------------------------------ */
  function initAnchorOffset() {
    const header = $('header');
    const headerHeight = header ? Math.ceil(header.getBoundingClientRect().height) : 0;

    function scrollToId(id) {
      const el = document.getElementById(id);
      if (!el) return;

      const y = window.scrollY + el.getBoundingClientRect().top - clamp(headerHeight + 12, 0, 120);
      window.scrollTo({
        top: y,
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
    }

    document.addEventListener('click', (e) => {
      const a = e.target instanceof Element ? e.target.closest('a[href^="#"]') : null;
      if (!a) return;

      const href = a.getAttribute('href') || '';
      if (!href.startsWith('#') || href === '#') return;

      const id = href.slice(1);
      const target = document.getElementById(id);
      if (!target) return;

      // Let default behavior update URL, but handle scrolling ourselves
      e.preventDefault();
      history.pushState(null, '', href);
      scrollToId(id);
    });

    // If page loads with a hash, offset-scroll once
    window.addEventListener('load', () => {
      const raw = window.location.hash || '';
      const [anchor] = raw.split('?');
      const id = (anchor || '').replace('#', '');
      if (id) scrollToId(id);
    });
  }

  /* -----------------------------
     Boot
  ------------------------------ */
  function boot() {
    initTheme();
    initFooterYear();
    initActiveSectionNav();

    const projectAPI = initProjects();

    // These are optional — they only do anything if matching HTML exists.
    initProjectModal(projectAPI);
    initScrollReveal();
    initAnchorOffset();
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
