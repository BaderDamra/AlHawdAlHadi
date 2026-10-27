/**
 * <site-header> Web Component
 * High-end responsive navigation header with sticky blur, theme toggle, and mobile drawer
 */
class SiteHeader extends HTMLElement {
  connectedCallback() {
    this.page = this.getAttribute("page") || "home";
    this.render();
    this.setupEvents();
  }

  render() {
    const isHome = this.page === "home";
    const prefix = isHome ? "" : "/";

    this.innerHTML = `
      <header class="site-header scrolled" id="siteHeaderMain">
        <div class="container header-inner">
          <!-- Right: Brand Logo -->
          <a href="${prefix}#hero" class="brand-logo" aria-label="الحوض الهادي للإسكان">
            <svg class="brand-emblem" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M34 6L50 15V56H34V6Z" fill="#DFB97B" stroke="#B88E4A" stroke-width="1.2"/>
              <path d="M34 6L18 16V56H34V6Z" fill="#C79E5B" stroke="#B88E4A" stroke-width="1.2"/>
              <path d="M12 28L24 21V56H12V28Z" fill="#AD8340" stroke="#9E7638" stroke-width="1.1"/>
              <line x1="6" y1="56" x2="58" y2="56" stroke="#C8A265" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <div class="brand-text">
              <span class="brand-title-ar">الحوض الهادي للإسكان</span>
              <span class="brand-title-en">AL HAWD AL HADI HOUSING</span>
            </div>
          </a>

          <!-- Center: Navigation Links -->
          <nav class="main-nav" id="mainNavMenu" aria-label="القائمة الرئيسية">
            <a href="${prefix}#hero" class="nav-link ${isHome ? 'active' : ''}">الرئيسية</a>
            <a href="${prefix}#projects" class="nav-link ${!isHome ? 'active' : ''}">المشاريع</a>
            <a href="${prefix}#explorer" class="nav-link">مستكشف الشقق</a>
            <a href="${prefix}#lifestyle" class="nav-link">أسلوب الحياة</a>
            <a href="${prefix}#about" class="nav-link">عن الشركة</a>
            <a href="${prefix}#cta-banner" class="nav-link">اتصل بنا</a>
          </nav>

          <!-- Left: Actions (Theme Switcher + Booking CTA + Mobile Toggle for small screens only) -->
          <div class="header-actions">
            <theme-toggle compact></theme-toggle>
            
            <button type="button" class="btn-gold header-booking-btn" id="headerBookBtn" style="padding: 8px 18px; font-size: 0.9rem;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span>حجز موعد</span>
            </button>

            <!-- Mobile Hamburger Button (Only shown on screens <= 1024px) -->
            <button type="button" class="mobile-menu-btn" id="mobileMenuToggle" aria-label="فتح القائمة">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      <!-- Mobile Slide-Out Drawer (Hidden on desktop, opens only on mobile) -->
      <div class="mobile-drawer-backdrop" id="mobileDrawerBackdrop">
        <div class="mobile-drawer" id="mobileDrawerMenu">
          <div class="mobile-drawer-header">
            <span class="brand-title-ar">الحوض الهادي للإسكان</span>
            <button type="button" class="icon-btn" id="mobileDrawerClose" aria-label="إغلاق">✕</button>
          </div>
          <ul class="mobile-drawer-nav">
            <li><a href="${prefix}#hero" class="mobile-nav-item">الرئيسية</a></li>
            <li><a href="${prefix}#projects" class="mobile-nav-item">المشاريع السكنية</a></li>
            <li><a href="${prefix}#explorer" class="mobile-nav-item">مستكشف الشقق</a></li>
            <li><a href="${prefix}#lifestyle" class="mobile-nav-item">أسلوب الحياة</a></li>
            <li><a href="${prefix}#about" class="mobile-nav-item">عن الشركة</a></li>
            <li><a href="${prefix}#cta-banner" class="mobile-nav-item">اتصل بنا</a></li>
          </ul>
          <div style="margin-top: 20px;">
            <button type="button" class="btn-gold" style="width: 100%;" id="mobileBookBtn">
              احجز موعدك الآن
            </button>
          </div>
        </div>
      </div>
    `;
  }

  setupEvents() {
    const header = this.querySelector("#siteHeaderMain");
    window.addEventListener("scroll", () => {
      if (header) {
        header.classList.toggle("scrolled", window.scrollY > 40);
      }
    });

    const toggleBtn = this.querySelector("#mobileMenuToggle");
    const closeBtn = this.querySelector("#mobileDrawerClose");
    const backdrop = this.querySelector("#mobileDrawerBackdrop");

    if (toggleBtn && backdrop) {
      toggleBtn.addEventListener("click", () => backdrop.classList.add("open"));
    }
    if (closeBtn && backdrop) {
      closeBtn.addEventListener("click", () => backdrop.classList.remove("open"));
    }
    if (backdrop) {
      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) backdrop.classList.remove("open");
      });
    }

    this.querySelectorAll(".mobile-nav-item").forEach((item) => {
      item.addEventListener("click", () => {
        if (backdrop) backdrop.classList.remove("open");
      });
    });

    const triggerBooking = () => {
      const modal = document.querySelector("booking-modal");
      if (modal && typeof modal.openModal === "function") {
        modal.openModal();
      } else {
        const bookSec = document.getElementById("bookingSection") || document.getElementById("cta-banner");
        if (bookSec) bookSec.scrollIntoView({ behavior: "smooth" });
      }
    };

    const hBtn = this.querySelector("#headerBookBtn");
    const mBtn = this.querySelector("#mobileBookBtn");
    if (hBtn) hBtn.addEventListener("click", triggerBooking);
    if (mBtn) {
      mBtn.addEventListener("click", () => {
        if (backdrop) backdrop.classList.remove("open");
        triggerBooking();
      });
    }
  }
}

if (!customElements.get("site-header")) {
  customElements.define("site-header", SiteHeader);
}
