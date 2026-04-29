/* ==========================================================================
   Nicholas Lasagna — Portfolio JS
   Vanilla. No deps. Progressive enhancement throughout.
   ========================================================================== */

(() => {
  'use strict';

  /* -------- utils -------- */
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const norm = s => (s ?? '').toString().toLowerCase().trim().replace(/\s+/g, ' ');
  const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
  const isMac = () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
  const debounce = (fn, w = 120) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), w); }; };
  const safeFocus = el => { if (!el) return; try { el.focus({ preventScroll: true }); } catch { el.focus(); } };

  /* -------- header height var -------- */
  function initHeaderHeight() {
    const h = $('header');
    if (!h) return;
    const set = () => {
      document.documentElement.style.setProperty('--header-h', `${Math.ceil(h.getBoundingClientRect().height)}px`);
    };
    set();
    window.addEventListener('resize', set, { passive: true });
  }

  /* -------- theme -------- */
  function initTheme() {
    const btn = $('#themeBtn');
    const sysTheme = () => window.matchMedia?.('(prefers-color-scheme: light)')?.matches ? 'light' : 'dark';
    const get = () => { try { return localStorage.getItem('theme'); } catch { return null; } };
    const set = v => { try { localStorage.setItem('theme', v); } catch {} };

    const apply = t => {
      if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
      else document.documentElement.removeAttribute('data-theme');
      btn?.setAttribute('aria-pressed', t === 'light' ? 'true' : 'false');
      btn?.setAttribute('aria-label', t === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
    };

    const stored = get();
    apply(stored || sysTheme());

    const mq = window.matchMedia?.('(prefers-color-scheme: light)');
    if (mq && !stored) {
      const onSys = () => apply(sysTheme());
      mq.addEventListener?.('change', onSys);
      mq.addListener?.(onSys);
    }

    btn?.addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = cur === 'light' ? 'dark' : 'light';
      apply(next); set(next);
      toast(`${next === 'dark' ? 'Dark' : 'Light'} mode`);
    });
  }

  /* -------- footer year -------- */
  function initYear() {
    const y = $('#year');
    if (y) y.textContent = new Date().getFullYear();
  }

  /* -------- local time (pinned to Berkeley / America/Los_Angeles) -------- */
  function initLocalTime() {
    const el = $('[data-local-time]');
    if (!el) return;

    const fmt = new Intl.DateTimeFormat([], {
      hour: 'numeric', minute: '2-digit', hour12: true,
      timeZone: 'America/Los_Angeles',
    });

    const tick = () => {
      el.textContent = fmt.format(new Date()).replace(' ', '');
    };
    tick();
    setInterval(tick, 30 * 1000);
  }

  /* -------- cursor spotlight -------- */
  function initCursorGlow() {
    const glow = $('.cursor-glow');
    if (!glow) return;
    if (matchMedia('(pointer: coarse)').matches) return; // skip on touch
    if (reduceMotion()) return;

    let raf = 0, tx = 50, ty = 30, mx = 50, my = 30;
    const onMove = e => {
      tx = (e.clientX / window.innerWidth) * 100;
      ty = (e.clientY / window.innerHeight) * 100;
      if (!raf) {
        raf = requestAnimationFrame(loop);
      }
    };
    const loop = () => {
      mx += (tx - mx) * 0.18;
      my += (ty - my) * 0.18;
      glow.style.setProperty('--mx', `${mx}%`);
      glow.style.setProperty('--my', `${my}%`);
      if (Math.abs(tx - mx) > 0.05 || Math.abs(ty - my) > 0.05) {
        raf = requestAnimationFrame(loop);
      } else {
        raf = 0;
      }
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mouseenter', () => glow.classList.add('on'));
    window.addEventListener('mouseleave', () => glow.classList.remove('on'));
    glow.classList.add('on');
  }

  /* -------- magnetic buttons (subtle) -------- */
  function initMagnetic() {
    if (reduceMotion()) return;
    if (matchMedia('(pointer: coarse)').matches) return;

    const targets = $$('.btn.primary.lg, .contact-cta');
    targets.forEach(el => {
      let raf = 0;
      const onMove = e => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - (r.left + r.width / 2);
        const y = e.clientY - (r.top + r.height / 2);
        const max = 6;
        const tx = clamp(x * 0.18, -max, max);
        const ty = clamp(y * 0.18, -max, max);
        if (!raf) raf = requestAnimationFrame(() => {
          el.style.transform = `translate(${tx}px, ${ty}px)`;
          raf = 0;
        });
      };
      const reset = () => { el.style.transform = ''; };
      el.addEventListener('mousemove', onMove);
      el.addEventListener('mouseleave', reset);
    });
  }

  /* -------- nav: smooth scroll w/ offset -------- */
  function initAnchorOffset() {
    const headerH = () => {
      const h = $('header');
      return h ? Math.ceil(h.getBoundingClientRect().height) : 0;
    };
    function scrollTo(id) {
      const el = document.getElementById(id);
      if (!el) return;
      const y = window.scrollY + el.getBoundingClientRect().top - clamp(headerH() + 12, 0, 200);
      window.scrollTo({ top: y, behavior: reduceMotion() ? 'auto' : 'smooth' });
    }

    document.addEventListener('click', e => {
      const a = e.target instanceof Element ? e.target.closest('a[href^="#"]') : null;
      if (!a) return;
      const href = a.getAttribute('href') || '';
      if (!href.startsWith('#') || href === '#') return;
      const [hash] = href.split('?');
      const id = hash.slice(1);
      if (!id) return;
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      history.pushState(null, '', href);
      scrollTo(id);
    });

    window.addEventListener('load', () => {
      const raw = window.location.hash || '';
      const id = (raw.split('?')[0] || '').replace('#', '');
      if (id) scrollTo(id);
    });

    // expose
    window.__scrollToId = scrollTo;
  }

  /* -------- active section highlight -------- */
  function initActiveSection() {
    const links = $$('header nav a[href^="#"]');
    if (!links.length) return;
    const map = new Map();
    links.forEach(a => {
      const id = (a.getAttribute('href') || '').slice(1);
      if (id) map.set(id, a);
    });
    const sections = Array.from(map.keys()).map(id => document.getElementById(id)).filter(Boolean);
    if (!sections.length) return;

    const setCurrent = id => {
      for (const [k, link] of map.entries()) {
        if (k === id) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      }
    };

    const obs = new IntersectionObserver(entries => {
      const visible = entries.filter(e => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible?.target?.id) setCurrent(visible.target.id);
    }, {
      threshold: [0.2, 0.4, 0.6],
      rootMargin: '-18% 0px -65% 0px',
    });
    sections.forEach(s => obs.observe(s));
  }

  /* -------- mobile nav with iOS-safe scroll lock -------- */
  // Position-fixed body trick — fully prevents iOS Safari scroll bleed.
  let _lockedScrollY = 0;
  let _scrollLocked = false;
  function lockPageScroll() {
    if (_scrollLocked) return;
    _scrollLocked = true;
    _lockedScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    const sw = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${_lockedScrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    if (sw > 0) document.body.style.paddingRight = `${sw}px`;
  }
  function unlockPageScroll() {
    if (!_scrollLocked) return;
    _scrollLocked = false;
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    window.scrollTo(0, _lockedScrollY);
  }

  function initMobileNav() {
    const nav = document.getElementById('navMobile');
    if (!nav) return;
    const summary = nav.querySelector('summary');
    const panel = nav.querySelector('.nav-panel');

    const setOpen = open => {
      nav.open = open;
      summary?.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) lockPageScroll(); else unlockPageScroll();
    };

    nav.addEventListener('toggle', () => {
      const open = nav.open;
      summary?.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) lockPageScroll(); else unlockPageScroll();
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && nav.open) setOpen(false);
    });

    document.addEventListener('click', e => {
      if (!nav.open) return;
      const t = e.target;
      if (!(t instanceof Node)) return;
      if (!summary?.contains(t) && !panel?.contains(t)) setOpen(false);
    });

    // Close panel when a link is clicked
    nav.addEventListener('click', e => {
      const a = e.target instanceof Element ? e.target.closest('a[href]') : null;
      if (a) setOpen(false);
    });

    const mq = window.matchMedia('(max-width: 940px)');
    const onMq = () => { if (!mq.matches && nav.open) setOpen(false); };
    mq.addEventListener?.('change', onMq);
    mq.addListener?.(onMq);
  }

  /* -------- projects filter + search -------- */
  function initProjects() {
    const chips = $$('.chip');
    const projects = $$('.project');
    const input = $('#projectSearch');
    const noResults = $('#noResults');
    if (!projects.length) return null;

    const items = projects.map(el => {
      const tags = norm(el.getAttribute('data-tags') || '').split(/\s+/).filter(Boolean);
      const title = norm($('h3', el)?.textContent || '');
      const blob = `${title} ${tags.join(' ')} ${norm(el.textContent || '')}`.trim();
      return { el, tags, blob };
    });

    let filter = 'all';
    let query = '';

    const press = chipEl => {
      chips.forEach(c => c.setAttribute('aria-pressed', 'false'));
      chipEl?.setAttribute('aria-pressed', 'true');
    };
    const apply = ({ updateUrl = true } = {}) => {
      let visible = 0;
      for (const it of items) {
        const okFilter = filter === 'all' || it.tags.includes(filter);
        const okSearch = !query || it.blob.includes(query);
        const ok = okFilter && okSearch;
        it.el.style.display = ok ? '' : 'none';
        if (ok) visible++;
      }
      if (noResults) {
        noResults.hidden = visible !== 0;
      }
      if (updateUrl) {
        const params = new URLSearchParams();
        if (filter !== 'all') params.set('tag', filter);
        if (query) params.set('query', query);
        const q = params.toString();
        const cur = window.location.hash.split('?')[0] || '';
        const isProj = cur === '#projects' || !cur;
        if (isProj && (q || cur === '#projects')) {
          history.replaceState(null, '', q ? `#projects?${q}` : '#projects');
        }
      }
    };

    const setFilter = next => {
      filter = norm(next) || 'all';
      const target = chips.find(c => (c.getAttribute('data-filter') || 'all') === filter);
      press(target);
      apply();
    };
    const setQuery = q => { query = norm(q); apply(); };

    chips.forEach(c => c.addEventListener('click', () => setFilter(c.getAttribute('data-filter') || 'all')));

    if (input) {
      const onSearch = debounce(() => setQuery(input.value), 80);
      input.addEventListener('input', onSearch);
      input.addEventListener('keydown', e => {
        if (e.key === 'Escape') { input.value = ''; setQuery(''); input.blur(); }
      });
    }

    // Init from hash
    const hash = window.location.hash || '';
    if (hash.startsWith('#projects')) {
      const q = hash.split('?')[1] || '';
      const params = new URLSearchParams(q);
      setFilter(params.get('tag') || 'all');
      const queryVal = params.get('query') || '';
      if (input) {
        input.value = queryVal;
        setQuery(queryVal);
      } else {
        query = norm(queryVal);
        apply({ updateUrl: false });
      }
    } else {
      apply({ updateUrl: false });
    }

    return { setFilter, setQuery, focusSearch: () => input?.focus() };
  }

  /* -------- modal -------- */
  function initModal() {
    const modal = $('#modal');
    if (!modal) return null;

    const backdrop = $('.modal-backdrop', modal);
    const closes = $$('[data-close="true"]', modal);
    const titleEl = $('#modalTitle', modal);
    const bodyEl = $('#modalBody', modal);
    const tagsEl = $('#modalTags', modal);
    const linksEl = $('#modalLinks', modal);

    const focusables = 'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])';
    let prevFocus = null;
    let prevOverflow = '';
    let prevPad = '';
    let locked = false;

    const lock = () => {
      if (locked) return;
      locked = true;
      prevOverflow = document.body.style.overflow;
      prevPad = document.body.style.paddingRight;
      const sw = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      if (sw > 0) document.body.style.paddingRight = `${sw}px`;
    };
    const unlock = () => {
      if (!locked) return;
      locked = false;
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPad;
    };

    const setOpen = open => {
      if (open) {
        prevFocus = document.activeElement;
        modal.hidden = false;
        modal.setAttribute('aria-hidden', 'false');
        lock();
        safeFocus(closes[0] || titleEl || modal);
      } else {
        modal.setAttribute('aria-hidden', 'true');
        modal.hidden = true;
        unlock();
        safeFocus(prevFocus);
      }
    };

    const fillFromButton = btn => {
      if (titleEl) titleEl.textContent = '';
      if (bodyEl) bodyEl.textContent = '';
      if (tagsEl) tagsEl.innerHTML = '';
      if (linksEl) linksEl.innerHTML = '';

      const title = btn.getAttribute('data-title') || 'Project';
      const body = btn.getAttribute('data-body') || '';
      const tags = (btn.getAttribute('data-tags') || '').split('•').map(s => s.trim()).filter(Boolean);
      let links = [];
      try {
        const parsed = JSON.parse(btn.getAttribute('data-links') || '[]');
        if (Array.isArray(parsed)) links = parsed;
      } catch {}

      if (titleEl) titleEl.textContent = title;
      if (bodyEl) bodyEl.textContent = body;

      tags.forEach(t => {
        const s = document.createElement('span');
        s.className = 'tag';
        s.textContent = t;
        tagsEl?.appendChild(s);
      });
      links.forEach(l => {
        if (!l?.url) return;
        const a = document.createElement('a');
        a.className = 'btn';
        a.href = l.url;
        a.target = '_blank';
        a.rel = 'noreferrer';
        a.textContent = l.label || 'Link';
        a.addEventListener('click', () => setOpen(false));
        linksEl?.appendChild(a);
      });

      setOpen(true);
    };

    document.addEventListener('click', e => {
      const btn = e.target instanceof Element ? e.target.closest('.open-modal') : null;
      if (!btn) return;
      e.preventDefault();
      fillFromButton(btn);
    });

    backdrop?.addEventListener('click', () => setOpen(false));
    closes.forEach(c => c.addEventListener('click', () => setOpen(false)));

    modal.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); setOpen(false); return; }
      if (e.key !== 'Tab') return;
      const list = $$(focusables, modal).filter(el => el.offsetParent !== null);
      if (!list.length) return;
      const first = list[0], last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); safeFocus(last); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); safeFocus(first); }
    });

    if (!modal.hasAttribute('aria-hidden')) modal.setAttribute('aria-hidden', 'true');
    modal.hidden = modal.getAttribute('aria-hidden') !== 'false';

    return { open: () => setOpen(true), close: () => setOpen(false) };
  }

  /* -------- toast -------- */
  let toastTimer = 0;
  function toast(msg) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('on'), 1700);
  }

  /* -------- copy helper -------- */
  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch {}
      document.body.removeChild(ta);
      return ok;
    }
  }

  /* -------- command palette -------- */
  function initPalette(projects) {
    const palette = $('#palette');
    const input = $('#paletteInput');
    const list = $('#paletteList');
    const btn = $('#cmdkBtn');
    if (!palette || !input || !list) return;

    const items = [
      { id: 'shell',    label: 'Open shell (terminal)',hint: '`',  kind: 'nav', action: () => { goSection('shell'); setTimeout(() => document.getElementById('termInput')?.focus(), 250); } },
      { id: 'work',     label: 'Go to Selected work',  hint: 'W',  kind: 'nav', action: () => goSection('work') },
      { id: 'projects', label: 'Go to Projects',       hint: 'P',  kind: 'nav', action: () => goSection('projects') },
      { id: 'principles',label:'Go to Principles',     hint: 'N',  kind: 'nav', action: () => goSection('principles') },
      { id: 'about',    label: 'Go to About',          hint: 'A',  kind: 'nav', action: () => goSection('about') },
      { id: 'stack',    label: 'Go to Stack',          hint: 'S',  kind: 'nav', action: () => goSection('stack') },
      { id: 'contact',  label: 'Go to Contact',        hint: 'C',  kind: 'nav', action: () => goSection('contact') },
      { id: 'top',      label: 'Scroll to top',        hint: 'T',  kind: 'nav', action: () => window.scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' }) },
      { id: 'tour',     label: 'Run guided tour',      hint: '◐',  kind: 'do',  action: () => { goSection('shell'); setTimeout(() => document.getElementById('termInput')?.focus(), 250); setTimeout(() => { const i = document.getElementById('termInput'); if (i) { i.value = 'tour'; i.form?.dispatchEvent(new Event('submit', {bubbles: true, cancelable: true})); } }, 600); } },
      { id: 'neofetch', label: 'Run neofetch in shell',hint: '◯',  kind: 'do',  action: () => { goSection('shell'); setTimeout(() => { const i = document.getElementById('termInput'); if (i) { i.value = 'neofetch'; i.form?.dispatchEvent(new Event('submit', {bubbles: true, cancelable: true})); } }, 400); } },
      { id: 'email',    label: 'Copy email address',   hint: '@',  kind: 'do',  action: async () => {
        const ok = await copyToClipboard('nicholaslasagna@gmail.com');
        toast(ok ? 'Email copied' : 'Copy failed');
      }},
      { id: 'mail',     label: 'Open email client',           hint: '✉', kind: 'do', action: () => { window.location.href = 'mailto:nicholaslasagna@gmail.com'; } },
      { id: 'resume',   label: 'Download resume (PDF)',       hint: '↓', kind: 'do', action: () => { window.open('Resume.pdf', '_blank'); } },
      { id: 'github',   label: 'Open GitHub · Maze77-AH',     hint: '↗', kind: 'do', action: () => { window.open('https://github.com/Maze77-AH', '_blank'); } },
      { id: 'github2',  label: 'Open GitHub · NemesisSSBU',   hint: '↗', kind: 'do', action: () => { window.open('https://github.com/NemesisSSBU', '_blank'); } },
      { id: 'linkedin', label: 'Open LinkedIn',               hint: '↗', kind: 'do', action: () => { window.open('https://www.linkedin.com/in/nicholas-lasagna-798118277', '_blank'); } },
      { id: 'realfic',  label: 'Open realfiction.live',       hint: '↗', kind: 'do', action: () => { window.open('https://realfiction.live', '_blank'); } },
      { id: 'theme',    label: 'Toggle theme',                hint: '◐', kind: 'do', action: () => $('#themeBtn')?.click() },
      { id: 'f-all',    label: 'Filter projects: All',        hint: '▢', kind: 'filter', action: () => { goSection('projects'); projects?.setFilter('all'); } },
      { id: 'f-systems',label: 'Filter projects: Systems',    hint: '▢', kind: 'filter', action: () => { goSection('projects'); projects?.setFilter('systems'); } },
      { id: 'f-games',  label: 'Filter projects: Games',      hint: '▢', kind: 'filter', action: () => { goSection('projects'); projects?.setFilter('games'); } },
      { id: 'f-infra',  label: 'Filter projects: Infra',      hint: '▢', kind: 'filter', action: () => { goSection('projects'); projects?.setFilter('infra'); } },
      { id: 'f-tools',  label: 'Filter projects: Tools',      hint: '▢', kind: 'filter', action: () => { goSection('projects'); projects?.setFilter('tools'); } },
    ];

    let filtered = items.slice();
    let selected = 0;

    const goSection = id => {
      const target = document.getElementById(id);
      if (!target) return;
      window.__scrollToId?.(id);
    };

    const iconFor = kind => {
      switch (kind) {
        case 'nav':    return '→';
        case 'filter': return '▢';
        case 'do':     return '·';
        default:       return '·';
      }
    };

    const render = () => {
      list.innerHTML = '';
      if (!filtered.length) {
        const e = document.createElement('div');
        e.className = 'palette-empty';
        e.textContent = 'No matches.';
        list.appendChild(e);
        return;
      }
      filtered.forEach((it, i) => {
        const row = document.createElement('div');
        row.className = 'palette-item';
        row.setAttribute('role', 'option');
        row.setAttribute('aria-selected', i === selected ? 'true' : 'false');
        row.innerHTML = `
          <span class="palette-icon mono">${iconFor(it.kind)}</span>
          <span class="palette-label">${it.label}</span>
          <span class="palette-hint">${it.hint}</span>
        `;
        row.addEventListener('click', () => { runItem(it); });
        row.addEventListener('mouseenter', () => {
          selected = i;
          updateSelected();
        });
        list.appendChild(row);
      });
    };

    const updateSelected = () => {
      $$('.palette-item', list).forEach((row, i) => {
        row.setAttribute('aria-selected', i === selected ? 'true' : 'false');
      });
      const cur = $$('.palette-item', list)[selected];
      cur?.scrollIntoView({ block: 'nearest' });
    };

    const runItem = it => {
      setOpen(false);
      // Defer so the close animation happens cleanly
      setTimeout(() => it.action?.(), 60);
    };

    const setOpen = open => {
      if (open) {
        palette.hidden = false;
        palette.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        input.value = '';
        filtered = items.slice();
        selected = 0;
        render();
        setTimeout(() => safeFocus(input), 30);
      } else {
        palette.setAttribute('aria-hidden', 'true');
        palette.hidden = true;
        document.body.style.overflow = '';
      }
    };

    input.addEventListener('input', () => {
      const q = norm(input.value);
      filtered = !q
        ? items.slice()
        : items.filter(it => norm(it.label).includes(q) || norm(it.hint).includes(q) || norm(it.id).includes(q));
      selected = 0;
      render();
    });

    palette.addEventListener('click', e => {
      const t = e.target;
      if (t instanceof Element && t.matches('[data-close="true"]')) setOpen(false);
    });

    document.addEventListener('keydown', e => {
      const inField = e.target instanceof Element && (e.target.matches('input, textarea') || e.target.isContentEditable);
      const k = e.key;

      // Open palette
      if ((e.metaKey || e.ctrlKey) && (k === 'k' || k === 'K')) {
        e.preventDefault();
        setOpen(palette.hidden);
        return;
      }

      if (palette.hidden) {
        // global "/" focuses search if not in field
        if (k === '/' && !inField) {
          const search = $('#projectSearch');
          if (search) {
            e.preventDefault();
            window.__scrollToId?.('projects');
            setTimeout(() => safeFocus(search), 200);
          }
        }
        return;
      }

      if (k === 'Escape') { e.preventDefault(); setOpen(false); return; }
      if (k === 'ArrowDown') { e.preventDefault(); selected = (selected + 1) % filtered.length; updateSelected(); return; }
      if (k === 'ArrowUp')   { e.preventDefault(); selected = (selected - 1 + filtered.length) % filtered.length; updateSelected(); return; }
      if (k === 'Enter')     { e.preventDefault(); const it = filtered[selected]; if (it) runItem(it); return; }
    });

    btn?.addEventListener('click', () => setOpen(palette.hidden));

    // Adapt the visible label for non-Mac
    if (!isMac()) {
      const t = $('.kbd-keys', btn);
      if (t) t.innerHTML = '<span>Ctrl</span><span>K</span>';
    }
  }

  /* -------- copy on contact-row click -------- */
  function initContactCopy() {
    $$('.contact-row').forEach(row => {
      row.addEventListener('click', async e => {
        // Allow normal navigation; offer secondary "copy" via shift-click
        if (!e.shiftKey) return;
        e.preventDefault();
        const txt = $('.contact-val', row)?.textContent?.trim();
        if (!txt) return;
        const ok = await copyToClipboard(txt);
        toast(ok ? 'Copied' : 'Copy failed');
      });
    });

    // Click on the big email CTA: copy + open mail
    const cta = $('.contact-cta');
    cta?.addEventListener('click', async e => {
      // If user shift-clicks, copy instead of mailto
      if (!e.shiftKey) return;
      e.preventDefault();
      const ok = await copyToClipboard('nicholaslasagna@gmail.com');
      toast(ok ? 'Email copied' : 'Copy failed');
    });
  }

  /* -------- scroll to top -------- */
  function initFootTop() {
    const btn = $('#footTop');
    btn?.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' });
    });
  }

  /* -------- reveal animations -------- */
  function initReveal() {
    const items = $$('.reveal');
    if (!items.length) return;
    if (reduceMotion()) {
      items.forEach(el => el.classList.add('show'));
      return;
    }
    const obs = new IntersectionObserver(entries => {
      entries.forEach((e, i) => {
        if (e.isIntersecting) {
          // small stagger by index in batch
          const delay = Math.min(i * 60, 240);
          setTimeout(() => e.target.classList.add('show'), delay);
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -8% 0px' });

    items.forEach(el => obs.observe(el));
  }

  /* -------- keyboard shortcuts (single-letter nav like vim) -------- */
  function initKeyboardNav(palette) {
    const map = {
      w: 'work', p: 'projects', n: 'principles', a: 'about', s: 'stack', c: 'contact', t: 'top',
    };
    document.addEventListener('keydown', e => {
      const inField = e.target instanceof Element && (e.target.matches('input, textarea') || e.target.isContentEditable);
      if (inField) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 't') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' });
        return;
      }
      const id = map[k];
      if (!id) return;
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      window.__scrollToId?.(id);
    });
  }

  /* -------- konami code easter egg (CRT mode) -------- */
  function initKonami() {
    const seq = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
    let i = 0;
    document.addEventListener('keydown', e => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (k === seq[i]) {
        i++;
        if (i === seq.length) {
          i = 0;
          document.body.classList.toggle('crt');
          toast(document.body.classList.contains('crt') ? 'CRT mode: on' : 'CRT mode: off');
        }
      } else {
        i = (k === seq[0]) ? 1 : 0;
      }
    });
  }

  /* -------- console signature -------- */
  function consoleSignature() {
    const name = '%cNicholas Lasagna';
    const tag  = '%c — Software Engineer · Texas Tech \'27';
    const body = '%c\n\n  /usr/local/bin/portfolio\n  → looking for systems eyes? mail nicholaslasagna@gmail.com\n  → ⌘K opens the palette · ` opens the shell · / focuses search\n  → letters jump: w work · p projects · n principles · a about · s stack · c contact · t top\n  → konami code does something\n';
    try {
      console.log(name + tag + body,
        'font: 600 14px ui-monospace, JetBrains Mono, monospace; color: #f5b94a;',
        'font: 13px ui-monospace; color: #8d8a82;',
        'font: 12px ui-monospace; color: #c8c4ba;'
      );
    } catch {}
  }

  /* ==========================================================================
     TERMINAL — virtual shell with a real REPL
     ========================================================================== */

  const FS = (() => {
    const f = (content) => ({ type: 'file', content });
    const d = (children) => ({ type: 'dir', children });

    const README = `welcome to nicholaslasagna.com.

this is an actual REPL — not a video, not a screenshot.
type 'help' to see commands, or 'tour' for a guided walk.

start somewhere:
  cat about.md
  cat projects/realfiction.md
  cat projects/united-exams.md
  cat projects/nemesisssbu.md
  cat principles.md
  ls projects/
  neofetch
`;

    const ABOUT = `nicholas lasagna — software engineering intern candidate.

cs at texas tech university (b.s. expected may 2027). currently in
berkeley, california / bay area.

i started building production-style software early through indie game
development with a small distributed team — three years of engine-level
work in unreal engine 4/5, mostly in c++ and c#.

from there i moved deeper into systems, runtime tooling, infrastructure,
and backend / platform work. my energy goes into the layer of the stack
where the abstraction breaks — servers, runtimes, tooling, and real
user-facing systems.

looking for: summer 2026 swe internship.
strongest fits: systems, runtime / tooling, distributed services,
performance, infrastructure, backend / platform, game tech.
`;

    const PRINCIPLES = `engineering principles — six opinions, earned the hard way.

01. tail latency, not mean.
    "average response time looks fine" is the most expensive sentence in
    production. the user feels p99, not p50.

02. rust over c++ when getting it wrong panics someone else's machine.
    memory safety isn't a "feature" once code runs unsupervised on
    thousands of consumer hosts.

03. region-safe, not threadsafe-by-luck.
    "it's been fine for six months" is a coin landing heads. write code
    that's correct because the model says so.

04. read the source before guessing the bug.
    five extra minutes in grep beats two days arguing with intuition.

05. ship behind a known-good baseline.
    every change should be reversible. production is sacred.

06. tooling is product.
    the cli you build for yourself sets the velocity for everything else.
`;

    const STACK = `comfortable shipping with
  rust          ── runtime, tooling
  java          ── backends, plugins
  typescript    ── next.js, web
  python        ── ocr, automation
  c++ / c       ── ue5, low-level
  c#            ── ue / unity

systems & infra
  linux (ubuntu)     ── daily driver, prod
  oracle cloud       ── realfiction host
  mariadb / postgres ── realfiction · supabase
  redis              ── cache, state
  docker             ── isolation, deploy
  git · cloudflare   ── distributed wf · dns, edge

web · game · currently deepening
  next.js · supabase     ── united exams, heroic submission
  postgresql · rls       ── schema, policies, triggers
  tailwind · shadcn/ui   ── ui systems
  velocity · folia       ── jvm proxies, region-threaded
  unreal engine 4/5      ── gameplay systems, engine
  assembly · architecture ── risc-v, masm/x86, study
`;

    const CONTACT = `contact

  email     nicholaslasagna@gmail.com
  github    github.com/Maze77-AH
  github 2  github.com/NemesisSSBU
  linkedin  linkedin.com/in/nicholas-lasagna-798118277
  resume    /Resume.pdf
  website   https://www.nicholaslasagna.com

shortcut: 'email' opens your mail client, 'resume' downloads the pdf.
`;

    const EDU = `texas tech university   — b.s. computer science
  enrolled  fall 2023
  graduate  may 2027
  coursework  systems, architecture, languages, math
`;

    const REALFIC = `realfiction — live game server infrastructure        [ 2023 → live ]

stack: java · ubuntu · oracle cloud · velocity · folia/purpur · mariadb · redis

a live, user-facing multi-server java game network running on ubuntu /
oracle cloud free-tier infrastructure. designed, deployed, and currently
operated end to end. setup includes a velocity proxy, multiple server
nodes (lobby / arcade / smp / anarchy), mariadb + redis, a reverse proxy
layer, and a folia / purpur / pufferfish style runtime.

highlights:
  → proxy routing, plugin interoperability, database access,
    server configuration, permissions, deployment hygiene.
  → region-threaded plugin work on folia: refactored unsafe world
    access into region-safe scheduling; cut async-violation crashes.
  → tuned jvm, proxy, and chunk / database pipelines under real player
    load; treated tail latency as the actual kpi, not mean.
  → owned config hygiene, plugin compatibility, observability —
    every change shipped behind a known-good baseline.

links:
  https://realfiction.live
  https://github.com/Maze77-AH
`;

    const NEMESIS = `nemesisssbu — rust runtime tooling                     [ 2024 → active ]

stack: rust · runtime tooling · low-level systems

rust runtime / tooling work for a non-commercial super smash bros.
ultimate modding project with a public community. the work targets
memory safety, explicit failure handling, and robust api boundaries —
the kind of layer where being slightly wrong can hurt someone else's
machine.

why rust over c++:
  the type system pays for itself in tooling that runs close to a host
  process. memory safety isn't a feature here — it's a precondition.

highlights:
  → careful api boundaries between modded code and the host runtime,
    no silent fallbacks, explicit errors.
  → emphasized debuggability and explainability for a public modding
    community.
  → patched paths designed to fail loudly in dev, gracefully in prod.

links:
  https://github.com/NemesisSSBU
`;

    const REALCHAT = `realchat — ocr desktop automation assistant           [ 2023 ]

stack: python · ocr · tesseract · macos · packaging

python desktop tool combining screen capture, tesseract ocr, ai-assisted
interpretation, and os-level automation with explicit safeguards.

highlights:
  → robust ocr noise filtering for unstable on-screen text and
    inconsistent ui layouts.
  → safeguards around input dispatch — predictable, testable
    automation behavior.
  → macos packaging: app bundling, encrypted local config, license-key
    validation, hotkeys, gui.

links:
  https://github.com/Maze77-AH
`;

    const INDIE = `indie game studio — co-founder & developer            [ 2021 — 2023 ]

stack: unreal engine 4/5 · c++ · c# · java

co-founded a multi-year indie studio. led development of a multi-year
software project, owning core systems from initial design through
production deployment and iteration.

highlights:
  → engine-level systems: state management, input handling, gameplay
    logic. clean, well-documented, maintainable codebases.
  → collaborated with a distributed team using git-based workflows,
    code reviews, and iterative development.
  → balanced technical correctness with product goals.
`;

    const FOLIA = `folia compatibility                                    [ 2024 ]

stack: java · concurrency · refactoring

migrated and refactored java plugins to satisfy folia's region-threaded
model. the interesting bug class here is "looks correct, runs correct,
crashes once a week."

highlights:
  → refactored unsafe world access patterns into region-safe scheduling.
  → eliminated async-thread access violations and slow cleanup leaks.
  → documented patterns the rest of the plugin set could re-use.

links:
  https://github.com/Maze77-AH
`;

    const LOWLEVEL = `low-level cs & systems                                [ ongoing ]

stack: c · assembly (risc-v, masm/x86) · architecture · parsing

coursework and self-study in computer architecture, assembly, c, and
operating-systems fundamentals. the kind of work that makes rust's
borrow checker feel like a friend.

  → assembly and architecture: registers, memory, calling conventions,
    instruction-level behavior, risc-style concepts.
  → c / c++ systems study: pointers, memory layout, compilation,
    os fundamentals.
  → programming languages: grammars, parsing, finite automata,
    semantics, recursive descent, shift-reduce.
`;

    const UNITED = `united exams — full-stack study platform              [ 2025 → active ]

stack: next.js (app router) · typescript · supabase · postgresql · rls · tailwind · shadcn/ui

a full-stack study platform with auth, persistent quiz attempts,
mastery / streaks, leaderboard, and a polished academic ui.

highlights:
  → designed sql schema, rls policies, and triggers / views for
    leaderboard, mastery, and streak tracking.
  → supabase auth, protected routes, account settings, password reset,
    email templates.
  → courses, quizzes, profile, settings, contact — responsive across
    desktop and mobile.
  → security fundamentals: least-privilege access, rls, validation,
    reliable session behavior.
`;

    const HEROIC = `heroic submission — game backend prototype            [ 2025 → r&d ]

stack: next.js · typescript · postgresql · api design · eos (planned)

backend foundations for an original-ip live-service multiplayer game.
public catalog api with locale / chapter filtering, account-linking
groundwork, and epic online services planning for cross-progression.

highlights:
  → catalog endpoint:
      get /api/heroic-submission/v1/catalog
    returns success, requestid, data.meta, currentchapterkey, chapters,
    paragons, operators, incidentzones, chapterpasstiers, directives,
    cosmetics.
  → reads public hs catalog tables; excludes internal release_state and
    parent chapter data.
  → public / private boundaries treated as a first-class design concern.
  → planning eos integration for multiplayer / account foundation.
`;

    const PORTSHELL = `interactive portfolio shell                           [ 2026 ]

stack: html · css · javascript · github pages · cloudflare

this site. hand-written html / css / js with an interactive
terminal-style repl, command history, project search, view transitions,
and accessible mobile nav — no frameworks.

highlights:
  → real repl with virtual filesystem (you're using it).
  → command palette (⌘k), keyboard shortcuts, theme toggle, live local
    time pinned to berkeley.
  → deployed via github pages with a cloudflare-managed custom domain.
`;

    return {
      '/': d({
        'README.md':       f(README),
        'about.md':        f(ABOUT),
        'principles.md':   f(PRINCIPLES),
        'stack.txt':       f(STACK),
        'contact.txt':     f(CONTACT),
        'education.txt':   f(EDU),
        'projects':        d({
          'realfiction.md':       f(REALFIC),
          'nemesisssbu.md':       f(NEMESIS),
          'united-exams.md':      f(UNITED),
          'heroic-submission.md': f(HEROIC),
          'realchat.md':          f(REALCHAT),
          'folia.md':             f(FOLIA),
          'portfolio-shell.md':   f(PORTSHELL),
          'indie-studio.md':      f(INDIE),
          'lowlevel.md':          f(LOWLEVEL),
        }),
        '.secrets':        d({
          'easter.md': f("you found it.\n\ntry the konami code: ↑↑↓↓←→←→ b a\nor type 'fortune' for a quote.\n\np.s. real recruiters get an actual cover letter.\n"),
        }),
      }),
    };
  })();

  function initTerminal() {
    const term = document.getElementById('term');
    if (!term) return null;
    const out = document.getElementById('termOutput');
    const form = document.getElementById('termForm');
    const input = document.getElementById('termInput');
    const expandBtn = document.getElementById('termExpand');
    const clearBtn = document.getElementById('termClear');
    const cwdEls = $$('[data-cwd]', term);
    if (!out || !form || !input) return null;

    let cwd = '/';
    const history = [];
    let historyIdx = -1;

    /* ---- output helpers ---- */
    const escape = s => String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const linkify = s => {
      // Turn URLs into anchor tags after escaping
      return s.replace(/https?:\/\/[^\s<>"]+/g, m => `<a href="${m}" target="_blank" rel="noreferrer">${m}</a>`);
    };

    const print = (html, kind = '') => {
      const div = document.createElement('div');
      div.className = 'term-line ' + kind;
      div.innerHTML = html;
      out.appendChild(div);
      out.scrollTop = out.scrollHeight;
    };
    const printText = (text, kind = '') => print(linkify(escape(text)), kind);
    const printErr = text => print(`<span class="err">${escape(text)}</span>`);
    const printInfo = text => print(`<span class="info">${escape(text)}</span>`);
    const printOk = text => print(`<span class="ok">${escape(text)}</span>`);
    const newline = () => print('&nbsp;');

    const echoCommand = raw => {
      const safe = escape(raw);
      const promptHTML = `<span class="cmd"><span class="term-user">nicholas</span><span class="term-at">@</span><span class="term-host">portfolio</span><span class="term-colon">:</span><span class="term-path">${escape(displayCwd())}</span><span class="term-sigil"> $</span> <span class="cmd-name">${safe}</span></span>`;
      print(promptHTML);
    };

    /* ---- path helpers ---- */
    const displayCwd = () => cwd === '/' ? '~' : '~' + cwd;
    const updateCwdEls = () => cwdEls.forEach(el => { el.textContent = displayCwd(); });

    const resolvePath = (p) => {
      if (!p) return cwd;
      let path = p;
      if (path === '~') path = '/';
      else if (path.startsWith('~/')) path = path.slice(1);
      else if (!path.startsWith('/')) path = (cwd === '/' ? '/' : cwd + '/') + path;
      // Normalize ./ and ../
      const parts = path.split('/').filter(Boolean);
      const out = [];
      for (const seg of parts) {
        if (seg === '.') continue;
        if (seg === '..') out.pop();
        else out.push(seg);
      }
      return '/' + out.join('/');
    };

    const lookup = (path) => {
      const p = resolvePath(path);
      if (p === '/') return FS['/'];
      const segs = p.split('/').filter(Boolean);
      let node = FS['/'];
      for (const s of segs) {
        if (!node || node.type !== 'dir') return null;
        node = node.children[s];
        if (!node) return null;
      }
      return node;
    };

    /* ---- commands ---- */
    const COMMANDS = {
      help: {
        desc: 'list commands',
        run: () => {
          const rows = [
            ['help',                'list commands'],
            ['ls [path]',           'list files in current or given dir'],
            ['cd <path>',           'change directory (~, .., projects, /)'],
            ['cat <file>',          'print a file'],
            ['pwd',                 'print working directory'],
            ['tree',                'print full filesystem tree'],
            ['echo <text>',         'echo back text'],
            ['clear',               'clear the screen'],
            ['history',             'show command history'],
            ['date',                'current date and time'],
            ['uptime',              'shipping uptime since 2021'],
            ['neofetch',            'system info card'],
            ['whoami',              'short bio'],
            ['fortune',             'a quote, from someone'],
            ['theme [light|dark]',  'toggle or set theme'],
            ['goto <id>',           'scroll the page to a section'],
            ['email',               'open mail client to nicholaslasagna@gmail.com'],
            ['resume',              'open the resume pdf'],
            ['github [alt]',        'open the primary or alt github profile'],
            ['linkedin',            'open linkedin'],
            ['exit',                'collapse the terminal'],
            ['tour',                'guided walkthrough of this site'],
          ];
          const w = Math.max(...rows.map(r => r[0].length));
          const lines = rows.map(([k, v]) => `  ${k.padEnd(w + 2)}${v}`).join('\n');
          printText(lines);
        }
      },

      ls: {
        desc: 'list files',
        run: (args) => {
          const target = args[0] || cwd;
          const node = lookup(target);
          if (!node) return printErr(`ls: cannot access '${target}': no such file or directory`);
          if (node.type === 'file') return printText(target);
          const entries = Object.entries(node.children).sort((a, b) => {
            // dirs first, then files
            if (a[1].type !== b[1].type) return a[1].type === 'dir' ? -1 : 1;
            return a[0].localeCompare(b[0]);
          });
          const cols = entries.map(([name, n]) => {
            const display = n.type === 'dir' ? `<span class="info">${escape(name)}/</span>` : escape(name);
            return display;
          });
          // Render as wrapping grid (mono spacing)
          print(cols.join('   '));
        }
      },

      cd: {
        desc: 'change directory',
        run: (args) => {
          const target = args[0] || '/';
          if (target === '-') { cwd = '/'; updateCwdEls(); return; }
          const path = resolvePath(target);
          const node = lookup(path);
          if (!node) return printErr(`cd: ${target}: no such file or directory`);
          if (node.type !== 'dir') return printErr(`cd: ${target}: not a directory`);
          cwd = path;
          updateCwdEls();
        }
      },

      cat: {
        desc: 'print file',
        run: (args) => {
          if (!args.length) return printErr('cat: missing operand. try: cat about.md');
          for (const a of args) {
            const node = lookup(a);
            if (!node) { printErr(`cat: ${a}: no such file or directory`); continue; }
            if (node.type === 'dir') { printErr(`cat: ${a}: is a directory`); continue; }
            printText(node.content.trimEnd());
          }
        }
      },

      pwd: { desc: 'print working dir', run: () => printText(displayCwd()) },

      tree: {
        desc: 'print full tree',
        run: () => {
          const lines = ['~/'];
          const walk = (node, prefix) => {
            const keys = Object.keys(node.children);
            keys.forEach((k, i) => {
              const last = i === keys.length - 1;
              const child = node.children[k];
              lines.push(prefix + (last ? '└── ' : '├── ') + (child.type === 'dir' ? k + '/' : k));
              if (child.type === 'dir') walk(child, prefix + (last ? '    ' : '│   '));
            });
          };
          walk(FS['/'], '');
          printText(lines.join('\n'));
        }
      },

      echo: { desc: 'echo', run: (args) => printText(args.join(' ')) },

      clear: { desc: 'clear', run: () => { out.innerHTML = ''; } },

      history: {
        desc: 'show history',
        run: () => {
          if (!history.length) return printText('  (no commands yet)');
          const lines = history.map((h, i) => `  ${(i + 1).toString().padStart(3)}  ${h}`).join('\n');
          printText(lines);
        }
      },

      date: {
        desc: 'date and time',
        run: () => printText(new Date().toString())
      },

      uptime: {
        desc: 'uptime',
        run: () => {
          const start = new Date('2021-06-01');
          const now = new Date();
          const yrs = ((now - start) / (1000 * 60 * 60 * 24 * 365.25)).toFixed(2);
          printText(`shipping uptime: ${yrs} years (since 2021).
no scheduled maintenance windows. occasional production fires.`);
        }
      },

      whoami: { desc: 'short bio', run: () => printText('nicholas lasagna — software engineer · texas tech \'27 · berkeley, ca.\nopen to summer 2026 swe internships.') },

      fortune: {
        desc: 'a quote',
        run: () => {
          const lines = [
            '"premature optimization is the root of all evil." — donald knuth',
            '"the cheapest, fastest, and most reliable components are those that aren\'t there." — gordon bell',
            '"there are 2 hard problems in computer science: cache invalidation, naming things, and off-by-one errors."',
            '"weeks of programming can save you hours of planning."',
            '"the best code is the code you didn\'t have to write."',
            '"if it doesn\'t panic in development, it will panic in production."',
            '"the type system is the test suite you wrote in advance." — me, probably',
          ];
          printText(lines[Math.floor(Math.random() * lines.length)]);
        }
      },

      neofetch: {
        desc: 'system info',
        run: () => {
          const ascii = `         .---.
       .'_:___\".
       |__ --==|
       [  ]  :[|
       |__| I=[|
       / / ____|
      |-/.____.'
     /___\\ /___\\`;

          const start = new Date('2021-06-01');
          const yrs = ((Date.now() - start) / (1000 * 60 * 60 * 24 * 365.25)).toFixed(1);

          const rows = [
            ['user',   'nicholas@portfolio'],
            ['os',     'nicholaslasagna.com (static, hand-written)'],
            ['kernel', 'inter / instrument-serif / jetbrains-mono'],
            ['shell',  'js (esm, no deps)'],
            ['uptime', `${yrs} years (shipping since 2021)`],
            ['edu',    'texas tech university — b.s. cs (\'27)'],
            ['stack',  'rust · java · typescript · python · c++'],
            ['active', 'united exams · heroic submission · realfiction'],
            ['focus',  'systems · runtime · infra · backend / platform'],
            ['status', 'open to summer 2026 swe internships'],
          ];

          const rowHtml = rows.map(([k, v]) => `<span class="k">${escape(k)}</span> <span class="v">${linkify(escape(v))}</span>`).join('\n');

          print(`<div class="ascii-block"><pre>${escape(ascii)}</pre><div class="info-rows">${rowHtml}</div></div>`);
        }
      },

      theme: {
        desc: 'toggle/set theme',
        run: (args) => {
          const html = document.documentElement;
          const cur = html.getAttribute('data-theme') || 'dark';
          let next;
          if (args[0] === 'light' || args[0] === 'dark') next = args[0];
          else next = cur === 'light' ? 'dark' : 'light';
          if (next === 'light') html.setAttribute('data-theme', 'light');
          else html.setAttribute('data-theme', 'dark');
          try { localStorage.setItem('theme', next); } catch {}
          $('#themeBtn')?.setAttribute('aria-pressed', next === 'light' ? 'true' : 'false');
          printOk(`theme set to ${next}.`);
        }
      },

      goto: {
        desc: 'scroll to section',
        run: (args) => {
          if (!args[0]) return printErr('goto: missing section. try: goto projects');
          const id = args[0].replace(/^#/, '');
          if (!document.getElementById(id)) return printErr(`goto: section '${id}' not found.`);
          window.__scrollToId?.(id);
          printOk(`scrolled to #${id}.`);
        }
      },

      email: {
        desc: 'open mail',
        run: () => {
          window.location.href = 'mailto:nicholaslasagna@gmail.com';
          printOk('opening mail to nicholaslasagna@gmail.com');
        }
      },

      resume: {
        desc: 'open resume',
        run: () => { window.open('Resume.pdf', '_blank'); printOk('opening Resume.pdf'); }
      },

      github: {
        desc: 'open github',
        run: (args) => {
          const url = args[0] === 'alt' ? 'https://github.com/NemesisSSBU' : 'https://github.com/Maze77-AH';
          window.open(url, '_blank'); printOk(`opening ${url}`);
        }
      },

      linkedin: {
        desc: 'open linkedin',
        run: () => { window.open('https://www.linkedin.com/in/nicholas-lasagna-798118277', '_blank'); printOk('opening linkedin'); }
      },

      exit: {
        desc: 'close terminal',
        run: () => {
          term.classList.remove('is-full');
          newline();
          printInfo('terminal collapsed. press ` to focus again.');
        }
      },

      tour: {
        desc: 'guided walkthrough',
        run: async () => {
          const stops = [
            { id: 'shell',     msg: 'you are here. an actual shell, in the page.' },
            { id: 'work',      msg: 'selected work — two live, public-facing systems.' },
            { id: 'projects',  msg: 'all projects, filterable. try the "rust" search.' },
            { id: 'principles',msg: 'six engineering opinions, earned the hard way.' },
            { id: 'about',     msg: 'short bio + texas tech timeline.' },
            { id: 'stack',     msg: 'honest stack — what i\'ve actually shipped with.' },
            { id: 'contact',   msg: 'fastest way to reach me.' },
          ];
          for (const s of stops) {
            window.__scrollToId?.(s.id);
            printInfo(`#${s.id}: ${s.msg}`);
            await new Promise(r => setTimeout(r, reduceMotion() ? 250 : 1100));
          }
          printOk('tour complete. \\;\\)');
          window.__scrollToId?.('shell');
        }
      },

      // Light easter eggs
      vim:    { desc: 'jk', run: () => printErr("you don't need vim here. try ':q' anyway. just kidding, you can't quit.") },
      nano:   { desc: 'jk', run: () => printErr('nano is not installed. (this is a portfolio.)') },
      emacs:  { desc: 'jk', run: () => printErr('emacs would be too much for a static site. try `vim`.') },
      ssh:    { desc: 'jk', run: () => printErr('ssh: connect to host portfolio port 22: connection refused.') },
      sudo:   { desc: 'jk', run: () => printErr('user is not in the sudoers file. this incident will not be reported.') },
      rm:     { desc: 'jk', run: (a) => printErr(a.includes('-rf') ? 'i admire your courage. permission denied.' : 'rm: try cat instead.') },
      'man':  { desc: 'show command help', run: (args) => {
        if (!args[0]) return printErr('what manual page do you want? try: man cat');
        const c = COMMANDS[args[0]];
        if (!c) return printErr(`no manual entry for ${args[0]}`);
        printText(`NAME\n  ${args[0]} — ${c.desc}\n\nSEE ALSO\n  help`);
      }},
    };

    // Aliases
    COMMANDS['?']  = COMMANDS.help;
    COMMANDS['h']  = COMMANDS.help;
    COMMANDS['ll'] = COMMANDS.ls;
    COMMANDS['dir']= COMMANDS.ls;

    /* ---- runner ---- */
    const tokenize = (line) => line.trim().match(/(?:[^\s"]+|"[^"]*")+/g) || [];

    const run = async (raw) => {
      const trimmed = raw.trim();
      if (!trimmed) { newline(); return; }
      history.push(trimmed);
      historyIdx = -1;
      echoCommand(trimmed);

      const parts = tokenize(trimmed);
      const name = parts.shift().toLowerCase();
      const args = parts.map(s => s.replace(/^"|"$/g, ''));
      const cmd = COMMANDS[name];
      if (!cmd) {
        printErr(`${name}: command not found. try 'help'.`);
        return;
      }
      try { await cmd.run(args); }
      catch (e) { printErr(`${name}: error: ${e.message || e}`); }
    };

    /* ---- autocomplete ---- */
    const complete = (line) => {
      const parts = line.split(/\s+/);
      if (parts.length === 1) {
        const matches = Object.keys(COMMANDS).filter(c => c.startsWith(parts[0]));
        return matches.length === 1 ? matches[0] + ' ' : null;
      }
      // Path completion for last token
      const last = parts[parts.length - 1] || '';
      let dirPath = cwd, prefix = last;
      const slash = last.lastIndexOf('/');
      if (slash >= 0) {
        dirPath = resolvePath(last.slice(0, slash) || '/');
        prefix = last.slice(slash + 1);
      } else if (last.startsWith('~')) {
        dirPath = '/'; prefix = last.slice(2);
      }
      const node = lookup(dirPath);
      if (!node || node.type !== 'dir') return null;
      const matches = Object.keys(node.children).filter(n => n.startsWith(prefix));
      if (matches.length !== 1) {
        if (matches.length > 1) {
          newline(); printText('  ' + matches.join('   '));
        }
        return null;
      }
      const match = matches[0];
      const head = parts.slice(0, -1).join(' ');
      const dir = (slash >= 0) ? last.slice(0, slash + 1) : '';
      const completed = (head ? head + ' ' : '') + dir + match + (node.children[match].type === 'dir' ? '/' : ' ');
      return completed;
    };

    /* ---- focus / events ---- */
    term.addEventListener('click', e => {
      // Don't steal focus from buttons/links
      if (e.target instanceof Element && e.target.closest('a, button, input')) return;
      input.focus();
    });

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const v = input.value;
      input.value = '';
      await run(v);
    });

    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!history.length) return;
        if (historyIdx === -1) historyIdx = history.length - 1;
        else if (historyIdx > 0) historyIdx--;
        input.value = history[historyIdx] || '';
        // move cursor to end
        setTimeout(() => input.setSelectionRange(input.value.length, input.value.length), 0);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (historyIdx === -1) return;
        if (historyIdx < history.length - 1) {
          historyIdx++;
          input.value = history[historyIdx];
        } else {
          historyIdx = -1;
          input.value = '';
        }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        const completed = complete(input.value);
        if (completed) input.value = completed;
      } else if (e.ctrlKey && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        out.innerHTML = '';
      } else if (e.ctrlKey && (e.key === 'c' || e.key === 'C')) {
        // visually echo the prompt and abort current input
        echoCommand(input.value + '^C');
        input.value = '';
      }
    });

    /* ---- bar buttons ---- */
    expandBtn?.addEventListener('click', () => {
      term.classList.toggle('is-full');
      input.focus();
    });
    clearBtn?.addEventListener('click', () => { out.innerHTML = ''; input.focus(); });
    $$('.t-dot', term).forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-action');
        if (action === 'exit') { term.classList.remove('is-full'); }
        if (action === 'expand') { term.classList.toggle('is-full'); input.focus(); }
        if (action === 'minimize') { /* no-op for inline; fullscreen already toggles */ term.classList.remove('is-full'); }
      });
    });

    /* ---- global focus shortcut: ` ---- */
    document.addEventListener('keydown', e => {
      const inField = e.target instanceof Element && (e.target.matches('input, textarea') || e.target.isContentEditable);
      if (inField) return;
      if (e.key === '`' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        window.__scrollToId?.('shell');
        setTimeout(() => input.focus(), 200);
      } else if (e.key === 'Escape' && term.classList.contains('is-full')) {
        term.classList.remove('is-full');
      }
    });

    /* ---- boot sequence ---- */
    updateCwdEls();
    const start = new Date('2021-06-01');
    const yrs = ((Date.now() - start) / (1000 * 60 * 60 * 24 * 365.25)).toFixed(1);
    printInfo(`nicholas@portfolio v2.7.0 — uptime ${yrs}y`);
    printText(`type 'help' for commands. try 'cat about.md', 'tour', or 'neofetch'.`);
    newline();

    return {
      run: (s) => run(s),
      focus: () => input.focus(),
    };
  }

  /* ==========================================================================
     LIVE GITHUB ACTIVITY — public events + heatmap
     ========================================================================== */

  const GITHUB_USER = 'Maze77-AH';

  function relTime(date) {
    const d = (Date.now() - date.getTime()) / 1000;
    if (d < 60) return `${Math.floor(d)}s`;
    if (d < 3600) return `${Math.floor(d / 60)}m`;
    if (d < 86400) return `${Math.floor(d / 3600)}h`;
    if (d < 86400 * 30) return `${Math.floor(d / 86400)}d`;
    if (d < 86400 * 365) return `${Math.floor(d / (86400 * 30))}mo`;
    return `${Math.floor(d / (86400 * 365))}y`;
  }

  function eventIcon(type) {
    switch (type) {
      case 'PushEvent':         return '↟';
      case 'CreateEvent':       return '+';
      case 'DeleteEvent':       return '−';
      case 'ForkEvent':         return '⑂';
      case 'IssuesEvent':       return '!';
      case 'PullRequestEvent':  return '◐';
      case 'WatchEvent':        return '★';
      case 'PublicEvent':       return '◯';
      case 'CommitCommentEvent':return '✎';
      default:                  return '·';
    }
  }

  function eventLabel(e) {
    switch (e.type) {
      case 'PushEvent':         return `pushed ${e.payload?.commits?.length || 0} commit${(e.payload?.commits?.length || 0) === 1 ? '' : 's'} to`;
      case 'CreateEvent':       return `created ${e.payload?.ref_type || 'something'} on`;
      case 'DeleteEvent':       return `deleted ${e.payload?.ref_type || 'something'} on`;
      case 'ForkEvent':         return 'forked';
      case 'IssuesEvent':       return `${e.payload?.action || 'updated'} issue on`;
      case 'PullRequestEvent':  return `${e.payload?.action || 'updated'} pull request on`;
      case 'WatchEvent':        return 'starred';
      case 'PublicEvent':       return 'made public';
      default:                  return e.type.replace(/Event$/, '').toLowerCase() + ' on';
    }
  }

  async function initGithubActivity() {
    const root = document.getElementById('activity');
    if (!root) return;
    const heatmap = root.querySelector('#heatmap');
    const feed = root.querySelector('#feed');
    const status = root.querySelector('[data-feed-status]');
    if (!heatmap || !feed) return;

    /* ---- heatmap shell: 52 weeks × 7 days ---- */
    const WEEKS = 52;
    const cells = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Move to Saturday end-of-week so columns line up nicely
    const endDay = new Date(today);
    const startDay = new Date(today);
    startDay.setDate(startDay.getDate() - (WEEKS * 7 - 1));

    const dayKey = (d) => d.toISOString().slice(0, 10);
    const cellByDay = new Map();
    for (let i = 0; i < WEEKS * 7; i++) {
      const d = new Date(startDay);
      d.setDate(d.getDate() + i);
      const key = dayKey(d);
      const el = document.createElement('div');
      el.className = 'heatmap-cell';
      el.title = `${key}: 0 events`;
      el.dataset.date = key;
      heatmap.appendChild(el);
      cells.push(el);
      cellByDay.set(key, el);
    }

    /* ---- fetch events ---- */
    let events = [];
    try {
      const r = await fetch(`https://api.github.com/users/${GITHUB_USER}/events/public?per_page=30`, {
        headers: { 'Accept': 'application/vnd.github+json' }
      });
      if (!r.ok) throw new Error('api ' + r.status);
      let raw = await r.json();
      if (!Array.isArray(raw)) raw = [];
      // Drop empty / no-op pushes and other meaningless events
      events = raw.filter(e => {
        if (e.type === 'PushEvent') {
          const n = e.payload?.commits?.length || e.payload?.distinct_size || 0;
          return n > 0;
        }
        // Keep meaningful event types
        return ['CreateEvent','PullRequestEvent','IssuesEvent','ReleaseEvent','ForkEvent','PublicEvent','CommitCommentEvent'].includes(e.type);
      });
      if (status) {
        if (events.length) {
          status.innerHTML = `${events.length} recent event${events.length === 1 ? '' : 's'} · refreshed <span data-refreshed>just now</span>`;
        } else {
          status.innerHTML = `<span class="dim">no recent public commits — most current work lives in private repos.</span>`;
        }
      }
    } catch (err) {
      if (status) status.innerHTML = `<span class="dim">offline / rate-limited — see <a class="ink" href="https://github.com/${GITHUB_USER}" target="_blank" rel="noreferrer">github.com/${GITHUB_USER}</a>.</span>`;
    }

    /* ---- populate heatmap ---- */
    const counts = {};
    for (const e of events) {
      const k = (e.created_at || '').slice(0, 10);
      if (!k) continue;
      counts[k] = (counts[k] || 0) + 1;
    }
    const maxCount = Math.max(1, ...Object.values(counts));
    for (const [k, n] of Object.entries(counts)) {
      const el = cellByDay.get(k);
      if (!el) continue;
      const ratio = n / maxCount;
      let level = 1;
      if (ratio > 0.75) level = 4;
      else if (ratio > 0.5) level = 3;
      else if (ratio > 0.25) level = 2;
      el.classList.add('l-' + level);
      el.title = `${k}: ${n} event${n === 1 ? '' : 's'}`;
    }

    /* ---- populate feed ---- */
    feed.innerHTML = '';
    if (!events.length) {
      const li = document.createElement('li');
      li.innerHTML = `<span class="ev-icon">·</span><span><span class="ev-when">—</span><span class="ev-msg dim">no recent public events. check back soon, or open <a class="ink" href="https://github.com/${GITHUB_USER}" target="_blank" rel="noreferrer">github.com/${GITHUB_USER}</a>.</span></span>`;
      feed.appendChild(li);
      return;
    }
    events.slice(0, 6).forEach(e => {
      const li = document.createElement('li');
      const when = e.created_at ? relTime(new Date(e.created_at)) : '—';
      const repo = e.repo?.name || 'somewhere';
      const repoUrl = `https://github.com/${repo}`;
      const label = eventLabel(e);
      const icon = eventIcon(e.type);
      let msg = '';
      if (e.type === 'PushEvent' && e.payload?.commits?.length) {
        msg = `<span class="ev-msg">${(e.payload.commits[0].message || '').split('\n')[0].slice(0, 80)}</span>`;
      }
      li.innerHTML = `
        <span class="ev-icon">${icon}</span>
        <span>
          <span class="ev-when">${when}</span> ${label} <a class="ev-repo ink" href="${repoUrl}" target="_blank" rel="noreferrer">${repo}</a>
          ${msg}
        </span>`;
      feed.appendChild(li);
    });
  }

  /* ==========================================================================
     SIGNATURE — animate stroke when in view
     ========================================================================== */
  function initSignature() {
    const sig = document.querySelector('.signature');
    if (!sig) return;
    if (reduceMotion()) { sig.classList.add('draw'); return; }
    const obs = new IntersectionObserver((entries, observer) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          sig.classList.add('draw');
          observer.unobserve(e.target);
        }
      });
    }, { threshold: 0.3 });
    obs.observe(sig);
  }

  /* ==========================================================================
     ENTRANCE — curtain that drops on first paint
     ========================================================================== */
  function initEntrance() {
    const el = document.getElementById('entrance');
    if (!el) return;

    if (reduceMotion()) {
      // Skip animation entirely
      el.remove();
      document.body.classList.add('entrance-done');
      return;
    }

    let seen = false;
    try { seen = sessionStorage.getItem('entrance-done') === '1'; } catch {}

    if (seen) {
      el.remove();
      document.body.classList.add('entrance-done');
      return;
    }

    // Wait until the first paint settles, then leave
    const minDuration = 700;
    const startedAt = performance.now();
    const finish = () => {
      const elapsed = performance.now() - startedAt;
      const wait = Math.max(0, minDuration - elapsed);
      setTimeout(() => {
        el.classList.add('is-leaving');
        setTimeout(() => {
          document.body.classList.add('entrance-done');
          el.remove();
          try { sessionStorage.setItem('entrance-done', '1'); } catch {}
        }, 480);
      }, wait);
    };

    if (document.readyState === 'complete') finish();
    else window.addEventListener('load', finish, { once: true });
  }

  /* ==========================================================================
     HERO WORD REVEAL — split text, stagger
     ========================================================================== */
  function initWordReveal() {
    const targets = $$('[data-reveal-words]');
    if (!targets.length) return;

    targets.forEach(target => {
      const stride = 60; // ms between words
      let idx = 0;

      // Walk children: split text nodes into per-word spans, leave element
      // children (em, span.cursor-blink) alone but still wrap their text content.
      const wrapText = (text, startIdx) => {
        const frag = document.createDocumentFragment();
        const parts = text.split(/(\s+)/);
        let i = startIdx;
        parts.forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(part));
            return;
          }
          const wrap = document.createElement('span');
          wrap.className = 'w';
          const inner = document.createElement('span');
          inner.textContent = part;
          inner.style.setProperty('--word-delay', `${i * stride}ms`);
          wrap.appendChild(inner);
          frag.appendChild(wrap);
          i++;
        });
        return { frag, next: i };
      };

      const walk = (node) => {
        const kids = Array.from(node.childNodes);
        for (const kid of kids) {
          if (kid.nodeType === Node.TEXT_NODE) {
            if (!kid.textContent.trim()) continue;
            const { frag, next } = wrapText(kid.textContent, idx);
            idx = next;
            kid.replaceWith(frag);
          } else if (kid.nodeType === Node.ELEMENT_NODE) {
            // Skip the cursor blink — it shouldn't animate as a word
            if (kid.classList?.contains('cursor-blink')) continue;
            walk(kid);
          }
        }
      };

      walk(target);
    });
  }

  /* ==========================================================================
     PINNED PRINCIPLES — sticky scroll stage
     ========================================================================== */
  function initPinnedPrinciples() {
    const section = document.getElementById('principles');
    if (!section || !section.classList.contains('principles-pinned')) return;
    const container = document.getElementById('pinContainer');
    const stage = section.querySelector('.pin-stage');
    const items = $$('.principles > li', section);
    const cur = section.querySelector('.pin-cur');
    const fill = document.getElementById('pinBarFill');
    if (!container || !stage || items.length === 0) return;

    const mq = window.matchMedia('(max-width: 940px)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    const setActive = (n) => {
      const idx = clamp(n, 0, items.length - 1);
      items.forEach((el, i) => el.classList.toggle('is-active', i === idx));
      if (cur) cur.textContent = String(idx + 1).padStart(2, '0');
      if (fill) fill.style.width = `${((idx + 1) / items.length) * 100}%`;
      section.classList.toggle('pin-done', idx === items.length - 1);
    };

    const isPinDisabled = () => mq.matches || reduced.matches;

    const onScroll = () => {
      if (isPinDisabled()) {
        items.forEach(el => el.classList.add('is-active'));
        return;
      }
      const rect = container.getBoundingClientRect();
      const headerH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 64;
      const stageH = window.innerHeight - headerH;

      const total = container.offsetHeight - stageH;
      const traveled = clamp(-rect.top, 0, total);
      const progress = total > 0 ? (traveled / total) : 0;

      // Map progress to a discrete principle. Use a fractional with rounding so
      // the active item changes near each step boundary.
      const idx = Math.min(items.length - 1, Math.floor(progress * items.length + 0.0001));
      setActive(idx);
    };

    // Initialize: only first item active
    items.forEach((el, i) => el.classList.toggle('is-active', i === 0));
    if (cur) cur.textContent = '01';
    if (fill) fill.style.width = `${(1 / items.length) * 100}%`;

    if (isPinDisabled()) {
      items.forEach(el => el.classList.add('is-active'));
      return;
    }

    let raf = 0;
    const tick = () => {
      raf = 0;
      onScroll();
    };
    window.addEventListener('scroll', () => {
      if (raf) return;
      raf = requestAnimationFrame(tick);
    }, { passive: true });
    window.addEventListener('resize', tick, { passive: true });
    onScroll();

    // React if user toggles reduced-motion / mobile breakpoint mid-session
    const onMq = () => {
      if (isPinDisabled()) {
        items.forEach(el => el.classList.add('is-active'));
      } else {
        onScroll();
      }
    };
    mq.addEventListener?.('change', onMq);
    reduced.addEventListener?.('change', onMq);
  }

  /* ==========================================================================
     SECTION PROGRESS RAIL — right-edge dots
     ========================================================================== */
  function initSectionRail() {
    const rail = document.getElementById('rail');
    if (!rail) return;
    const links = $$('a[data-rail-id]', rail);
    if (!links.length) return;

    const map = new Map();
    links.forEach(a => {
      const id = a.getAttribute('data-rail-id');
      const target = id ? document.getElementById(id) : null;
      if (target) map.set(target, a);
    });

    const setCurrent = (el) => {
      links.forEach(a => a.removeAttribute('data-current'));
      const a = map.get(el);
      a?.setAttribute('data-current', 'true');
    };

    const obs = new IntersectionObserver(entries => {
      const visible = entries
        .filter(e => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible?.target) setCurrent(visible.target);
    }, {
      threshold: [0.18, 0.4, 0.6],
      rootMargin: '-25% 0px -55% 0px',
    });

    map.forEach((_, el) => obs.observe(el));
  }

  /* ==========================================================================
     CURSOR-FOLLOW CHIP — agency-style hover preview
     ========================================================================== */
  function initCursorChip() {
    const chip = document.getElementById('cursorChip');
    if (!chip) return;
    if (reduceMotion()) return;
    if (matchMedia('(pointer: coarse)').matches) return;

    const text = $('.cc-text', chip);
    const targets = $$('.project, .feature, .stack-card');

    let raf = 0, x = 0, y = 0, tx = 0, ty = 0, active = false;

    const onMove = (e) => {
      tx = e.clientX; ty = e.clientY;
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const loop = () => {
      // Subtle lerp for buttery feel
      x += (tx - x) * 0.32;
      y += (ty - y) * 0.32;
      chip.style.transform = `translate(calc(${x}px - 50%), calc(${y - 28}px - 50%)) scale(${active ? 1 : 0.7})`;
      raf = 0;
      if (active && (Math.abs(tx - x) > 0.2 || Math.abs(ty - y) > 0.2)) {
        raf = requestAnimationFrame(loop);
      }
    };

    const setActive = (label) => {
      active = !!label;
      if (label && text) text.textContent = label;
      chip.classList.toggle('on', active);
      if (active && !raf) raf = requestAnimationFrame(loop);
    };

    targets.forEach(el => {
      const label = el.classList.contains('feature')
        ? 'Read'
        : el.classList.contains('stack-card')
        ? '—'
        : 'Open';

      el.addEventListener('mouseenter', () => setActive(label));
      el.addEventListener('mouseleave', () => setActive(false));
      el.addEventListener('mousemove', onMove);
    });

    // If user moves outside any target, ensure we lerp the chip back to mouse
    document.addEventListener('mousemove', e => {
      tx = e.clientX; ty = e.clientY;
    }, { passive: true });
  }

  /* -------- boot -------- */
  function boot() {
    initHeaderHeight();
    initEntrance();
    initWordReveal();
    initTheme();
    initYear();
    initLocalTime();
    initCursorGlow();
    initMagnetic();
    initAnchorOffset();
    initActiveSection();
    initSectionRail();
    initMobileNav();

    const projects = initProjects();
    initModal();
    initPalette(projects);
    initContactCopy();
    initFootTop();
    initReveal();
    initKeyboardNav(projects);
    initKonami();

    // New: terminal, signature, github, pinned principles, cursor chip
    initTerminal();
    initSignature();
    initGithubActivity();
    initPinnedPrinciples();
    initCursorChip();

    consoleSignature();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
