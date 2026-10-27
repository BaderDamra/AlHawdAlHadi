/**
 * <site-footer> Web Component
 * Supports two luxury variants:
 * - variant="full" (4-column homepage footer)
 * - variant="compact" (Single-bar luxury footer matching property listing mockups)
 */
class SiteFooter extends HTMLElement {
  connectedCallback() {
    this.variant = this.getAttribute("variant") || "full";
    this.render();
  }

  setCMSData(cmsData) {
    this.cmsData = cmsData;
    this.render();
  }

  render() {
    if (this.variant === "compact") {
      this.renderCompact();
    } else {
      this.renderFull();
    }
  }

  renderFull() {
    const f = this.cmsData?.footer || {
      contactHeading: "معلومات الاتصال",
      address: "عمان - الأردن",
      phone: "+962 6 123 4567",
      email: "info@alhawdalhadi.com",
      servicesHeading: "خدماتنا",
      services: [
        { label: "بيع الشقق", href: "#explorer" },
        { label: "إدارة الأملاك العقارية", href: "#about" },
        { label: "الاستشارات العقارية", href: "#cta-banner" },
        { label: "خدمات ما بعد البيع", href: "#cta-banner" }
      ],
      quickLinksHeading: "روابط سريعة",
      quickLinks: [
        { label: "المشاريع", href: "#projects" },
        { label: "الشقق المتوفرة", href: "#explorer" },
        { label: "عن الشركة", href: "#about" },
        { label: "اتصل بنا", href: "#cta-banner" }
      ],
      privacyText: "سياسة الخصوصية",
      termsText: "الشروط والأحكام",
      copyrightText: "جميع الحقوق محفوظة © 2026 الحوض الهادي للإسكان"
    };

    const srvHtml = (f.services || []).map((s) => `<li><a href="${s.href}">${s.label}</a></li>`).join("");
    const qlHtml = (f.quickLinks || []).map((q) => `<li><a href="${q.href}">${q.label}</a></li>`).join("");

    this.innerHTML = `
      <footer class="site-footer" id="footer">
        <div class="container">
          <div class="footer-grid">
            <!-- Column 1 (Far Right in RTL): Brand Logo & Socials -->
            <div class="footer-brand-col">
              <a href="#hero" class="brand-logo footer-brand-logo">
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

              <div class="footer-socials">
                <a href="https://instagram.com" target="_blank" rel="noopener" class="social-icon-link" aria-label="Instagram">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                  </svg>
                </a>
                <a href="https://facebook.com" target="_blank" rel="noopener" class="social-icon-link" aria-label="Facebook">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                  </svg>
                </a>
                <a href="https://youtube.com" target="_blank" rel="noopener" class="social-icon-link" aria-label="YouTube">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/>
                  </svg>
                </a>
                <a href="https://linkedin.com" target="_blank" rel="noopener" class="social-icon-link" aria-label="LinkedIn">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>
                  </svg>
                </a>
              </div>
            </div>

            <!-- Column 2 (Center-Right): Quick Links -->
            <div>
              <h4 class="footer-col-title">${f.quickLinksHeading || "روابط سريعة"}</h4>
              <ul class="footer-list">${qlHtml}</ul>
            </div>

            <!-- Column 3 (Center-Left): Our Services -->
            <div>
              <h4 class="footer-col-title">${f.servicesHeading || "خدماتنا"}</h4>
              <ul class="footer-list">${srvHtml}</ul>
            </div>

            <!-- Column 4 (Far Left): Contact Info -->
            <div>
              <h4 class="footer-col-title">${f.contactHeading || "معلومات الاتصال"}</h4>
              <ul class="footer-list">
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                  <span>${f.address || "عمان - الأردن"}</span>
                </li>
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                  <a href="tel:${(f.phone || '').replace(/\s+/g, '')}" dir="ltr">${f.phone || "+962 6 123 4567"}</a>
                </li>
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                  </svg>
                  <a href="mailto:${f.email || 'info@alhawdalhadi.com'}">${f.email || "info@alhawdalhadi.com"}</a>
                </li>
              </ul>
            </div>
          </div>

          <!-- Bottom Bar -->
          <div class="footer-bottom-bar">
            <div id="footerCopyright">${f.copyrightText || "جميع الحقوق محفوظة © 2026 الحوض الهادي للإسكان"}</div>
            <div class="footer-legal-links">
              <a href="#footer">${f.privacyText || "سياسة الخصوصية"}</a>
              <span class="legal-sep">|</span>
              <a href="#footer">${f.termsText || "الشروط والأحكام"}</a>
            </div>
          </div>
        </div>
      </footer>
    `;
  }

  renderCompact() {
    this.innerHTML = `
      <footer class="site-footer project-detail-footer">
        <div class="container footer-luxury-inner">
          <!-- Right: Brand Logo + Copyright text -->
          <div class="footer-right-side">
            <a href="/" class="brand-logo footer-brand-link">
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
            <div class="footer-copy-text">جميع الحقوق محفوظة © 2026 الحوض الهادي للإسكان</div>
          </div>

          <!-- Center: Links separated by vertical pipes -->
          <nav class="footer-center-nav" aria-label="روابط سريعة وقانونية">
            <a href="/">الرئيسية</a>
            <span class="footer-nav-pipe">|</span>
            <a href="/#projects">المشاريع</a>
            <span class="footer-nav-pipe">|</span>
            <a href="#tab-location">خريطة الموقع</a>
            <span class="footer-nav-pipe">|</span>
            <a href="#">الشروط والأحكام</a>
            <span class="footer-nav-pipe">|</span>
            <a href="#">سياسة الخصوصية</a>
            <span class="footer-nav-pipe">|</span>
            <a href="#bookingSection">اتصل بنا</a>
          </nav>

          <!-- Left: Clean Social Icons -->
          <div class="footer-social-links">
            <a href="https://linkedin.com" target="_blank" rel="noopener" aria-label="LinkedIn" class="footer-soc-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>
              </svg>
            </a>
            <a href="https://facebook.com" target="_blank" rel="noopener" aria-label="Facebook" class="footer-soc-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
              </svg>
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener" aria-label="Instagram" class="footer-soc-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
              </svg>
            </a>
            <a href="https://youtube.com" target="_blank" rel="noopener" aria-label="YouTube" class="footer-soc-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/>
              </svg>
            </a>
          </div>
        </div>
      </footer>
    `;
  }
}

if (!customElements.get("site-footer")) {
  customElements.define("site-footer", SiteFooter);
}
