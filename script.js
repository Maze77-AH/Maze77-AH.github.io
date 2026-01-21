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

  const prefersReducedMotion = () =>
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

  const debounce = (fn, wait = 120) => {
    let t = null;
    return (...args) => {
      window.clearTimeout(t);
      t = window.setTimeout(() => fn(...args), wait);
    };
  };

  const safeFocus = (el) => {
    if (!el) return;
    try {
      el.focus({ preventScroll: true });
    } catch {
      el.focus();
    }
  };

  /* -----------------------------
     Hash param helpers
     Supports:
       #projects
       #projects?tag=systems&query=ocr
  ------------------------------ */
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
    history.replaceState(null, '', next);
  }

  /* -----------------------------
     Theme (persisted + system aware)
  ------------------------------ */
  const themeBtn = $('#themeBtn');

  function getSystemTheme() {
    return window.matchMedia?.('(prefers-color-scheme: light)')?.matches ? 'light' : 'dark';
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
    // [data-theme="light"] and [data-theme="dark"]
    if (theme === 'light' || theme === 'dark') {
      document.documentElement.setAttribute('data-theme', theme);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }

    if (themeBtn) {
      const isLight = theme === 'light';
      themeBtn.setAttribute('aria-label', isLight ? 'Switch to dark theme' : 'Switch to light theme');
      themeBtn.setAttribute('aria-pressed', isLight ? 'true' : 'false');
    }
  }

  function initMobileNav() {
     const nav = document.getElementById('navMobile');
     if (!nav) return;
   
     const summary = nav.querySelector('summary');
   
     const setOpen = (open) => {
       nav.open = open;
       summary?.setAttribute('aria-expanded', open ? 'true' : 'false');
       
       // Lock/unlock body scroll
       if (open) {
         document.body.style.overflow = 'hidden';
       } else {
         document.body.style.overflow = '';
       }
     };
   
     // Keep body lock synced if user toggles the <details>
     nav.addEventListener('toggle', () => setOpen(nav.open));
   
     // Close when tapping a link inside the panel
     nav.addEventListener('click', (e) => {
       const a =
         e.target instanceof Element
           ? e.target.closest('a[href^="#"], a[href^="mailto:"], a[href$=".pdf"]')
           : null;
       if (!a) return;
       setOpen(false);
     });
   
     // Close on Escape
     document.addEventListener('keydown', (e) => {
       if (e.key === 'Escape' && nav.open) setOpen(false);
     });
   
     // Close when tapping the backdrop (outside the panel)
     document.addEventListener('click', (e) => {
       if (!nav.open) return;
       const target = e.target;
       const panel = nav.querySelector('.nav-panel');
       const isSummary = summary && summary.contains(target);
       
       // Don't close if clicking the toggle button or inside the panel
       if (target instanceof Node && !isSummary && panel && !panel.contains(target)) {
         setOpen(false);
       }
     });
   
     // If resizing to desktop width, force close so you never see "open mobile sheet" on desktop
     const mq = window.matchMedia('(max-width: 940px)');
     const onChange = () => {
       if (!mq.matches) setOpen(false);
     };
     mq.addEventListener?.('change', onChange);
     mq.addListener?.(onChange);
   
     // Initial sync
     setOpen(nav.open);
   }

  function initTheme() {
    const stored = getStoredTheme();
    const initial = stored || getSystemTheme();
    applyTheme(initial);

    // Sync with system only if user hasn't chosen yet
    const mq = window.matchMedia?.('(prefers-color-scheme: light)');
    if (mq && !stored) {
      const onChange = () => applyTheme(getSystemTheme());
      mq.addEventListener?.('change', onChange);
      mq.addListener?.(onChange); // older Safari
    }

    themeBtn?.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = current === 'light' ? 'dark' : 'light';
      applyTheme(next);
      setStoredTheme(next);
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
    navLinks.forEach((a) => {
      const id = (a.getAttribute('href') || '').slice(1);
      if (id) idToLink.set(id, a);
    });

    const sections = Array.from(idToLink.keys())
      .map((id) => document.getElementById(id))
      .filter(Boolean);

    if (!sections.length) return;

    const setCurrent = (id) => {
      for (const [sid, link] of idToLink.entries()) {
        if (sid === id) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      }
    };

    // Prefer IO (no scroll listeners)
    const obs = new IntersectionObserver(
      (entries) => {
        // Choose most visible intersecting section
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) setCurrent(visible.target.id);
      },
      {
        threshold: [0.2, 0.35, 0.5, 0.65],
        rootMargin: '-18% 0px -70% 0px',
      }
    );

    sections.forEach((s) => obs.observe(s));
  }

  /* -----------------------------
     Smooth anchor scrolling offset (sticky header)
  ------------------------------ */
  function initAnchorOffset() {
    const header = $('header');
    const getHeaderHeight = () => (header ? Math.ceil(header.getBoundingClientRect().height) : 0);

    function scrollToId(id) {
      const el = document.getElementById(id);
      if (!el) return;

      const headerHeight = getHeaderHeight();
      const offset = clamp(headerHeight + 12, 0, 140);

      const y = window.scrollY + el.getBoundingClientRect().top - offset;
      window.scrollTo({
        top: y,
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
    }

    // Intercept anchor clicks
    document.addEventListener('click', (e) => {
      const a = e.target instanceof Element ? e.target.closest('a[href^="#"]') : null;
      if (!a) return;

      const href = a.getAttribute('href') || '';
      if (!href.startsWith('#') || href === '#') return;

      // Keep URL behavior
      const [hash] = href.split('?');
      const id = hash.slice(1);
      if (!id) return;

      const target = document.getElementById(id);
      if (!target) return;

      e.preventDefault();
      history.pushState(null, '', href);
      scrollToId(id);
    });

    // On load with hash
    window.addEventListener('load', () => {
      const raw = window.location.hash || '';
      const [anchor] = raw.split('?');
      const id = (anchor || '').replace('#', '');
      if (id) scrollToId(id);
    });
  }

  /* -----------------------------
     Projects: filter + search + deep-link
  ------------------------------ */
  function initProjects() {
    const chips = $$('.chip');
    const projects = $$('.project');
    const searchInput = $('#projectSearch');
    const noResults = $('#noResults');

    if (!projects.length) return null;

    const index = projects.map((el) => {
      const tagsRaw = normalize(el.getAttribute('data-tags') || '');
      const tags = tagsRaw ? tagsRaw.split(/\s+/).filter(Boolean) : [];

      // Searchable text: title + body + tags
      const title = normalize($('h3', el)?.textContent || '');
      const body = normalize(el.textContent || '');
      const blob = `${title} ${tags.join(' ')} ${body}`.trim();

      return { el, tags, blob };
    });

    let activeFilter = 'all';
    let activeQuery = '';

    const setChipPressed = (chipEl) => {
      chips.forEach((c) => c.setAttribute('aria-pressed', 'false'));
      chipEl?.setAttribute('aria-pressed', 'true');
    };

    const matchesFilter = (item) => (activeFilter === 'all' ? true : item.tags.includes(activeFilter));
    const matchesSearch = (item) => (!activeQuery ? true : item.blob.includes(activeQuery));

    function applyFilters({ updateUrl = true } = {}) {
      let visible = 0;

      for (const item of index) {
        const ok = matchesFilter(item) && matchesSearch(item);
        item.el.style.display = ok ? '' : 'none';
        if (ok) visible++;
      }

      if (noResults) noResults.style.display = visible === 0 ? '' : 'none';

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
      activeFilter = normalize(next) || 'all';
      const targetChip = chips.find((c) => (c.getAttribute('data-filter') || 'all') === activeFilter);
      setChipPressed(targetChip);
      applyFilters();
    }

    function setQuery(q) {
      activeQuery = normalize(q);
      applyFilters();
    }

    // Chip interaction
    chips.forEach((chip) => {
      chip.addEventListener('click', () => setFilter(chip.getAttribute('data-filter') || 'all'));
      chip.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          chip.click();
        }
      });
    });

    // Search interaction
    if (searchInput) {
      const onSearch = debounce(() => setQuery(searchInput.value), 80);
      searchInput.addEventListener('input', onSearch);

      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          searchInput.value = '';
          setQuery('');
          searchInput.blur();
        }
      });
    }

    // Initialize from hash
    const { anchor, params } = readHashParams();
    if (anchor === '#projects' || window.location.hash.startsWith('#projects')) {
      const tag = normalize(params.get('tag') || '');
      const query = params.get('query') || '';

      setFilter(tag || 'all');

      if (searchInput) {
        searchInput.value = query;
        setQuery(query);
      } else {
        activeQuery = normalize(query);
        applyFilters({ updateUrl: false });
      }
    } else {
      applyFilters({ updateUrl: false });
    }

    return {
      setFilter,
      setQuery,
      getAllProjects: () => index,
    };
  }

  /* -----------------------------
     Modal (matches your HTML)
     Your markup uses:
       <div class="modal" id="modal" aria-hidden="true" hidden>...</div>
     And buttons use:
       <button class="open-modal" data-title="" data-body="" data-tags="" data-links='[...]'>Details</button>
  ------------------------------ */
  function initModal() {
    const modal = $('#modal');
    if (!modal) return null;

    const backdrop = $('.modal-backdrop', modal);
    const closeButtons = $$('[data-close="true"]', modal);

    const titleEl = $('#modalTitle', modal);
    const bodyEl = $('#modalBody', modal);
    const tagsEl = $('#modalTags', modal);
    const linksEl = $('#modalLinks', modal);

    const focusableSelector =
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

    let lastFocused = null;

    // Scroll lock that avoids layout shift (desktop) and scroll bleed (mobile-ish)
    let prevOverflow = '';
    let prevPaddingRight = '';
    let locked = false;

    const getScrollbarWidth = () => window.innerWidth - document.documentElement.clientWidth;

    function lockScroll() {
      if (locked) return;
      locked = true;
      prevOverflow = document.body.style.overflow || '';
      prevPaddingRight = document.body.style.paddingRight || '';

      const sw = getScrollbarWidth();
      document.body.style.overflow = 'hidden';
      if (sw > 0) document.body.style.paddingRight = `${sw}px`;
    }

    function unlockScroll() {
      if (!locked) return;
      locked = false;
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    }

    function setOpen(open) {
      if (open) {
        lastFocused = document.activeElement;

        modal.hidden = false;
        modal.setAttribute('aria-hidden', 'false');

        lockScroll();

        // Focus close button if possible
        const preferred = closeButtons[0] || titleEl || modal;
        safeFocus(preferred);
      } else {
        modal.setAttribute('aria-hidden', 'true');
        modal.hidden = true;

        unlockScroll();
        safeFocus(lastFocused);
      }
    }

    function clearContent() {
      if (titleEl) titleEl.textContent = '';
      if (bodyEl) bodyEl.textContent = '';
      if (tagsEl) tagsEl.innerHTML = '';
      if (linksEl) linksEl.innerHTML = '';
    }

    function addTag(text) {
      const span = document.createElement('span');
      span.className = 'tag';
      span.textContent = text;
      tagsEl?.appendChild(span);
    }

    function addLink(label, url) {
      const a = document.createElement('a');
      a.className = 'btn';
      a.href = url;
      a.target = '_blank';
      a.rel = 'noreferrer';
      a.textContent = label;
      linksEl?.appendChild(a);

      // Optional: close modal after navigating (feels crisp)
      a.addEventListener('click', () => setOpen(false));
    }

    function openFromDataset(btn) {
      clearContent();

      const title = btn.getAttribute('data-title') || 'Project';
      const body = btn.getAttribute('data-body') || '';
      const tags = (btn.getAttribute('data-tags') || '')
        .split('•')
        .map((s) => s.trim())
        .filter(Boolean);

      let links = [];
      try {
        const raw = btn.getAttribute('data-links') || '[]';
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) links = parsed;
      } catch {
        links = [];
      }

      if (titleEl) titleEl.textContent = title;
      if (bodyEl) bodyEl.textContent = body;
      tags.forEach(addTag);
      links.forEach((l) => {
        const label = (l && l.label) ? String(l.label) : 'Link';
        const url = (l && l.url) ? String(l.url) : '';
        if (url) addLink(label, url);
      });

      setOpen(true);
    }

    // Open handlers for any .open-modal buttons
    document.addEventListener('click', (e) => {
      const btn = e.target instanceof Element ? e.target.closest('.open-modal') : null;
      if (!btn) return;
      e.preventDefault();
      openFromDataset(btn);
    });

    // Close handlers
    backdrop?.addEventListener('click', () => setOpen(false));
    closeButtons.forEach((b) => b.addEventListener('click', () => setOpen(false)));

    // Keyboard: ESC close + focus trap
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
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

    // Safety: ensure default is hidden (prevents “Project / X” ghost UI)
    if (!modal.hasAttribute('aria-hidden')) modal.setAttribute('aria-hidden', 'true');
    modal.hidden = modal.getAttribute('aria-hidden') !== 'false';

    return { open: () => setOpen(true), close: () => setOpen(false) };
  }

  /* -----------------------------
     Optional: Scroll reveal
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
     Boot
  ------------------------------ */
  function boot() {
    initTheme();
    initFooterYear();
    initActiveSectionNav();
    initAnchorOffset();

    initProjects();
    initModal();
    initMobileNav();

    initScrollReveal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
