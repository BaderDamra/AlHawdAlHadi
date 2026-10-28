/**
 * <booking-banner> Web Component
 * Luxury Pre-Footer CTA banner with building showcase and action buttons
 */
class BookingBanner extends HTMLElement {
  connectedCallback() {
    this.render();
    this.setupEvents();
  }

  setBannerData(data) {
    this.data = data;
    this.render();
    this.setupEvents();
  }

  render() {
    const raw = this.data || {};
    const d = {
      title: raw.title || this.getAttribute("title") || "جاهز لزيارة مشروع الهدوء 2؟",
      subtitle: raw.subtitle || this.getAttribute("subtitle") || "احجز موعدك الآن واكتشف بنفسك أسلوب الحياة الذي تستحقه في بيئة متكاملة.",
      image: raw.image || this.getAttribute("image") || "/images/projects/12_footer_building_banner.webp",
      primaryText: raw.ctaText || raw.primaryText || this.getAttribute("primary-text") || "احجز موعد معاينة",
      contactText: raw.contactText || "تواصل معنا",
      whatsappNumber: raw.whatsappNumber || "962790000000"
    };

    this.innerHTML = `
      <section class="project-bottom-cta-banner component-booking-banner" id="bookingSection">
        <div class="cta-banner-inner">
          <div class="cta-banner-media">
            <img src="${d.image}" alt="معاينة المشروع" id="compCtaImg" />
          </div>
          <div class="cta-banner-content">
            <h2 class="cta-banner-title">${d.title}</h2>
            <p class="cta-banner-subtitle">${d.subtitle}</p>

            <div class="cta-banner-actions-row">
              <button type="button" class="btn btn-primary btn-gold-solid btn-lg" id="compCtaBookBtn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <span>${d.primaryText}</span>
              </button>

              <a href="https://wa.me/${d.whatsappNumber}?text=${encodeURIComponent('مرحباً، أود الاستفسار عن مشاريع الحوض الهادي للإسكان')}" target="_blank" rel="noopener" class="btn btn-secondary btn-outline-clean btn-lg">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                </svg>
                <span>${d.contactText}</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  setupEvents() {
    const btn = this.querySelector("#compCtaBookBtn");
    if (btn) {
      btn.onclick = () => {
        const modal = document.querySelector("booking-modal");
        if (modal && typeof modal.openModal === "function") {
          modal.openModal();
        }
      };
    }
  }
}

if (!customElements.get("booking-banner")) {
  customElements.define("booking-banner", BookingBanner);
}
