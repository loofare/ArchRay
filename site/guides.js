/* ==========================================================================
   ArchRay Guides Controller — Theme Toggle, Mobile Nav, Copy Code & Scroll Bar
   ========================================================================== */
(function () {
  'use strict';

  function initTheme() {
    var root = document.documentElement;
    var btn = document.getElementById('themeToggle');
    var stored = null;
    try {
      stored = localStorage.getItem('archray-theme');
    } catch {
      stored = null;
    }
    var theme = stored === 'dark' ? 'dark' : 'light';
    root.setAttribute('data-theme', theme);

    function syncLabel() {
      if (!btn) return;
      var lbl = btn.querySelector('[data-theme-label]');
      if (!lbl) return;
      var isZh = root.lang === 'zh-CN';
      lbl.textContent = theme === 'light'
        ? (isZh ? '深色' : 'Dark')
        : (isZh ? '浅色' : 'Light');
    }

    syncLabel();
    if (btn) {
      btn.addEventListener('click', function () {
        theme = theme === 'light' ? 'dark' : 'light';
        root.setAttribute('data-theme', theme);
        try {
          localStorage.setItem('archray-theme', theme);
        } catch {
          // ignore storage errors
        }
        syncLabel();
      });
    }
  }

  function initNav() {
    var toggle = document.getElementById('navToggle');
    var menu = document.getElementById('primaryNav');
    if (!toggle || !menu) return;

    function close() {
      menu.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    }

    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = !menu.classList.contains('is-open');
      menu.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    });

    menu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', close);
    });

    document.addEventListener('click', function (e) {
      if (!menu.classList.contains('is-open')) return;
      if (!menu.contains(e.target) && !toggle.contains(e.target)) close();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 1240) close();
    });
  }

  function initCopyButtons() {
    var isZh = document.documentElement.lang === 'zh-CN';
    var copiedLabel = isZh ? '已复制 ✓' : 'Copied ✓';
    var copyLabel = isZh ? '复制' : 'Copy';

    document.querySelectorAll('[data-copy-code]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var block = btn.closest('.code-block');
        var codeEl = block ? block.querySelector('pre code') : null;
        if (!codeEl) return;
        var raw = (codeEl.textContent || '').trim();
        var cleaned = raw.replace(/^\$\s+/gm, '');
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(cleaned).catch(function () {});
        }
        btn.textContent = copiedLabel;
        setTimeout(function () {
          btn.textContent = copyLabel;
        }, 1500);
      });
    });
  }

  function initScrollBar() {
    var bar = document.getElementById('scrollProgressBar');
    if (!bar) return;
    var pending = false;

    function update() {
      var scrollY = window.scrollY || window.pageYOffset || 0;
      var doc = document.documentElement;
      var max = Math.max(1, doc.scrollHeight - window.innerHeight);
      var p = Math.max(0, Math.min(1, scrollY / max));
      bar.style.setProperty('--scroll-progress', p.toFixed(4));
    }

    window.addEventListener('scroll', function () {
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () {
        pending = false;
        update();
      });
    }, { passive: true });
    update();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initTheme();
      initNav();
      initCopyButtons();
      initScrollBar();
    });
  } else {
    initTheme();
    initNav();
    initCopyButtons();
    initScrollBar();
  }
})();
