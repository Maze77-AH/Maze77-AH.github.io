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

  /* -------- local time -------- */
  function initLocalTime() {
    const el = $('[data-local-time]');
    const zoneEl = $('[data-local-zone]');
    if (!el) return;

    const fmt = new Intl.DateTimeFormat([], {
      hour: 'numeric', minute: '2-digit', hour12: true,
    });

    const tick = () => {
      const now = new Date();
      el.textContent = fmt.format(now).replace(' ', '');
      if (zoneEl) {
        try {
          const parts = new Intl.DateTimeFormat([], { timeZoneName: 'short' }).formatToParts(now);
          const tz = parts.find(p => p.type === 'timeZoneName')?.value || 'local';
          zoneEl.textContent = tz;
        } catch {}
      }
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

  /* -------- mobile nav -------- */
  function initMobileNav() {
    const nav = document.getElementById('navMobile');
    if (!nav) return;
    const summary = nav.querySelector('summary');
    const panel = nav.querySelector('.nav-panel');

    const setOpen = open => {
      nav.open = open;
      summary?.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.style.overflow = open ? 'hidden' : '';
    };

    nav.addEventListener('toggle', () => {
      const open = nav.open;
      summary?.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.style.overflow = open ? 'hidden' : '';
      const sw = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.paddingRight = open && sw > 0 ? `${sw}px` : '';
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

    nav.addEventListener('click', e => {
      const a = e.target instanceof Element ? e.target.closest('a[href]') : null;
      if (a) setOpen(false);
    });

    const mq = window.matchMedia('(max-width: 940px)');
    const onMq = () => { if (!mq.matches) setOpen(false); };
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
      { id: 'work',     label: 'Go to Selected work',  hint: 'W',  kind: 'nav', action: () => goSection('work') },
      { id: 'projects', label: 'Go to Projects',       hint: 'P',  kind: 'nav', action: () => goSection('projects') },
      { id: 'about',    label: 'Go to About',          hint: 'A',  kind: 'nav', action: () => goSection('about') },
      { id: 'stack',    label: 'Go to Stack',          hint: 'S',  kind: 'nav', action: () => goSection('stack') },
      { id: 'contact',  label: 'Go to Contact',        hint: 'C',  kind: 'nav', action: () => goSection('contact') },
      { id: 'top',      label: 'Scroll to top',        hint: 'T',  kind: 'nav', action: () => window.scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' }) },
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
      w: 'work', p: 'projects', a: 'about', s: 'stack', c: 'contact', t: 'top',
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
    const body = '%c\n\n  /usr/local/bin/portfolio\n  → looking for systems eyes? mail nicholaslasagna@gmail.com\n  → keyboard shortcuts: ⌘K palette · / search · w,p,a,s,c,t jump\n  → konami code does something\n';
    try {
      console.log(name + tag + body,
        'font: 600 14px ui-monospace, JetBrains Mono, monospace; color: #f5b94a;',
        'font: 13px ui-monospace; color: #8d8a82;',
        'font: 12px ui-monospace; color: #c8c4ba;'
      );
    } catch {}
  }

  /* -------- boot -------- */
  function boot() {
    initHeaderHeight();
    initTheme();
    initYear();
    initLocalTime();
    initCursorGlow();
    initMagnetic();
    initAnchorOffset();
    initActiveSection();
    initMobileNav();

    const projects = initProjects();
    initModal();
    initPalette(projects);
    initContactCopy();
    initFootTop();
    initReveal();
    initKeyboardNav(projects);
    initKonami();

    consoleSignature();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
