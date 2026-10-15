// =========================
// Sidebar Toggle
// =========================
document.addEventListener('DOMContentLoaded', () => {
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');

  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('sidebar-collapsed');
    });
  }

  // Auto-dismiss alerts after 5 seconds
  const alerts = document.querySelectorAll('.alert');
  alerts.forEach(alert => {
    setTimeout(() => {
      alert.style.transition = 'opacity 0.5s';
      alert.style.opacity = '0';
      setTimeout(() => alert.remove(), 500);
    }, 5000);
  });

  // Active nav link
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    if (link.getAttribute('href') === currentPath) {
      link.classList.add('active');
    }
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

