// =========================
// Toast Notification System
// =========================
window.Toast = (function () {
  let container = null;

  function getContainer() {
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  const icons = {
    success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    error:   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    warning: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    info:    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
  };

  const titles = { success: 'Berhasil', error: 'Gagal', warning: 'Perhatian', info: 'Info' };

  function show(type, message, options = {}) {
    const duration = options.duration ?? 4500;
    const title    = options.title ?? titles[type] ?? '';

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
      <div class="toast-icon">${icons[type] || icons.info}</div>
      <div class="toast-content">
        ${title ? `<div class="toast-title">${title}</div>` : ''}
        <div class="toast-msg">${message}</div>
      </div>
      <button class="toast-close" aria-label="Tutup">✕</button>
      <div class="toast-progress" style="animation-duration:${duration}ms"></div>
    `;

    function dismiss() {
      toast.classList.add('toast-hiding');
      toast.addEventListener('animationend', () => toast.remove(), { once: true });
    }

    toast.querySelector('.toast-close').addEventListener('click', dismiss);
    setTimeout(dismiss, duration);

    getContainer().appendChild(toast);
    return { dismiss };
  }

  return {
    success: (msg, opts) => show('success', msg, opts),
    error:   (msg, opts) => show('error', msg, opts),
    warning: (msg, opts) => show('warning', msg, opts),
    info:    (msg, opts) => show('info', msg, opts),
  };
})();

// =========================
// Button Loading State
// =========================
function setButtonLoading(btn, loading) {
  if (!btn) return;
  if (loading) {
    btn.dataset.originalText = btn.innerHTML;
    btn.classList.add('btn-loading');
    btn.disabled = true;
    btn.innerHTML = `<span class="btn-text">${btn.innerHTML}</span>`;
  } else {
    btn.classList.remove('btn-loading');
    btn.disabled = false;
    if (btn.dataset.originalText) {
      btn.innerHTML = btn.dataset.originalText;
      delete btn.dataset.originalText;
    }
  }
}

// =========================
// Sidebar Toggle
// =========================
document.addEventListener('DOMContentLoaded', () => {
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');

  function isMobile() {
    return window.innerWidth <= 768;
  }

  function openMobileSidebar() {
    if (sidebar) sidebar.classList.add('sidebar-mobile-open');
    if (sidebarBackdrop) sidebarBackdrop.classList.add('active');
    document.body.classList.add('no-scroll');
  }

  function closeMobileSidebar() {
    if (sidebar) sidebar.classList.remove('sidebar-mobile-open');
    if (sidebarBackdrop) sidebarBackdrop.classList.remove('active');
    document.body.classList.remove('no-scroll');
  }

  function toggleSidebar() {
    if (isMobile()) {
      if (sidebar && sidebar.classList.contains('sidebar-mobile-open')) {
        closeMobileSidebar();
      } else {
        openMobileSidebar();
      }
    } else {
      if (sidebar) sidebar.classList.toggle('sidebar-collapsed');
    }
  }

  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleSidebar();
    });
  }

  if (sidebarCloseBtn) {
    sidebarCloseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeMobileSidebar();
    });
  }

  if (sidebarBackdrop) {
    sidebarBackdrop.addEventListener('click', () => {
      closeMobileSidebar();
    });
  }

  // Close mobile sidebar on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isMobile() && sidebar && sidebar.classList.contains('sidebar-mobile-open')) {
      closeMobileSidebar();
    }
  });

  // Navigation links handling (Active link & Auto-close on mobile)
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    if (link.getAttribute('href') === currentPath) {
      link.classList.add('active');
    }
    link.addEventListener('click', () => {
      if (isMobile()) {
        closeMobileSidebar();
      }
    });
  });

  // Handle window resize cleanly
  window.addEventListener('resize', () => {
    if (!isMobile()) {
      closeMobileSidebar();
    }
  });

  // =========================
  // Form Submit — Button Loading State
  // =========================
  document.querySelectorAll('form').forEach(form => {
    // Skip forms that are just logout or delete confirm (no loading needed)
    if (form.classList.contains('no-loading')) return;

    form.addEventListener('submit', function (e) {
      const submitBtn = form.querySelector('[type="submit"]');
      if (submitBtn && !submitBtn.classList.contains('no-loading')) {
        // Small delay so validation can still cancel submission
        setTimeout(() => {
          if (!e.defaultPrevented) {
            setButtonLoading(submitBtn, true);
          }
        }, 0);
      }
    });
  });

  // Convert server-side alerts into toasts & auto-dismiss
  const alerts = document.querySelectorAll('.alert');
  alerts.forEach(alert => {
    const isSuccess = alert.classList.contains('alert-success');
    const isError   = alert.classList.contains('alert-error');
    const isWarning = alert.classList.contains('alert-warning');
    const msg = alert.textContent.trim();

    if (msg) {
      if (isSuccess) Toast.success(msg);
      else if (isError) Toast.error(msg, { duration: 6000 });
      else if (isWarning) Toast.warning(msg);
      else Toast.info(msg);
    }

    // Hide the original alert element gracefully
    alert.style.transition = 'opacity 0.3s, max-height 0.3s';
    alert.style.opacity = '0';
    alert.style.maxHeight = '0';
    alert.style.overflow = 'hidden';
    alert.style.marginBottom = '0';
    setTimeout(() => alert.remove(), 350);
  });

  // =========================
  // Theme Switcher (Dark / Light Mode)
  // =========================
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeBtnText = document.getElementById('themeBtnText');

  function updateThemeUI(theme) {
    if (!themeBtnText) return;
    if (theme === 'dark') {
      themeBtnText.textContent = 'Light Mode';
      if (themeToggleBtn) {
        themeToggleBtn.setAttribute('title', 'Ubah ke Mode Terang (Alt + T)');
        themeToggleBtn.setAttribute('aria-label', 'Ubah ke Mode Terang');
      }
    } else {
      themeBtnText.textContent = 'Dark Mode';
      if (themeToggleBtn) {
        themeToggleBtn.setAttribute('title', 'Ubah ke Mode Gelap (Alt + T)');
        themeToggleBtn.setAttribute('aria-label', 'Ubah ke Mode Gelap');
      }
    }
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    try {
      localStorage.setItem('minipos_theme', newTheme);
    } catch (e) {}
    
    updateThemeUI(newTheme);
  }

  // Initialize UI based on current active theme
  const initialTheme = document.documentElement.getAttribute('data-theme') || 'light';
  updateThemeUI(initialTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', toggleTheme);
  }

  // Keyboard shortcut: Alt + T to toggle theme anywhere
  document.addEventListener('keydown', (e) => {
    if (e.altKey && (e.key === 't' || e.key === 'T')) {
      e.preventDefault();
      toggleTheme();
    }
  });

  // Listen to OS system theme changes if user hasn't explicitly saved a preference
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      const savedTheme = localStorage.getItem('minipos_theme');
      if (!savedTheme) {
        const systemTheme = e.matches ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', systemTheme);
        updateThemeUI(systemTheme);
      }
    });
  }
});

