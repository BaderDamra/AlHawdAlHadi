/**
 * <theme-toggle> Web Component
 * Luxury Light / Dark mode switcher with persistence and custom events
 */
class ThemeToggle extends HTMLElement {
  connectedCallback() {
    this.render();
    this.initTheme();
    this.addEventListener("click", () => this.toggleTheme());
  }

  initTheme() {
    const urlTheme = new URLSearchParams(window.location.search).get("theme");
    const savedTheme = localStorage.getItem("alhawd_theme");
    const currentTheme = urlTheme || savedTheme || document.documentElement.getAttribute("data-theme") || "light";
    this.setTheme(currentTheme, false);
  }

  toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    const next = current === "dark" ? "light" : "dark";
    this.setTheme(next, true);
  }

  setTheme(theme, save = true) {
    document.documentElement.setAttribute("data-theme", theme);
    if (save) {
      localStorage.setItem("alhawd_theme", theme);
    }
    this.updateUI(theme);
    window.dispatchEvent(new CustomEvent("alhawd:themechange", { detail: { theme } }));
  }

  updateUI(theme) {
    const isDark = theme === "dark";
    const iconEl = this.querySelector(".theme-toggle-icon");
    const textEl = this.querySelector(".theme-toggle-text");
    if (iconEl) iconEl.textContent = isDark ? "☀️" : "🌙";
    if (textEl) textEl.textContent = isDark ? "الوضع النهاري" : "الوضع الليلي";
    this.setAttribute("aria-label", isDark ? "التبديل إلى الوضع النهاري" : "التبديل إلى الوضع الليلي");
    this.setAttribute("title", isDark ? "التبديل إلى الوضع النهاري" : "التبديل إلى الوضع الليلي");
  }

  render() {
    const isCompact = this.hasAttribute("compact");
    this.innerHTML = `
      <button type="button" class="theme-toggle-btn ${isCompact ? 'compact' : ''}" aria-label="تبديل المظهر">
        <span class="theme-toggle-icon" aria-hidden="true">🌙</span>
        ${!isCompact ? '<span class="theme-toggle-text">الوضع الليلي</span>' : ''}
      </button>
    `;
  }
}

if (!customElements.get("theme-toggle")) {
  customElements.define("theme-toggle", ThemeToggle);
}
